-- Carta de Reyes · 010: vigilar el precio de los deseos con enlace
-- La función «prices» (supabase/functions/prices) revisa unos pocos deseos cada vez; pg_cron la llama cada 2 horas.
-- Si el precio cambia, se guarda el anterior y se avisa al dueño y a quien lo esté regalando.
-- Pegar entero en Supabase > SQL Editor > Run. Se puede ejecutar varias veces.

create extension if not exists pg_cron;

alter table public.rdc_items add column if not exists price_prev       numeric(10,2);
alter table public.rdc_items add column if not exists price_changed_at timestamptz;
alter table public.rdc_items add column if not exists price_checked_at timestamptz;

create or replace function public.rdc_item_json(i public.rdc_items) returns jsonb
language sql stable as $$
  select jsonb_build_object('id', i.id, 'owner_id', i.owner_id, 'title', i.title, 'url', i.url,
    'image', i.image, 'price', i.price, 'category', i.category, 'priority', i.priority,
    'notes', i.notes, 'created_at', i.created_at, 'kind', i.kind, 'discarded', i.discarded, 'position', i.position,
    'price_prev', i.price_prev, 'price_changed_at', i.price_changed_at)
$$;

-- qué revisar ahora: los que llevan más tiempo sin mirar
create or replace function public.rdc_price_queue(p_limit int) returns table(id uuid, url text, price numeric)
language sql security definer set search_path = public as $$
  select i.id, i.url, i.price from rdc_items i
  where i.kind = 'product' and not i.discarded and i.url ~ '^https?://'
    and (i.price_checked_at is null or i.price_checked_at < now() - interval '6 hours')
  order by i.price_checked_at nulls first limit greatest(1, least(p_limit, 30))
$$;

-- guarda lo que ha encontrado la función y avisa si el precio ha cambiado de verdad (≥ 1 % y ≥ 0,50 €)
create or replace function public.rdc_price_result(p_item uuid, p_price numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare i rdc_items; v_owner text; v_dir text;
begin
  select * into i from rdc_items where id = p_item;
  if i.id is null then return jsonb_build_object('error','no_existe'); end if;
  update rdc_items set price_checked_at = now() where id = p_item;
  if p_price is null or p_price <= 0 or p_price > 100000 then return jsonb_build_object('ok', true, 'changed', false); end if;
  if i.price is null then
    update rdc_items set price = p_price where id = p_item;
    return jsonb_build_object('ok', true, 'changed', false);
  end if;
  if abs(p_price - i.price) < greatest(0.5, i.price * 0.01) then return jsonb_build_object('ok', true, 'changed', false); end if;
  update rdc_items set price_prev = i.price, price = p_price, price_changed_at = now() where id = p_item;
  v_owner := (select name from rdc_members where id = i.owner_id);
  v_dir := case when p_price < i.price then 'Ha bajado' else 'Ha subido' end;
  -- al dueño (su propio deseo) y a quien lo esté regalando
  perform rdc_notify(array[i.owner_id] || coalesce((select array_agg(member_id) from rdc_gift_members where item_id = i.id), '{}'),
    v_dir || ' el precio de «' || left(i.title, 50) || '»',
    to_char(i.price, 'FM999G990D00') || ' € → ' || to_char(p_price, 'FM999G990D00') || ' €', './#regalos', 'price-' || i.id);
  return jsonb_build_object('ok', true, 'changed', true);
end $$;

revoke execute on function public.rdc_price_queue(int), public.rdc_price_result(uuid, numeric) from public, anon, authenticated;
grant execute on function public.rdc_price_queue(int), public.rdc_price_result(uuid, numeric) to service_role;

-- cada 2 horas
do $$ begin perform cron.unschedule('rdc-prices'); exception when others then null; end $$;
select cron.schedule('rdc-prices', '17 */2 * * *', $cron$
  select net.http_post(
    url := replace((select value from public.rdc_config where key = 'notify_url'), '/notify', '/prices'),
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', (select value from public.rdc_config where key = 'notify_secret')),
    timeout_milliseconds := 120000)
$cron$);
