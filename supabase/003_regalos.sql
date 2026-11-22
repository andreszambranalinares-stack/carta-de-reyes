-- Carta de Reyes · 003: regalos a medias, «ya lo he comprado», novedades y presupuesto
-- Pegar entero en Supabase > SQL Editor > Run. Se puede ejecutar varias veces.
-- Compatible con la versión anterior de la web (mismas funciones, solo añade datos).

-- Un regalo = un deseo que alguien ha reservado. Puede ser de una persona o «a medias» (open = true).
create table if not exists public.rdc_gifts (
  item_id    uuid primary key references public.rdc_items(id) on delete cascade,
  open       boolean not null default false,
  bought     boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.rdc_gift_members (
  item_id    uuid not null references public.rdc_gifts(item_id) on delete cascade,
  member_id  uuid not null references public.rdc_members(id) on delete cascade,
  amount     numeric(10,2),
  created_at timestamptz not null default now(),
  primary key (item_id, member_id)
);
alter table public.rdc_gifts        enable row level security;
alter table public.rdc_gift_members enable row level security;
revoke all on public.rdc_gifts, public.rdc_gift_members from anon, authenticated;

alter table public.rdc_members add column if not exists budget numeric(10,2);

-- pasar las reservas antiguas al modelo nuevo
do $$ begin
  if to_regclass('public.rdc_reservations') is not null then
    insert into public.rdc_gifts(item_id, created_at)
      select item_id, created_at from public.rdc_reservations on conflict do nothing;
    insert into public.rdc_gift_members(item_id, member_id, created_at)
      select item_id, member_id, created_at from public.rdc_reservations on conflict do nothing;
    drop table public.rdc_reservations;
  end if;
end $$;

-- si alguien se queda solo sin compañeros o se va el último, se limpia
create or replace function public.rdc_gift_cleanup(p_item uuid) returns void
language sql security definer set search_path = public as $$
  delete from rdc_gifts g where g.item_id = p_item
    and not exists (select 1 from rdc_gift_members gm where gm.item_id = p_item)
$$;

-- estado del regalo de un deseo tal y como lo ve otro miembro (nunca el dueño)
create or replace function public.rdc_gift_json(p_item uuid, p_me uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when g.item_id is null then
      jsonb_build_object('reserved', false, 'reserved_by_me', false, 'reserved_by', null, 'gift', null)
    else jsonb_build_object(
      'reserved', true,
      'reserved_by_me', exists (select 1 from rdc_gift_members x where x.item_id = p_item and x.member_id = p_me),
      'reserved_by', (select string_agg(m.name, ', ' order by gm.created_at) from rdc_gift_members gm join rdc_members m on m.id = gm.member_id where gm.item_id = p_item),
      'gift', jsonb_build_object('open', g.open, 'bought', g.bought,
        'members', (select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'color', m.color, 'photo', m.photo, 'amount', gm.amount) order by gm.created_at)
                    from rdc_gift_members gm join rdc_members m on m.id = gm.member_id where gm.item_id = p_item)))
    end
  from (select p_item as id) s left join rdc_gifts g on g.item_id = s.id
$$;

drop function if exists public.rdc_home(uuid);
create or replace function public.rdc_home(p_token uuid, p_seen jsonb default '{}'::jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  return jsonb_build_object(
    'me', jsonb_build_object('id', me.id, 'name', me.name, 'color', me.color, 'photo', me.photo, 'budget', me.budget,
      'count', (select count(*) from rdc_items where owner_id = me.id)),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'color', m.color, 'photo', m.photo,
        'count', (select count(*) from rdc_items i where i.owner_id = m.id),
        'mine',  (select count(*) from rdc_items i join rdc_gift_members gm on gm.item_id = i.id
                  where i.owner_id = m.id and gm.member_id = me.id),
        'new',   case when coalesce(p_seen, '{}'::jsonb) ? m.id::text then
                   (select count(*) from rdc_items i where i.owner_id = m.id
                      and i.created_at > (p_seen->>m.id::text)::timestamptz)
                 else 0 end) order by m.created_at)
      from rdc_members m where m.id <> me.id), '[]'::jsonb),
    'gifts', (select count(*) from rdc_gift_members where member_id = me.id),
    'now', now()
  );
exception when invalid_text_representation or invalid_datetime_format then
  return rdc_home(p_token, '{}'::jsonb);
end $$;

