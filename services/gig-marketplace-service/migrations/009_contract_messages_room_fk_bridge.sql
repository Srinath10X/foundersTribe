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
  v_room_id uuid;
  v_has_room_id boolean := false;
  v_has_content boolean := false;
  v_rooms_table_exists boolean := false;
  v_rooms_has_host_id boolean := false;
  v_rooms_has_title boolean := false;
  v_rooms_has_type boolean := false;
  v_rooms_has_created_at boolean := false;
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
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'room_id'
  ) into v_has_room_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'content'
  ) into v_has_content;

  if v_has_room_id then
    v_room_id := p_contract_id;
    v_rooms_table_exists := to_regclass('public.rooms') is not null;

    if v_rooms_table_exists then
      select exists(select 1 from public.rooms r where r.id = p_contract_id) into v_rooms_table_exists;

      if not v_rooms_table_exists then
        select exists (
          select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'rooms' and column_name = 'host_id'
        ) into v_rooms_has_host_id;
        select exists (
          select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'rooms' and column_name = 'title'
        ) into v_rooms_has_title;
        select exists (
          select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'rooms' and column_name = 'type'
        ) into v_rooms_has_type;

        begin
          if v_rooms_has_host_id and v_rooms_has_title and v_rooms_has_type then
            execute '
              insert into public.rooms(id, host_id, title, type)
              values ($1, $2, $3, $4)
              on conflict (id) do nothing
            ' using p_contract_id, v_founder_id, ('Contract Chat ' || left(p_contract_id::text, 8)), 'public';
          elsif v_rooms_has_host_id and v_rooms_has_title then
            execute '
              insert into public.rooms(id, host_id, title)
              values ($1, $2, $3)
              on conflict (id) do nothing
            ' using p_contract_id, v_founder_id, ('Contract Chat ' || left(p_contract_id::text, 8));
          elsif v_rooms_has_host_id then
            execute '
              insert into public.rooms(id, host_id)
              values ($1, $2)
              on conflict (id) do nothing
            ' using p_contract_id, v_founder_id;
          elsif v_rooms_has_title and v_rooms_has_type then
            execute '
              insert into public.rooms(id, title, type)
              values ($1, $2, $3)
              on conflict (id) do nothing
            ' using p_contract_id, ('Contract Chat ' || left(p_contract_id::text, 8)), 'public';
          elsif v_rooms_has_title then
            execute '
              insert into public.rooms(id, title)
              values ($1, $2)
              on conflict (id) do nothing
            ' using p_contract_id, ('Contract Chat ' || left(p_contract_id::text, 8));
          else
            execute '
              insert into public.rooms(id)
              values ($1)
              on conflict (id) do nothing
            ' using p_contract_id;
          end if;
        exception
          when others then
            null;
        end;

        if exists(select 1 from public.rooms r where r.id = p_contract_id) then
          v_room_id := p_contract_id;
        else
          select exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'rooms' and column_name = 'created_at'
          ) into v_rooms_has_created_at;

          if v_rooms_has_created_at then
            execute 'select id from public.rooms order by created_at desc nulls last, id desc limit 1'
              into v_room_id;
          else
            execute 'select id from public.rooms order by id desc limit 1'
              into v_room_id;
          end if;
        end if;

        if v_room_id is null then
          raise exception 'room_not_available_for_messages' using errcode = 'P0001';
        end if;
      end if;
    end if;
  end if;

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
      coalesce(v_room_id, p_contract_id),
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
      coalesce(v_room_id, p_contract_id);
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
