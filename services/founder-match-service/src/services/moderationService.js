import { blockRepository } from "../repositories/blockRepository.js";
import { reportRepository } from "../repositories/reportRepository.js";
import { AppError } from "../utils/AppError.js";

export async function blockUser(blockerId, blockedId, reason) {
  if (blockerId === blockedId) {
    throw new AppError("Cannot block self", 400);
  }
  const block = await blockRepository.createBlock(blockerId, blockedId, reason, null);
  return block;
}

export async function reportUser(reporterId, payload) {
  if (reporterId === payload.reportedUserId) {
    throw new AppError("Cannot report self", 400);
  }
  const report = await reportRepository.create({
    reporterId,
    reportedId: payload.reportedUserId,
    matchId: payload.matchId,
    reason: payload.reason,
    metadata: payload.metadata,
  });
  return report;
}

