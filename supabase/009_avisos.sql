-- Carta de Reyes · 009: notificaciones en el móvil (web push)
-- La base de datos llama a la función «notify» (supabase/functions/notify) cuando pasa algo.
-- Después de ejecutar este archivo hay que guardar, sin subirlos a GitHub:
--   insert into rdc_config values ('notify_url', 'https://<ref>.supabase.co/functions/v1/notify'),
--                                 ('notify_secret', '<el mismo NOTIFY_SECRET de la función>')
--   on conflict (key) do update set value = excluded.value;
-- Pegar entero en Supabase > SQL Editor > Run. Se puede ejecutar varias veces.

create extension if not exists pg_net with schema extensions;

create table if not exists public.rdc_push (
  endpoint   text primary key,
  member_id  uuid not null references public.rdc_members(id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
alter table public.rdc_push enable row level security;
revoke all on public.rdc_push from anon, authenticated;

create or replace function public.rdc_push_subscribe(p_token uuid, p_sub jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  if coalesce(p_sub->>'endpoint','') !~ '^https://' or p_sub#>>'{keys,p256dh}' is null or p_sub#>>'{keys,auth}' is null then
    return jsonb_build_object('error','suscripcion');
  end if;
  insert into rdc_push(endpoint, member_id, p256dh, auth)
  values (left(p_sub->>'endpoint', 1000), me.id, left(p_sub#>>'{keys,p256dh}', 200), left(p_sub#>>'{keys,auth}', 100))
  on conflict (endpoint) do update set member_id = excluded.member_id, p256dh = excluded.p256dh, auth = excluded.auth;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rdc_push_unsubscribe(p_endpoint text) returns jsonb
language sql security definer set search_path = public as $$
  delete from rdc_push where endpoint = p_endpoint; select jsonb_build_object('ok', true)
$$;

-- envía un aviso; si algo falla nunca rompe lo que estaba haciendo el usuario
create or replace function public.rdc_notify(p_members uuid[], p_title text, p_body text, p_url text, p_tag text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v_url text := (select value from rdc_config where key = 'notify_url');
        v_secret text := (select value from rdc_config where key = 'notify_secret');
begin
  if v_url is null or p_members is null or cardinality(p_members) = 0 then return; end if;
  if not exists (select 1 from rdc_push where member_id = any(p_members)) then return; end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('members', to_jsonb(p_members), 'title', p_title, 'body', p_body,
      'url', coalesce(p_url, './'), 'tag', p_tag),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_secret),
    timeout_milliseconds := 8000);
exception when others then null;
end $$;

create or replace function public.rdc_others(p_except uuid[]) returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(id), '{}') from rdc_members where approved and not (id = any(p_except))
$$;

-- deseo nuevo → al resto de la familia
create or replace function public.rdc_tg_item_new() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text := (select name from rdc_members where id = new.owner_id);
begin
  perform rdc_notify(rdc_others(array[new.owner_id]), v_name || ' ha pedido algo nuevo',
    '«' || new.title || '»', './#lista-' || new.owner_id, 'items-' || new.owner_id);
  return new;
end $$;
drop trigger if exists rdc_item_new on public.rdc_items;
create trigger rdc_item_new after insert on public.rdc_items for each row execute function public.rdc_tg_item_new();

-- «ya no lo quiero» → solo a quien ya lo estaba regalando
create or replace function public.rdc_tg_item_discard() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text := (select name from rdc_members where id = new.owner_id);
begin
  if new.discarded and not old.discarded then
    perform rdc_notify((select coalesce(array_agg(member_id), '{}') from rdc_gift_members where item_id = new.id),
      v_name || ' ya no quiere un regalo tuyo', '«' || new.title || '». Ábrelo para decidir qué hacer.', './#regalos', 'discard-' || new.id);
  end if;
  return new;
end $$;
drop trigger if exists rdc_item_discard on public.rdc_items;
create trigger rdc_item_discard after update of discarded on public.rdc_items for each row execute function public.rdc_tg_item_discard();

-- regalos a medias: propuesta nueva → familia (menos el dueño); alguien se apunta → los que ya estaban
create or replace function public.rdc_tg_gift_member() returns trigger
language plpgsql security definer set search_path = public as $$
declare g rdc_gifts; i rdc_items; v_who text; v_owner text; v_members uuid[];
begin
  select * into g from rdc_gifts where item_id = new.item_id;
  if not g.open then return new; end if;
  select * into i from rdc_items where id = new.item_id;
  v_who := (select name from rdc_members where id = new.member_id);
  v_owner := (select name from rdc_members where id = i.owner_id);
  select array_agg(member_id) into v_members from rdc_gift_members where item_id = new.item_id and member_id <> new.member_id;
  if v_members is null then
    perform rdc_notify(rdc_others(array[i.owner_id, new.member_id]), v_who || ' propone regalar a medias',
      '«' || i.title || '» para ' || v_owner || '. ¿Te apuntas?', './#lista-' || i.owner_id, 'share-' || i.id);
  else
    perform rdc_notify(v_members, v_who || ' se ha apuntado a medias', '«' || i.title || '» para ' || v_owner, './#regalos', 'share-' || i.id);
  end if;
  return new;
end $$;
drop trigger if exists rdc_gift_member on public.rdc_gift_members;
create trigger rdc_gift_member after insert on public.rdc_gift_members for each row execute function public.rdc_tg_gift_member();

create or replace function public.rdc_tg_gift_open() returns trigger
language plpgsql security definer set search_path = public as $$
declare i rdc_items; v_who text;
begin
  if new.open and not old.open then
    select * into i from rdc_items where id = new.item_id;
    v_who := (select m.name from rdc_gift_members gm join rdc_members m on m.id = gm.member_id where gm.item_id = new.item_id order by gm.created_at limit 1);
    perform rdc_notify(rdc_others(array[i.owner_id] || (select array_agg(member_id) from rdc_gift_members where item_id = new.item_id)),
      coalesce(v_who, 'Alguien') || ' propone regalar a medias',
      '«' || i.title || '» para ' || (select name from rdc_members where id = i.owner_id) || '. ¿Te apuntas?', './#lista-' || i.owner_id, 'share-' || i.id);
  end if;
  return new;
end $$;
drop trigger if exists rdc_gift_open on public.rdc_gifts;
create trigger rdc_gift_open after update of open on public.rdc_gifts for each row execute function public.rdc_tg_gift_open();

-- chat del regalo → los demás participantes
create or replace function public.rdc_tg_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_who text := (select name from rdc_members where id = new.member_id);
        v_title text := (select title from rdc_items where id = new.item_id);
begin
  perform rdc_notify((select coalesce(array_agg(member_id), '{}') from rdc_gift_members where item_id = new.item_id and member_id <> new.member_id),
    v_who || ' · «' || left(v_title, 40) || '»', left(new.body, 140), './#regalos', 'chat-' || new.item_id);
  return new;
end $$;
drop trigger if exists rdc_message on public.rdc_gift_messages;
create trigger rdc_message after insert on public.rdc_gift_messages for each row execute function public.rdc_tg_message();

-- personas nuevas → administradores; aceptada → a ella
create or replace function public.rdc_tg_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and not new.approved then
    perform rdc_notify((select coalesce(array_agg(id), '{}') from rdc_members where is_admin and approved),
      new.name || ' quiere entrar en la familia', 'Ábrela para aceptarle o rechazarle.', './', 'requests');
  elsif tg_op = 'UPDATE' and new.approved and not old.approved then
    perform rdc_notify(array[new.id], '¡Ya estás dentro!', 'Ya puedes ver las cartas de la familia y escribir la tuya.', './', 'approved');
  end if;
  return new;
end $$;
drop trigger if exists rdc_member on public.rdc_members;
create trigger rdc_member after insert or update of approved on public.rdc_members for each row execute function public.rdc_tg_member();

-- foto nueva en el álbum → al resto
create or replace function public.rdc_tg_album() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform rdc_notify(rdc_others(array[new.member_id]), (select name from rdc_members where id = new.member_id) || ' ha subido una foto',
    coalesce(new.caption, 'Mírala en el álbum de Reyes'), './#album', 'album');
  return new;
end $$;
drop trigger if exists rdc_album_new on public.rdc_album;
create trigger rdc_album_new after insert on public.rdc_album for each row execute function public.rdc_tg_album();

revoke execute on function public.rdc_notify(uuid[], text, text, text, text), public.rdc_others(uuid[]) from public, anon, authenticated;
grant execute on function public.rdc_push_subscribe(uuid, jsonb), public.rdc_push_unsubscribe(text) to anon;
