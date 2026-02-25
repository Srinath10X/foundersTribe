begin;

create or replace function public.create_contract_message_safe(
  p_contract_id uuid,
  p_user_id uuid,
  p_message_type message_type_enum,
  p_body text default null,
  p_file_url text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_founder_id uuid;
  v_freelancer_id uuid;
  v_status contract_status_enum;
  v_recipient_id uuid;
  v_message public.messages;
  v_has_room_id boolean := false;
  v_has_content boolean := false;
begin
  select founder_id, freelancer_id, status
    into v_founder_id, v_freelancer_id, v_status
  from public.contracts
  where id = p_contract_id;

  if v_status is null then
    raise exception 'contract_not_found' using errcode = 'P0002';
  end if;

  if p_user_id is distinct from v_founder_id and p_user_id is distinct from v_freelancer_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_status not in ('active', 'completed') then
    raise exception 'messaging_disabled_for_contract_status' using errcode = 'P0001';
  end if;

  if p_user_id = v_founder_id then
    v_recipient_id := v_freelancer_id;
  else
    v_recipient_id := v_founder_id;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'messages'
      and column_name = 'room_id'
  ) into v_has_room_id;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'messages'
      and column_name = 'content'
  ) into v_has_content;

  if v_has_room_id and v_has_content then
    execute
      'insert into public.messages(
        contract_id, sender_id, recipient_id, message_type, body, file_url, metadata, room_id, content
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      returning *'
    into v_message
    using
      p_contract_id,
      p_user_id,
      v_recipient_id,
      p_message_type,
      p_body,
      p_file_url,
      coalesce(p_metadata, '{}'::jsonb),
      p_contract_id,
      coalesce(p_body, '');
  elsif v_has_room_id then
    execute
      'insert into public.messages(
        contract_id, sender_id, recipient_id, message_type, body, file_url, metadata, room_id
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)
      returning *'
    into v_message
    using
      p_contract_id,
      p_user_id,
      v_recipient_id,
      p_message_type,
      p_body,
      p_file_url,
      coalesce(p_metadata, '{}'::jsonb),
      p_contract_id;
  elsif v_has_content then
    execute
      'insert into public.messages(
        contract_id, sender_id, recipient_id, message_type, body, file_url, metadata, content
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)
      returning *'
    into v_message
    using
      p_contract_id,
      p_user_id,
      v_recipient_id,
      p_message_type,
      p_body,
      p_file_url,
      coalesce(p_metadata, '{}'::jsonb),
      coalesce(p_body, '');
  else
    insert into public.messages(
      contract_id,
      sender_id,
      recipient_id,
      message_type,
      body,
      file_url,
      metadata
    )
    values (
      p_contract_id,
      p_user_id,
      v_recipient_id,
      p_message_type,
      p_body,
      p_file_url,
      coalesce(p_metadata, '{}'::jsonb)
    )
    returning * into v_message;
  end if;

  return v_message;
end;
$$;

commit;
