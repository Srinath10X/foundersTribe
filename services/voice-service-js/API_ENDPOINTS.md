# Voice Service API Endpoints

This document lists the REST API endpoints and Socket.IO events implemented in this service, their HTTP/transport type, and a short description of what they do.

## REST Endpoints (Express)

- **GET /api/health/**: Health check. Returns service health and downstream checks (supabase). Responds 200 when healthy, 503 when degraded.

- **GET /api/get_all_available_rooms** (auth required): Returns an array of active rooms with `participant_count` for each room.

- **POST /api/create_room** (auth required, body validated): Creates a new room. Body parameters: `title` (string), optional `type` (`public` or `private`). Returns created `room`, `participant` (host), and a `livekitToken`. Responds 201 on success.

- **GET /api/:id** (auth required): Returns the state for the room with id `:id`, including the `room` object and current connected `participants`.

- **GET /api/:id/messages** (auth required): Returns paginated chat messages for room `:id`. Query params: `cursor` (for pagination), `limit` (default 50, max 100). Response includes `messages` and `nextCursor` when available.

Notes:
- All REST routes are mounted under `/api` in `src/index.js`.
- `authMiddleware` protects the `/api` routes (see `src/routes/rooms.js`).

## Socket.IO Events (real-time API)

Socket server is configured in `src/index.js` and handlers live in `src/socket/handlers.js`. Socket auth uses `socketAuthMiddleware`. Many events are rate-limited.

- **create_room** (emit, callback): Create a new room (similar to POST /api/create_room). Request data: `{ title, type }`. On success, server joins socket to the room, emits `room_created` to all, and returns `{ room, participant, livekitToken }` via callback.

- **join_room** (emit, callback): Join an existing room. Request data: `{ roomId }`. On success the server joins the socket to the room, emits `participant_joined` to room, `room_updated` to all, and returns `{ room, participant, livekitToken, participants, messages }`.

- **leave_room** (emit, callback): Leave a room. Request data: `{ roomId }`. Server marks participant disconnected, emits `participant_left` to room and `room_updated` to all.

- **end_room** (emit, callback): End a room (host only). Request data: `{ roomId }`. Server marks room inactive, emits `room_ended` to room and `room_removed` to all, and forces sockets to leave the room.

- **request_mic** (emit, callback): Request microphone from hosts. Request data: `{ roomId }`. Server forwards `mic_requested` to host sockets.

- **grant_mic** (emit, callback): Grant mic to a participant. Request data: `{ targetId, roomId }`. Server updates participant role, sends `mic_granted` to the target socket with a new `livekitToken`, and emits `participant_updated` to room.

- **revoke_mic** (emit, callback): Revoke mic from a participant. Request data: `{ targetId, roomId }`. Similar to `grant_mic`, emits `mic_revoked` and `participant_updated`.

- **promote_user** (emit, callback): Promote a participant's role (e.g., to co-host/speaker). Request data: `{ targetId, roomId, role }`. Emits `role_changed` to target (plus `livekitToken` if applicable) and `participant_updated` to room.

- **demote_user** (emit, callback): Demote a participant's role. Request data: `{ targetId, roomId }`. Emits `role_changed` and `participant_updated`.

- **remove_user** (emit, callback): Remove a participant from a room. Request data: `{ targetId, roomId }`. Server emits `removed_from_room` to the target, `participant_left` to the room, and forces the target socket to leave.

- **send_message** (emit, callback): Send a chat message to the room. Request data: `{ roomId, content }`. Server validates message, stores it, then emits `receive_message` to the room and returns the created message via callback.

- **restore_room_state** (emit, callback): Reconnect flow to restore a participant after a transient disconnect. Request data: `{ roomId, lastMessageAt }`. Server re-joins socket to the room, returns `room`, `participants`, `missedMessages`, and possibly a `livekitToken`.

- **disconnect** (socket lifecycle event): On disconnect the server marks the participant disconnected, emits `participant_disconnected` and starts a grace period before removing participant and possibly destroying the room if empty.

Notes on sockets:
- Socket events use callbacks for success/failure: successful responses are returned via the callback with `{ success: true, data }`, failures via `{ success: false, error }`.
- Many socket events apply `socketRateLimit` to prevent abuse. The reconnect flow uses `gracePeriod` handling to allow temporary disconnects.

## Where to look in code

- REST: [src/index.js](src/index.js) mounts the routers; [src/routes/rooms.js](src/routes/rooms.js) and [src/routes/health.js](src/routes/health.js) contain route handlers.
- Socket events: [src/socket/handlers.js](src/socket/handlers.js).
- Business logic: [src/services/*.js] — e.g. `roomService.js`, `chatService.js`, `participantService.js`.

If you want, I can also generate an OpenAPI/Swagger spec for the REST endpoints.
