begin;

-- 1) Enums
DO $$ BEGIN
  CREATE TYPE service_duration_unit_enum AS ENUM ('days', 'weeks');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE service_request_status_enum AS ENUM ('pending', 'accepted', 'declined', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2) Service catalog table
create table if not exists public.freelancer_services (
  id uuid primary key default gen_random_uuid(),
  freelancer_id uuid not null references auth.users(id) on delete cascade,
  service_name text not null,
  description text,
  cost_amount numeric(12,2) not null,
  cost_currency text not null default 'INR',
  delivery_time_value integer not null,
  delivery_time_unit service_duration_unit_enum not null default 'days',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint freelancer_services_cost_nonnegative check (cost_amount >= 0),
  constraint freelancer_services_time_positive check (delivery_time_value > 0),
  constraint freelancer_services_name_nonempty check (length(trim(service_name)) > 1)
);

-- 3) Founder <-> Freelancer request thread table
create table if not exists public.service_message_requests (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.freelancer_services(id) on delete set null,
  founder_id uuid not null references auth.users(id) on delete cascade,
  freelancer_id uuid not null references auth.users(id) on delete cascade,
  status service_request_status_enum not null default 'pending',
  request_message text,
  last_message_preview text,
  last_message_at timestamptz not null default now(),
  unread_founder_count integer not null default 0,
  unread_freelancer_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_message_requests_distinct_users check (founder_id <> freelancer_id),
  constraint service_message_requests_unread_nonnegative check (unread_founder_count >= 0 and unread_freelancer_count >= 0)
);

-- 4) Messages inside request threads
-- reuses existing message_type_enum from gig-marketplace schema
create table if not exists public.service_request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_message_requests(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid references auth.users(id) on delete cascade,
  message_type message_type_enum not null default 'text',
  body text,
  file_url text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_request_messages_content_check check (
    (message_type = 'text' and body is not null)
    or (message_type = 'file' and file_url is not null)
    or (message_type = 'system')
  )
);

-- 5) Indexes
create index if not exists idx_freelancer_services_freelancer on public.freelancer_services(freelancer_id, is_active, created_at desc);
create index if not exists idx_freelancer_services_cost on public.freelancer_services(cost_amount asc);
create index if not exists idx_freelancer_services_time on public.freelancer_services(delivery_time_value asc, delivery_time_unit);
create index if not exists idx_freelancer_services_name_lower on public.freelancer_services(lower(service_name));

create index if not exists idx_service_requests_founder_last_msg on public.service_message_requests(founder_id, last_message_at desc, id desc);
create index if not exists idx_service_requests_freelancer_last_msg on public.service_message_requests(freelancer_id, last_message_at desc, id desc);
create index if not exists idx_service_requests_status_last_msg on public.service_message_requests(status, last_message_at desc, id desc);

create index if not exists idx_service_request_messages_request_created on public.service_request_messages(request_id, created_at desc, id desc);
create index if not exists idx_service_request_messages_recipient_unread on public.service_request_messages(recipient_id, read_at, created_at desc);

-- 6) RLS
alter table public.freelancer_services enable row level security;
alter table public.service_message_requests enable row level security;
alter table public.service_request_messages enable row level security;

