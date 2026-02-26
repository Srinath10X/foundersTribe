import { supabase } from "@/lib/supabase";
import { SearchArticle, SearchAccount, SearchCommunity } from "./searchService";

const STORAGE_BUCKET = "tribe-media";

/**
 * Resolve a raw avatar value (storage path or URL) to a usable URL.
 */
async function resolveAvatarUrl(raw: string | null, userId: string): Promise<string | null> {
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.trim()) {
    try {
      const { data } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(raw.trim(), 60 * 60 * 24 * 30);
      if (data?.signedUrl) return `${data.signedUrl}&t=${Date.now()}`;
    } catch { /* fall through */ }
  }
  return null;
}

export type { SearchArticle, SearchAccount, SearchCommunity };

export interface SearchResults {
  top: (SearchArticle | SearchAccount | SearchCommunity)[];
  articles: SearchArticle[];
  accounts: SearchAccount[];
  communities: SearchCommunity[];
}

export interface SearchCounts {
  top: number;
  accounts: number;
  articles: number;
  communities: number;
}


async function searchCommunitiesFromDb(query: string): Promise<SearchCommunity[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const { data, error } = await supabase
      .from("tribes")
      .select("id, name, description, avatar_url, member_count")
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      .order("member_count", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Community search error:", error);
      return [];
    }

    return Promise.all(
      (data || []).map(async (t: any) => {
        const resolvedAvatar = await resolveAvatarUrl(t.avatar_url || null, t.id);
        return {
          id: t.id,
          name: t.name || "Community",
          description: t.description || null,
          avatar_url: resolvedAvatar,
          member_count: t.member_count || 0,
        };
      })
    );
  } catch (err) {
    console.error("Community search error:", err);
    return [];
  }
}

async function searchArticlesFromDb(query: string): Promise<SearchArticle[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const { data, error } = await supabase
      .from("Articles")
      .select(
        'id, Title, Summary, Content, "Image URL", "Article Link", Category, "Company Name"'
      )
      .or(
        `Title.ilike.%${trimmed}%,Summary.ilike.%${trimmed}%,Content.ilike.%${trimmed}%`
      )
      .order("id", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Article search error:", error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error("Article search error:", error);
    return [];
  }
}

async function searchAccountsFromApi(query: string): Promise<SearchAccount[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    // Query the profiles table (tribe-service) which has user-edited data
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, username, photo_url, avatar_url, bio")
      .or(
        `display_name.ilike.%${trimmed}%,username.ilike.%${trimmed}%,bio.ilike.%${trimmed}%`
      )
      .order("updated_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Profile search error:", error);
      return [];
    }

    // Resolve avatars (storage paths → signed URLs) in parallel
    return Promise.all(
      (data || []).map(async (profile: any) => {
        const rawAvatar = profile.photo_url || profile.avatar_url || null;
        const resolvedAvatar = await resolveAvatarUrl(rawAvatar, profile.id);

        return {
          id: profile.id,
          display_name: profile.display_name || profile.username || "User",
          username: profile.username || "user",
          avatar_url: resolvedAvatar,
          bio: profile.bio || null,
          user_type: null,
        };
      })
    );
  } catch (error) {
    console.error("Account search error:", error);
    return [];
  }
}

export async function searchAll(query: string): Promise<SearchResults> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { top: [], articles: [], accounts: [], communities: [] };
  }

  const [articles, accounts, communities] = await Promise.all([
    searchArticlesFromDb(trimmed),
    searchAccountsFromApi(trimmed),
    searchCommunitiesFromDb(trimmed),
  ]);

  const top: (SearchArticle | SearchAccount | SearchCommunity)[] = [
    ...articles.slice(0, 5),
    ...accounts.slice(0, 3),
    ...communities.slice(0, 2),
  ].slice(0, 10);

  return { top, articles, accounts, communities };
}

export function getSearchCounts(results: SearchResults): SearchCounts {
  return {
    top: results.top.length,
    accounts: results.accounts.length,
    articles: results.articles.length,
    communities: results.communities.length,
  };
}
