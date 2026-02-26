import { SupabaseClient } from "@supabase/supabase-js";

export type ServiceCatalogInput = {
  service_name: string;
  description?: string | null;
  cost_amount: number;
  cost_currency?: string;
  delivery_time_value: number;
  delivery_time_unit: "days" | "weeks";
  is_active?: boolean;
};

export type ServiceCatalogRow = {
  id: string;
  freelancer_id: string;
  service_name: string;
  description: string | null;
  cost_amount: string;
  cost_currency: string;
  delivery_time_value: number;
  delivery_time_unit: "days" | "weeks";
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ServiceRequestRow = {
  id: string;
  service_id: string | null;
  founder_id: string;
  freelancer_id: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  request_message: string | null;
  last_message_preview: string | null;
  last_message_at: string;
  unread_founder_count: number;
  unread_freelancer_count: number;
  created_at: string;
  updated_at: string;
  service?: {
    id: string;
    service_name: string;
    description: string | null;
    cost_amount: string;
    cost_currency: string;
    delivery_time_value: number;
    delivery_time_unit: "days" | "weeks";
    is_active: boolean;
  } | null;
};

export type ServiceRequestStatus = "pending" | "accepted" | "declined" | "cancelled";

export type ServiceRequestMessageRow = {
  id: string;
  request_id: string;
  sender_id: string;
  recipient_id: string | null;
  message_type: "text" | "file" | "system";
  body: string | null;
  file_url: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
};

function escapeIlike(input: string) {
  return input.replace(/[%_]/g, "").trim();
}

export class ServiceRepository {
  db: SupabaseClient;

  constructor(db: SupabaseClient) {
    this.db = db;
  }

  async listMyServices(userId: string): Promise<ServiceCatalogRow[]> {
    const { data, error } = await this.db
      .from("freelancer_services")
      .select("*")
      .eq("freelancer_id", userId)
      .order("is_active", { ascending: false })
      .order("cost_amount", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as ServiceCatalogRow[];
  }

  async listFreelancerServices(freelancerId: string): Promise<ServiceCatalogRow[]> {
    const { data, error } = await this.db
      .from("freelancer_services")
      .select("*")
      .eq("freelancer_id", freelancerId)
      .eq("is_active", true)
      .order("cost_amount", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as ServiceCatalogRow[];
  }

  async getServiceById(serviceId: string): Promise<ServiceCatalogRow | null> {
    const { data, error } = await this.db
      .from("freelancer_services")
      .select("*")
      .eq("id", serviceId)
      .maybeSingle();
    if (error) throw error;
    return (data || null) as ServiceCatalogRow | null;
  }

  async replaceMyServices(userId: string, services: ServiceCatalogInput[]): Promise<ServiceCatalogRow[]> {
    const { error: deleteError } = await this.db
      .from("freelancer_services")
      .delete()
      .eq("freelancer_id", userId);

    if (deleteError) throw deleteError;

    if (!services.length) return [];

    const payload = services.map((service) => ({
      freelancer_id: userId,
      service_name: service.service_name,
      description: service.description ?? null,
      cost_amount: service.cost_amount,
      cost_currency: service.cost_currency || "INR",
      delivery_time_value: service.delivery_time_value,
      delivery_time_unit: service.delivery_time_unit,
      is_active: service.is_active ?? true,
    }));

    const { data, error } = await this.db
      .from("freelancer_services")
      .insert(payload)
      .select("*")
      .order("is_active", { ascending: false })
      .order("cost_amount", { ascending: true });

    if (error) throw error;
    return (data || []) as ServiceCatalogRow[];
  }

  async searchServiceRows(filters: {
    q?: string;
    min_cost?: number;
    max_cost?: number;
    max_delivery_days?: number;
    service_name?: string;
    limit: number;
  }): Promise<ServiceCatalogRow[]> {
    let query = this.db
      .from("freelancer_services")
      .select("*")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(Math.min(Math.max(filters.limit * 6, 30), 600));

    if (typeof filters.min_cost === "number") {
      query = query.gte("cost_amount", filters.min_cost);
    }
    if (typeof filters.max_cost === "number") {
      query = query.lte("cost_amount", filters.max_cost);
    }

    const rawQuery = filters.q || filters.service_name;
    if (rawQuery) {
      const safe = escapeIlike(rawQuery);
      if (safe) {
        query = query.or(`service_name.ilike.%${safe}%,description.ilike.%${safe}%`);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data || []) as ServiceCatalogRow[];
    if (typeof filters.max_delivery_days !== "number") {
      return rows;
    }

    return rows.filter((row) => {
      const durationDays = row.delivery_time_unit === "weeks"
        ? row.delivery_time_value * 7
        : row.delivery_time_value;
      return durationDays <= filters.max_delivery_days!;
    });
  }

  async createServiceRequest(payload: {
    founder_id: string;
    freelancer_id: string;
    service_id?: string | null;
    request_message?: string | null;
  }): Promise<ServiceRequestRow> {
    const { data, error } = await this.db
      .from("service_message_requests")
      .insert({
        founder_id: payload.founder_id,
        freelancer_id: payload.freelancer_id,
        service_id: payload.service_id ?? null,
        request_message: payload.request_message ?? null,
      })
      .select(
        "*, service:freelancer_services(id, service_name, description, cost_amount, cost_currency, delivery_time_value, delivery_time_unit, is_active)",
      )
      .single();

    if (error) throw error;
    return data as ServiceRequestRow;
  }

  async findOpenRequest(
    founderId: string,
    freelancerId: string,
    serviceId?: string | null,
  ): Promise<ServiceRequestRow | null> {
    let query = this.db
      .from("service_message_requests")
      .select(
        "*, service:freelancer_services(id, service_name, description, cost_amount, cost_currency, delivery_time_value, delivery_time_unit, is_active)",
      )
      .eq("founder_id", founderId)
      .eq("freelancer_id", freelancerId)
      .in("status", ["pending", "accepted"])
      .order("last_message_at", { ascending: false })
      .limit(1);

    if (serviceId) {
      query = query.eq("service_id", serviceId);
    }

    const { data, error } = await query;
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : null;
    return (row || null) as ServiceRequestRow | null;
  }

  async listServiceRequests(userId: string, limit: number, status?: string): Promise<ServiceRequestRow[]> {
    let query = this.db
      .from("service_message_requests")
      .select(
        "*, service:freelancer_services(id, service_name, description, cost_amount, cost_currency, delivery_time_value, delivery_time_unit, is_active)",
      )
      .or(`founder_id.eq.${userId},freelancer_id.eq.${userId}`)
      .order("last_message_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as ServiceRequestRow[];
  }

  async getServiceRequestById(requestId: string): Promise<ServiceRequestRow | null> {
    const { data, error } = await this.db
      .from("service_message_requests")
      .select(
        "*, service:freelancer_services(id, service_name, description, cost_amount, cost_currency, delivery_time_value, delivery_time_unit, is_active)",
      )
      .eq("id", requestId)
      .maybeSingle();

    if (error) throw error;
    return (data || null) as ServiceRequestRow | null;
  }

  async updateServiceRequestStatus(requestId: string, status: ServiceRequestStatus): Promise<ServiceRequestRow | null> {
    const { data, error } = await this.db
      .from("service_message_requests")
      .update({ status })
      .eq("id", requestId)
      .select(
        "*, service:freelancer_services(id, service_name, description, cost_amount, cost_currency, delivery_time_value, delivery_time_unit, is_active)",
      )
      .maybeSingle();

    if (error) throw error;
    return (data || null) as ServiceRequestRow | null;
  }

  async insertServiceRequestMessage(payload: {
    request_id: string;
    sender_id: string;
    recipient_id?: string | null;
    message_type: "text" | "file" | "system";
    body?: string | null;
    file_url?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<ServiceRequestMessageRow> {
    const { data, error } = await this.db
      .from("service_request_messages")
      .insert({
        request_id: payload.request_id,
        sender_id: payload.sender_id,
        recipient_id: payload.recipient_id ?? null,
        message_type: payload.message_type,
        body: payload.body ?? null,
        file_url: payload.file_url ?? null,
        metadata: payload.metadata ?? {},
      })
      .select("*")
      .single();

    if (error) throw error;
    return data as ServiceRequestMessageRow;
  }

  async listServiceRequestMessages(
    requestId: string,
    limit: number,
    cursor: { createdAt: string; id: string } | null,
  ): Promise<ServiceRequestMessageRow[]> {
    let query = this.db
      .from("service_request_messages")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.or(
        `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as ServiceRequestMessageRow[];
  }

  async markServiceRequestMessagesRead(requestId: string, userId: string): Promise<number> {
    const { data: updated, error } = await this.db
      .from("service_request_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("request_id", requestId)
      .eq("recipient_id", userId)
      .is("read_at", null)
      .select("id");

    if (error) throw error;

    const { data: requestRow, error: requestErr } = await this.db
      .from("service_message_requests")
      .select("id, founder_id, freelancer_id")
      .eq("id", requestId)
      .maybeSingle();

    if (requestErr) throw requestErr;

    if (requestRow) {
      const patch = requestRow.founder_id === userId
        ? { unread_founder_count: 0 }
        : requestRow.freelancer_id === userId
          ? { unread_freelancer_count: 0 }
          : null;
      if (patch) {
        const { error: patchErr } = await this.db
          .from("service_message_requests")
          .update(patch)
          .eq("id", requestId);
        if (patchErr) throw patchErr;
      }
    }

    return Array.isArray(updated) ? updated.length : 0;
  }
}
