import { SupabaseClient } from "@supabase/supabase-js";
import {
  ServiceRepository,
  type ServiceCatalogRow,
  type ServiceRequestStatus,
} from "../repositories/serviceRepository.js";
import { AppError } from "../utils/AppError.js";
import { decodeCursor, encodeCursor } from "../utils/cursor.js";
import { mapSupabaseError } from "./dbErrorMap.js";

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
}

function durationInDays(service: Pick<ServiceCatalogRow, "delivery_time_value" | "delivery_time_unit">) {
  return service.delivery_time_unit === "weeks"
    ? service.delivery_time_value * 7
    : service.delivery_time_value;
}

function normalizeSortBy(raw?: string) {
  switch (raw) {
    case "cost_asc":
    case "cost_desc":
    case "time_asc":
    case "time_desc":
    case "newest":
      return raw;
    default:
      return "relevance";
  }
}

export async function listMyFreelancerServices(db: SupabaseClient, userId: string) {
  const repo = new ServiceRepository(db);
  return repo.listMyServices(userId);
}

export async function listFreelancerServicesByUserId(db: SupabaseClient, freelancerId: string) {
  const repo = new ServiceRepository(db);
  return repo.listFreelancerServices(freelancerId);
}

export async function upsertMyFreelancerServices(
  db: SupabaseClient,
  userId: string,
  payload: { services: Array<Record<string, unknown>> },
) {
  try {
    const repo = new ServiceRepository(db);
    const services = (payload.services || []).map((row) => ({
      service_name: String(row.service_name || "").trim(),
      description: row.description ? String(row.description).trim() : null,
      cost_amount: toNumber(row.cost_amount, 0),
      cost_currency: String(row.cost_currency || "INR").trim() || "INR",
      delivery_time_value: Math.max(1, Math.trunc(toNumber(row.delivery_time_value, 1))),
      delivery_time_unit: (row.delivery_time_unit === "weeks" ? "weeks" : "days") as "days" | "weeks",
      is_active: row.is_active !== false,
    }));

    return await repo.replaceMyServices(userId, services);
  } catch (error) {
    throw mapSupabaseError(error, "Failed to save freelancer services");
  }
}

export async function searchFreelancerServices(db: SupabaseClient, query: Record<string, unknown>) {
  const repo = new ServiceRepository(db);
  const limit = Math.min(Math.max(toNumber(query.limit, 20), 1), 50);
  const minCost = query.min_cost !== undefined ? toNumber(query.min_cost, 0) : undefined;
  const maxCost = query.max_cost !== undefined ? toNumber(query.max_cost, 0) : undefined;
  const maxDeliveryDays =
    query.max_delivery_days !== undefined ? Math.max(1, Math.trunc(toNumber(query.max_delivery_days, 1))) : undefined;
  const sortBy = normalizeSortBy(String(query.sort_by || ""));
  const cursor = decodeCursor(typeof query.cursor === "string" ? query.cursor : undefined);
  const specificFreelancerId =
    typeof query.freelancer_id === "string" && query.freelancer_id.trim()
      ? query.freelancer_id.trim()
      : null;

  const rawRows = specificFreelancerId
    ? await repo.listFreelancerServices(specificFreelancerId)
    : await repo.searchServiceRows({
        q: typeof query.q === "string" ? query.q.trim() : undefined,
        service_name: typeof query.service_name === "string" ? query.service_name.trim() : undefined,
        min_cost: minCost,
        max_cost: maxCost,
        max_delivery_days: maxDeliveryDays,
        limit,
      });

  const grouped = new Map<
    string,
    {
      freelancer_id: string;
      services: ServiceCatalogRow[];
      min_cost_amount: number;
      min_delivery_days: number;
      max_delivery_days: number;
      updated_at: string;
    }
  >();

  rawRows.forEach((service) => {
    const key = service.freelancer_id;
    const serviceDays = durationInDays(service);
    const cost = Number(service.cost_amount || 0);

    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, {
        freelancer_id: key,
        services: [service],
        min_cost_amount: cost,
        min_delivery_days: serviceDays,
        max_delivery_days: serviceDays,
        updated_at: service.updated_at,
      });
      return;
    }

    current.services.push(service);
    current.min_cost_amount = Math.min(current.min_cost_amount, cost);
    current.min_delivery_days = Math.min(current.min_delivery_days, serviceDays);
    current.max_delivery_days = Math.max(current.max_delivery_days, serviceDays);
    if (new Date(service.updated_at).getTime() > new Date(current.updated_at).getTime()) {
      current.updated_at = service.updated_at;
    }
  });

  let items = Array.from(grouped.values());
  const q = typeof query.q === "string" ? query.q.trim().toLowerCase() : "";

  if (sortBy === "cost_asc") {
    items.sort((a, b) => a.min_cost_amount - b.min_cost_amount);
  } else if (sortBy === "cost_desc") {
    items.sort((a, b) => b.min_cost_amount - a.min_cost_amount);
  } else if (sortBy === "time_asc") {
    items.sort((a, b) => a.min_delivery_days - b.min_delivery_days);
  } else if (sortBy === "time_desc") {
    items.sort((a, b) => b.max_delivery_days - a.max_delivery_days);
  } else if (sortBy === "newest") {
    items.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  } else {
    items.sort((a, b) => {
      const aHit = q
        ? a.services.filter((service) => service.service_name.toLowerCase().includes(q)).length
        : 0;
      const bHit = q
        ? b.services.filter((service) => service.service_name.toLowerCase().includes(q)).length
        : 0;
      if (aHit !== bHit) return bHit - aHit;
      if (a.min_delivery_days !== b.min_delivery_days) {
        return a.min_delivery_days - b.min_delivery_days;
      }
      return a.min_cost_amount - b.min_cost_amount;
    });
  }

  if (cursor) {
    items = items.filter((item) => {
      const itemTs = new Date(item.updated_at).getTime();
      const cursorTs = new Date(cursor.createdAt).getTime();
      if (Number.isNaN(itemTs) || Number.isNaN(cursorTs)) return true;
      if (itemTs < cursorTs) return true;
      if (itemTs > cursorTs) return false;
      return item.freelancer_id < cursor.id;
    });
  }

  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore
    ? encodeCursor(pageItems[pageItems.length - 1].updated_at, pageItems[pageItems.length - 1].freelancer_id)
    : null;

  return {
    items: pageItems.map((item) => ({
      freelancer_id: item.freelancer_id,
      min_cost_amount: item.min_cost_amount,
      min_delivery_days: item.min_delivery_days,
      max_delivery_days: item.max_delivery_days,
      updated_at: item.updated_at,
      services: item.services,
    })),
    next_cursor: nextCursor,
  };
}

