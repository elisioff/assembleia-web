// Worker entry point (see wrangler.jsonc): handles /iniciativa/:id.
//
// Devices with the app never reach this (universal/app link opens the app).
// For everyone else — including link crawlers (iMessage, WhatsApp, etc.),
// which don't run JS — it serves iniciativa-app.html with the generic preview
// tags rewritten to the actual initiative's title and summary.

const SUPABASE_URL = "https://fnvtibybkxujurxrilfg.supabase.co";
const SUPABASE_KEY = "sb_publishable_BAYxTO8BAW_WG1ng5zCnqg_uu8LqZDj";
const SITE_URL = "https://assembleiaapp.com";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// The asset layer answers .html paths with a clean-URL redirect, so follow
// one hop manually.
async function fetchPage(request, env) {
  let res = await env.ASSETS.fetch(new URL("/iniciativa-app.html", request.url));
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location");
    if (location) res = await env.ASSETS.fetch(new URL(location, request.url));
  }
  return res;
}

async function fetchInitiative(id, select = "titulo,tipo,resultado,summary") {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/iniciativas?id=eq.${id}&select=${select}`,
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

async function handleIniciativa(request, env, id) {
  const page = await fetchPage(request, env);
  let html = await page.text();

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

// /iniciativa/:id/documento — devices with the app open the PDF reader over the
// initiative; everyone else is redirected to the document itself.
async function handleDocumento(request, env, id) {
  if (id) {
    try {
      const it = await fetchInitiative(id, "documento_path,link_texto");
      if (it && it.documento_path) {
        return Response.redirect(
          `${SUPABASE_URL}/storage/v1/object/public/documentos-iniciativas/${it.documento_path}`,
          302
        );
      }
      if (it && it.link_texto) return Response.redirect(it.link_texto, 302);
    } catch {
      // Supabase hiccup: fall through to the initiative page below.
    }
  }
  return handleIniciativa(request, env, id);
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const match = pathname.match(/^\/iniciativa\/([^/]+)(\/documento)?\/?$/);
    if (match && (request.method === "GET" || request.method === "HEAD")) {
      const id = /^\d+$/.test(match[1]) ? match[1] : null;
      return match[2] ? handleDocumento(request, env, id) : handleIniciativa(request, env, id);
    }
    return env.ASSETS.fetch(request);
  },
};
