CREATE TYPE "public"."availability_status_enum" AS ENUM('open', 'busy', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."budget_type_enum" AS ENUM('fixed', 'hourly');--> statement-breakpoint
CREATE TYPE "public"."contract_status_enum" AS ENUM('active', 'completed', 'cancelled', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."experience_level_enum" AS ENUM('junior', 'mid', 'senior');--> statement-breakpoint
CREATE TYPE "public"."gig_status_enum" AS ENUM('draft', 'open', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."message_type_enum" AS ENUM('text', 'file', 'system');--> statement-breakpoint
CREATE TYPE "public"."notification_type_enum" AS ENUM('new_proposal', 'proposal_accepted', 'message', 'contract_completed');--> statement-breakpoint
CREATE TYPE "public"."proposal_status_enum" AS ENUM('pending', 'shortlisted', 'accepted', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."startup_stage_enum" AS ENUM('idea', 'mvp', 'revenue', 'funded');--> statement-breakpoint
CREATE TYPE "public"."user_role_enum" AS ENUM('founder', 'freelancer', 'both');--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gig_id" uuid NOT NULL,
	"proposal_id" uuid NOT NULL,
	"founder_id" uuid NOT NULL,
	"freelancer_id" uuid NOT NULL,
	"status" "contract_status_enum" DEFAULT 'active' NOT NULL,
	"freelancer_marked_complete" boolean DEFAULT false NOT NULL,
	"founder_approved" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contracts_gig_id_unique" UNIQUE("gig_id"),
	CONSTRAINT "contracts_proposal_id_unique" UNIQUE("proposal_id")
);
--> statement-breakpoint
CREATE TABLE "gig_tags" (
	"gig_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gig_tags_gig_id_tag_id_pk" PRIMARY KEY("gig_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "gigs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"founder_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"budget_type" "budget_type_enum" NOT NULL,
	"budget_min" numeric(12, 2) NOT NULL,
	"budget_max" numeric(12, 2) NOT NULL,
	"experience_level" "experience_level_enum" NOT NULL,
	"startup_stage" "startup_stage_enum",
	"status" "gig_status_enum" DEFAULT 'draft' NOT NULL,
	"proposals_count" integer DEFAULT 0 NOT NULL,
	"location_text" text,
	"is_remote" boolean DEFAULT true NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gigs_budget_nonnegative" CHECK ("gigs"."budget_min" >= 0 and "gigs"."budget_max" >= 0),
	CONSTRAINT "gigs_budget_range" CHECK ("gigs"."budget_max" >= "gigs"."budget_min")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid,
	"message_type" "message_type_enum" DEFAULT 'text' NOT NULL,
	"body" text,
	"file_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_content_check" CHECK (("messages"."message_type" = 'text' and "messages"."body" is not null) or ("messages"."message_type" = 'file' and "messages"."file_url" is not null) or ("messages"."message_type" = 'system'))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type_enum" NOT NULL,
	"reference_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gig_id" uuid NOT NULL,
	"freelancer_id" uuid NOT NULL,
	"cover_letter" text NOT NULL,
	"proposed_amount" numeric(12, 2) NOT NULL,
	"estimated_days" integer,
	"status" "proposal_status_enum" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposals_gig_id_freelancer_id_unique" UNIQUE("gig_id","freelancer_id"),
	CONSTRAINT "proposals_amount_nonnegative" CHECK ("proposals"."proposed_amount" >= 0),
	CONSTRAINT "proposals_days_positive" CHECK ("proposals"."estimated_days" is null or "proposals"."estimated_days" > 0)
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"reviewee_id" uuid NOT NULL,
	"score" smallint NOT NULL,
	"review_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_contract_id_reviewer_id_unique" UNIQUE("contract_id","reviewer_id"),
	CONSTRAINT "ratings_score_range" CHECK ("ratings"."score" between 1 and 5),
	CONSTRAINT "ratings_reviewer_reviewee_distinct" CHECK ("ratings"."reviewer_id" <> "ratings"."reviewee_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"handle" text,
	"full_name" text,
	"avatar_url" text,
	"bio" text,
	"role" "user_role_enum" DEFAULT 'both' NOT NULL,
	"availability" "availability_status_enum" DEFAULT 'open' NOT NULL,
	"experience_level" "experience_level_enum",
	"startup_stage" "startup_stage_enum",
	"hourly_rate" numeric(12, 2),
	"country" text,
	"timezone" text,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"email" text,
	"date_of_birth" timestamp,
	"gender" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"linkedin_url" text,
	"portfolio_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_handle_key" UNIQUE("handle"),
	CONSTRAINT "user_profiles_hourly_rate_nonnegative" CHECK ("user_profiles"."hourly_rate" is null or "user_profiles"."hourly_rate" >= 0),
	CONSTRAINT "user_profiles_gender_check" CHECK ("user_profiles"."gender" is null or "user_profiles"."gender" in ('male','female','non_binary','prefer_not_to_say','other')),
	CONSTRAINT "user_profiles_email_format" CHECK ("user_profiles"."email" is null or "user_profiles"."email" ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_profiles_email_unique" ON "user_profiles" USING btree ("email");