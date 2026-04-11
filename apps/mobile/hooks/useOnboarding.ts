/**
 * ============================================================
 * REACT QUERY HOOKS - Data fetching hooks for Onboarding
 * ============================================================
 *
 * Query Key Convention:
 * - ["onboarding", "categories"]     - all categories from Articles
 * - ["onboarding", "interests"]      - current user's selected interests
 * - ["onboarding", "profile"]        - current user's profile
 * ============================================================
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import * as tribeApi from "@/lib/tribeApi";
import { useAuth } from "@/context/AuthContext";

// ============================================================
// TYPES
// ============================================================

export type Category = {
  id: string;
  label: string;
  image: string;
};

// ============================================================
// QUERY KEYS
// ============================================================

export const onboardingQueryKeys = {
  all: ["onboarding"] as const,
  categories: () => ["onboarding", "categories"] as const,
  interests: (userId?: string) => ["onboarding", "interests", userId] as const,
  profile: (token?: string) => ["onboarding", "profile", token] as const,
};

// ============================================================
// FETCHERS
// ============================================================

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1557683311-eac922347aa1";

async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("Articles")
    .select('Category, "Image URL"')
    .not("Category", "is", null)
    .order("Category");

  if (error) throw error;

  if (!data || data.length === 0) return [];

  const categoryMap = new Map<string, string>();
  data.forEach((item) => {
    const categoryName =
      typeof item.Category === "string" ? item.Category.trim() : "";
    if (!categoryName) return;

    const imageUrl =
      typeof item["Image URL"] === "string" ? item["Image URL"].trim() : "";

    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, imageUrl || DEFAULT_IMAGE);
      return;
    }

    if (imageUrl && categoryMap.get(categoryName) === DEFAULT_IMAGE) {
      categoryMap.set(categoryName, imageUrl);
    }
  });

  return Array.from(categoryMap.entries()).map(([cat, img]) => ({
    id: cat.toLowerCase().replace(/\s+/g, "_"),
    label: cat,
    image: img,
  }));
}

async function fetchUserInterests(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_interests")
    .select("category")
    .eq("user_id", userId);

  if (error) throw error;

  if (!data) return [];

  return data.map((item) =>
    item.category.toLowerCase().replace(/ /g, "_"),
  );
}

// ============================================================
// HOOKS
// ============================================================

/**
 * Fetch all available categories for interest selection
 */
export function useCategories() {
  return useQuery<Category[], Error>({
    queryKey: onboardingQueryKeys.categories(),
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch the current user's selected interests
 */
export function useUserInterests(userId?: string) {
  return useQuery<string[], Error>({
    queryKey: onboardingQueryKeys.interests(userId),
    queryFn: () => fetchUserInterests(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch the current user's profile for preloading onboarding fields
 */
export function useMyProfile(token?: string) {
  return useQuery({
    queryKey: onboardingQueryKeys.profile(token),
    queryFn: () => tribeApi.getMyProfile(token!),
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Mutation to update the user's profile (role, bio, etc.)
 */
export function useUpdateProfile(token?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, any>) =>
      tribeApi.updateMyProfile(token!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: onboardingQueryKeys.profile(token),
      });
    },
  });
}

/**
 * Mutation to save user interests (delete all then insert new ones)
 */
export function useSaveInterests() {
  const { user, refreshOnboardingStatus } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (interests: { category: string }[]) => {
      if (!user) throw new Error("Not authenticated");

      const del = await supabase
        .from("user_interests")
        .delete()
        .eq("user_id", user.id);
      if (del.error) throw del.error;

      const interestsData = interests.map((i) => ({
        user_id: user.id,
        category: i.category,
      }));

      const ins = await supabase
        .from("user_interests")
        .insert(interestsData);
      if (ins.error) throw ins.error;

      await refreshOnboardingStatus();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: onboardingQueryKeys.interests(user?.id),
      });
    },
  });
}
