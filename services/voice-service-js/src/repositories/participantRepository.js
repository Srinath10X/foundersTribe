import { supabase } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

export class ParticipantRepository {
  async addParticipant(roomId, userId, role, socketId) {
    const { data, error } = await supabase
      .from("participants")
      .upsert(
        {
          room_id: roomId,
          user_id: userId,
          role: role,
          socket_id: socketId,
          is_connected: true,
          disconnected_at: null,
          mic_enabled: role !== "listener",
        },
        { onConflict: "room_id,user_id" },
      )
      .select()
      .single();

    if (error) {
      logger.error(
        { error, roomId, userId },
        "ParticipantRepository.addParticipant failed",
      );
      throw new Error("Database error adding participant");
    }
    return data;
  }

  async getParticipant(roomId, userId) {
    const { data, error } = await supabase
      .from("participants")
      .select("*")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      return null;
    }
    return data;
  }

  async getConnectedParticipants(roomId) {
    const { data, error } = await supabase
      .from("participants")
      .select("*")
      .eq("room_id", roomId)
      .eq("is_connected", true)
      .order("joined_at", { ascending: true });

    if (error) {
      logger.error(
        { error, roomId },
        "ParticipantRepository.getConnectedParticipants failed",
      );
      throw new Error("Database error fetching participants");
    }
    return data || [];
  }

  async countConnected(roomId) {
    const { count, error } = await supabase
      .from("participants")
      .select("*", { count: "exact", head: true })
      .eq("room_id", roomId)
      .eq("is_connected", true);

    if (error) {
      logger.error(
        { error, roomId },
        "ParticipantRepository.countConnected failed",
      );
      throw new Error("Database error counting participants");
    }
    return count || 0;
  }

  async updateSocketId(roomId, userId, socketId) {
    const { error } = await supabase
      .from("participants")
      .update({
        socket_id: socketId,
        is_connected: true,
        disconnected_at: null,
      })
      .eq("room_id", roomId)
      .eq("user_id", userId);

    if (error) {
      logger.error(
        { error, roomId, userId },
        "ParticipantRepository.updateSocketId failed",
      );
      throw new Error("Database error updating socket ID");
    }
  }

  async markDisconnected(roomId, userId) {
    const { error } = await supabase
      .from("participants")
      .update({
        is_connected: false,
        disconnected_at: new Date().toISOString(),
      })
      .eq("room_id", roomId)
      .eq("user_id", userId);

    if (error) {
      logger.error(
        { error, roomId, userId },
        "ParticipantRepository.markDisconnected failed",
      );
      throw new Error("Database error marking disconnected");
    }
  }

  async markDisconnectedBySocket(userId, roomId, socketId) {
    const { error } = await supabase
      .from("participants")
      .update({
        is_connected: false,
        disconnected_at: new Date().toISOString(),
      })
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .eq("socket_id", socketId);

    if (error) {
      logger.error(
        { error, roomId, userId, socketId },
        "ParticipantRepository.markDisconnectedBySocket failed",
      );
      throw new Error("Database error marking disconnected");
    }
  }

  async getParticipantRooms(socketId) {
    const { data, error } = await supabase
      .from("participants")
      .select("room_id, user_id")
      .eq("socket_id", socketId)
      .eq("is_connected", true);

    if (error) {
      logger.error(
        { error, socketId },
        "ParticipantRepository.getParticipantRooms failed",
      );
      return [];
    }
    return data || [];
  }

  async removeAllInRoom(roomId) {
    const { error } = await supabase
      .from("participants")
      .delete()
      .eq("room_id", roomId);

    if (error) {
      logger.error(
        { error, roomId },
        "ParticipantRepository.removeAllInRoom failed",
      );
      throw new Error("Database error removing participants");
    }
  }

  async deleteParticipant(roomId, userId) {
    const { error } = await supabase
      .from("participants")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", userId);

    if (error) {
      logger.error(
        { error, roomId, userId },
        "ParticipantRepository.deleteParticipant failed",
      );
      throw new Error("Database error deleting participant");
    }
  }

  async updateParticipant(roomId, userId, updates) {
    const { data, error } = await supabase
      .from("participants")
      .update(updates)
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      logger.error(
        { error, roomId, userId, updates },
        "ParticipantRepository.updateParticipant failed",
      );
      throw new Error("Database error updating participant");
    }
    return data;
  }
}

export const participantRepository = new ParticipantRepository();