DO $$ BEGIN
  CREATE POLICY freelancer_services_select_all
  ON public.freelancer_services FOR SELECT
  TO authenticated
  USING (is_active = true OR freelancer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY freelancer_services_insert_self
  ON public.freelancer_services FOR INSERT
  TO authenticated
  WITH CHECK (freelancer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY freelancer_services_update_self
  ON public.freelancer_services FOR UPDATE
  TO authenticated
  USING (freelancer_id = auth.uid())
  WITH CHECK (freelancer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY freelancer_services_delete_self
  ON public.freelancer_services FOR DELETE
  TO authenticated
  USING (freelancer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY service_requests_select_participants
  ON public.service_message_requests FOR SELECT
  TO authenticated
  USING (founder_id = auth.uid() OR freelancer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY service_requests_insert_founder
  ON public.service_message_requests FOR INSERT
  TO authenticated
  WITH CHECK (founder_id = auth.uid() and founder_id <> freelancer_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY service_requests_update_participants
  ON public.service_message_requests FOR UPDATE
  TO authenticated
  USING (founder_id = auth.uid() OR freelancer_id = auth.uid())
  WITH CHECK (founder_id = auth.uid() OR freelancer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY service_request_messages_select_participants
  ON public.service_request_messages FOR SELECT
  TO authenticated
  USING (
    exists (
      select 1 from public.service_message_requests r
      where r.id = service_request_messages.request_id
        and (r.founder_id = auth.uid() or r.freelancer_id = auth.uid())
    )
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY service_request_messages_insert_participants
  ON public.service_request_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    and exists (
      select 1 from public.service_message_requests r
      where r.id = service_request_messages.request_id
        and r.status in ('pending', 'accepted')
        and (r.founder_id = auth.uid() or r.freelancer_id = auth.uid())
        and (
          service_request_messages.recipient_id is null
          or service_request_messages.recipient_id = case
            when r.founder_id = auth.uid() then r.freelancer_id
            else r.founder_id
          end
        )
    )
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY service_request_messages_update_recipient
  ON public.service_request_messages FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 7) updated_at triggers
-- expects public.set_updated_at() to already exist
DROP TRIGGER IF EXISTS trg_freelancer_services_updated_at ON public.freelancer_services;
CREATE TRIGGER trg_freelancer_services_updated_at
BEFORE UPDATE ON public.freelancer_services
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_service_message_requests_updated_at ON public.service_message_requests;
CREATE TRIGGER trg_service_message_requests_updated_at
BEFORE UPDATE ON public.service_message_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_service_request_messages_updated_at ON public.service_request_messages;
CREATE TRIGGER trg_service_request_messages_updated_at
BEFORE UPDATE ON public.service_request_messages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8) recipient + unread maintenance + notifications
create or replace function public.set_service_request_message_recipient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_founder_id uuid;
  v_freelancer_id uuid;
begin
  select founder_id, freelancer_id
    into v_founder_id, v_freelancer_id
  from public.service_message_requests
  where id = new.request_id;

  if v_founder_id is null then
    raise exception 'service_request_not_found' using errcode = 'P0002';
  end if;

  if new.sender_id = v_founder_id then
    new.recipient_id := v_freelancer_id;
  elsif new.sender_id = v_freelancer_id then
    new.recipient_id := v_founder_id;
  else
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.notify_on_new_service_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insert only if recipient has a row in user_profiles (to avoid FK failure)
  insert into public.notifications(user_id, type, reference_id, payload)
  select new.freelancer_id,
         'message'::notification_type_enum,
         new.id,
         jsonb_build_object(
           'kind', 'service_request',
           'request_id', new.id,
           'service_id', new.service_id,
           'founder_id', new.founder_id,
           'message', left(coalesce(new.request_message, ''), 180)
         )
  where exists (select 1 from public.user_profiles up where up.id = new.freelancer_id);

  return new;
end;
$$;

create or replace function public.on_new_service_request_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.service_message_requests r
     set last_message_at = new.created_at,
         last_message_preview = left(coalesce(new.body, ''), 180),
         unread_founder_count = case when new.recipient_id = r.founder_id then r.unread_founder_count + 1 else r.unread_founder_count end,
         unread_freelancer_count = case when new.recipient_id = r.freelancer_id then r.unread_freelancer_count + 1 else r.unread_freelancer_count end
   where r.id = new.request_id;

  if new.recipient_id is not null and new.recipient_id <> new.sender_id then
    insert into public.notifications(user_id, type, reference_id, payload)
    select new.recipient_id,
           'message'::notification_type_enum,
           new.request_id,
           jsonb_build_object(
             'kind', 'service_message',
             'request_id', new.request_id,
             'message_id', new.id,
             'sender_id', new.sender_id,
             'preview', left(coalesce(new.body, ''), 140)
           )
    where exists (select 1 from public.user_profiles up where up.id = new.recipient_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_service_message_requests_notify on public.service_message_requests;
create trigger trg_service_message_requests_notify
after insert on public.service_message_requests
for each row execute function public.notify_on_new_service_request();

drop trigger if exists trg_service_request_messages_set_recipient on public.service_request_messages;
create trigger trg_service_request_messages_set_recipient
before insert on public.service_request_messages
for each row execute function public.set_service_request_message_recipient();

drop trigger if exists trg_service_request_messages_notify on public.service_request_messages;
create trigger trg_service_request_messages_notify
after insert on public.service_request_messages
for each row execute function public.on_new_service_request_message();

-- 9) realtime publications
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'service_request_messages'
  ) then
    alter publication supabase_realtime add table public.service_request_messages;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'service_message_requests'
  ) then
    alter publication supabase_realtime add table public.service_message_requests;
  end if;
end
$$;

commit;
