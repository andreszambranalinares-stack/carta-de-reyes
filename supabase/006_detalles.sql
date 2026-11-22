-- Carta de Reyes · 006: tallas y gustos, «ya no lo quiero», orden de la carta y estado del regalo
-- Pegar entero en Supabase > SQL Editor > Run. Se puede ejecutar varias veces.

alter table public.rdc_members add column if not exists prefs jsonb not null default '{}'::jsonb;
alter table public.rdc_items   add column if not exists discarded boolean not null default false;
alter table public.rdc_items   add column if not exists position  int;
alter table public.rdc_gifts   add column if not exists status    text not null default 'pending';
do $$ begin
  alter table public.rdc_gifts add constraint rdc_gifts_status check (status in ('pending','ordered','shipping','home','wrapped'));
exception when duplicate_object then null; end $$;
update public.rdc_gifts set status = 'home' where bought and status = 'pending';

create or replace function public.rdc_item_json(i public.rdc_items) returns jsonb
language sql stable as $$
  select jsonb_build_object('id', i.id, 'owner_id', i.owner_id, 'title', i.title, 'url', i.url,
    'image', i.image, 'price', i.price, 'category', i.category, 'priority', i.priority,
    'notes', i.notes, 'created_at', i.created_at, 'kind', i.kind, 'discarded', i.discarded, 'position', i.position)
$$;

-- orden de una carta: el que haya puesto su dueño; si no, ilusión y fecha
create or replace function public.rdc_item_order(i public.rdc_items) returns text
language sql stable as $$
  select lpad(coalesce(i.position, 999999)::text, 7, '0') || (4 - i.priority)::text || to_char(9999999999 - extract(epoch from i.created_at), 'FM0000000000')
$$;

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
                    from rdc_gift_members gm join rdc_members m on m.id = gm.member_id where gm.item_id = p_item)))
    end
  from (select p_item as id) s left join rdc_gifts g on g.item_id = s.id
$$;

create or replace function public.rdc_items_list(p_token uuid, p_owner uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  if p_owner = me.id then
    -- tu propia lista: nunca se ve quién ha reservado qué
    return jsonb_build_object('items', coalesce((
      select jsonb_agg(rdc_item_json(i) order by i.discarded, rdc_item_order(i))
      from rdc_items i where i.owner_id = me.id), '[]'::jsonb));
  end if;
  -- lo descartado solo lo ve quien ya participaba en ese regalo (para avisarle)
  return jsonb_build_object('items', coalesce((
    select jsonb_agg(rdc_item_json(i) || rdc_gift_json(i.id, me.id) order by i.discarded, rdc_item_order(i))
    from rdc_items i where i.owner_id = p_owner
      and (not i.discarded or exists (select 1 from rdc_gift_members gm where gm.item_id = i.id and gm.member_id = me.id))), '[]'::jsonb));
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
      'admin', me.is_admin, 'fails', me.fails_alert, 'prefs', me.prefs,
      'count', (select count(*) from rdc_items where owner_id = me.id and not discarded)),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'color', m.color, 'photo', m.photo, 'prefs', m.prefs,
        'count', (select count(*) from rdc_items i where i.owner_id = m.id and not i.discarded),
        'mine',  (select count(*) from rdc_items i join rdc_gift_members gm on gm.item_id = i.id
                  where i.owner_id = m.id and gm.member_id = me.id),
        'new',   case when coalesce(p_seen, '{}'::jsonb) ? m.id::text then
                   (select count(*) from rdc_items i where i.owner_id = m.id and not i.discarded
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

-- no se puede reservar algo que su dueño ya no quiere
create or replace function public.rdc_reserve(p_token uuid, p_item uuid, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token); v_owner uuid; v_disc boolean;
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  select owner_id, discarded into v_owner, v_disc from rdc_items where id = p_item;
  if v_owner is null then return jsonb_build_object('error','no_existe'); end if;
  if v_owner = me.id then return jsonb_build_object('error','propio'); end if;
  if p_on then
    if v_disc then return jsonb_build_object('error','descartado'); end if;
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

create or replace function public.rdc_share(p_token uuid, p_item uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token); v_owner uuid; v_disc boolean; g rdc_gifts;
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  select owner_id, discarded into v_owner, v_disc from rdc_items where id = p_item;
  if v_owner is null then return jsonb_build_object('error','no_existe'); end if;
  if v_owner = me.id then return jsonb_build_object('error','propio'); end if;
  if v_disc then return jsonb_build_object('error','descartado'); end if;
  insert into rdc_gifts(item_id, open) values (p_item, true) on conflict do nothing;
  select * into g from rdc_gifts where item_id = p_item for update;
  if exists (select 1 from rdc_gift_members where item_id = p_item and member_id = me.id) then
    update rdc_gifts set open = true where item_id = p_item;
  elsif g.open or not exists (select 1 from rdc_gift_members where item_id = p_item) then
    update rdc_gifts set open = true where item_id = p_item;
    insert into rdc_gift_members(item_id, member_id) values (p_item, me.id);
  else
    return jsonb_build_object('error','ocupado');
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- «comprado» sigue funcionando y equivale a «en casa»
create or replace function public.rdc_set_bought(p_token uuid, p_item uuid, p_bought boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  if not exists (select 1 from rdc_gift_members where item_id = p_item and member_id = me.id) then
    return jsonb_build_object('error','no_existe');
  end if;
  update rdc_gifts set bought = coalesce(p_bought, false), status = case when p_bought then 'home' else 'pending' end where item_id = p_item;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rdc_set_status(p_token uuid, p_item uuid, p_status text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  if p_status not in ('pending','ordered','shipping','home','wrapped') then return jsonb_build_object('error','estado'); end if;
  if not exists (select 1 from rdc_gift_members where item_id = p_item and member_id = me.id) then
    return jsonb_build_object('error','no_existe');
  end if;
  update rdc_gifts set status = p_status, bought = p_status <> 'pending' where item_id = p_item;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rdc_set_discarded(p_token uuid, p_item uuid, p_discarded boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  update rdc_items set discarded = coalesce(p_discarded, false), updated_at = now() where id = p_item and owner_id = me.id;
  if not found then return jsonb_build_object('error','no_existe'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rdc_reorder(p_token uuid, p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  update rdc_items i set position = o.n
    from unnest(p_ids) with ordinality as o(id, n)
    where i.id = o.id and i.owner_id = me.id;
  return jsonb_build_object('ok', true);
end $$;

-- tallas y gustos: solo textos cortos y claves conocidas
create or replace function public.rdc_set_prefs(p_token uuid, p_prefs jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token); v jsonb := '{}'::jsonb; k text;
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  foreach k in array array['top','bottom','shoes','ring','colors','likes','dislikes','notes'] loop
    if nullif(trim(coalesce(p_prefs->>k, '')), '') is not null then
      v := v || jsonb_build_object(k, left(trim(p_prefs->>k), 200));
    end if;
  end loop;
  update rdc_members set prefs = v where id = me.id;
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
  public.rdc_approve(uuid,uuid,boolean), public.rdc_set_family(uuid,text),
  public.rdc_set_status(uuid,uuid,text), public.rdc_set_discarded(uuid,uuid,boolean),
  public.rdc_reorder(uuid,uuid[]), public.rdc_set_prefs(uuid,jsonb)
to anon;
