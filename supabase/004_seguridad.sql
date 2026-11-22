-- Carta de Reyes · 004: seguridad
-- - El código de familia se guarda cifrado en la base de datos (nunca en el código de la web).
--   Para ponerlo, después de ejecutar este archivo:
--     insert into rdc_config(key, value) values ('family', extensions.crypt('tucodigo', extensions.gen_salt('bf')))
--     on conflict (key) do update set value = excluded.value;
--   (en minúsculas y sin espacios). Luego el administrador puede cambiarlo desde la app.
-- - Bloqueo progresivo del PIN (5 min, 1 h, 24 h) y aviso al dueño de los intentos fallidos.
-- - Cambiar PIN y cerrar sesión en todos los móviles.
-- - Las personas nuevas quedan pendientes hasta que un administrador las acepte.
-- Se puede ejecutar varias veces.

create table if not exists public.rdc_config (key text primary key, value text not null);
alter table public.rdc_config enable row level security;
revoke all on public.rdc_config from anon, authenticated;

alter table public.rdc_members add column if not exists approved    boolean not null default true;
alter table public.rdc_members add column if not exists is_admin    boolean not null default false;
alter table public.rdc_members add column if not exists lock_level  int not null default 0;
alter table public.rdc_members add column if not exists fails_alert int not null default 0;
alter table public.rdc_members alter column approved set default false;  -- a partir de ahora, pendientes

create or replace function public.rdc_norm_code(p text) returns text
language sql immutable as $$ select lower(regexp_replace(coalesce(p, ''), '\s', '', 'g')) $$;

create or replace function public.rdc_family_ok(p_family text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from rdc_config where key = 'family' and value = crypt(rdc_norm_code(p_family), value))
$$;

-- solo miembros aceptados pueden usar la app
create or replace function public.rdc_me(p_token uuid) returns public.rdc_members
language sql stable security definer set search_path = public as $$
  select * from public.rdc_members where token = p_token and approved
$$;

create or replace function public.rdc_members_list(p_family text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not rdc_family_ok(p_family) then return jsonb_build_object('error','familia'); end if;
  return jsonb_build_object('members', coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'color', color, 'photo', photo, 'approved', approved) order by created_at)
    from rdc_members), '[]'::jsonb));
end $$;

create or replace function public.rdc_register(p_family text, p_name text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_name text := regexp_replace(trim(coalesce(p_name,'')), '\s+', ' ', 'g'); m rdc_members; v_first boolean;
begin
  if not rdc_family_ok(p_family) then return jsonb_build_object('error','familia'); end if;
  if length(v_name) < 1 or length(v_name) > 30 then return jsonb_build_object('error','nombre'); end if;
  if coalesce(p_pin,'') !~ '^[0-9]{4}$' then return jsonb_build_object('error','pin_formato'); end if;
  if exists (select 1 from rdc_members where name_key = lower(v_name)) then return jsonb_build_object('error','existe'); end if;
  if (select count(*) from rdc_members where not approved) >= 10 then return jsonb_build_object('error','muchos'); end if;
  v_first := not exists (select 1 from rdc_members where approved);
  insert into rdc_members(name, name_key, pin_hash, color, approved, is_admin)
  values (v_name, lower(v_name), crypt(p_pin, gen_salt('bf')), (select count(*) from rdc_members) % 8, v_first, v_first)
  returning * into m;
  return jsonb_build_object('token', m.token, 'id', m.id, 'name', m.name, 'color', m.color, 'pending', not m.approved);
end $$;

create or replace function public.rdc_login(p_family text, p_member uuid, p_pin text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare m rdc_members; v_wait interval;
begin
  if not rdc_family_ok(p_family) then return jsonb_build_object('error','familia'); end if;
  select * into m from rdc_members where id = p_member;
  if m.id is null then return jsonb_build_object('error','no_existe'); end if;
  if m.locked_until is not null and m.locked_until > now() then
    return jsonb_build_object('error','bloqueado', 'until', m.locked_until);
  end if;
  if crypt(coalesce(p_pin,''), m.pin_hash) = m.pin_hash then
    update rdc_members set failed = 0, lock_level = 0, locked_until = null where id = m.id;
    return jsonb_build_object('token', m.token, 'id', m.id, 'name', m.name, 'color', m.color, 'photo', m.photo, 'pending', not m.approved);
  end if;
  if m.failed + 1 >= 5 then
    v_wait := case m.lock_level when 0 then interval '5 minutes' when 1 then interval '1 hour' else interval '24 hours' end;
    update rdc_members set failed = 0, lock_level = lock_level + 1, fails_alert = fails_alert + 1,
      locked_until = now() + v_wait where id = m.id;
    return jsonb_build_object('error','bloqueado', 'until', now() + v_wait);
  end if;
  update rdc_members set failed = failed + 1, fails_alert = fails_alert + 1 where id = m.id;
  return jsonb_build_object('error','pin', 'left', 4 - m.failed);
end $$;

drop function if exists public.rdc_home(uuid, jsonb);
create or replace function public.rdc_home(p_token uuid, p_seen jsonb default '{}'::jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then
    if exists (select 1 from rdc_members where token = p_token and not approved) then
      return jsonb_build_object('error','pendiente', 'admins',
        (select string_agg(name, ', ') from rdc_members where is_admin));
    end if;
    return jsonb_build_object('error','sesion');
  end if;
  return jsonb_build_object(
    'me', jsonb_build_object('id', me.id, 'name', me.name, 'color', me.color, 'photo', me.photo, 'budget', me.budget,
      'admin', me.is_admin, 'fails', me.fails_alert,
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
      from rdc_members m where m.id <> me.id and m.approved), '[]'::jsonb),
    'pending', case when me.is_admin then coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'color', color, 'photo', photo, 'created_at', created_at) order by created_at)
      from rdc_members where not approved), '[]'::jsonb) else '[]'::jsonb end,
    'gifts', (select count(*) from rdc_gift_members where member_id = me.id),
    'now', now()
  );
