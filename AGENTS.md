# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Static vanilla HTML/CSS/JS portfolio site deployed to Cloudflare Pages. No framework, no bundler, no database. See `RUNBOOK.md` for full operational details.

### Running locally

- **Dev server**: `npm run dev` — starts `http-server` on port 8080 (no hot reload; refresh browser manually after changes).
- **Build (data sync)**: `npm run build` — runs `scripts/sync-apps.mjs` to regenerate `data/apps.json` from GitHub/Netlify/Vercel/Render/Cloudflare APIs. Works without any API tokens (gracefully skips missing sources); pre-existing `data/apps.json` is committed and usable as-is.
- **Deploy**: `npm run deploy:pages` — deploys to Cloudflare Pages via `wrangler` (requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`).

### Lint / Test / Build

- No linter or test framework is configured in this project. There are no ESLint, Prettier, or test runner configs.
- The only "build" step is `npm run build` (data sync). The HTML/CSS/JS is served as-is with no transpilation.

### Admin page

- Accessible at `/admin.html` (or `/studio-ymd-gate-73x.html`).
- Authentication is configured via `config/site.json` (`adminAccessHash` / `adminPublishHash`). If `adminAccessHash` is empty, the Studio opens without auth.
- Publishing changes to GitHub from Studio requires a GitHub token entered in the browser UI.

### Key files

| File | Purpose |
|------|---------|
| `config/site.json` | Site metadata, contact info, admin config |
| `config/apps.config.json` | App sync sources, overrides, exclusions |
| `data/apps.json` | Generated portfolio items (committed) |
| `scripts/sync-apps.mjs` | Build script that generates `data/apps.json` |
