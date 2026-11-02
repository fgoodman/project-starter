# Deploy

Puts the client on Cloudflare Pages and the Worker on `api.<domain>`, both deploying on each push to `main`.

**Use it when** the project is ready to go live.

**Cost:** Cloudflare's free plan covers small apps. Pages is free, and Workers Free allows 100,000 requests a day.

**Source:** "One-time setup" in `percolatus/README.md`, and `rummy-dummy/docs/CLOUD_SETUP.md`.

Record the project's real values in the "One-time setup" section of its README. Sign-in, databases and other services have their own recipes.

## Steps

### Domain

1. Add the domain to Cloudflare, under Dashboard → Add a domain, on the Free plan. If it was registered elsewhere, turn off DNSSEC at the registrar and point its nameservers at the two Cloudflare shows. Wait until the domain is **Active**.

2. Under SSL/TLS → Overview, set the mode to **Full (strict)**.

3. Log in from the repo root:

   ```bash
   npx wrangler login
   ```

### Project values

4. Replace the placeholders, and commit and push the result:
   - `client/index.html`, `client/public/manifest.webmanifest`, `client/public/robots.txt` and `client/public/sitemap.xml`: name, description, domain, colours and icons
   - `client/package.json`: `--project-name` in the `deploy` script
   - `client/.env.production`: create it with `VITE_API_URL=https://api.<domain>`, which the [API client](api-client.md) reads
   - `server/wrangler.jsonc`: the Worker's `name`, `ALLOWED_ORIGINS`, and `limits` sized to the app

     ```jsonc
     "routes": [{ "pattern": "api.<domain>", "custom_domain": true }],
     ```

     Past `cpu_ms` / `subrequests` limits are 5000 / 1000 in Percolatus, 5000 / 2000 in Rummy Dummy, and 1000 / 25 in Nomp.

### Worker

5. Go to Dashboard → Workers & Pages → the Worker → Settings → Build, and connect the GitHub repo:
   - Root directory: `/`, so the npm workspace and `shared/` are available
   - Build command: leave empty
   - Deploy command: `npm run deploy -w server`
   - Build watch paths: `server/*`, `shared/*` and `package-lock.json`, so client changes don't redeploy the Worker

   If the Worker doesn't exist yet, run `npm run deploy:server` once. The `custom_domain` route creates the DNS record.

6. Store any secrets, each of which prompts for its value. Never commit them or print them:

   ```bash
   cd server && npx wrangler secret put SECRET_NAME
   ```

### Client

7. Go to Dashboard → Workers & Pages → Create → Pages → Connect to Git, and pick the repo:
   - Production branch: `main`
   - Root directory: leave empty, so the npm workspace and `shared/` are available
   - Build command: `npm run build -w client`
   - Build output directory: `client/dist`
   - Environment variables: none. Vite reads `client/.env.production`, and `.node-version` sets Node.

8. After the first deploy, set the Build watch paths under Settings → Build to `client/*`, `shared/*` and `package-lock.json`, so Worker changes don't redeploy the client.

9. Under Custom domains, add `<domain>` and `www.<domain>`.

10. Redirect `www` to the bare domain, with Rules → Redirect Rules → "Redirect from WWW to root". An installed app belongs to one address, and opening the other inside it shows a browser bar over the app.

**Pull requests:** these get preview URLs, but previews can't call the API unless their origin is in `ALLOWED_ORIGINS`.

## Launch checklist

- Title reads `Name · tagline`, with real description, canonical, Open Graph and Twitter tags
- Real icons and `theme-color`
- Safe-area padding on phones, `dvh` units for full-height layouts, and an overscroll colour matching the header
- No scrolling on pages whose content fits
- `sitemap.xml` lists the public pages
- Private and shared links use unguessable ids, and send `X-Robots-Tag: noindex` from `_headers`. See [PWA and deploys](pwa-and-deploys.md).

## Check it works

- `https://api.<domain>/api/health` returns `{ "status": "ok" }`.
- `https://<domain>` loads and calls the API, with no CORS errors in the console.
- `https://www.<domain>` redirects to `https://<domain>`.
- `https://<domain>/nope` shows the 404 page.
- A change under `client/` deploys only the client, and one under `server/` deploys only the Worker.
- `git status` shows no secrets, and the Worker's logs appear in the dashboard.
