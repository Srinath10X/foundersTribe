begin;

create or replace function public.notify_founder_on_new_proposal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_founder_id uuid;
begin
  select founder_id into v_founder_id from public.gigs where id = new.gig_id;

  if v_founder_id is not null then
    perform public.create_notification(
      v_founder_id,
      'new_proposal',
      new.id,
      jsonb_build_object('gig_id', new.gig_id, 'freelancer_id', new.freelancer_id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_new_proposal_notify on public.proposals;
create trigger trg_new_proposal_notify
after insert on public.proposals
for each row execute function public.notify_founder_on_new_proposal();

-- Ensure messages and notifications are included in realtime publications.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;

commit;
