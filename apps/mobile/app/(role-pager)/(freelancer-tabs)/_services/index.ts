// ─────────────────────────────────────────────────────────────────────────────
// Freelancer Tabs — Service Barrel Export
// Single import point for all freelancer service layer exports.
// ─────────────────────────────────────────────────────────────────────────────

// Types
export type {
  Gig,
  GigWithFounderAndTags,
  GigFilters,
  GigStatus,
  BudgetType,
  ExperienceLevel,
  StartupStage,
  Tag,
  FounderInfo,
  CreateGigPayload,
  UpdateGigPayload,
  DisplayGig,
  Proposal,
  ProposalStatus,
  CreateProposalPayload,
  Contract,
  ContractStatus,
  ContractFilters,
  Message,
  CreateMessagePayload,
  Rating,
  CreateRatingPayload,
  Notification,
  NotificationType,
  FreelancerStats,
  PaginatedResponse,
  CursorPaginationParams,
  ApiErrorPayload,
} from "./types";

// Service
export { freelancerGigsService } from "./freelancerGigs.service";

// Helpers
export { toDisplayGig, FreelancerServiceError } from "./freelancerGigs.service";

// Config
export { USE_MOCK } from "./config";
