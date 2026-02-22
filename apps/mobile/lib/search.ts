import { supabase } from "@/lib/supabase";
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

const MOCK_ACCOUNTS: SearchAccount[] = [
  {
    id: "1",
    display_name: "Sarah Chen",
    username: "sarahchen",
    avatar_url: null,
    bio: "Building the future of fintech | YC W23",
  },
  {
    id: "2",
    display_name: "Alex Rivera",
    username: "arivera",
    avatar_url: null,
    bio: "Serial entrepreneur & angel investor",
  },
  {
    id: "3",
    display_name: "Priya Sharma",
    username: "priyasharma",
    avatar_url: null,
    bio: "AI/ML engineer turned founder | Ex-Google",
  },
  {
    id: "4",
    display_name: "James Wu",
    username: "jameswu",
    avatar_url: null,
    bio: "YC alum, scaling B2B SaaS to $10M ARR",
  },
  {
    id: "5",
    display_name: "Maria Garcia",
    username: "mariagarcia",
    avatar_url: null,
    bio: "Founder @ FlowHQ | SaaS metrics expert",
  },
  {
    id: "6",
    display_name: "David Kim",
    username: "davidkim",
    avatar_url: null,
    bio: "Building in public | 3x founder",
  },
];

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

function searchAccountsFromMock(query: string): SearchAccount[] {
  const q = query.toLowerCase();
  return MOCK_ACCOUNTS.filter(
    (a) =>
      a.display_name.toLowerCase().includes(q) ||
      a.username.toLowerCase().includes(q) ||
      (a.bio && a.bio.toLowerCase().includes(q))
  );
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
    Promise.resolve(searchAccountsFromMock(trimmed)),
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
