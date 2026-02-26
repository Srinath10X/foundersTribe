import { useInfiniteQuery } from "@tanstack/react-query";

import gigService from "@/lib/gigService";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/types/gig";

export type PeopleUser = {
  id: string;
  full_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string | null;
};

export type PaginatedUsers = {
  items: PeopleUser[];
  next_cursor: string | null;
};

export const userQueryKeys = {
  all: ["users"] as const,
  infinite: (limit?: number) => ["users", "infinite", { limit }] as const,
};

export function useInfiniteUsers(limit = 12) {
  return useInfiniteQuery<PaginatedUsers>({
    queryKey: userQueryKeys.infinite(limit),
    queryFn: async ({ pageParam }) => {
      try {
        const response = await gigService.listUsers({
          cursor: pageParam as string | undefined,
          limit,
        });

        const items = (response.items || []).map((profile: UserProfile) => ({
          id: profile.id,
          full_name: profile.full_name,
          handle: profile.handle,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          role: profile.role,
        }));

        return { items, next_cursor: response.next_cursor ?? null };
      } catch (error) {
        console.warn("Falling back to direct profiles fetch:", error);
        const { data, error: dbError } = await supabase
          .from("user_profiles")
          .select("id, full_name, handle, avatar_url, bio, role, updated_at")
          .order("updated_at", { ascending: false })
          .limit(limit);

        if (dbError) {
          throw dbError;
        }

        const items = (data || []).map((profile: any) => ({
          id: profile.id,
          full_name: profile.full_name ?? null,
          handle: profile.handle ?? null,
          avatar_url: profile.avatar_url ?? null,
          bio: profile.bio ?? null,
          role: profile.role ?? null,
        }));

        return { items, next_cursor: null };
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
}
