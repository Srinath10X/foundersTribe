import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

export class RoomRepository {
    async createRoom(hostId, title, type) {
        const { data, error } = await supabase
            .from('rooms')
            .insert({ title, host_id: hostId, type })
            .select()
            .single();

        if (error) {
            logger.error({ error }, 'RoomRepository.createRoom failed');
            throw new Error('Database error creating room');
        }
        return data;
    }

    async getRoomById(roomId) {
        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', roomId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            logger.error({ error, roomId }, 'RoomRepository.getRoomById failed');
            throw new Error('Database error fetching room');
        }
        return data;
    }

    async updateRoomStatus(roomId, isActive) {
        const { error } = await supabase
            .from('rooms')
            .update({ is_active: isActive })
            .eq('id', roomId);

        if (error) {
            logger.error({ error, roomId }, 'RoomRepository.updateRoomStatus failed');
            throw new Error('Database error updating room status');
        }
    }

    async getActiveRooms() {
        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error({ error }, 'RoomRepository.getActiveRooms failed');
            throw new Error('Database error fetching active rooms');
        }
        return data || [];
    }
}

export const roomRepository = new RoomRepository();