exception when invalid_text_representation or invalid_datetime_format then
  return rdc_home(p_token, '{}'::jsonb);
end $$;

create or replace function public.rdc_change_pin(p_token uuid, p_old text, p_new text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare me rdc_members := rdc_me(p_token); v_token uuid := gen_random_uuid();
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  if crypt(coalesce(p_old,''), me.pin_hash) <> me.pin_hash then return jsonb_build_object('error','pin_actual'); end if;
  if coalesce(p_new,'') !~ '^[0-9]{4}$' then return jsonb_build_object('error','pin_formato'); end if;
  update rdc_members set pin_hash = crypt(p_new, gen_salt('bf')), token = v_token, fails_alert = 0 where id = me.id;
  return jsonb_build_object('token', v_token);
end $$;

create or replace function public.rdc_logout_all(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token); v_token uuid := gen_random_uuid();
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  update rdc_members set token = v_token where id = me.id;
  return jsonb_build_object('token', v_token);
end $$;

create or replace function public.rdc_ack_fails(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  update rdc_members set fails_alert = 0 where id = me.id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rdc_approve(p_token uuid, p_member uuid, p_ok boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  if not me.is_admin then return jsonb_build_object('error','admin'); end if;
  if p_ok then update rdc_members set approved = true where id = p_member and not approved;
  else delete from rdc_members where id = p_member and not approved; end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rdc_set_family(p_token uuid, p_code text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  if not me.is_admin then return jsonb_build_object('error','admin'); end if;
  if length(rdc_norm_code(p_code)) < 6 then return jsonb_build_object('error','codigo'); end if;
  insert into rdc_config(key, value) values ('family', crypt(rdc_norm_code(p_code), gen_salt('bf')))
  on conflict (key) do update set value = excluded.value;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.rdc_members_list(text), public.rdc_register(text,text,text), public.rdc_login(text,uuid,text),
  public.rdc_home(uuid,jsonb), public.rdc_items_list(uuid,uuid), public.rdc_my_gifts(uuid),
  public.rdc_save_item(uuid,jsonb), public.rdc_delete_item(uuid,uuid), public.rdc_reserve(uuid,uuid,boolean),
  public.rdc_set_photo(uuid,text), public.rdc_share(uuid,uuid), public.rdc_set_bought(uuid,uuid,boolean),
  public.rdc_set_amount(uuid,uuid,numeric), public.rdc_set_budget(uuid,numeric),
  public.rdc_change_pin(uuid,text,text), public.rdc_logout_all(uuid), public.rdc_ack_fails(uuid),
  public.rdc_approve(uuid,uuid,boolean), public.rdc_set_family(uuid,text)
to anon;