export async function createServiceRequest(
  db: SupabaseClient,
  founderId: string,
  payload: {
    freelancer_id: string;
    service_id?: string;
    message?: string;
  },
) {
  try {
    const repo = new ServiceRepository(db);

    if (!payload.freelancer_id) {
      throw new AppError("freelancer_id is required", 400, "bad_request");
    }

    if (payload.freelancer_id === founderId) {
      throw new AppError("Cannot request service from yourself", 400, "bad_request");
    }

    let serviceId: string | null = payload.service_id || null;
    if (serviceId) {
      const service = await repo.getServiceById(serviceId);
      if (!service || !service.is_active) {
        throw new AppError("Service not found", 404, "not_found");
      }
      if (service.freelancer_id !== payload.freelancer_id) {
        throw new AppError("Service does not belong to the selected freelancer", 400, "bad_request");
      }
    }

    const buildInitialMessage = (serviceName?: string | null) => {
      const explicit = (payload.message || "").trim();
      if (explicit) return explicit;
      if (serviceName) return `Hi, I would like to discuss your ${serviceName} service.`;
      return "Hi, I would like to discuss your services.";
    };

    const existing = await repo.findOpenRequest(founderId, payload.freelancer_id, serviceId);
    if (existing) {
      const refreshedExisting = await repo.getServiceRequestById(existing.id);
      if (!refreshedExisting) {
        throw new AppError("Service request created but not found", 500, "internal_error");
      }
      return refreshedExisting;
    }

    const request = await repo.createServiceRequest({
      founder_id: founderId,
      freelancer_id: payload.freelancer_id,
      service_id: serviceId,
      request_message: (payload.message || "").trim() || null,
    });

    const initialMessage = buildInitialMessage(request.service?.service_name);

    await repo.insertServiceRequestMessage({
      request_id: request.id,
      sender_id: founderId,
      message_type: "text",
      body: initialMessage,
      metadata: {
        source: "service_request",
      },
    });

    const refreshed = await repo.getServiceRequestById(request.id);
    if (!refreshed) {
      throw new AppError("Service request created but not found", 500, "internal_error");
    }
    return refreshed;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw mapSupabaseError(error, "Failed to create service request");
  }
}

export async function listServiceRequests(db: SupabaseClient, userId: string, query: Record<string, unknown>) {
  const repo = new ServiceRepository(db);
  const limit = Math.min(Math.max(toNumber(query.limit, 30), 1), 100);
  const status = typeof query.status === "string" ? query.status : undefined;

  const rows = await repo.listServiceRequests(userId, limit, status);
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    items: items.map((row) => ({
      ...row,
      unread_count: row.founder_id === userId ? row.unread_founder_count : row.unread_freelancer_count,
    })),
    next_cursor: null,
  };
}

