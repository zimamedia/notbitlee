# notbitlee.com

The landing page for NotBitLee: plain HTML and CSS, served as static files by a Cloudflare Worker. There's no build step: edit `public/` and push.

| Path | What it is |
| --- | --- |
| `public/index.html` | The page |
| `public/styles.css` | All styles |
| `public/404.html` | Shown for any unknown path |
| `public/_headers` | Security and cache headers |
| `public/og.png` | Preview image for social posts (1200×630) |
| `public/fonts/` | Inter and Space Grotesk, served from the site (SIL Open Font Licence) |
| `wrangler.jsonc` | Worker name and the `notbitlee.com` custom domain |

## Preview locally

```bash
cd site
npm install
npm run dev
```

## Deploy

The `notbitlee-site` Worker is connected to this repository with Workers Builds:

- **Root directory:** `site`
- **Build command:** none
- **Deploy command:** `npm run deploy`
- **Build watch paths:** `site/**`

Every push to `main` that changes this folder goes live in about a minute.
