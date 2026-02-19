import { generateLiveKitToken, livekitWsUrl } from "../config/livekit.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/AppError.js";
import { participantRepository } from "../repositories/participantRepository.js";

const ROLE_HIERARCHY = {
  host: 4,
  "co-host": 3,
  speaker: 2,
  listener: 1,
};

async function validateActorPrivileges(actorId, roomId, requiredRoles) {
  const actor = await participantRepository.getParticipant(roomId, actorId);

  if (!actor || !actor.is_connected) {
    throw new AppError("Actor not found or not connected", 404);
  }

  if (!requiredRoles.includes(actor.role)) {
    throw new AppError("Insufficient privileges", 403);
  }

  return actor;
}

async function getTargetParticipant(targetId, roomId) {
  const target = await participantRepository.getParticipant(roomId, targetId);

  if (!target || !target.is_connected) {
    throw new AppError("Target user not found in room", 404);
  }

  return target;
}

export async function promoteUser(actorId, targetId, roomId, newRole) {
  const actor = await validateActorPrivileges(actorId, roomId, [
    "host",
    "co-host",
  ]);
  const target = await getTargetParticipant(targetId, roomId);

  if (ROLE_HIERARCHY[newRole] >= ROLE_HIERARCHY[actor.role]) {
    throw new AppError(
      "Cannot promote to equal or higher role than your own",
      403,
    );
  }

  if (ROLE_HIERARCHY[newRole] <= ROLE_HIERARCHY[target.role]) {
    throw new AppError("Target already has equal or higher role", 400);
  }

  if (newRole === "co-host" && actor.role !== "host") {
    throw new AppError("Only the host can promote to co-host", 403);
  }

  const micEnabled = newRole !== "listener";

  let updated = await participantRepository.updateParticipant(
    roomId,
    targetId,
    {
      role: newRole,
      mic_enabled: micEnabled,
    },
  );
  updated = await participantRepository.enrichOneWithProfile(updated);

  const canPublish = ["host", "co-host", "speaker"].includes(newRole);
  const livekitToken = await generateLiveKitToken(targetId, roomId, {
    canPublish,
    canSubscribe: true,
  });

  logger.info({ actorId, targetId, roomId, newRole }, "User promoted");
  return { participant: updated, livekitToken, livekitUrl: livekitWsUrl };
}

export async function demoteUser(actorId, targetId, roomId) {
  const actor = await validateActorPrivileges(actorId, roomId, [
    "host",
    "co-host",
  ]);
  const target = await getTargetParticipant(targetId, roomId);

  if (ROLE_HIERARCHY[target.role] >= ROLE_HIERARCHY[actor.role]) {
    throw new AppError("Cannot demote a user with equal or higher role", 403);
  }

  let updated = await participantRepository.updateParticipant(
    roomId,
    targetId,
    {
      role: "listener",
      mic_enabled: false,
    },
  );
  updated = await participantRepository.enrichOneWithProfile(updated);

  const livekitToken = await generateLiveKitToken(targetId, roomId, {
    canPublish: false,
    canSubscribe: true,
  });

  logger.info({ actorId, targetId, roomId }, "User demoted to listener");
  return { participant: updated, livekitToken, livekitUrl: livekitWsUrl };
}

export async function grantMic(actorId, targetId, roomId) {
  await validateActorPrivileges(actorId, roomId, ["host", "co-host"]);
  await getTargetParticipant(targetId, roomId);

  let updated = await participantRepository.updateParticipant(
    roomId,
    targetId,
    {
      mic_enabled: true,
      role: "speaker",
    },
  );
  updated = await participantRepository.enrichOneWithProfile(updated);

  const livekitToken = await generateLiveKitToken(targetId, roomId, {
    canPublish: true,
    canSubscribe: true,
  });

  logger.info({ actorId, targetId, roomId }, "Mic granted");
  return { participant: updated, livekitToken, livekitUrl: livekitWsUrl };
}

export async function revokeMic(actorId, targetId, roomId) {
  const actor = await validateActorPrivileges(actorId, roomId, [
    "host",
    "co-host",
  ]);
  const target = await getTargetParticipant(targetId, roomId);

  if (ROLE_HIERARCHY[target.role] >= ROLE_HIERARCHY[actor.role]) {
    throw new AppError(
      "Cannot revoke mic from a user with equal or higher role",
      403,
    );
  }

  let updated = await participantRepository.updateParticipant(
    roomId,
    targetId,
    {
      mic_enabled: false,
      role: "listener",
    },
  );
  updated = await participantRepository.enrichOneWithProfile(updated);

  const livekitToken = await generateLiveKitToken(targetId, roomId, {
    canPublish: false,
    canSubscribe: true,
  });

  logger.info({ actorId, targetId, roomId }, "Mic revoked");
  return { participant: updated, livekitToken, livekitUrl: livekitWsUrl };
}

export async function removeUser(actorId, targetId, roomId) {
  await validateActorPrivileges(actorId, roomId, ["host"]);
  const target = await getTargetParticipant(targetId, roomId);

  if (target.role === "host") {
    throw new AppError("Cannot remove the host", 403);
  }

  await participantRepository.deleteParticipant(roomId, targetId);

  logger.info({ actorId, targetId, roomId }, "User removed from room");
}