export async function getServiceRequestById(db: SupabaseClient, requestId: string, userId: string) {
  const repo = new ServiceRepository(db);
  const row = await repo.getServiceRequestById(requestId);
  if (!row) throw new AppError("Request not found", 404, "not_found");
  if (row.founder_id !== userId && row.freelancer_id !== userId) {
    throw new AppError("Unauthorized", 403, "forbidden");
  }
  return {
    ...row,
    unread_count: row.founder_id === userId ? row.unread_founder_count : row.unread_freelancer_count,
  };
}

export async function listServiceRequestMessages(
  db: SupabaseClient,
  requestId: string,
  userId: string,
  query: Record<string, unknown>,
) {
  const repo = new ServiceRepository(db);
  const limit = Math.min(Math.max(toNumber(query.limit, 50), 1), 100);
  const cursor = decodeCursor(typeof query.cursor === "string" ? query.cursor : undefined);

  const request = await repo.getServiceRequestById(requestId);
  if (!request) throw new AppError("Request not found", 404, "not_found");
  if (request.founder_id !== userId && request.freelancer_id !== userId) {
    throw new AppError("Unauthorized", 403, "forbidden");
  }

  const rows = await repo.listServiceRequestMessages(requestId, limit, cursor);
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  const nextCursor = hasMore
    ? encodeCursor(items[items.length - 1].created_at, items[items.length - 1].id)
    : null;

  return { items, next_cursor: nextCursor };
}

export async function createServiceRequestMessage(
  db: SupabaseClient,
  requestId: string,
  userId: string,
  payload: {
    message_type: "text" | "file" | "system";
    body?: string;
    file_url?: string;
    metadata?: Record<string, unknown>;
  },
) {
  try {
    const repo = new ServiceRepository(db);
    const request = await repo.getServiceRequestById(requestId);
    if (!request) throw new AppError("Request not found", 404, "not_found");

    const isParticipant = request.founder_id === userId || request.freelancer_id === userId;
    if (!isParticipant) {
      throw new AppError("Unauthorized", 403, "forbidden");
    }

    if (request.status !== "accepted") {
      throw new AppError("Messaging is available after request acceptance", 409, "request_not_accepted");
    }

    return await repo.insertServiceRequestMessage({
      request_id: requestId,
      sender_id: userId,
      message_type: payload.message_type,
      body: payload.body || null,
      file_url: payload.file_url || null,
      metadata: payload.metadata || {},
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw mapSupabaseError(error, "Failed to send service message");
  }
}

async function transitionServiceRequestStatus(
  db: SupabaseClient,
  requestId: string,
  userId: string,
  targetStatus: ServiceRequestStatus,
) {
  const repo = new ServiceRepository(db);
  const request = await repo.getServiceRequestById(requestId);
  if (!request) throw new AppError("Request not found", 404, "not_found");

  if (request.freelancer_id !== userId) {
    throw new AppError("Only the freelancer can update this request", 403, "forbidden");
  }

  if (request.status === targetStatus) {
    return {
      ...request,
      unread_count: request.unread_freelancer_count,
    };
  }

  if (request.status !== "pending") {
    throw new AppError(`Cannot update request in ${request.status} state`, 409, "invalid_request_status");
  }

  const updated = await repo.updateServiceRequestStatus(requestId, targetStatus);
  if (!updated) throw new AppError("Request not found", 404, "not_found");

  return {
    ...updated,
    unread_count: updated.unread_freelancer_count,
  };
}

export async function acceptServiceRequest(db: SupabaseClient, requestId: string, userId: string) {
  try {
    return await transitionServiceRequestStatus(db, requestId, userId, "accepted");
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw mapSupabaseError(error, "Failed to accept service request");
  }
}

export async function declineServiceRequest(db: SupabaseClient, requestId: string, userId: string) {
  try {
    return await transitionServiceRequestStatus(db, requestId, userId, "declined");
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw mapSupabaseError(error, "Failed to decline service request");
  }
}

export async function markServiceRequestMessagesRead(db: SupabaseClient, requestId: string, userId: string) {
  try {
    const repo = new ServiceRepository(db);
    const request = await repo.getServiceRequestById(requestId);
    if (!request) throw new AppError("Request not found", 404, "not_found");
    if (request.founder_id !== userId && request.freelancer_id !== userId) {
      throw new AppError("Unauthorized", 403, "forbidden");
    }

    const updated = await repo.markServiceRequestMessagesRead(requestId, userId);
    return { updated };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw mapSupabaseError(error, "Failed to mark service messages as read");
  }
}
