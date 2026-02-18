/**
 * Tribe Service API Client
 * Typed fetch wrapper for all tribe-service endpoints.
 *
 * Backend response shapes:
 *   Success  → { data: T }
 *   Fail     → { status: "fail", message: "...", errors: [...] }   (Zod)
 *   Error    → { status: "error", message: "..." }                 (AppError)
 */

const BASE_URL =
    process.env.EXPO_PUBLIC_TRIBE_API_URL || "http://192.168.1.4:3003";

/* ------------------------------------------------------------------ */
/*  Generic request helper                                            */
/* ------------------------------------------------------------------ */

type RequestOptions = {
    method?: string;
    body?: any;
    token?: string;
};

async function request<T = any>(
    path: string,
    opts: RequestOptions = {},
): Promise<T> {
    const { method = "GET", body, token } = opts;
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const url = `${BASE_URL}${path}`;
    console.log(`[tribeApi] ${method} ${url}`);

    const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    // 204 No Content
    if (res.status === 204) return null as T;

    const json = await res.json();

    if (!res.ok) {
        // Build readable error from backend response
        const msg =
            json?.error?.message || json?.message || `API error ${res.status}`;
        const zodErrors = json?.errors
            ? ` → ${json.errors.map((e: any) => `${e.path?.join(".")}: ${e.message}`).join(", ")}`
            : "";
        throw new Error(msg + zodErrors);
    }

    return json.data ?? json;
}

/* ------------------------------------------------------------------ */
/*  Tribes                                                            */
/* ------------------------------------------------------------------ */

export const getPublicTribes = (
    token: string,
    cursor?: string,
    limit = 20,
) =>
    request<any[]>(
        `/api/tribes?limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`,
        { token },
    );

/**
 * Returns RAW tribe_member rows: { tribe_id, role, joined_at, tribes: {...} }
 * Use `getMyTribesFlat()` for a flat array of tribe objects with roles.
 */
export const getMyTribesRaw = (token: string) =>
    request<any[]>("/api/tribes/me", { token });

/**
 * Unwraps the nested tribe_member response into flat tribe objects
 * with `role` and `joined_at` merged in.
 */
export const getMyTribes = async (token: string): Promise<any[]> => {
    const raw = await getMyTribesRaw(token);
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((row) => row.tribes && !row.tribes.deleted_at)
        .map((row) => ({
            ...row.tribes,
            role: row.role,
            joined_at: row.joined_at,
        }));
};

export const searchTribes = (
    token: string,
    query: string,
    limit = 20,
) =>
    request<any[]>(
        `/api/tribes/search?q=${encodeURIComponent(query)}&limit=${limit}`,
        { token },
    );

export const getTribe = (token: string, tribeId: string) =>
    request<any>(`/api/tribes/${tribeId}`, { token });

export const createTribe = (
    token: string,
    data: { name: string; description?: string; is_public?: boolean },
) => request<any>("/api/tribes", { method: "POST", body: data, token });

export const updateTribe = (
    token: string,
    tribeId: string,
    data: { name?: string; description?: string; is_public?: boolean },
) =>
    request<any>(`/api/tribes/${tribeId}`, {
        method: "PATCH",
        body: data,
        token,
    });

export const deleteTribe = (token: string, tribeId: string) =>
    request<void>(`/api/tribes/${tribeId}`, { method: "DELETE", token });

/* ------------------------------------------------------------------ */
/*  Tribe Members                                                     */
/* ------------------------------------------------------------------ */

export const joinTribe = (token: string, tribeId: string) =>
    request<any>(`/api/tribes/${tribeId}/join`, { method: "POST", token });

export const leaveTribe = (token: string, tribeId: string) =>
    request<void>(`/api/tribes/${tribeId}/leave`, { method: "POST", token });

/**
 * Returns member rows with nested profile:
 * { id, tribe_id, user_id, role, joined_at, profiles: { id, username, display_name, avatar_url } }
 */
export const getTribeMembers = (
    token: string,
    tribeId: string,
    cursor?: string,
    limit = 50,
) =>
    request<any[]>(
        `/api/tribes/${tribeId}/members?limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`,
        { token },
    );

export const changeRole = (
    token: string,
    tribeId: string,
    userId: string,
    role: "admin" | "moderator" | "member",
) =>
    request<any>(`/api/tribes/${tribeId}/members/${userId}/role`, {
        method: "PATCH",
        body: { role },
        token,
    });

export const removeMember = (
    token: string,
    tribeId: string,
    userId: string,
) =>
    request<void>(`/api/tribes/${tribeId}/members/${userId}`, {
        method: "DELETE",
        token,
    });

/* ------------------------------------------------------------------ */
/*  Groups / Channels                                                 */
/* ------------------------------------------------------------------ */

export const getGroups = (token: string, tribeId: string) =>
    request<any[]>(`/api/tribes/${tribeId}/groups`, { token });

/** Public preview of groups — no membership required */
export const getGroupsPublic = (token: string, tribeId: string) =>
    request<any[]>(`/api/tribes/${tribeId}/groups/public`, { token });

export const getGroup = (token: string, tribeId: string, groupId: string) =>
    request<any>(`/api/tribes/${tribeId}/groups/${groupId}`, { token });

export const createGroup = (
    token: string,
    tribeId: string,
    data: { name: string; description?: string },
) =>
    request<any>(`/api/tribes/${tribeId}/groups`, {
        method: "POST",
        body: data,
        token,
    });

export const updateGroup = (
    token: string,
    tribeId: string,
    groupId: string,
    data: { name?: string; description?: string },
) =>
    request<any>(`/api/tribes/${tribeId}/groups/${groupId}`, {
        method: "PATCH",
        body: data,
        token,
    });

