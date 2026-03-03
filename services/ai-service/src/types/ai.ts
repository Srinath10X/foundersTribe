// ── Shared AI types ──────────────────────────────────────────

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  freelancers?: FreelancerResult[];
  timestamp: number;
};

export type FreelancerResult = {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  experience_level: string | null;
  hourly_rate: string | null;
  availability: string | null;
  country: string | null;
  services: {
    name: string;
    cost: string;
    delivery: string;
  }[];
  matchReason: string;
};

// ── Internal profile types ──────────────────────────────────

export type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  photo_url: string | null;
  avatar_url: string | null;
  bio: string | null;
  user_type: string | null;
  role: string | null;
  location: string | null;
  rating: number | null;
  previous_works: any[] | null;
  completed_gigs: any[] | null;
  linkedin_url: string | null;
  business_idea: string | null;
  business_ideas: any[] | null;
  social_links: Record<string, string> | null;
  contact: string | null;
};

export type UserProfile = {
  id: string;
  full_name: string | null;
  handle: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: string | null;
  experience_level: string | null;
  hourly_rate: string | null;
  availability: string | null;
  country: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
};

export type FreelancerService = {
  id: string;
  user_id: string;
  service_name: string;
  description: string | null;
  cost_amount: number;
  cost_currency: string;
  delivery_time_value: number;
  delivery_time_unit: string;
  is_active: boolean;
};
