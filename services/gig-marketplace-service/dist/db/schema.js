import { boolean, check, integer, jsonb, numeric, pgEnum, pgTable, primaryKey, smallint, text, timestamp, unique, uniqueIndex, uuid, } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
export const userRoleEnum = pgEnum("user_role_enum", ["founder", "freelancer", "both"]);
export const availabilityStatusEnum = pgEnum("availability_status_enum", ["open", "busy", "inactive"]);
export const experienceLevelEnum = pgEnum("experience_level_enum", ["junior", "mid", "senior"]);
export const budgetTypeEnum = pgEnum("budget_type_enum", ["fixed", "hourly"]);
export const startupStageEnum = pgEnum("startup_stage_enum", ["idea", "mvp", "revenue", "funded"]);
export const gigStatusEnum = pgEnum("gig_status_enum", ["draft", "open", "in_progress", "completed", "cancelled"]);
export const proposalStatusEnum = pgEnum("proposal_status_enum", ["pending", "shortlisted", "accepted", "rejected", "withdrawn"]);
export const contractStatusEnum = pgEnum("contract_status_enum", ["active", "completed", "cancelled", "disputed"]);
export const messageTypeEnum = pgEnum("message_type_enum", ["text", "file", "system"]);
export const notificationTypeEnum = pgEnum("notification_type_enum", ["new_proposal", "proposal_accepted", "message", "contract_completed"]);
export const userProfiles = pgTable("user_profiles", {
    id: uuid("id").primaryKey(),
    handle: text("handle"),
    fullName: text("full_name"),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    role: userRoleEnum("role").notNull().default("both"),
    availability: availabilityStatusEnum("availability").notNull().default("open"),
    experienceLevel: experienceLevelEnum("experience_level"),
    startupStage: startupStageEnum("startup_stage"),
    hourlyRate: numeric("hourly_rate", { precision: 12, scale: 2 }),
    country: text("country"),
    timezone: text("timezone"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    phone: text("phone"),
    email: text("email"),
    dateOfBirth: timestamp("date_of_birth", { withTimezone: false }),
    gender: text("gender"),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    linkedinUrl: text("linkedin_url"),
    portfolioUrl: text("portfolio_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    handleUnique: unique("user_profiles_handle_key").on(t.handle),
    emailUnique: uniqueIndex("idx_user_profiles_email_unique").on(t.email),
    hourlyRateNonNegative: check("user_profiles_hourly_rate_nonnegative", sql `${t.hourlyRate} is null or ${t.hourlyRate} >= 0`),
    genderValid: check("user_profiles_gender_check", sql `${t.gender} is null or ${t.gender} in ('male','female','non_binary','prefer_not_to_say','other')`),
    emailFormat: check("user_profiles_email_format", sql `${t.email} is null or ${t.email} ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$'`),
}));
export const gigs = pgTable("gigs", {
    id: uuid("id").primaryKey().defaultRandom(),
    founderId: uuid("founder_id").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    budgetType: budgetTypeEnum("budget_type").notNull(),
    budgetMin: numeric("budget_min", { precision: 12, scale: 2 }).notNull(),
    budgetMax: numeric("budget_max", { precision: 12, scale: 2 }).notNull(),
    experienceLevel: experienceLevelEnum("experience_level").notNull(),
    startupStage: startupStageEnum("startup_stage"),
    status: gigStatusEnum("status").notNull().default("draft"),
    proposalsCount: integer("proposals_count").notNull().default(0),
    locationText: text("location_text"),
    isRemote: boolean("is_remote").notNull().default(true),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    budgetNonNegative: check("gigs_budget_nonnegative", sql `${t.budgetMin} >= 0 and ${t.budgetMax} >= 0`),
    budgetRange: check("gigs_budget_range", sql `${t.budgetMax} >= ${t.budgetMin}`),
}));
export const tags = pgTable("tags", {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const gigTags = pgTable("gig_tags", {
    gigId: uuid("gig_id").notNull(),
    tagId: uuid("tag_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    pk: primaryKey({ columns: [t.gigId, t.tagId] }),
}));
export const proposals = pgTable("proposals", {
    id: uuid("id").primaryKey().defaultRandom(),
    gigId: uuid("gig_id").notNull(),
    freelancerId: uuid("freelancer_id").notNull(),
    coverLetter: text("cover_letter").notNull(),
    proposedAmount: numeric("proposed_amount", { precision: 12, scale: 2 }).notNull(),
    estimatedDays: integer("estimated_days"),
    status: proposalStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    uniqueGigFreelancer: unique().on(t.gigId, t.freelancerId),
    amountNonNegative: check("proposals_amount_nonnegative", sql `${t.proposedAmount} >= 0`),
    daysPositive: check("proposals_days_positive", sql `${t.estimatedDays} is null or ${t.estimatedDays} > 0`),
}));
export const contracts = pgTable("contracts", {
    id: uuid("id").primaryKey().defaultRandom(),
    gigId: uuid("gig_id").notNull(),
    proposalId: uuid("proposal_id").notNull(),
    founderId: uuid("founder_id").notNull(),
    freelancerId: uuid("freelancer_id").notNull(),
    status: contractStatusEnum("status").notNull().default("active"),
    freelancerMarkedComplete: boolean("freelancer_marked_complete").notNull().default(false),
    founderApproved: boolean("founder_approved").notNull().default(false),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    uniqueGig: unique().on(t.gigId),
    uniqueProposal: unique().on(t.proposalId),
}));
export const messages = pgTable("messages", {
    id: uuid("id").primaryKey().defaultRandom(),
    contractId: uuid("contract_id").notNull(),
    senderId: uuid("sender_id").notNull(),
    recipientId: uuid("recipient_id"),
    messageType: messageTypeEnum("message_type").notNull().default("text"),
    body: text("body"),
    fileUrl: text("file_url"),
    metadata: jsonb("metadata").notNull().default(sql `'{}'::jsonb`),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    contentCheck: check("messages_content_check", sql `(${t.messageType} = 'text' and ${t.body} is not null) or (${t.messageType} = 'file' and ${t.fileUrl} is not null) or (${t.messageType} = 'system')`),
}));
export const ratings = pgTable("ratings", {
    id: uuid("id").primaryKey().defaultRandom(),
    contractId: uuid("contract_id").notNull(),
    reviewerId: uuid("reviewer_id").notNull(),
    revieweeId: uuid("reviewee_id").notNull(),
    score: smallint("score").notNull(),
    reviewText: text("review_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    uniqueContractReviewer: unique().on(t.contractId, t.reviewerId),
    scoreRange: check("ratings_score_range", sql `${t.score} between 1 and 5`),
    reviewerRevieweeDistinct: check("ratings_reviewer_reviewee_distinct", sql `${t.reviewerId} <> ${t.revieweeId}`),
}));
export const notifications = pgTable("notifications", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    type: notificationTypeEnum("type").notNull(),
    referenceId: uuid("reference_id"),
    payload: jsonb("payload").notNull().default(sql `'{}'::jsonb`),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
