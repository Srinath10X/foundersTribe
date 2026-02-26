import { supabase } from "@/lib/supabase";

// ─── Types ──────────────────────────────────────────────────────
export interface SearchArticle {
  id: number;
  Title: string;
  Summary: string;
  Content: string;
  "Image URL": string | null;
  "Article Link": string;
  Category: string | null;
  "Company Name": string | null;
}

export interface SearchAccount {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  user_type?: string | null;
  skills?: string[];
  rating?: number;
  hourly_rate?: number;
}

export interface SearchCommunity {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  member_count: number;
}

export interface SearchResults {
  articles: SearchArticle[];
  accounts: SearchAccount[];
  communities: SearchCommunity[];
}

// ─── Mock data (used until backend supports full search) ────────
const MOCK_ACCOUNTS: SearchAccount[] = [
  {
    id: "1",
    display_name: "Sarah Chen",
    username: "sarahchen",
    avatar_url: null,
    bio: "Building the future of fintech",
    skills: ["React", "Node.js", "TypeScript"],
    rating: 4.9,
    hourly_rate: 75,
  },
  {
    id: "2",
    display_name: "Alex Rivera",
    username: "arivera",
    avatar_url: null,
    bio: "Serial entrepreneur & investor",
    skills: ["Product Management", "Strategy", "SaaS"],
    rating: 4.8,
    hourly_rate: 120,
  },
  {
    id: "3",
    display_name: "Priya Sharma",
    username: "priyasharma",
    avatar_url: null,
    bio: "AI/ML engineer turned founder",
    skills: ["Python", "Machine Learning", "TensorFlow"],
    rating: 5.0,
    hourly_rate: 95,
  },
  {
    id: "4",
    display_name: "James Wu",
    username: "jameswu",
    avatar_url: null,
    bio: "YC alum, scaling B2B SaaS",
    skills: ["Sales", "Growth", "B2B"],
    rating: 4.7,
    hourly_rate: 150,
  },
  {
    id: "5",
    display_name: "Michael Torres",
    username: "michaeltorres",
    avatar_url: null,
    bio: "Full-stack developer with 5+ years experience",
    skills: ["Frontend Developer", "React", "Vue.js", "CSS"],
    rating: 4.8,
    hourly_rate: 60,
  },
  {
    id: "6",
    display_name: "Emma Wilson",
    username: "emmawilson",
    avatar_url: null,
    bio: "UI/UX Designer passionate about clean interfaces",
    skills: ["UI Design", "Figma", "User Research", "Frontend Developer"],
    rating: 4.9,
    hourly_rate: 55,
  },
  {
    id: "7",
    display_name: "David Kim",
    username: "davidkim",
    avatar_url: null,
    bio: "Mobile app developer specializing in React Native",
    skills: ["React Native", "Mobile Development", "iOS", "Android"],
    rating: 4.7,
    hourly_rate: 70,
  },
  {
    id: "8",
    display_name: "Lisa Johnson",
    username: "lisajohnson",
    avatar_url: null,
    bio: "Backend engineer with expertise in scalable systems",
    skills: ["Backend", "PostgreSQL", "AWS", "Docker"],
    rating: 4.8,
    hourly_rate: 80,
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
    description: "For founders building with AI",
    avatar_url: null,
    member_count: 890,
  },
  {
    id: "3",
    name: "SaaS Growth",
    description: "Strategies for scaling SaaS products",
    avatar_url: null,
    member_count: 2100,
  },
];

// ─── Search functions ───────────────────────────────────────────

async function searchArticles(query: string): Promise<SearchArticle[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

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
}

export function searchAccounts(query: string): SearchAccount[] {
  const q = query.toLowerCase();
  return MOCK_ACCOUNTS.filter(
    (a) =>
      a.display_name.toLowerCase().includes(q) ||
      a.username.toLowerCase().includes(q) ||
      (a.bio && a.bio.toLowerCase().includes(q)) ||
      (a.skills && a.skills.some((skill) => skill.toLowerCase().includes(q)))
  );
}

function searchCommunities(query: string): SearchCommunity[] {
  // TODO: Replace with supabase query when communities table is ready
  const q = query.toLowerCase();
  return MOCK_COMMUNITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
  );
}

/**
 * Search all content types. Easy to swap mock data for real API calls.
 */
export async function searchAll(query: string): Promise<SearchResults> {
  const [articles, accounts, communities] = await Promise.all([
    searchArticles(query),
    Promise.resolve(searchAccounts(query)),
    Promise.resolve(searchCommunities(query)),
  ]);

  return { articles, accounts, communities };
}
