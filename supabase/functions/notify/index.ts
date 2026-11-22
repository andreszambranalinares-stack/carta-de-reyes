// Carta de Reyes · función «notify»: envía notificaciones push a los móviles de la familia.
// La llama la propia base de datos (pg_net) con una cabecera secreta; nunca la web.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT")!, Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);

Deno.serve(async (req) => {
  if (req.headers.get("x-notify-secret") !== Deno.env.get("NOTIFY_SECRET")) return new Response("no", { status: 401 });
  const { members, title, body, url, tag } = await req.json();
  if (!Array.isArray(members) || !members.length) return Response.json({ sent: 0 });
  const { data: subs } = await sb.from("rdc_push").select("endpoint,p256dh,auth").in("member_id", members);
  let sent = 0;
  const gone: string[] = [];
  const payload = JSON.stringify({ title, body, url, tag });
  await Promise.all((subs || []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400, urgency: "normal" });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) gone.push(s.endpoint); // suscripción caducada: se borra
    }
  }));
  if (gone.length) await sb.from("rdc_push").delete().in("endpoint", gone);
  return Response.json({ sent, gone: gone.length });
});
