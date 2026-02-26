import { supabase } from "@/lib/supabase";
import gigService from "@/lib/gigService";
import { SearchArticle, SearchAccount, SearchCommunity } from "./searchService";

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

const MOCK_COMMUNITIES: SearchCommunity[] = [
  {
    id: "1",
    name: "Fintech Founders",
    description: "Discuss payments, lending, and financial infrastructure",
    avatar_url: null,
    member_count: 1240,
  },
  {
    id: "2",
    name: "AI Builders",
    description: "For founders building with AI/ML technologies",
    avatar_url: null,
    member_count: 890,
  },
  {
    id: "3",
    name: "SaaS Growth",
    description: "Strategies for scaling SaaS products to $1M+ ARR",
    avatar_url: null,
    member_count: 2100,
  },
  {
    id: "4",
    name: "Bootstrapped Founders",
    description: "Building profitable businesses without VC funding",
    avatar_url: null,
    member_count: 567,
  },
  {
    id: "5",
    name: "Indie Hackers",
    description: "Launching side projects and validating ideas",
    avatar_url: null,
    member_count: 3200,
  },
];

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
    const response = await gigService.listUsers({ q: trimmed, limit: 20 });
    return (response.items || []).map((profile) => ({
      id: profile.id,
      display_name: profile.full_name || "User",
      username: profile.handle || "user",
      avatar_url: profile.avatar_url || null,
      bio: profile.bio || null,
      user_type: profile.role || null,
    }));
  } catch (error) {
    console.warn("API account search failed, falling back to Supabase:", error);
    try {
      const { data, error: dbError } = await supabase
        .from("user_profiles")
        .select("id, full_name, handle, avatar_url, bio, role")
        .or(
          `full_name.ilike.%${trimmed}%,handle.ilike.%${trimmed}%,bio.ilike.%${trimmed}%`
        )
        .order("updated_at", { ascending: false })
        .limit(20);

      if (dbError) {
        console.error("Supabase account search fallback error:", dbError);
        return [];
      }

      return (data || []).map((profile: any) => ({
        id: profile.id,
        display_name: profile.full_name || "User",
        username: profile.handle || "user",
        avatar_url: profile.avatar_url || null,
        bio: profile.bio || null,
        user_type: profile.role || null,
      }));
    } catch (fallbackError) {
      console.error("Account search fallback error:", fallbackError);
      return [];
    }
  }
}

function searchCommunitiesFromMock(query: string): SearchCommunity[] {
  const q = query.toLowerCase();
  return MOCK_COMMUNITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
  );
}

export async function searchAll(query: string): Promise<SearchResults> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { top: [], articles: [], accounts: [], communities: [] };
  }

  const [articles, accounts, communities] = await Promise.all([
    searchArticlesFromDb(trimmed),
    searchAccountsFromApi(trimmed),
    Promise.resolve(searchCommunitiesFromMock(trimmed)),
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
