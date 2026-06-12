# AssembLeia — product site

Static product page for the **AssembLeia** app (a non-official client for the
Portuguese parliament). Plain HTML + CSS, no build step, no dependencies —
GitHub Pages serves the repo directly.

Separate from the [AssembLeia monorepo](https://github.com/elisioff/AssembLeia)
on purpose: this site has none of the schema-contract coupling that ties the
iOS/Android/Supabase code together.

## Structure

```
index.html        Início (landing)
privacidade.html  Política de privacidade
suporte.html      Suporte + FAQ
styles.css        Shared styles (flat, app-green palette)
favicon.svg       Brand mark
.nojekyll         Serve files as-is (skip Jekyll)
```

Header and footer are duplicated across the three pages by design — at this
size it's simpler than a templating toolchain. If you edit one, update all three.

## Preview locally

Just open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Deploy (GitHub Pages)

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   branch `main`, folder `/ (root)`.
3. The site goes live at `https://<user>.github.io/<repo>/`.

Links are relative, so it works under that subpath. To use a custom domain later,
add a `CNAME` file and configure DNS — no other changes needed.

## ⚠️ Placeholders to fill before going live

- **Contact email** — `o-teu-email@exemplo.pt` appears in `privacidade.html`
  and `suporte.html`. Replace both (and remove the "(endereço a confirmar)" note).
- **Store links** — the App Store and Google Play buttons in `index.html` use
  `href="#"`. Replace with the real store URLs once the apps are published.
