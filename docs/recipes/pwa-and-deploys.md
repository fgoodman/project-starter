# PWA and deploys

Keeps copies of the app left open up to date, and sets it up for installing on a phone. The starter already includes a manifest, icons and the metadata.

**Use it when** people keep the app open in a tab or add it to their home screen.

**Source:** `percolatus/client/src/lib/version.ts` and `percolatus/client/vite.config.ts`.

## Reload after a deploy

A tab left open, or a home-screen app that iOS paused for days, keeps running old code against a newer API. In Percolatus, this showed "undefined likes" after a deploy. So each build publishes a version, and the app compares it when it comes back into view.

1. Add this to `client/vite.config.ts`:

   ```ts
   import { defineConfig, type Plugin } from 'vite';

   // Each build's version: baked into the app as __APP_VERSION__ and published as /version.json, so a
   // copy of the app left open can tell a newer one has been deployed (see src/lib/version.ts).
   const version = process.env.CF_PAGES_COMMIT_SHA?.slice(0, 12) ?? Date.now().toString(36);

   function versionFile(): Plugin {
     return {
       name: 'version-file',
       apply: 'build',
       generateBundle() {
         this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) });
       },
     };
   }
   ```

   Then add `versionFile()` to `plugins`, and `define: { __APP_VERSION__: JSON.stringify(version) }` to the config.

2. Copy `percolatus/client/src/lib/version.ts` to `client/src/lib/version.ts`. Update `FORM_PAGES` and `RELOADED_KEY`.

3. Call `watchForNewVersion()` in `client/src/main.tsx`.

It never reloads over unsaved work, and it does nothing in development. It also reloads when a lazy-loaded file has gone missing after a deploy (`vite:preloadError`), which caused "Failed to fetch dynamically imported module" in Percolatus.

For long-lived apps, such as games, also check after reconnecting and on a timer, as `rummy-dummy/client/src/lib/version.ts` does.

## Service worker

Only add one for [push notifications](push-notifications.md). Leave out a `fetch` handler, so it never caches the app and a reload always gets the newest version.

## Installed app

- Keep `display: standalone` in the manifest, and set real icons and colours.
- For iOS, add `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`, and pad the header for the safe area.
- Colour the overscroll area to match the edge being pulled past. See `markScrollEdge` in `percolatus/client/src/main.tsx`.
- Serve from the bare domain and redirect `www` to it. Serving from `www` caused a browser bar in Percolatus's Android app.
- iOS home-screen apps have no pull-to-refresh. See `percolatus/client/src/components/PullToRefresh/index.tsx`.

## Private links

Keep shared links out of search results with `client/public/_headers`, not `robots.txt`. A crawler that may not fetch a page never sees its noindex, and can still list the address.

```
/p/*
  X-Robots-Tag: noindex, nofollow
```

## Check it works

- `client/dist/version.json` exists after a build.
- Open the production site, deploy a change, switch away and back after a minute: the page reloads.
- Typed text in a `textarea` isn't lost to a reload.
- Installed on a phone, the app runs full screen with no browser bar.
