// Money Magnet: "Big Money" relay (Supabase Edge Function "big-money").
// 1) Myfxbook Community Outlook: retail long/short positions for gold and forex.
//    Needs two secrets in Supabase: MYFXBOOK_EMAIL and MYFXBOOK_PASSWORD (a free Myfxbook account).
// 2) Binance futures public data, used only if a phone or browser cannot reach Binance directly.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

let session = "";
let outlook: { t: number; data: unknown } | null = null;

async function myfxbookLogin(): Promise<string> {
  const email = Deno.env.get("MYFXBOOK_EMAIL");
  const password = Deno.env.get("MYFXBOOK_PASSWORD");
  if (!email || !password) throw new Error("MYFXBOOK credentials are not set");
  const r = await fetch(
    `https://www.myfxbook.com/api/login.json?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
  );
  const j = await r.json();
  if (j.error || !j.session) throw new Error("Myfxbook login failed: " + (j.message || "check email and password"));
  return decodeURIComponent(j.session);
}

async function communityOutlook() {
  if (outlook && Date.now() - outlook.t < 10 * 60 * 1000) return outlook.data;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!session) session = await myfxbookLogin();
    const r = await fetch(`https://www.myfxbook.com/api/get-community-outlook.json?session=${encodeURIComponent(session)}`);
    const j = await r.json();
    if (!j.error) {
      const data = { symbols: j.symbols ?? [], general: j.general ?? {} };
      outlook = { t: Date.now(), data };
      return data;
    }
    session = ""; // session expired: log in again once
  }
  if (outlook) return outlook.data;
  throw new Error("Myfxbook did not return data");
}

const BINANCE_PATHS = [
  "/fapi/v1/klines", "/fapi/v1/premiumIndex", "/fapi/v1/openInterest",
  "/futures/data/openInterestHist", "/futures/data/globalLongShortAccountRatio",
  "/futures/data/topLongShortPositionRatio", "/futures/data/topLongShortAccountRatio",
  "/futures/data/takerlongshortRatio",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  let body: Record<string, unknown> = {};
  if (req.method === "POST") { try { body = await req.json(); } catch { /* empty */ } }
  const url = new URL(req.url);
  const src = String(body.src ?? url.searchParams.get("src") ?? "myfxbook");
  try {
    if (src === "myfxbook") return json(await communityOutlook());
    if (src === "binance") {
      const path = String(body.path ?? "");
      if (!BINANCE_PATHS.includes(path)) return json({ error: "path not allowed" }, 400);
      const params = new URLSearchParams((body.params ?? {}) as Record<string, string>);
      const r = await fetch(`https://fapi.binance.com${path}?${params}`);
      return new Response(await r.text(), { status: r.status, headers: { ...cors, "Content-Type": "application/json" } });
    }
    return json({ error: "unknown source" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 502);
  }
});
