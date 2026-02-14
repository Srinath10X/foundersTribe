import { z } from 'zod';

export const createRoomSchema = z.object({
    body: z.object({
        title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
        type: z.enum(['public', 'private']).optional().default('public'),
    }),
});

export const joinRoomSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid room ID').optional(),
    }),
});
