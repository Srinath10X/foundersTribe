begin;

create or replace function public.list_contract_messages_safe(
  p_contract_id uuid,
  p_user_id uuid,
  p_limit integer default 50,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null
)
returns setof public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_founder_id uuid;
  v_freelancer_id uuid;
  v_status contract_status_enum;
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
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

  return query
  select m.*
  from public.messages m
  where m.contract_id = p_contract_id
    and (
      p_cursor_created_at is null
      or m.created_at < p_cursor_created_at
      or (m.created_at = p_cursor_created_at and p_cursor_id is not null and m.id < p_cursor_id)
    )
  order by m.created_at desc, m.id desc
  limit v_limit + 1;
end;
$$;

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

create or replace function public.mark_contract_messages_read_safe(
  p_contract_id uuid,
  p_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_founder_id uuid;
  v_freelancer_id uuid;
  v_status contract_status_enum;
  v_updated integer := 0;
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

  update public.messages
     set read_at = now()
   where contract_id = p_contract_id
     and recipient_id = p_user_id
     and read_at is null;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

revoke all on function public.list_contract_messages_safe(uuid, uuid, integer, timestamptz, uuid) from public;
revoke all on function public.create_contract_message_safe(uuid, uuid, message_type_enum, text, text, jsonb) from public;
revoke all on function public.mark_contract_messages_read_safe(uuid, uuid) from public;

grant execute on function public.list_contract_messages_safe(uuid, uuid, integer, timestamptz, uuid) to authenticated;
grant execute on function public.create_contract_message_safe(uuid, uuid, message_type_enum, text, text, jsonb) to authenticated;
grant execute on function public.mark_contract_messages_read_safe(uuid, uuid) to authenticated;

commit;
