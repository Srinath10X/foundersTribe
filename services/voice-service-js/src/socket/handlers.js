import * as roomService from "../services/roomService.js";
import * as participantService from "../services/participantService.js";
import * as chatService from "../services/chatService.js";
import { startGracePeriod, clearGracePeriod } from "./gracePeriod.js";
import {
  socketRateLimit,
  cleanupSocketRateLimit,
} from "../middleware/rateLimiter.js";
import { logger } from "../utils/logger.js";

function success(cb, data) {
  if (cb) cb({ success: true, data });
}

function fail(cb, error) {
  if (cb) cb({ success: false, error });
}

export function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    const user = socket.data.user;
    logger.info({ userId: user.id, socketId: socket.id }, "Socket connected");

    // ==========================================
    // ROOM EVENTS
    // ==========================================

    socket.on("create_room", async (data, cb) => {
      logger.info({ userId: user.id, data }, "Received create_room request");
      if (!socketRateLimit(socket.id)) return fail(cb, "Rate limit exceeded");
      try {
        const type = ["public", "private"].includes(data.type || "")
          ? data.type
          : "public";

        const result = await roomService.createRoom(user.id, data.title, type);
        socket.join(result.room.id);
        await roomService.updateSocketId(user.id, result.room.id, socket.id);

        io.emit("room_created", {
          room: result.room,
          participant_count: 1,
        });

        success(cb, {
          room: result.room,
          participant: result.participant,
          livekitToken: result.livekitToken,
        });
      } catch (err) {
        logger.error({ err }, "create_room failed");
        fail(cb, err.message);
      }
    });

    socket.on("join_room", async (data, cb) => {
      if (!socketRateLimit(socket.id)) return fail(cb, "Rate limit exceeded");
      try {
        clearGracePeriod(user.id, data.roomId);

        const result = await roomService.joinRoom(
          user.id,
          data.roomId,
          socket.id,
        );
        socket.join(data.roomId);

        const roomState = await roomService.getRoomState(data.roomId);

        socket.to(data.roomId).emit("participant_joined", {
          participant: result.participant,
        });

        io.emit("room_updated", {
          roomId: data.roomId,
          participant_count: roomState.participants.length,
        });

        const { messages } = await chatService.getMessages(
          data.roomId,
          undefined,
          50,
        );
        const chronologicalMessages = messages.reverse();

        success(cb, {
          room: result.room,
          participant: result.participant,
          livekitToken: result.livekitToken,
          participants: roomState.participants,
          messages: chronologicalMessages,
        });
      } catch (err) {
        logger.error({ err }, "join_room failed");
        fail(cb, err.message);
      }
    });

    socket.on("leave_room", async (data, cb) => {
      if (!socketRateLimit(socket.id)) return fail(cb, "Rate limit exceeded");
      try {
        await roomService.leaveRoom(user.id, data.roomId);
        socket.leave(data.roomId);

        socket.to(data.roomId).emit("participant_left", {
          userId: user.id,
        });

        const roomState = await roomService.getRoomState(data.roomId);
        io.emit("room_updated", {
          roomId: data.roomId,
          participant_count: roomState.participants.length,
        });

        success(cb);
      } catch (err) {
        logger.error({ err }, "leave_room failed");
        fail(cb, err.message);
      }
    });

    socket.on("end_room", async (data, cb) => {
      if (!socketRateLimit(socket.id)) return fail(cb, "Rate limit exceeded");
      try {
        await roomService.endRoom(user.id, data.roomId);

        io.to(data.roomId).emit("room_ended", { roomId: data.roomId });

        const sockets = await io.in(data.roomId).fetchSockets();
        for (const s of sockets) {
          s.leave(data.roomId);
        }

        io.emit("room_removed", { roomId: data.roomId });

        success(cb);
      } catch (err) {
        logger.error({ err }, "end_room failed");
        fail(cb, err.message);
      }
    });

    // ==========================================
    // ROLE & MIC EVENTS
    // ==========================================

    socket.on("request_mic", async (data, cb) => {
      if (!socketRateLimit(socket.id)) return fail(cb, "Rate limit exceeded");
      try {
        const roomState = await roomService.getRoomState(data.roomId);
        const hosts = roomState.participants.filter(
          (p) => p.role === "host" || p.role === "co-host",
        );

        for (const host of hosts) {
          const hostSockets = await io.in(data.roomId).fetchSockets();
          for (const hs of hostSockets) {
            if (hs.data.user?.id === host.user_id) {
              hs.emit("mic_requested", {
                userId: user.id,
                roomId: data.roomId,
              });
            }
          }
        }

        success(cb);
      } catch (err) {
        logger.error({ err }, "request_mic failed");
        fail(cb, err.message);
      }
    });

    socket.on("grant_mic", async (data, cb) => {
      if (!socketRateLimit(socket.id)) return fail(cb, "Rate limit exceeded");
      try {
        const result = await participantService.grantMic(
          user.id,
          data.targetId,
          data.roomId,
        );

        const targetSockets = await io.in(data.roomId).fetchSockets();
        for (const ts of targetSockets) {
          if (ts.data.user?.id === data.targetId) {
            ts.emit("mic_granted", {
              participant: result.participant,
              livekitToken: result.livekitToken,
            });
          }
        }

        io.to(data.roomId).emit("participant_updated", {
          participant: result.participant,
        });

        success(cb);
      } catch (err) {
        logger.error({ err }, "grant_mic failed");
        fail(cb, err.message);
      }
    });

    socket.on("revoke_mic", async (data, cb) => {
      if (!socketRateLimit(socket.id)) return fail(cb, "Rate limit exceeded");
      try {
        const result = await participantService.revokeMic(
          user.id,
          data.targetId,
          data.roomId,
        );

        const targetSockets = await io.in(data.roomId).fetchSockets();
        for (const ts of targetSockets) {
          if (ts.data.user?.id === data.targetId) {
            ts.emit("mic_revoked", {
              participant: result.participant,
              livekitToken: result.livekitToken,
            });
          }
        }

        io.to(data.roomId).emit("participant_updated", {
          participant: result.participant,
        });

        success(cb);
      } catch (err) {
        logger.error({ err }, "revoke_mic failed");
        fail(cb, err.message);
      }
    });

    socket.on("promote_user", async (data, cb) => {
      if (!socketRateLimit(socket.id)) return fail(cb, "Rate limit exceeded");
      try {
        const result = await participantService.promoteUser(
          user.id,
          data.targetId,
          data.roomId,
          data.role,
        );

        if (result.livekitToken) {
          const targetSockets = await io.in(data.roomId).fetchSockets();
          for (const ts of targetSockets) {
            if (ts.data.user?.id === data.targetId) {
              ts.emit("role_changed", {
                participant: result.participant,
                livekitToken: result.livekitToken,
              });
            }
          }
        }

        io.to(data.roomId).emit("participant_updated", {
          participant: result.participant,
        });

        success(cb);
      } catch (err) {
        logger.error({ err }, "promote_user failed");
        fail(cb, err.message);
      }
    });

    socket.on("demote_user", async (data, cb) => {
      if (!socketRateLimit(socket.id)) return fail(cb, "Rate limit exceeded");
      try {
        const result = await participantService.demoteUser(
          user.id,
          data.targetId,
          data.roomId,
        );

        const targetSockets = await io.in(data.roomId).fetchSockets();
        for (const ts of targetSockets) {
          if (ts.data.user?.id === data.targetId) {
            ts.emit("role_changed", {
              participant: result.participant,
              livekitToken: result.livekitToken,
            });
          }
        }

        io.to(data.roomId).emit("participant_updated", {
          participant: result.participant,
        });

        success(cb);
      } catch (err) {
        logger.error({ err }, "demote_user failed");
        fail(cb, err.message);
      }
    });

    socket.on("remove_user", async (data, cb) => {
      if (!socketRateLimit(socket.id)) return fail(cb, "Rate limit exceeded");
      try {
        await participantService.removeUser(
          user.id,
          data.targetId,
          data.roomId,
        );

        const targetSockets = await io.in(data.roomId).fetchSockets();
        for (const ts of targetSockets) {
          if (ts.data.user?.id === data.targetId) {
            ts.emit("removed_from_room", { roomId: data.roomId });
            ts.leave(data.roomId);
          }
        }

        io.to(data.roomId).emit("participant_left", {
          userId: data.targetId,
          removed: true,
        });

        success(cb);
      } catch (err) {
        logger.error({ err }, "remove_user failed");
        fail(cb, err.message);
      }
    });

    // ==========================================
    // CHAT EVENTS
    // ==========================================

    socket.on("send_message", async (data, cb) => {
      if (!socketRateLimit(socket.id, 30))
        return fail(cb, "Rate limit exceeded");
      try {
        const message = await chatService.sendMessage(
          user.id,
          data.roomId,
          data.content,
        );

        io.to(data.roomId).emit("receive_message", { message });

        success(cb, { message });
      } catch (err) {
        logger.error({ err }, "send_message failed");
        fail(cb, err.message);
      }
    });

    // ==========================================
    // RECONNECT EVENTS
    // ==========================================

    socket.on("restore_room_state", async (data, cb) => {
      if (!socketRateLimit(socket.id)) return fail(cb, "Rate limit exceeded");
      try {
        clearGracePeriod(user.id, data.roomId);

        await roomService.updateSocketId(user.id, data.roomId, socket.id);
        socket.join(data.roomId);

        const roomState = await roomService.getRoomState(data.roomId);

        let missedMessages = [];
        if (data.lastMessageAt) {
          missedMessages = await chatService.getMessagesSince(
            data.roomId,
            data.lastMessageAt,
          );
        }

        const myParticipant = roomState.participants.find(
          (p) => p.user_id === user.id,
        );
        let livekitToken;

        if (myParticipant) {
          const canPublish = ["host", "co-host", "speaker"].includes(
            myParticipant.role,
          );
          const { generateLiveKitToken } = await import("../config/livekit.js");
          livekitToken = await generateLiveKitToken(user.id, data.roomId, {
            canPublish,
            canSubscribe: true,
          });
        }

        socket.to(data.roomId).emit("participant_reconnected", {
          userId: user.id,
        });

        success(cb, {
          room: roomState.room,
          participants: roomState.participants,
          missedMessages,
          livekitToken,
        });
      } catch (err) {
        logger.error({ err }, "restore_room_state failed");
        fail(cb, err.message);
      }
    });

    // ==========================================
    // DISCONNECT HANDLING
    // ==========================================

    socket.on("disconnect", async (reason) => {
      logger.info(
        { userId: user.id, socketId: socket.id, reason },
        "Socket disconnected",
      );
      cleanupSocketRateLimit(socket.id);

      try {
        const rooms = await roomService.getParticipantRooms(socket.id);

        for (const { room_id, user_id } of rooms) {
          await roomService.markDisconnected(user_id, room_id, socket.id);

          socket.to(room_id).emit("participant_disconnected", {
            userId: user_id,
          });

          startGracePeriod(user_id, room_id, async () => {
            await roomService.removeParticipant(user_id, room_id);

            io.to(room_id).emit("participant_left", {
              userId: user_id,
              expired: true,
            });

            try {
              const state = await roomService.getRoomState(room_id);
              io.emit("room_updated", {
                roomId: room_id,
                participant_count: state.participants.length,
              });
            } catch {
              // Room may no longer exist
            }
          });
        }
      } catch (err) {
        logger.error({ err }, "Error handling disconnect");
      }
    });
  });
}
