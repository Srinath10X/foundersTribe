// ─────────────────────────────────────────────────────────────────────────────
// Freelancer Tabs — Type Definitions
// Matches the gig-marketplace-service API contract exactly.
// ─────────────────────────────────────────────────────────────────────────────

// ======================== Pagination ========================

export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  next_cursor: string | null;
}

// ======================== Error ========================

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown> | null;
  };
}

// ======================== Tag ========================

export interface Tag {
  id: string;
  slug: string;
  label: string;
}

// ======================== Enums ========================

export type BudgetType = "fixed" | "hourly";
export type ExperienceLevel = "junior" | "mid" | "senior";
export type StartupStage = "idea" | "mvp" | "revenue" | "funded";
export type GigStatus = "draft" | "open" | "in_progress" | "completed" | "cancelled";
export type ProposalStatus = "pending" | "shortlisted" | "accepted" | "rejected" | "withdrawn";
export type ContractStatus = "active" | "completed" | "cancelled" | "disputed";

// ======================== Gig ========================

export interface Gig {
  id: string;
  founder_id: string;
  title: string;
  description: string;
  budget_type: BudgetType;
  budget_min: number;
  budget_max: number;
  experience_level: ExperienceLevel;
  startup_stage: StartupStage | null;
  status: GigStatus;
  proposals_count: number;
  location_text: string | null;
  is_remote: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FounderInfo {
  id: string;
  display_name: string;
  avatar_url: string | null;
  company_name: string | null;
}

export interface GigWithFounderAndTags extends Gig {
  tags: Tag[];
  founder: FounderInfo;
}

export interface GigFilters extends CursorPaginationParams {
  status?: GigStatus;
  tag?: string;
  budget_type?: BudgetType;
  budget_min?: number;
  budget_max?: number;
  experience_level?: ExperienceLevel;
  startup_stage?: StartupStage;
}

export interface CreateGigPayload {
  title: string;
  description: string;
  budget_type: BudgetType;
  budget_min: number;
  budget_max: number;
  experience_level: ExperienceLevel;
  startup_stage?: StartupStage;
  is_remote?: boolean;
  location_text?: string;
  status?: GigStatus;
}

export type UpdateGigPayload = Partial<CreateGigPayload>;

// ======================== Display Adapter ========================
// Maps backend Gig to the fields the existing UI expects

export interface DisplayGig extends Gig {
  /** Derived: midpoint of budget_min and budget_max */
  budget: number;
  /** Derived: from founder.display_name */
  client_name: string;
  /** Derived: from founder.company_name */
  client_company: string;
  /** Not in backend — always null */
  deadline: string | null;
  /** Not in backend — always 0 */
  progress: number;
  /** Forwarded tags from GigWithFounderAndTags */
  tags: Tag[];
  /** Forwarded founder info */
  founder: FounderInfo;
}

// ======================== Proposal ========================

export interface Proposal {
  id: string;
  gig_id: string;
  freelancer_id: string;
  cover_letter: string;
  proposed_amount: number;
  estimated_days: number | null;
  status: ProposalStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateProposalPayload {
  cover_letter: string;
  proposed_amount: number;
  estimated_days?: number;
}

// ======================== Contract ========================

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
}

export interface ContractFilters extends CursorPaginationParams {
  status?: ContractStatus;
}

// ======================== Message ========================

export interface Message {
  id: string;
  contract_id: string;
  sender_id: string;
  recipient_id: string | null;
  message_type: "text" | "file" | "system";
  body: string | null;
  file_url: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface CreateMessagePayload {
  recipient_id?: string;
  message_type: "text" | "file" | "system";
  body?: string;
  file_url?: string;
  metadata?: Record<string, unknown>;
}

// ======================== Rating ========================

export interface Rating {
  id: string;
  contract_id: string;
  reviewer_id: string;
  reviewee_id: string;
  score: number;
  review_text: string | null;
  created_at: string;
}

export interface CreateRatingPayload {
  reviewee_id: string;
  score: number;
  review_text?: string;
}

// ======================== Notification ========================

export type NotificationType =
  | "proposal_received"
  | "proposal_accepted"
  | "proposal_rejected"
  | "contract_started"
  | "contract_completed"
  | "new_message"
  | "rating_received";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  reference_id: string | null;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

// ======================== Freelancer Stats ========================

export interface FreelancerStats {
  earnings_mtd: number;
  active_projects: number;
  earnings_growth_pct: number;
}
