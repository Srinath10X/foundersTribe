begin;

create or replace function public.create_notification(
  p_user_id uuid,
  p_type notification_type_enum,
  p_reference_id uuid default null,
  p_payload jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
begin
  insert into public.notifications(user_id, type, reference_id, payload)
  values (p_user_id, p_type, p_reference_id, coalesce(p_payload, '{}'::jsonb))
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

create or replace function public.accept_proposal(p_proposal_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract_id uuid;
  v_gig_id uuid;
  v_founder_id uuid;
  v_freelancer_id uuid;
  v_gig_status gig_status_enum;
begin
  select p.gig_id, g.founder_id, p.freelancer_id, g.status
    into v_gig_id, v_founder_id, v_freelancer_id, v_gig_status
  from public.proposals p
  join public.gigs g on g.id = p.gig_id
  where p.id = p_proposal_id
  for update of g;

  if v_gig_id is null then
    raise exception 'proposal_not_found' using errcode = 'P0002';
  end if;

  if auth.uid() is distinct from v_founder_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_gig_status <> 'open' then
    raise exception 'gig_not_open' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.contracts where gig_id = v_gig_id) then
    raise exception 'contract_already_exists' using errcode = '23505';
  end if;

  update public.proposals
     set status = 'accepted'
   where id = p_proposal_id
     and status in ('pending', 'shortlisted');

  if not found then
    raise exception 'proposal_not_acceptable' using errcode = 'P0001';
  end if;

  update public.proposals
     set status = 'rejected'
   where gig_id = v_gig_id
     and id <> p_proposal_id
     and status in ('pending', 'shortlisted');

  insert into public.contracts(gig_id, proposal_id, founder_id, freelancer_id, status)
  values (v_gig_id, p_proposal_id, v_founder_id, v_freelancer_id, 'active')
  returning id into v_contract_id;

  update public.gigs
     set status = 'in_progress'
   where id = v_gig_id;

  perform public.create_notification(
    v_freelancer_id,
    'proposal_accepted',
    v_contract_id,
    jsonb_build_object('gig_id', v_gig_id, 'proposal_id', p_proposal_id)
  );

  return v_contract_id;

exception
  when unique_violation then
    raise exception 'contract_already_exists' using errcode = '23505';
end;
$$;

create or replace function public.mark_contract_complete(p_contract_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_founder_id uuid;
  v_freelancer_id uuid;
  v_founder_approved boolean;
begin
  select founder_id, freelancer_id, founder_approved
    into v_founder_id, v_freelancer_id, v_founder_approved
  from public.contracts
  where id = p_contract_id
    and status = 'active'
  for update;

  if v_freelancer_id is null then
    raise exception 'contract_not_found_or_not_active' using errcode = 'P0002';
  end if;

  if auth.uid() is distinct from v_freelancer_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.contracts
     set freelancer_marked_complete = true,
         status = case when v_founder_approved then 'completed' else status end,
         completed_at = case when v_founder_approved then now() else completed_at end
   where id = p_contract_id;

  if v_founder_approved then
    update public.gigs g
       set status = 'completed'
      from public.contracts c
     where c.id = p_contract_id
       and c.gig_id = g.id;
  end if;

  perform public.create_notification(
    v_founder_id,
    'contract_completed',
    p_contract_id,
    jsonb_build_object('by', 'freelancer')
  );

  return true;
end;
$$;

create or replace function public.approve_contract(p_contract_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_founder_id uuid;
  v_freelancer_id uuid;
  v_freelancer_marked boolean;
begin
  select founder_id, freelancer_id, freelancer_marked_complete
    into v_founder_id, v_freelancer_id, v_freelancer_marked
  from public.contracts
  where id = p_contract_id
    and status = 'active'
  for update;

  if v_founder_id is null then
    raise exception 'contract_not_found_or_not_active' using errcode = 'P0002';
  end if;

  if auth.uid() is distinct from v_founder_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.contracts
     set founder_approved = true,
         status = case when v_freelancer_marked then 'completed' else status end,
         completed_at = case when v_freelancer_marked then now() else completed_at end
   where id = p_contract_id;

  if v_freelancer_marked then
    update public.gigs g
       set status = 'completed'
      from public.contracts c
     where c.id = p_contract_id
       and c.gig_id = g.id;
  end if;

  perform public.create_notification(
    v_freelancer_id,
    'contract_completed',
    p_contract_id,
    jsonb_build_object('by', 'founder')
  );

  return true;
end;
$$;

revoke all on function public.create_notification(uuid, notification_type_enum, uuid, jsonb) from public;
revoke all on function public.accept_proposal(uuid) from public;
revoke all on function public.mark_contract_complete(uuid) from public;
revoke all on function public.approve_contract(uuid) from public;

grant execute on function public.accept_proposal(uuid) to authenticated;
grant execute on function public.mark_contract_complete(uuid) to authenticated;
grant execute on function public.approve_contract(uuid) to authenticated;
grant execute on function public.create_notification(uuid, notification_type_enum, uuid, jsonb) to service_role;

commit;
