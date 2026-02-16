import { tribeRepository } from "../repositories/tribeRepository.js";
import { tribeMemberRepository } from "../repositories/tribeMemberRepository.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/AppError.js";

export async function createTribe(userId, data) {
  const tribe = await tribeRepository.create(userId, data);
  logger.info({ tribeId: tribe.id, userId }, "Tribe created");
  // Trigger auto-creates announcement group and adds owner — handled by DB trigger
  return tribe;
}

export async function getTribe(tribeId, userId) {
  const tribe = await tribeRepository.getById(tribeId);
  if (!tribe) throw new AppError("Tribe not found", 404);

  // Check access: public tribes visible to all, private only to members
  if (!tribe.is_public) {
    const isMember = await tribeMemberRepository.isMember(tribeId, userId);
    if (!isMember) throw new AppError("Tribe not found", 404);
  }

  return tribe;
}

export async function updateTribe(tribeId, userId, updates) {
  const role = await tribeMemberRepository.getRole(tribeId, userId);
  if (!role || !["owner", "admin"].includes(role)) {
    throw new AppError("Only owner or admin can update tribe", 403);
  }

  const tribe = await tribeRepository.update(tribeId, updates);
  logger.info({ tribeId, userId }, "Tribe updated");
  return tribe;
}

export async function deleteTribe(tribeId, userId) {
  const role = await tribeMemberRepository.getRole(tribeId, userId);
  if (role !== "owner") {
    throw new AppError("Only tribe owner can delete tribe", 403);
  }

  await tribeRepository.softDelete(tribeId);
  logger.info({ tribeId, userId }, "Tribe deleted");
}

export async function listPublicTribes(cursor, limit) {
  return await tribeRepository.listPublic(cursor, limit);
}

export async function listMyTribes(userId) {
  return await tribeRepository.listByUser(userId);
}
