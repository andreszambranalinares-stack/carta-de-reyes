// Carta de Reyes · función «prices»: revisa el precio de unos pocos deseos con enlace.
// La llama pg_cron cada 2 horas con la cabecera secreta. Lee la tienda a través de r.jina.ai
// (como hace la app al pegar un enlace) y guarda el precio con rdc_price_result.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const BLOCKED = /just a moment|attention required|access denied|acceso denegado|robot|captcha|lo sentimos|página no encontrada|not found/i;

function parsePrice(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return isFinite(raw) ? raw : null;
  let s = String(raw).replace(/[^\d.,]/g, "");
  if (!s) return null;
  const lc = s.lastIndexOf(","), ld = s.lastIndexOf(".");
  if (lc > -1 && ld > -1) s = lc > ld ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (lc > -1) s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = parseFloat(s);
  return isFinite(n) && n > 0 && n < 1e6 ? Math.round(n * 100) / 100 : null;
}

function findPrice(html: string): number | null {
  const title = (html.match(/<title[^>]*>([^<]*)/i) || [])[1] || "";
  if (BLOCKED.test(title)) return null;
  // 1) datos estructurados (JSON-LD) de la tienda
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const stack = [JSON.parse(m[1])];
      while (stack.length) {
        const n = stack.pop();
        if (!n || typeof n !== "object") continue;
        if (Array.isArray(n)) { stack.push(...n); continue; }
        if (n["@graph"]) stack.push(n["@graph"]);
        if (/Product/i.test([].concat(n["@type"] || []).join(" "))) {
          for (const o of [].concat(n.offers || [])) {
            const p = parsePrice(o?.price ?? o?.lowPrice ?? (o?.priceSpecification && [].concat(o.priceSpecification)[0]?.price));
            if (p) return p;
          }
          if (n.hasVariant) stack.push(n.hasVariant);
        }
      }
    } catch { /* JSON roto */ }
  }
  // 2) etiquetas meta
  const meta = html.match(/<meta[^>]+(?:property|name|itemprop)=["'](?:product:price:amount|og:price:amount|price)["'][^>]*content=["']([^"']+)/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["'](?:product:price:amount|og:price:amount|price)["']/i);
  if (meta) { const p = parsePrice(meta[1]); if (p) return p; }
  const ip = html.match(/itemprop=["']price["'][^>]*content=["']([^"']+)/i);
  return ip ? parsePrice(ip[1]) : null;
}

async function check(url: string): Promise<number | null> {
  try {
    const r = await fetch("https://r.jina.ai/" + url, { headers: { "X-Return-Format": "html" }, signal: AbortSignal.timeout(25000) });
    if (!r.ok) return null;
    return findPrice(await r.text());
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.headers.get("x-notify-secret") !== Deno.env.get("NOTIFY_SECRET")) return new Response("no", { status: 401 });
  const { data: queue, error } = await sb.rpc("rdc_price_queue", { p_limit: 12 });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const out: unknown[] = [];
  // de 3 en 3 para no saturar al lector de páginas
  for (let k = 0; k < (queue || []).length; k += 3) {
    await Promise.all(queue.slice(k, k + 3).map(async (it: { id: string; url: string; price: number | null }) => {
      const price = await check(it.url);
      const { data } = await sb.rpc("rdc_price_result", { p_item: it.id, p_price: price });
      out.push({ id: it.id, price, ...(data || {}) });
    }));
  }
  return Response.json({ checked: out.length, results: out });
});
