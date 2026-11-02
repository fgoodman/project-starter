# Project Starter

A starter for web apps. The client uses Preact, TypeScript, Vite, Tailwind CSS 4, preact-iso and `@preact/signals`, for Cloudflare Pages. The server is a Hono API on Cloudflare Workers.

Run npm commands from the repo root.

## Commands

- `npm run dev`: start the client (http://localhost:5293) and server (:8817) together
- `npm run dev:client` / `npm run dev:server`: start one on its own
- `npm test`: run the tests
- `npm run format`: format the code. CI runs `npm run format:check`
- `npm run build`: type-check everything, build the client and dry-run the Worker deploy
- `npm run preview`: preview the production client build
- `npm run deploy:client` / `npm run deploy:server`: deploy by hand

## Structure

npm workspaces `client` and `server`, plus `shared/` (plain imports, not a workspace).

```
client/src/
├── components/     Reusable UI, as Name/index.tsx
├── hooks/          Custom hooks, as useName.ts
├── lib/            Helpers that aren't hooks or components
├── routes/         One folder per route, as Name/index.tsx
├── store/          AppModel and domain stores
├── app.tsx         Router setup
├── main.tsx        Entry point
└── index.css       Tailwind import, theme colours and animations
server/src/         Worker API, with routes under /api
shared/             Code and types used by both sides, and tests
scripts/            dev.mjs and one-off tools
docs/               Project docs
```

In dev, Vite proxies `/api` to the Worker.

## Services

Prefer Firebase and Cloudflare. Choose the database from what the project needs: Firestore for NoSQL, D1 for SQLite, and Durable Objects for real-time. The starter doesn't include one.

## Recipes

The starter stays general, so features that only some projects need are written up in `docs/recipes/`. When a project needs one, follow its recipe rather than building it from scratch, so it's set up the same way every time. `docs/recipes/README.md` lists them.

## Conventions

- Preact, not React, with no compat layer. Write `class` and `for`, import hooks from `preact/hooks`, and use `onInput` for text fields.
- App state lives in `@preact/signals` stores: `AppModel` plus `useStore()`. Components read `store.x.value`, and UI-only state stays in `useState`.
- Saving a file does a full page reload, because hot reload leaves stores running old code. The right choice depends on the project, so full reload is the default and a project can change it in `client/vite.config.ts`.
- Add routes to the `Router` in `client/src/app.tsx`.
- Style with Tailwind utilities. Theme colours and animations go in `@theme` in `client/src/index.css`.
- TypeScript is strict, with erasable syntax only (no enums or parameter properties). Prettier formats it, with semicolons and a line width of 120. Run `npm run format` after changing code.
- Types used by both sides go in `shared/types.ts`.
- Code in `shared/` must run on Workers, so no Node-only imports outside tests.
- Imports of `shared/` code keep their `.ts` extension, so Node can run the tests directly.
- Tests use `node --test` and sit in `shared/` as `*.test.ts`.
- Run `npm run types -w server` after editing `wrangler.jsonc`.
- When a UI pattern appears twice, make it a shared component rather than aligning copies by hand.
- Never print or commit keys or other secrets.
- Keep dev-only previews behind `import.meta.env.DEV` so they never ship.
- Be careful to use unique dev ports for each project, with `strictPort`, so projects can run side by side. Ports are set in `client/vite.config.ts`, `server/wrangler.jsonc` and `.claude/launch.json`.

## Documentation

`CLAUDE.md` says how to work on the project. `README.md` documents the project itself. Keep project details in the README, and update it in the same change as the thing it describes.

When a project is created from this starter, replace this README with one for the project. Write it in plain language, and include only the sections that apply, in this order:

1. **Title and summary:** the project's name, a sentence or two on what it is, and a link if it's live.
2. **Pieces table:** `Piece | Tech | Where`, with a row each for `client/`, `server/`, `shared/`, auth, data and any other services.
3. **How it fits together:** how the pieces connect, with a subsection for the data model and any core concepts.
4. **One-time setup:** every step for each service, such as Firebase, Cloudflare and GitHub, with the exact values to enter.
5. **Local development:** the commands to run, ports, mock data and other scripts.
6. **API:** every route in a `Method | Path | Description` table, or every message for WebSocket apps, plus how auth and errors work.
7. **Feature sections:** one for each feature that needs explaining, such as push notifications, search engines or offline processes.
8. **Ideas for next steps:** things we've discussed but put off.

## Working together

- I make every commit and push myself. Leave changes uncommitted.
- When I ask for a commit message, give a summary and a description.
- Never add `Co-Authored-By` or any other Claude attribution to commits, suggested commit messages or PRs.
- Explain things in plain language.
- Be exact about state: fixed locally is different from deployed to production.
- After a change, say exactly what else I need to do, such as a migration to run or a setting to change.
- When picking emojis or icons, offer a short list and let me choose.
- Use my copy word for word.
- When I say I preferred something before, go back fully and don't re-add it later.
- Mention the cost when a design adds database reads or writes.
- Keep a local server and mock data ready, and pull up the exact state we're discussing.
- Check UI at phone width as well as desktop.

## UI standards

**Stability**
- No layout shift. Reserve space for anything that loads or appears.
- Numbers don't change a container's width unless a digit is added. Use `tabular-nums` and a min width.
- Bold states don't change a pill's width.
- Content boxes sit a fixed distance from the top and grow downward.
- Loading placeholders match the final height, and go away as soon as real content arrives.
- New screens open at the top, with no flash.

**Touch and feel**
- Click targets are at least 44×44px, extended invisibly where needed.
- Buttons and icons have a subtle tap animation, from shared classes.
- Menus animate in about 150ms, with an exit animation as well as an entrance.
- Clickable things show a pointer cursor.
- Toggles and pills have no text-colour hover.
- Hover-only UI must not stick on touch screens.
- Use haptics on switches, reactions and key actions.

**Patterns**
- Menus and popups close on Escape and on a click outside.
- Use a modal on wide screens and a full-viewport viewer on narrow screens.
- Long lists show a few items plus "Show more" or "Show all".
- Share opens the native share sheet on mobile and copies on desktop, with the button's text changing to "Copied!".
- Errors appear as a tooltip or toast by the field, not as a system error.
- Show a spinner next to a switch while it's saving, rather than fading it.
- Sign-in button text is "Sign in with Google".
- Links in lists are plain text with a hover underline, opening in a new tab.
- Icons are handwritten SVGs, not an icon library, and match each other in stroke width and character.
- No tooltips on icons unless I ask.
- Keep things plain.

**Dark mode**
- Follow `prefers-color-scheme` by default.
- If the app has a settings page, add a theme setting with "Follow system preference" as the default, plus Light and Dark.
