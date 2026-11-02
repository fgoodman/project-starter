# Prerendered pages

Writes chosen pages out as static HTML at build time, so search engines and link previews see them without running the app.

**Use it when** public pages should be found in search, such as guides or landing pages.

**Source:** the `guidePages` plugin in `rummy-dummy/client/vite.config.ts`, `rummy-dummy/client/src/prerender.tsx` and `rummy-dummy/client/src/lib/pages.ts`.

## Steps

1. Add `preact-render-to-string` to `client/package.json` as a dev dependency.

2. List the pages in `client/src/lib/pages.ts`, with each one's path, title and description.

3. Create `client/src/prerender.tsx`, which renders a page with `renderToString`, using the same frame as the app so nothing moves when the app takes over.

4. Copy the `guidePages` plugin into `client/vite.config.ts`, and add it to `plugins`. After the build, it loads `prerender.tsx` through a Vite server, then writes `dist/<path>.html` from the built `index.html`, with the page's title, description, canonical link, Open Graph tags and content. Cloudflare Pages serves that file at `/<path>`. Give the server its own `cacheDir`, so the build doesn't disturb a running `npm run dev`.

5. Add the pages to `client/public/sitemap.xml`.

**Keep the metadata tags in `index.html`.** The plugin replaces them, and throws if one is missing, so a removed tag fails the build rather than publishing a broken page.

## Check it works

- `client/dist/<path>.html` contains the page's text and its own title.
- View the page with JavaScript turned off.
- With JavaScript on, nothing shifts when the app takes over.
