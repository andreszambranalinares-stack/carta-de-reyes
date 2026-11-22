-- Carta de Reyes · 005: deseos sin enlace («Idea / Sorpréndeme»)
-- kind = 'product' (con enlace/foto) o 'idea' (p. ej. «un libro de fantasía»; price = precio máximo).
-- Pegar entero en Supabase > SQL Editor > Run. Se puede ejecutar varias veces.

alter table public.rdc_items add column if not exists kind text not null default 'product';
do $$ begin
  alter table public.rdc_items add constraint rdc_items_kind check (kind in ('product', 'idea'));
exception when duplicate_object then null; end $$;

create or replace function public.rdc_item_json(i public.rdc_items) returns jsonb
language sql stable as $$
  select jsonb_build_object('id', i.id, 'owner_id', i.owner_id, 'title', i.title, 'url', i.url,
    'image', i.image, 'price', i.price, 'category', i.category, 'priority', i.priority,
    'notes', i.notes, 'created_at', i.created_at, 'kind', i.kind)
$$;

create or replace function public.rdc_save_item(p_token uuid, p_item jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me rdc_members := rdc_me(p_token); v_id uuid; v_title text; v_price numeric;
  v_kind text := case when p_item->>'kind' = 'idea' then 'idea' else 'product' end;
  v_url text := case when v_kind = 'idea' then null else left(p_item->>'url', 2000) end;
  v_image text := case when v_kind = 'idea' then null else p_item->>'image' end;
begin
  if me.id is null then return jsonb_build_object('error','sesion'); end if;
  v_title := left(trim(coalesce(p_item->>'title','')), 160);
  if v_title = '' then return jsonb_build_object('error','titulo'); end if;
  if length(coalesce(v_image,'')) > 600000 then return jsonb_build_object('error','imagen'); end if;
  begin v_price := nullif(p_item->>'price','')::numeric; exception when others then v_price := null; end;
  if nullif(p_item->>'id','') is null then
    insert into rdc_items(owner_id, title, url, image, price, category, priority, notes, kind)
    values (me.id, v_title, v_url, v_image, v_price,
            nullif(left(trim(coalesce(p_item->>'category','')), 40), ''),
            greatest(1, least(3, coalesce((p_item->>'priority')::int, 2))),
            nullif(left(trim(coalesce(p_item->>'notes','')), 500), ''), v_kind)
    returning id into v_id;
  else
    update rdc_items set title = v_title, url = v_url, image = v_image,
      price = v_price, category = nullif(left(trim(coalesce(p_item->>'category','')), 40), ''),
      priority = greatest(1, least(3, coalesce((p_item->>'priority')::int, 2))),
      notes = nullif(left(trim(coalesce(p_item->>'notes','')), 500), ''), kind = v_kind, updated_at = now()
    where id = (p_item->>'id')::uuid and owner_id = me.id
    returning id into v_id;
    if v_id is null then return jsonb_build_object('error','no_existe'); end if;
  end if;
  return jsonb_build_object('id', v_id);
end $$;

revoke execute on function public.rdc_item_json(public.rdc_items) from public, anon, authenticated;
grant execute on function public.rdc_save_item(uuid, jsonb) to anon;
