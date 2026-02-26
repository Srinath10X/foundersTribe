import { useInfiniteQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

const STORAGE_BUCKET = "tribe-media";

/**
 * User data sourced from the `profiles` table (tribe-service).
 * Only contains user-set data — never OAuth / Google profile data.
 */
export type PeopleUser = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export type PaginatedUsers = {
  items: PeopleUser[];
  next_cursor: string | null;
};

const PAGE_SIZE_DEFAULT = 12;

export const userQueryKeys = {
  all: ["users"] as const,
  infinite: (limit?: number) => ["users", "infinite", { limit }] as const,
};

/**
 * Resolve a single avatar value to a usable URL.
 * - If already a full URL → return as-is.
 * - If a storage path → generate a signed URL.
 * - Otherwise → null.
 */
async function resolveAvatarUrl(raw: string | null, userId: string): Promise<string | null> {
  if (!raw) return null;

  // Already a full URL
  if (/^https?:\/\//i.test(raw)) return raw;

  // Storage path → signed URL
  if (raw.trim()) {
    try {
      const { data } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(raw.trim(), 60 * 60 * 24 * 30); // 30 days
      if (data?.signedUrl) return `${data.signedUrl}&t=${Date.now()}`;
    } catch {
      // fall through
    }
  }

  // Fallback: check the profiles/{userId} folder for any avatar file
  if (userId) {
    try {
      const folder = `profiles/${userId}`;
      const { data: files } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(folder, { limit: 5 });

      if (Array.isArray(files) && files.length > 0) {
        const preferred = files.find((f) => /^avatar\./i.test(f.name)) || files[0];
        if (preferred?.name) {
          const { data } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(`${folder}/${preferred.name}`, 60 * 60 * 24 * 30);
          if (data?.signedUrl) return `${data.signedUrl}&t=${Date.now()}`;
        }
      }
    } catch {
      // fall through
    }
  }

  return null;
}

/**
 * Fetches users from the `profiles` table (tribe-service) with cursor-based
 * pagination using `updated_at` ordering. Resolves storage-path avatars
 * into signed URLs so images render correctly in PeopleCard.
 */
export function useInfiniteUsers(limit = PAGE_SIZE_DEFAULT) {
  return useInfiniteQuery<PaginatedUsers>({
    queryKey: userQueryKeys.infinite(limit),
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from("profiles")
        .select("id, display_name, username, photo_url, avatar_url, bio, updated_at")
        .order("updated_at", { ascending: false })
        .limit(limit);

      // Cursor-based pagination: fetch rows older than the last seen updated_at
      if (pageParam) {
        query = query.lt("updated_at", pageParam as string);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const rows = data || [];

      // Resolve all avatars in parallel (storage paths → signed URLs)
      const items: PeopleUser[] = await Promise.all(
        rows.map(async (p: any) => {
          const rawAvatar = p.photo_url || p.avatar_url || null;
          const resolvedAvatar = await resolveAvatarUrl(rawAvatar, p.id);

          return {
            id: p.id,
            display_name: p.display_name ?? null,
            username: p.username ?? null,
            avatar_url: resolvedAvatar,
            bio: p.bio ?? null,
          };
        })
      );

      // Next cursor is the updated_at of the last row (if we got a full page)
      const next_cursor =
        rows.length >= limit ? (rows[rows.length - 1] as any).updated_at : null;

      return { items, next_cursor };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
}
