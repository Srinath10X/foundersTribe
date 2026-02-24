// ============================================================
// GIG TYPES - Domain models for the gig marketplace
// Aligned with backend schemas at services/gig-marketplace-service/src/db/schema.ts
// ============================================================

// ------------------------------------------
// Enums
// ------------------------------------------

export type GigStatus = "draft" | "open" | "in_progress" | "completed" | "cancelled";
export type BudgetType = "fixed" | "hourly";
export type ExperienceLevel = "junior" | "mid" | "senior";
export type StartupStage = "idea" | "mvp" | "revenue" | "funded";

export type ContractStatus = "active" | "completed" | "cancelled" | "disputed";
export type MessageType = "text" | "file" | "system";

export type ProposalStatus = "pending" | "shortlisted" | "accepted" | "rejected" | "withdrawn";

export type UserRole = "founder" | "freelancer" | "both";
export type AvailabilityStatus = "open" | "busy" | "inactive";
export type Gender = "male" | "female" | "non_binary" | "prefer_not_to_say" | "other";
export type NotificationType = "new_proposal" | "proposal_accepted" | "message" | "contract_completed";

// ------------------------------------------
// User/Profile Types
// ------------------------------------------

/** Minimal founder info embedded in gig joins */
export interface GigFounder {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  handle: string | null;
}

/** Full user profile matching user_profiles table */
export interface UserProfile {
  id: string;
  handle: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  availability: AvailabilityStatus;
  experience_level: ExperienceLevel | null;
  startup_stage: StartupStage | null;
  hourly_rate: string | null; // numeric(12,2) returned as string from Supabase
  country: string | null;
  timezone: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  gender: Gender | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfileUpsertInput {
  handle?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  role?: UserRole;
  availability?: AvailabilityStatus;
  experience_level?: ExperienceLevel | null;
  startup_stage?: StartupStage | null;
  hourly_rate?: number | null;
  country?: string | null;
  timezone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  date_of_birth?: string | null;
  gender?: Gender | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
}

// ------------------------------------------
// Tag Types
// ------------------------------------------

export interface Tag {
  id: string;
  slug: string;
  label: string;
}

export interface GigTag {
  tag_id: string;
  tags: Tag;
}

// ------------------------------------------
// Gig Types
// ------------------------------------------

export interface Gig {
  // Core fields
  id: string;
  founder_id: string;
  title: string;
  description: string;
  budget_type: BudgetType;
  budget_min: number;
  budget_max: number;
  experience_level: ExperienceLevel;
  startup_stage?: StartupStage;
  is_remote: boolean;
  location_text?: string;
  status: GigStatus;
  proposals_count: number;
  published_at?: string;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  founder?: GigFounder;
  gig_tags?: GigTag[];
  
  // Legacy / UI convenience (for backward compatibility)
  budget?: number;
  deadline?: string;
  progress?: number;
}

export interface GigCreateInput {
  title: string;
  description: string;
  budget_type: BudgetType;
  budget_min: number;
  budget_max: number;
  experience_level: ExperienceLevel;
  startup_stage?: StartupStage;
  is_remote: boolean;
  location_text?: string;
  status?: GigStatus;
  tags?: string[];
}

export interface GigUpdateInput {
  title?: string;
  description?: string;
  budget_type?: BudgetType;
  budget_min?: number;
  budget_max?: number;
  experience_level?: ExperienceLevel;
  startup_stage?: StartupStage;
  is_remote?: boolean;
  location_text?: string;
  status?: GigStatus;
  tags?: string[];
}

// ------------------------------------------
// Filter & Query Types
// ------------------------------------------

export interface GigFilters {
  status?: GigStatus;
  budget_type?: BudgetType;
  experience_level?: ExperienceLevel;
  startup_stage?: StartupStage;
  tag?: string;
  budget_min?: string;
  budget_max?: string;
  founder_id?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  next_cursor: string | null;
}

export type PaginatedGigs = PaginatedResponse<Gig>;

// ------------------------------------------
// Stats Types
// ------------------------------------------

export interface FreelancerStats {
  earnings_mtd: number;
  active_projects: number;
  earnings_growth_pct?: number;
  total_earnings?: number;
  completed_projects?: number;
  rating?: number;
}

// ------------------------------------------
// Contract Types
// ------------------------------------------

export interface Contract {
  id: string;
  gig_id: string;
  proposal_id: string;
  founder_id: string;
  freelancer_id: string;
  status: ContractStatus;
  freelancer_marked_complete: boolean;
  founder_approved: boolean;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined fields (optional)
  gig?: Gig;
  founder?: GigFounder;
  freelancer?: UserProfile;
}

export interface ContractFilters {
  status?: ContractStatus;
  limit?: number;
  cursor?: string;
}

export type PaginatedContracts = PaginatedResponse<Contract>;

// ------------------------------------------
// Message Types
// ------------------------------------------

export interface ContractMessage {
  id: string;
  contract_id: string;
  sender_id: string;
  recipient_id: string | null;
  message_type: MessageType;
  body: string | null;
  file_url: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
  updated_at?: string;
  
  // Joined fields
  sender?: UserProfile;
}

export interface MessageCreateInput {
  recipient_id?: string;
  message_type: MessageType;
  body?: string;
  file_url?: string;
  metadata?: Record<string, unknown>;
}

export interface MessageListParams {
  limit?: number;
  cursor?: string;
}

export type PaginatedMessages = PaginatedResponse<ContractMessage>;

// ------------------------------------------
// Proposal Types (aligned with backend)
// ------------------------------------------

export interface Proposal {
  id: string;
  gig_id: string;
  freelancer_id: string;
  cover_letter: string;
  proposed_amount: string; // numeric(12,2) returned as string from Supabase
  estimated_days: number | null;
  status: ProposalStatus;
  created_at: string;
  updated_at: string;
  
  // Joined fields (from .select("*, gigs(id, title, status)") on /proposals/me)
  gig?: Gig;
  gigs?: { id: string; title: string; status: GigStatus }; // Supabase join name
  freelancer?: UserProfile;
}

export interface ProposalCreateInput {
  cover_letter: string;
  proposed_amount: number;
  estimated_days?: number;
}

export interface ProposalFilters {
  limit?: number;
  cursor?: string;
}

export type PaginatedProposals = PaginatedResponse<Proposal>;

// ------------------------------------------
// Rating Types
// ------------------------------------------

export interface Rating {
  id: string;
  contract_id: string;
  reviewer_id: string;
  reviewee_id: string;
  score: number; // 1-5
  review_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface RatingCreateInput {
  reviewee_id: string;
  score: number; // 1-5
  review_text?: string;
}

// ------------------------------------------
// Notification Types
// ------------------------------------------

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  reference_id: string | null;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationFilters {
  unread?: "true" | "false";
  limit?: number;
  cursor?: string;
}

export type PaginatedNotifications = PaginatedResponse<Notification>;

// ------------------------------------------
// API Response Types
// ------------------------------------------

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

// Utility type for service method returns
export type ServiceResult<T> = Promise<T>;
