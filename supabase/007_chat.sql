-- Carta de Reyes · 007: chat secreto de cada regalo compartido
-- Solo lo leen y escriben quienes participan en ese regalo. El dueño de la carta nunca lo ve.
-- Pegar entero en Supabase > SQL Editor > Run. Se puede ejecutar varias veces.

create table if not exists public.rdc_gift_messages (
  id         bigint generated always as identity primary key,
  item_id    uuid not null references public.rdc_gifts(item_id) on delete cascade,
  member_id  uuid not null references public.rdc_members(id) on delete cascade,
  body       text not null check (length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists rdc_gift_messages_item on public.rdc_gift_messages(item_id, created_at);
alter table public.rdc_gift_messages enable row level security;
revoke all on public.rdc_gift_messages from anon, authenticated;

create or replace function public.rdc_gift_json(p_item uuid, p_me uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when g.item_id is null then
      jsonb_build_object('reserved', false, 'reserved_by_me', false, 'reserved_by', null, 'gift', null)
    else jsonb_build_object(
      'reserved', true,
      'reserved_by_me', exists (select 1 from rdc_gift_members x where x.item_id = p_item and x.member_id = p_me),
      'reserved_by', (select string_agg(m.name, ', ' order by gm.created_at) from rdc_gift_members gm join rdc_members m on m.id = gm.member_id where gm.item_id = p_item),
      'gift', jsonb_build_object('open', g.open, 'bought', g.bought, 'status', g.status,
        'members', (select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'color', m.color, 'photo', m.photo, 'amount', gm.amount) order by gm.created_at)
                    from rdc_gift_members gm join rdc_members m on m.id = gm.member_id where gm.item_id = p_item),
        -- solo los participantes saben si hay mensajes
        'last_msg_at', case when exists (select 1 from rdc_gift_members x where x.item_id = p_item and x.member_id = p_me)
                         then (select max(created_at) from rdc_gift_messages where item_id = p_item) end,
        'last_msg_by', case when exists (select 1 from rdc_gift_members x where x.item_id = p_item and x.member_id = p_me)
                         then (select member_id from rdc_gift_messages where item_id = p_item order by created_at desc limit 1) end))
    end
  from (select p_item as id) s left join rdc_gifts g on g.item_id = s.id
$$;

create or replace function public.rdc_messages(p_token uuid, p_item uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  if not exists (select 1 from rdc_gift_members where item_id = p_item and member_id = me.id) then
    return jsonb_build_object('error','no_existe');
  end if;
  return jsonb_build_object('messages', coalesce((
    select jsonb_agg(jsonb_build_object('id', x.id, 'member_id', x.member_id, 'name', m.name, 'color', m.color, 'photo', m.photo,
      'body', x.body, 'created_at', x.created_at) order by x.created_at)
    from (select * from rdc_gift_messages where item_id = p_item order by created_at desc limit 200) x
    join rdc_members m on m.id = x.member_id), '[]'::jsonb));
end $$;

create or replace function public.rdc_send_message(p_token uuid, p_item uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token); v text := left(trim(coalesce(p_body, '')), 500);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  if v = '' then return jsonb_build_object('error','mensaje'); end if;
  if not exists (select 1 from rdc_gift_members where item_id = p_item and member_id = me.id) then
    return jsonb_build_object('error','no_existe');
  end if;
  -- freno anti-spam: como mucho 20 mensajes por minuto
  if (select count(*) from rdc_gift_messages where member_id = me.id and created_at > now() - interval '1 minute') >= 20 then
    return jsonb_build_object('error','despacio');
  end if;
  insert into rdc_gift_messages(item_id, member_id, body) values (p_item, me.id, v);
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.rdc_gift_json(uuid, uuid) from public, anon, authenticated;
grant execute on function public.rdc_messages(uuid, uuid), public.rdc_send_message(uuid, uuid, text) to anon;
