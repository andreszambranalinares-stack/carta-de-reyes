-- Carta de Reyes · esquema para Supabase
-- Pegar entero en Supabase > SQL Editor > Run. Se puede ejecutar varias veces.
-- Todo el acceso va por funciones (RPC); las tablas no son accesibles directamente.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.rdc_members (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  name_key     text not null unique,
  pin_hash     text not null,
  token        uuid not null default gen_random_uuid(),
  color        int  not null default 0,
  failed       int  not null default 0,
  locked_until timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists public.rdc_items (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.rdc_members(id) on delete cascade,
  title      text not null,
  url        text,
  image      text,
  price      numeric(10,2),
  category   text,
  priority   int not null default 2 check (priority between 1 and 3),
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rdc_items_owner on public.rdc_items(owner_id);

create table if not exists public.rdc_reservations (
  item_id    uuid primary key references public.rdc_items(id) on delete cascade,
  member_id  uuid not null references public.rdc_members(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.rdc_members      enable row level security;
alter table public.rdc_items        enable row level security;
alter table public.rdc_reservations enable row level security;
revoke all on public.rdc_members, public.rdc_items, public.rdc_reservations from anon, authenticated;

-- ---------- helpers (no expuestos) ----------

-- El código de familia nunca se escribe aquí: se guarda cifrado en rdc_config (ver 004_seguridad.sql).
create table if not exists public.rdc_config (key text primary key, value text not null);
alter table public.rdc_config enable row level security;
revoke all on public.rdc_config from anon, authenticated;
create or replace function public.rdc_family_ok(p_family text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from rdc_config where key = 'family'
    and value = crypt(lower(regexp_replace(coalesce(p_family, ''), '\s', '', 'g')), value))
$$;

create or replace function public.rdc_me(p_token uuid) returns public.rdc_members
language sql stable security definer set search_path = public as $$
  select * from public.rdc_members where token = p_token
$$;

create or replace function public.rdc_item_json(i public.rdc_items) returns jsonb
language sql stable as $$
  select jsonb_build_object('id', i.id, 'owner_id', i.owner_id, 'title', i.title, 'url', i.url,
    'image', i.image, 'price', i.price, 'category', i.category, 'priority', i.priority,
    'notes', i.notes, 'created_at', i.created_at)
$$;

-- ---------- API pública ----------

create or replace function public.rdc_members_list(p_family text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not rdc_family_ok(p_family) then return jsonb_build_object('error','familia'); end if;
  return jsonb_build_object('members', coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'color', color) order by created_at)
    from rdc_members), '[]'::jsonb));
end $$;

create or replace function public.rdc_register(p_family text, p_name text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_name text := regexp_replace(trim(coalesce(p_name,'')), '\s+', ' ', 'g'); m rdc_members;
begin
  if not rdc_family_ok(p_family) then return jsonb_build_object('error','familia'); end if;
  if length(v_name) < 1 or length(v_name) > 30 then return jsonb_build_object('error','nombre'); end if;
  if coalesce(p_pin,'') !~ '^[0-9]{4}$' then return jsonb_build_object('error','pin_formato'); end if;
  if exists (select 1 from rdc_members where name_key = lower(v_name)) then
    return jsonb_build_object('error','existe');
  end if;
  insert into rdc_members(name, name_key, pin_hash, color)
  values (v_name, lower(v_name), crypt(p_pin, gen_salt('bf')), (select count(*) from rdc_members) % 8)
  returning * into m;
  return jsonb_build_object('token', m.token, 'id', m.id, 'name', m.name, 'color', m.color);
end $$;

create or replace function public.rdc_login(p_family text, p_member uuid, p_pin text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare m rdc_members;
begin
  if not rdc_family_ok(p_family) then return jsonb_build_object('error','familia'); end if;
  select * into m from rdc_members where id = p_member;
  if m.id is null then return jsonb_build_object('error','no_existe'); end if;
  if m.locked_until is not null and m.locked_until > now() then
    return jsonb_build_object('error','bloqueado');
  end if;
  if crypt(coalesce(p_pin,''), m.pin_hash) = m.pin_hash then
    update rdc_members set failed = 0, locked_until = null where id = m.id;
    return jsonb_build_object('token', m.token, 'id', m.id, 'name', m.name, 'color', m.color);
  end if;
  if m.failed + 1 >= 5 then
    update rdc_members set failed = 0, locked_until = now() + interval '5 minutes' where id = m.id;
    return jsonb_build_object('error','bloqueado');
  end if;
  update rdc_members set failed = failed + 1 where id = m.id;
  return jsonb_build_object('error','pin');
end $$;

create or replace function public.rdc_home(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  return jsonb_build_object(
    'me', jsonb_build_object('id', me.id, 'name', me.name, 'color', me.color,
      'count', (select count(*) from rdc_items where owner_id = me.id)),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'color', m.color,
        'count', (select count(*) from rdc_items i where i.owner_id = m.id),
        'mine',  (select count(*) from rdc_items i join rdc_reservations r on r.item_id = i.id
                  where i.owner_id = m.id and r.member_id = me.id)) order by m.created_at)
      from rdc_members m where m.id <> me.id), '[]'::jsonb),
    'gifts', (select count(*) from rdc_reservations where member_id = me.id)
  );
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
    select jsonb_agg(rdc_item_json(i) || jsonb_build_object(
      'reserved', r.member_id is not null,
      'reserved_by_me', r.member_id = me.id,
      'reserved_by', rm.name) order by i.priority desc, i.created_at desc)
    from rdc_items i
    left join rdc_reservations r on r.item_id = i.id
    left join rdc_members rm on rm.id = r.member_id
    where i.owner_id = p_owner), '[]'::jsonb));
