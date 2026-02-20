begin;

alter table public.user_profiles enable row level security;
alter table public.gigs enable row level security;
alter table public.tags enable row level security;
alter table public.gig_tags enable row level security;
alter table public.proposals enable row level security;
alter table public.contracts enable row level security;
alter table public.messages enable row level security;
alter table public.ratings enable row level security;
alter table public.notifications enable row level security;

-- user_profiles
create policy user_profiles_select_all
on public.user_profiles for select
to authenticated, anon
using (true);

create policy user_profiles_insert_self
on public.user_profiles for insert
to authenticated
with check (id = auth.uid());

create policy user_profiles_update_self
on public.user_profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- gigs
create policy gigs_select_open_or_owner
on public.gigs for select
to authenticated, anon
using (status = 'open' or founder_id = auth.uid());

create policy gigs_insert_owner
on public.gigs for insert
to authenticated
with check (founder_id = auth.uid());

create policy gigs_update_owner
on public.gigs for update
to authenticated
using (founder_id = auth.uid())
with check (founder_id = auth.uid());

create policy gigs_delete_owner
on public.gigs for delete
to authenticated
using (founder_id = auth.uid());

-- tags + gig_tags
create policy tags_select_all
on public.tags for select
to authenticated, anon
using (true);

create policy gig_tags_select_all
on public.gig_tags for select
to authenticated, anon
using (true);

create policy gig_tags_manage_owner
on public.gig_tags for all
to authenticated
using (
  exists (
    select 1 from public.gigs g
    where g.id = gig_tags.gig_id and g.founder_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.gigs g
    where g.id = gig_tags.gig_id and g.founder_id = auth.uid()
  )
);

-- proposals
create policy proposals_insert_freelancer
on public.proposals for insert
to authenticated
with check (
  freelancer_id = auth.uid()
  and exists (
    select 1 from public.gigs g
    where g.id = proposals.gig_id
      and g.status = 'open'
      and g.founder_id <> auth.uid()
  )
);

create policy proposals_select_owner_or_gig_founder
on public.proposals for select
to authenticated
using (
  freelancer_id = auth.uid()
  or exists (
    select 1 from public.gigs g
    where g.id = proposals.gig_id and g.founder_id = auth.uid()
  )
);

create policy proposals_update_freelancer_own
on public.proposals for update
to authenticated
using (freelancer_id = auth.uid())
with check (freelancer_id = auth.uid());

-- contracts
create policy contracts_select_participants
on public.contracts for select
to authenticated
using (founder_id = auth.uid() or freelancer_id = auth.uid());

-- messages
create policy messages_select_participants
on public.messages for select
to authenticated
using (
  exists (
    select 1 from public.contracts c
    where c.id = messages.contract_id
      and (c.founder_id = auth.uid() or c.freelancer_id = auth.uid())
  )
);

create policy messages_insert_participants
on public.messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.contracts c
    where c.id = messages.contract_id
      and (c.founder_id = auth.uid() or c.freelancer_id = auth.uid())
      and (
        messages.recipient_id is null
        or messages.recipient_id = case
          when c.founder_id = auth.uid() then c.freelancer_id
          else c.founder_id
        end
      )
  )
);

create policy messages_update_recipient_read
on public.messages for update
to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

-- ratings
create policy ratings_insert_completed_participants
on public.ratings for insert
to authenticated
with check (
  reviewer_id = auth.uid()
  and exists (
    select 1 from public.contracts c
    where c.id = ratings.contract_id
      and c.status = 'completed'
      and (
        (c.founder_id = ratings.reviewer_id and c.freelancer_id = ratings.reviewee_id)
        or (c.freelancer_id = ratings.reviewer_id and c.founder_id = ratings.reviewee_id)
      )
  )
);

create policy ratings_select_participants
on public.ratings for select
to authenticated
using (
  exists (
    select 1 from public.contracts c
    where c.id = ratings.contract_id
      and (c.founder_id = auth.uid() or c.freelancer_id = auth.uid())
  )
);

-- notifications
create policy notifications_select_own
on public.notifications for select
to authenticated
using (user_id = auth.uid());

create policy notifications_update_own
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

commit;
