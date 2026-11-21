-- Carta de Reyes · 002: fotos de perfil
-- Pegar entero en Supabase > SQL Editor > Run. Se puede ejecutar varias veces.

alter table public.rdc_members add column if not exists photo text;

create or replace function public.rdc_members_list(p_family text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not rdc_family_ok(p_family) then return jsonb_build_object('error','familia'); end if;
  return jsonb_build_object('members', coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'color', color, 'photo', photo) order by created_at)
    from rdc_members), '[]'::jsonb));
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
    return jsonb_build_object('token', m.token, 'id', m.id, 'name', m.name, 'color', m.color, 'photo', m.photo);
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
    'me', jsonb_build_object('id', me.id, 'name', me.name, 'color', me.color, 'photo', me.photo,
      'count', (select count(*) from rdc_items where owner_id = me.id)),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'color', m.color, 'photo', m.photo,
        'count', (select count(*) from rdc_items i where i.owner_id = m.id),
        'mine',  (select count(*) from rdc_items i join rdc_reservations r on r.item_id = i.id
                  where i.owner_id = m.id and r.member_id = me.id)) order by m.created_at)
      from rdc_members m where m.id <> me.id), '[]'::jsonb),
    'gifts', (select count(*) from rdc_reservations where member_id = me.id)
  );
end $$;

create or replace function public.rdc_my_gifts(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  return jsonb_build_object('items', coalesce((
    select jsonb_agg(rdc_item_json(i) || jsonb_build_object('owner_name', o.name, 'owner_color', o.color,
      'owner_photo', o.photo, 'reserved', true, 'reserved_by_me', true) order by o.name, i.priority desc)
    from rdc_reservations r join rdc_items i on i.id = r.item_id join rdc_members o on o.id = i.owner_id
    where r.member_id = me.id), '[]'::jsonb));
end $$;

create or replace function public.rdc_set_photo(p_token uuid, p_photo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  if p_photo is not null and (length(p_photo) > 150000 or p_photo not like 'data:image/%') then
    return jsonb_build_object('error','imagen');
  end if;
  update rdc_members set photo = p_photo where id = me.id;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.rdc_set_photo(uuid, text) from public, authenticated;
grant execute on function public.rdc_set_photo(uuid, text) to anon;
