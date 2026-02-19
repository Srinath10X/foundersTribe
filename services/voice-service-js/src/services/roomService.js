import { generateLiveKitToken } from "../config/livekit.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/AppError.js";
import { roomRepository } from "../repositories/roomRepository.js";
import { participantRepository } from "../repositories/participantRepository.js";

function getGrantsForRole(role) {
  switch (role) {
    case "host":
    case "co-host":
    case "speaker":
      return { canPublish: true, canSubscribe: true };
    case "listener":
      return { canPublish: false, canSubscribe: true };
    default:
      return { canPublish: false, canSubscribe: true };
  }
}

export async function createRoom(userId, title, type = "public") {
  const room = await roomRepository.createRoom(userId, title, type);

  let participant = await participantRepository.addParticipant(
    room.id,
    userId,
    "host",
    null,
  );
  participant = await participantRepository.enrichOneWithProfile(participant);

  const livekitToken = await generateLiveKitToken(
    userId,
    room.id,
    getGrantsForRole("host"),
  );

  logger.info({ roomId: room.id, userId }, "Room created");
  return { room, participant, livekitToken };
}

export async function joinRoom(userId, roomId, socketId) {
  const room = await roomRepository.getRoomById(roomId);

  if (!room || !room.is_active) {
    throw new AppError("Room not found or inactive", 404);
  }

  const count = await participantRepository.countConnected(roomId);
  if (count >= room.max_participants) {
    throw new AppError("Room is full", 400);
  }

  let participant = await participantRepository.getParticipant(roomId, userId);

  if (participant) {
    // Existing participant — restore connection and preserve role
    // If user was the host but their role got reset, fix it
    let role = participant.role;
    if (room.host_id === userId && role === "listener") {
      role = "host";
      await participantRepository.updateParticipant(roomId, userId, { role: "host", mic_enabled: true });
    }
    await participantRepository.updateSocketId(roomId, userId, socketId);
    const updated = await participantRepository.getParticipant(roomId, userId);
    if (updated) participant = updated;
    logger.info(
      { roomId, userId, role: participant.role },
      "Participant restored",
    );
  } else {
    // Restore host role if this user is the room creator
    const role = room.host_id === userId ? "host" : "listener";
    participant = await participantRepository.addParticipant(
      roomId,
      userId,
      role,
      socketId,
    );
    logger.info({ roomId, userId, role }, "New participant joined");
  }

  // Enrich with display name from profiles
  participant = await participantRepository.enrichOneWithProfile(participant);

  const livekitToken = await generateLiveKitToken(
    userId,
    roomId,
    getGrantsForRole(participant.role),
  );

  return { participant, livekitToken, room };
}

export async function leaveRoom(userId, roomId) {
  await participantRepository.deleteParticipant(roomId, userId);
  logger.info({ roomId, userId }, "Participant left room (deleted)");

  await checkAndDestroyRoom(roomId);
}

export async function endRoom(userId, roomId) {
  const room = await roomRepository.getRoomById(roomId);

  if (!room) {
    throw new AppError("Room not found", 404);
  }

  if (room.host_id !== userId) {
    throw new AppError("Only the host can end the room", 403);
  }

  await roomRepository.updateRoomStatus(roomId, false);
  await participantRepository.removeAllInRoom(roomId);

  logger.info({ roomId, userId }, "Room ended");
}

export async function getActiveRooms() {
  const rooms = await roomRepository.getActiveRooms();

  const roomsWithCounts = await Promise.all(
    rooms.map(async (room) => {
      const count = await participantRepository.countConnected(room.id);
      return { ...room, participant_count: count };
    }),
  );

  return roomsWithCounts;
}

export async function getRoomState(roomId) {
  const room = await roomRepository.getRoomById(roomId);

  if (!room) {
    throw new AppError("Room not found", 404);
  }

  const rawParticipants =
    await participantRepository.getConnectedParticipants(roomId);

  // Enrich with display names from profiles
  const participants =
    await participantRepository.enrichWithProfiles(rawParticipants);

  return { room, participants };
}

export async function markDisconnected(userId, roomId, socketId) {
  await participantRepository.markDisconnectedBySocket(
    userId,
    roomId,
    socketId,
  );
}

export async function removeParticipant(userId, roomId) {
  await participantRepository.deleteParticipant(roomId, userId);
  await checkAndDestroyRoom(roomId);
}

async function checkAndDestroyRoom(roomId) {
  const count = await participantRepository.countConnected(roomId);
  if (count === 0) {
    logger.info({ roomId }, "Room empty — initiating auto-destruction");
    await roomRepository.updateRoomStatus(roomId, false);
    await participantRepository.removeAllInRoom(roomId);
    logger.info({ roomId }, "Room destroyed due to inactivity");
  }
}

export async function getParticipantRooms(socketId) {
  return await participantRepository.getParticipantRooms(socketId);
}

export async function updateSocketId(userId, roomId, socketId) {
  await participantRepository.updateSocketId(roomId, userId, socketId);
}
