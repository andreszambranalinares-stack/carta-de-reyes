-- Carta de Reyes · 008: álbum de fotos de la familia
-- Cada foto se guarda dos veces: miniatura (~240 px) para la cuadrícula y foto (~1200 px) para verla grande.
-- Pegar entero en Supabase > SQL Editor > Run. Se puede ejecutar varias veces.

create table if not exists public.rdc_album (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.rdc_members(id) on delete cascade,
  thumb      text not null,
  photo      text not null,
  caption    text,
  created_at timestamptz not null default now()
);
create index if not exists rdc_album_created on public.rdc_album(created_at desc);
alter table public.rdc_album enable row level security;
revoke all on public.rdc_album from anon, authenticated;

create or replace function public.rdc_album_list(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  return jsonb_build_object('photos', coalesce((
    select jsonb_agg(jsonb_build_object('id', a.id, 'member_id', a.member_id, 'name', m.name, 'color', m.color, 'avatar', m.photo,
      'thumb', a.thumb, 'caption', a.caption, 'created_at', a.created_at) order by a.created_at desc)
    from rdc_album a join rdc_members m on m.id = a.member_id), '[]'::jsonb));
end $$;

create or replace function public.rdc_album_photo(p_token uuid, p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token); v text;
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  select photo into v from rdc_album where id = p_id;
  if v is null then return jsonb_build_object('error','no_existe'); end if;
  return jsonb_build_object('photo', v);
end $$;

create or replace function public.rdc_album_add(p_token uuid, p_thumb text, p_photo text, p_caption text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token); v_id uuid;
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  if p_thumb not like 'data:image/%' or p_photo not like 'data:image/%'
     or length(p_thumb) > 80000 or length(p_photo) > 700000 then return jsonb_build_object('error','imagen'); end if;
  if (select count(*) from rdc_album where member_id = me.id and created_at > now() - interval '1 hour') >= 30 then
    return jsonb_build_object('error','despacio');
  end if;
  insert into rdc_album(member_id, thumb, photo, caption)
  values (me.id, p_thumb, p_photo, nullif(left(trim(coalesce(p_caption, '')), 200), '')) returning id into v_id;
  return jsonb_build_object('id', v_id);
end $$;

-- borrar: quien la subió o el administrador
create or replace function public.rdc_album_delete(p_token uuid, p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token);
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  delete from rdc_album where id = p_id and (member_id = me.id or me.is_admin);
  if not found then return jsonb_build_object('error','no_existe'); end if;
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.rdc_album_list(uuid), public.rdc_album_photo(uuid, uuid),
  public.rdc_album_add(uuid, text, text, text), public.rdc_album_delete(uuid, uuid) to anon;
