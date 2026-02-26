/**
 * Search type definitions.
 *
 * All search logic now lives in `search.ts` which queries real data
 * from the `profiles` and `tribes` Supabase tables. This file only
 * exports the shared type interfaces consumed by `search.ts` and
 * the search UI components.
 */

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
