// Money Magnet: ForexFactory calendar relay (Supabase Edge Function "ff-calendar").
// Fetches ForexFactory's public weekly calendar feed on the server, so the app can read it
// without browser restrictions. Results are cached for 15 minutes to respect ForexFactory's limits.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const cache: Record<string, { t: number; body: string }> = {};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  let week = new URL(req.url).searchParams.get("week") ?? "";
  if (!week && req.method === "POST") {
    try { week = (await req.json())?.week ?? ""; } catch { /* no body */ }
  }
  const wk = week === "nextweek" ? "nextweek" : "thisweek";
  const hit = cache[wk];
  if (hit && Date.now() - hit.t < 15 * 60 * 1000) {
    return new Response(hit.body, { headers: { ...cors, "Content-Type": "application/json" } });
  }
  try {
    const r = await fetch(`https://nfs.faireconomy.media/ff_calendar_${wk}.json`, {
      headers: { "User-Agent": "MoneyMagnet/1.0 (trading journal)" },
    });
    const body = await r.text();
    if (!r.ok) throw new Error("ForexFactory returned " + r.status);
    cache[wk] = { t: Date.now(), body };
    return new Response(body, { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    if (hit) return new Response(hit.body, { headers: { ...cors, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ error: String(e) }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