end $$;

create or replace function public.rdc_my_gifts(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  return jsonb_build_object('items', coalesce((
    select jsonb_agg(rdc_item_json(i) || jsonb_build_object('owner_name', o.name, 'owner_color', o.color,
      'reserved', true, 'reserved_by_me', true) order by o.name, i.priority desc)
    from rdc_reservations r join rdc_items i on i.id = r.item_id join rdc_members o on o.id = i.owner_id
    where r.member_id = me.id), '[]'::jsonb));
end $$;

create or replace function public.rdc_save_item(p_token uuid, p_item jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token); v_id uuid; v_title text; v_price numeric;
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  v_title := left(trim(coalesce(p_item->>'title','')), 160);
  if v_title = '' then return jsonb_build_object('error','titulo'); end if;
  if length(coalesce(p_item->>'image','')) > 600000 then return jsonb_build_object('error','imagen'); end if;
  begin v_price := nullif(p_item->>'price','')::numeric; exception when others then v_price := null; end;
  if nullif(p_item->>'id','') is null then
    insert into rdc_items(owner_id, title, url, image, price, category, priority, notes)
    values (me.id, v_title, left(p_item->>'url', 2000), p_item->>'image', v_price,
            nullif(left(trim(coalesce(p_item->>'category','')), 40), ''),
            greatest(1, least(3, coalesce((p_item->>'priority')::int, 2))),
            nullif(left(trim(coalesce(p_item->>'notes','')), 500), ''))
    returning id into v_id;
  else
    update rdc_items set title = v_title, url = left(p_item->>'url', 2000), image = p_item->>'image',
      price = v_price, category = nullif(left(trim(coalesce(p_item->>'category','')), 40), ''),
      priority = greatest(1, least(3, coalesce((p_item->>'priority')::int, 2))),
      notes = nullif(left(trim(coalesce(p_item->>'notes','')), 500), ''), updated_at = now()
    where id = (p_item->>'id')::uuid and owner_id = me.id
    returning id into v_id;
    if v_id is null then return jsonb_build_object('error','no_existe'); end if;
  end if;
  return jsonb_build_object('id', v_id);
end $$;

create or replace function public.rdc_delete_item(p_token uuid, p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  delete from rdc_items where id = p_id and owner_id = me.id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rdc_reserve(p_token uuid, p_item uuid, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token); v_owner uuid; v_by uuid;
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  select owner_id into v_owner from rdc_items where id = p_item;
  if v_owner is null then return jsonb_build_object('error','no_existe'); end if;
  if v_owner = me.id then return jsonb_build_object('error','propio'); end if;
  if p_on then
    insert into rdc_reservations(item_id, member_id) values (p_item, me.id) on conflict (item_id) do nothing;
    select member_id into v_by from rdc_reservations where item_id = p_item;
    if v_by <> me.id then return jsonb_build_object('error','ocupado'); end if;
  else
    delete from rdc_reservations where item_id = p_item and member_id = me.id;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- Permisos: solo las funciones públicas son ejecutables desde la web
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.rdc_members_list(text), public.rdc_register(text,text,text), public.rdc_login(text,uuid,text),
  public.rdc_home(uuid), public.rdc_items_list(uuid,uuid), public.rdc_my_gifts(uuid),
  public.rdc_save_item(uuid,jsonb), public.rdc_delete_item(uuid,uuid), public.rdc_reserve(uuid,uuid,boolean)
to anon;
