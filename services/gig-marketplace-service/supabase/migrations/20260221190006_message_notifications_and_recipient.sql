begin;

create or replace function public.set_message_recipient_from_contract()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_founder_id uuid;
  v_freelancer_id uuid;
  v_counterparty_id uuid;
begin
  select founder_id, freelancer_id
    into v_founder_id, v_freelancer_id
  from public.contracts
  where id = new.contract_id;

  if v_founder_id is null then
    return new;
  end if;

  if new.sender_id = v_founder_id then
    v_counterparty_id := v_freelancer_id;
  elsif new.sender_id = v_freelancer_id then
    v_counterparty_id := v_founder_id;
  else
    return new;
  end if;

  if v_counterparty_id is not null then
    new.recipient_id := v_counterparty_id;
  end if;

  return new;
end;
$$;

create or replace function public.notify_recipient_on_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.message_type = 'system' then
    return new;
  end if;

  if new.recipient_id is null or new.recipient_id = new.sender_id then
    return new;
  end if;

  perform public.create_notification(
    new.recipient_id,
    'message',
    new.contract_id,
    jsonb_build_object(
      'contract_id', new.contract_id,
      'message_id', new.id,
      'sender_id', new.sender_id,
      'message_type', new.message_type,
      'preview', left(coalesce(new.body, ''), 140)
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_messages_set_recipient on public.messages;
create trigger trg_messages_set_recipient
before insert on public.messages
for each row execute function public.set_message_recipient_from_contract();

drop trigger if exists trg_messages_notify_recipient on public.messages;
create trigger trg_messages_notify_recipient
after insert on public.messages
for each row execute function public.notify_recipient_on_new_message();

commit;