create or replace function public.rdc_items_list(p_token uuid, p_owner uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  if p_owner = me.id then
    -- tu propia lista: nunca se ve quién ha reservado qué
    return jsonb_build_object('items', coalesce((
      select jsonb_agg(rdc_item_json(i) order by i.priority desc, i.created_at desc)
      from rdc_items i where i.owner_id = me.id), '[]'::jsonb));
  end if;
  return jsonb_build_object('items', coalesce((
    select jsonb_agg(rdc_item_json(i) || rdc_gift_json(i.id, me.id) order by i.priority desc, i.created_at desc)
    from rdc_items i where i.owner_id = p_owner), '[]'::jsonb));
end $$;

create or replace function public.rdc_my_gifts(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  return jsonb_build_object('budget', me.budget, 'items', coalesce((
    select jsonb_agg(rdc_item_json(i) || rdc_gift_json(i.id, me.id) || jsonb_build_object(
      'owner_name', o.name, 'owner_color', o.color, 'owner_photo', o.photo) order by o.name, i.priority desc)
    from rdc_gift_members gm join rdc_items i on i.id = gm.item_id join rdc_members o on o.id = i.owner_id
    where gm.member_id = me.id), '[]'::jsonb));
end $$;

-- reservar para mí solo (p_on = true) o soltar mi parte (p_on = false)
create or replace function public.rdc_reserve(p_token uuid, p_item uuid, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token); v_owner uuid;
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  select owner_id into v_owner from rdc_items where id = p_item;
  if v_owner is null then return jsonb_build_object('error','no_existe'); end if;
  if v_owner = me.id then return jsonb_build_object('error','propio'); end if;
  if p_on then
    insert into rdc_gifts(item_id) values (p_item) on conflict do nothing;
    if exists (select 1 from rdc_gift_members where item_id = p_item and member_id <> me.id) then
      return jsonb_build_object('error','ocupado');
    end if;
    insert into rdc_gift_members(item_id, member_id) values (p_item, me.id) on conflict do nothing;
    update rdc_gifts set open = false where item_id = p_item;
  else
    delete from rdc_gift_members where item_id = p_item and member_id = me.id;
    perform rdc_gift_cleanup(p_item);
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- proponer o unirse a un regalo a medias
create or replace function public.rdc_share(p_token uuid, p_item uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token); v_owner uuid; g rdc_gifts;
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  select owner_id into v_owner from rdc_items where id = p_item;
  if v_owner is null then return jsonb_build_object('error','no_existe'); end if;
  if v_owner = me.id then return jsonb_build_object('error','propio'); end if;
  insert into rdc_gifts(item_id, open) values (p_item, true) on conflict do nothing;
  select * into g from rdc_gifts where item_id = p_item for update;
  if exists (select 1 from rdc_gift_members where item_id = p_item and member_id = me.id) then
    update rdc_gifts set open = true where item_id = p_item;          -- era mío: lo abro a medias
  elsif g.open or not exists (select 1 from rdc_gift_members where item_id = p_item) then
    update rdc_gifts set open = true where item_id = p_item;
    insert into rdc_gift_members(item_id, member_id) values (p_item, me.id);
  else
    return jsonb_build_object('error','ocupado');                       -- lo regala otra persona sola
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rdc_set_bought(p_token uuid, p_item uuid, p_bought boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  if not exists (select 1 from rdc_gift_members where item_id = p_item and member_id = me.id) then
    return jsonb_build_object('error','no_existe');
  end if;
  update rdc_gifts set bought = coalesce(p_bought, false) where item_id = p_item;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rdc_set_amount(p_token uuid, p_item uuid, p_amount numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  if p_amount is not null and (p_amount < 0 or p_amount > 100000) then return jsonb_build_object('error','importe'); end if;
  update rdc_gift_members set amount = p_amount where item_id = p_item and member_id = me.id;
  if not found then return jsonb_build_object('error','no_existe'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rdc_set_budget(p_token uuid, p_amount numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  if p_amount is not null and (p_amount <= 0 or p_amount > 100000) then return jsonb_build_object('error','importe'); end if;
  update rdc_members set budget = p_amount where id = me.id;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.rdc_members_list(text), public.rdc_register(text,text,text), public.rdc_login(text,uuid,text),
  public.rdc_home(uuid,jsonb), public.rdc_items_list(uuid,uuid), public.rdc_my_gifts(uuid),
  public.rdc_save_item(uuid,jsonb), public.rdc_delete_item(uuid,uuid), public.rdc_reserve(uuid,uuid,boolean),
  public.rdc_set_photo(uuid,text), public.rdc_share(uuid,uuid), public.rdc_set_bought(uuid,uuid,boolean),
  public.rdc_set_amount(uuid,uuid,numeric), public.rdc_set_budget(uuid,numeric)
to anon;
