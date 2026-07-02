// Cloudflare Pages Function for /iniciativa/:id.
//
// Devices with the app never reach this (universal/app link opens the app).
// For everyone else — including link crawlers (iMessage, WhatsApp, etc.),
// which don't run JS — it serves iniciativa-app.html with the generic
// preview tags rewritten to the actual initiative's title and summary.
//
// This replaces the old `_redirects` rewrite: redirects run BEFORE Functions
// on Pages, so a `/iniciativa/*` rule there would prevent this from running.

const SUPABASE_URL = "https://fnvtibybkxujurxrilfg.supabase.co";
const SUPABASE_KEY = "sb_publishable_BAYxTO8BAW_WG1ng5zCnqg_uu8LqZDj";
const SITE_URL = "https://assembleiaapp.com";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Pages' clean-URL handling answers asset fetches with a redirect for .html
// paths, so follow one hop manually.
async function fetchPage(context) {
  let res = await context.env.ASSETS.fetch(new URL("/iniciativa-app.html", context.request.url));
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location");
    if (location) res = await context.env.ASSETS.fetch(new URL(location, context.request.url));
  }
  return res;
}

async function fetchInitiative(id) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/iniciativas?id=eq.${id}&select=titulo,tipo,resultado,summary`,
    { headers: { apikey: SUPABASE_KEY } }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows && rows[0] ? rows[0] : null;
}

function truncate(text, max) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

function injectPreview(html, it, id) {
  const title = truncate(it.titulo, 300);
  const bits = [it.tipo, it.resultado].filter(Boolean).join(" · ");
  const description = it.summary
    ? truncate(it.summary, 200)
    : (bits || "Uma iniciativa da Assembleia da República, na app AssembLeia.");

  return html
    .replace(
      "<title>Iniciativa - AssembLeia</title>",
      `<title>${esc(title)} - AssembLeia</title>`
    )
    .replace(
      /<meta name="description" content="[^"]*">/,
      `<meta name="description" content="${esc(description)}">`
    )
    .replace(
      '<meta property="og:title" content="AssembLeia">',
      `<meta property="og:title" content="${esc(title)}">`
    )
    .replace(
      /<meta property="og:description" content="[^"]*">/,
      `<meta property="og:description" content="${esc(description)}">`
    )
    .replace(
      '<meta property="og:type" content="website">',
      `<meta property="og:type" content="website">\n  <meta property="og:url" content="${SITE_URL}/iniciativa/${esc(id)}">`
    );
}

export async function onRequestGet(context) {
  const page = await fetchPage(context);
  let html = await page.text();

  const id = /^\d+$/.test(context.params.id) ? context.params.id : null;
  if (id) {
    try {
      const it = await fetchInitiative(id);
      if (it && it.titulo) html = injectPreview(html, it, id);
    } catch {
      // Supabase hiccup: fall through to the generic page; the client JS retries.
    }
  }

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