export const deleteGroup = (
    token: string,
    tribeId: string,
    groupId: string,
) =>
    request<void>(`/api/tribes/${tribeId}/groups/${groupId}`, {
        method: "DELETE",
        token,
    });

export const getGroupMembers = (
    token: string,
    tribeId: string,
    groupId: string,
    cursor?: string,
    limit = 50,
) =>
    request<any[]>(
        `/api/tribes/${tribeId}/groups/${groupId}/members?limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`,
        { token },
    );

export const joinGroup = (
    token: string,
    tribeId: string,
    groupId: string,
) =>
    request<any>(`/api/tribes/${tribeId}/groups/${groupId}/join`, {
        method: "POST",
        token,
    });

export const leaveGroup = (
    token: string,
    groupId: string,
) =>
    request<void>(`/api/groups/${groupId}/leave`, {
        method: "POST",
        token,
    });

/* ------------------------------------------------------------------ */
/*  Messages                                                          */
/*  Backend returns: { messages, next_cursor, has_more }              */
/* ------------------------------------------------------------------ */

export const getMessages = (
    token: string,
    groupId: string,
    cursor?: string,
    limit = 50,
) =>
    request<{ messages: any[]; next_cursor: string | null; has_more: boolean }>(
        `/api/groups/${groupId}/messages?limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`,
        { token },
    );

export const sendMessage = (
    token: string,
    groupId: string,
    data: {
        content?: string;
        type?: string;
        media_url?: string;
        media_metadata?: any;
        reply_to_id?: string;
    },
) =>
    request<any>(`/api/groups/${groupId}/messages`, {
        method: "POST",
        body: data,
        token,
    });

export const editMessage = (
    token: string,
    groupId: string,
    messageId: string,
    content: string,
) =>
    request<any>(`/api/groups/${groupId}/messages/${messageId}`, {
        method: "PATCH",
        body: { content },
        token,
    });

export const deleteMessage = (
    token: string,
    groupId: string,
    messageId: string,
) =>
    request<void>(`/api/groups/${groupId}/messages/${messageId}`, {
        method: "DELETE",
        token,
    });

/* ------------------------------------------------------------------ */
/*  Reactions                                                         */
/* ------------------------------------------------------------------ */

export const addReaction = (
    token: string,
    groupId: string,
    messageId: string,
    emoji: string,
) =>
    request<any>(
        `/api/groups/${groupId}/messages/${messageId}/reactions`,
        { method: "POST", body: { emoji }, token },
    );

export const removeReaction = (
    token: string,
    groupId: string,
    messageId: string,
    emoji: string,
) =>
    request<void>(
        `/api/groups/${groupId}/messages/${messageId}/reactions`,
        { method: "DELETE", body: { emoji }, token },
    );

export const getReactions = (
    token: string,
    groupId: string,
    messageId: string,
) =>
    request<any[]>(
        `/api/groups/${groupId}/messages/${messageId}/reactions`,
        { token },
    );

/* ------------------------------------------------------------------ */
/*  Invites                                                           */
/*  Schema: body { max_uses?: number, expires_at?: ISO datetime }     */
/* ------------------------------------------------------------------ */

export const createInvite = (
    token: string,
    tribeId: string,
    opts?: { max_uses?: number; expires_at?: string },
) =>
    request<any>(`/api/tribes/${tribeId}/invites`, {
        method: "POST",
        body: opts || {},
        token,
    });

export const getInvites = (token: string, tribeId: string) =>
    request<any[]>(`/api/tribes/${tribeId}/invites`, { token });

export const revokeInvite = (
    token: string,
    tribeId: string,
    inviteId: string,
) =>
    request<void>(`/api/tribes/${tribeId}/invites/${inviteId}`, {
        method: "DELETE",
        token,
    });

export const redeemInvite = (token: string, code: string) =>
    request<any>(`/api/invites/${code}/redeem`, {
        method: "POST",
        token,
    });

/* ------------------------------------------------------------------ */
/*  Read Receipts                                                     */
/* ------------------------------------------------------------------ */

export const markAsRead = (
    token: string,
    groupId: string,
    lastReadMsgId: string,
) =>
    request<any>(`/api/groups/${groupId}/messages/read`, {
        method: "POST",
        body: { last_read_msg_id: lastReadMsgId },
        token,
    });

/* ------------------------------------------------------------------ */
/*  Moderation                                                        */
/* ------------------------------------------------------------------ */

export const banUser = (
    token: string,
    tribeId: string,
    userId: string,
    reason?: string,
) =>
    request<any>(`/api/moderation/${tribeId}/bans`, {
        method: "POST",
        body: { user_id: userId, reason },
        token,
    });

export const unbanUser = (
    token: string,
    tribeId: string,
    userId: string,
) =>
    request<void>(`/api/moderation/${tribeId}/bans/${userId}`, {
        method: "DELETE",
        token,
    });

export const getBans = (token: string, tribeId: string) =>
    request<any[]>(`/api/moderation/${tribeId}/bans`, { token });

export const getAuditLogs = (
    token: string,
    tribeId: string,
    cursor?: string,
    limit = 50,
) =>
    request<any[]>(
        `/api/moderation/${tribeId}/audit?limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`,
        { token },
    );

/* ------------------------------------------------------------------ */
/*  Profiles                                                          */
/* ------------------------------------------------------------------ */

export const getMyProfile = (token: string) =>
    request<any>("/api/profiles/me", { token });

export const updateMyProfile = (token: string, data: Record<string, any>) =>
    request<any>("/api/profiles/me", { method: "PATCH", body: data, token });

export const getPublicProfile = (token: string, userId: string) =>
    request<any>(`/api/profiles/${userId}`, { token });
