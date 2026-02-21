begin;

create extension if not exists pgcrypto;

-- Enums
DO $$ BEGIN CREATE TYPE user_role_enum AS ENUM ('founder','freelancer','both'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE availability_status_enum AS ENUM ('open','busy','inactive'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE experience_level_enum AS ENUM ('junior','mid','senior'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE budget_type_enum AS ENUM ('fixed','hourly'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE startup_stage_enum AS ENUM ('idea','mvp','revenue','funded'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE gig_status_enum AS ENUM ('draft','open','in_progress','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE proposal_status_enum AS ENUM ('pending','shortlisted','accepted','rejected','withdrawn'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE contract_status_enum AS ENUM ('active','completed','cancelled','disputed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE message_type_enum AS ENUM ('text','file','system'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE notification_type_enum AS ENUM ('new_proposal','proposal_accepted','message','contract_completed'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Base profiles table for gig marketplace; linked to auth.users
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique,
  full_name text,
  avatar_url text,
  bio text,
  role user_role_enum not null default 'both',
  availability availability_status_enum not null default 'open',
  experience_level experience_level_enum,
  startup_stage startup_stage_enum,
  hourly_rate numeric(12,2),
  country text,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_hourly_rate_nonnegative check (hourly_rate is null or hourly_rate >= 0)
);

create table if not exists public.gigs (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references public.user_profiles(id) on delete restrict,
  title text not null,
  description text not null,
  budget_type budget_type_enum not null,
  budget_min numeric(12,2) not null,
  budget_max numeric(12,2) not null,
  experience_level experience_level_enum not null,
  startup_stage startup_stage_enum,
  status gig_status_enum not null default 'draft',
  proposals_count integer not null default 0,
  location_text text,
  is_remote boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gigs_budget_nonnegative check (budget_min >= 0 and budget_max >= 0),
  constraint gigs_budget_range check (budget_max >= budget_min)
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gig_tags (
  gig_id uuid not null references public.gigs(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (gig_id, tag_id)
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references public.gigs(id) on delete cascade,
  freelancer_id uuid not null references public.user_profiles(id) on delete restrict,
  cover_letter text not null,
  proposed_amount numeric(12,2) not null,
  estimated_days integer,
  status proposal_status_enum not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gig_id, freelancer_id),
  constraint proposals_amount_nonnegative check (proposed_amount >= 0),
  constraint proposals_days_positive check (estimated_days is null or estimated_days > 0)
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references public.gigs(id) on delete restrict,
  proposal_id uuid not null unique references public.proposals(id) on delete restrict,
  founder_id uuid not null references public.user_profiles(id) on delete restrict,
  freelancer_id uuid not null references public.user_profiles(id) on delete restrict,
  status contract_status_enum not null default 'active',
  freelancer_marked_complete boolean not null default false,
  founder_approved boolean not null default false,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gig_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  sender_id uuid not null references public.user_profiles(id) on delete restrict,
  recipient_id uuid references public.user_profiles(id) on delete restrict,
  message_type message_type_enum not null default 'text',
  body text,
  file_url text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint messages_content_check check (
    (message_type = 'text' and body is not null)
    or (message_type = 'file' and file_url is not null)
    or (message_type = 'system')
  )
);

-- If an existing messages table is present (from another module),
-- ensure gig-marketplace columns exist before indexes/queries rely on them.
alter table public.messages
  add column if not exists contract_id uuid,
  add column if not exists sender_id uuid,
  add column if not exists recipient_id uuid,
  add column if not exists message_type message_type_enum not null default 'text',
  add column if not exists body text,
  add column if not exists file_url text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists read_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  reviewer_id uuid not null references public.user_profiles(id) on delete restrict,
  reviewee_id uuid not null references public.user_profiles(id) on delete restrict,
  score smallint not null,
  review_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id, reviewer_id),
  constraint ratings_score_range check (score between 1 and 5),
  constraint ratings_reviewer_reviewee_distinct check (reviewer_id <> reviewee_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  type notification_type_enum not null,
  reference_id uuid,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at triggers
drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_gigs_updated_at on public.gigs;
create trigger trg_gigs_updated_at
before update on public.gigs
for each row execute function public.set_updated_at();

drop trigger if exists trg_tags_updated_at on public.tags;
create trigger trg_tags_updated_at
before update on public.tags
for each row execute function public.set_updated_at();

drop trigger if exists trg_proposals_updated_at on public.proposals;
create trigger trg_proposals_updated_at
before update on public.proposals
for each row execute function public.set_updated_at();

drop trigger if exists trg_contracts_updated_at on public.contracts;
create trigger trg_contracts_updated_at
before update on public.contracts
for each row execute function public.set_updated_at();

drop trigger if exists trg_messages_updated_at on public.messages;
create trigger trg_messages_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

drop trigger if exists trg_ratings_updated_at on public.ratings;
create trigger trg_ratings_updated_at
before update on public.ratings
for each row execute function public.set_updated_at();

drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

-- proposals_count maintenance
create or replace function public.bump_gig_proposals_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.gigs set proposals_count = proposals_count + 1 where id = new.gig_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.gigs set proposals_count = greatest(0, proposals_count - 1) where id = old.gig_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_proposals_count_ins on public.proposals;
create trigger trg_proposals_count_ins
after insert on public.proposals
for each row execute function public.bump_gig_proposals_count();

drop trigger if exists trg_proposals_count_del on public.proposals;
create trigger trg_proposals_count_del
after delete on public.proposals
for each row execute function public.bump_gig_proposals_count();

-- Indexes
create index if not exists idx_user_profiles_role_availability on public.user_profiles(role, availability);
create index if not exists idx_user_profiles_experience on public.user_profiles(experience_level);

create index if not exists idx_gigs_founder_created_desc on public.gigs(founder_id, created_at desc, id desc);
create index if not exists idx_gigs_status_created_desc on public.gigs(status, created_at desc, id desc);
create index if not exists idx_gigs_open_partial on public.gigs(created_at desc, id desc) where status = 'open';
create index if not exists idx_gigs_budget_type_range on public.gigs(budget_type, budget_min, budget_max);
create index if not exists idx_gigs_experience_stage on public.gigs(experience_level, startup_stage, created_at desc);

create index if not exists idx_tags_slug on public.tags(slug);
create index if not exists idx_gig_tags_tag_gig on public.gig_tags(tag_id, gig_id);
create index if not exists idx_gig_tags_gig on public.gig_tags(gig_id);

create index if not exists idx_proposals_gig_status_created on public.proposals(gig_id, status, created_at desc, id desc);
create index if not exists idx_proposals_freelancer_created on public.proposals(freelancer_id, created_at desc, id desc);

create index if not exists idx_contracts_founder_created on public.contracts(founder_id, created_at desc, id desc);
create index if not exists idx_contracts_freelancer_created on public.contracts(freelancer_id, created_at desc, id desc);
create index if not exists idx_contracts_status_created on public.contracts(status, created_at desc, id desc);

create index if not exists idx_messages_contract_created on public.messages(contract_id, created_at desc, id desc);
create index if not exists idx_messages_recipient_unread on public.messages(recipient_id, read_at, created_at desc);

create index if not exists idx_ratings_reviewee_created on public.ratings(reviewee_id, created_at desc);

create index if not exists idx_notifications_user_unread_created on public.notifications(user_id, read_at, created_at desc, id desc);
create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc, id desc);

commit;
