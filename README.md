# Project Starter

A starter for web apps, with a Preact client on Cloudflare Pages and an API on Cloudflare Workers.

## Stack

- **Preact** - Fast 3kB React alternative
- **TypeScript** - Type safety
- **Vite** - Fast dev server and builds
- **Tailwind CSS** - Utility-first CSS
- **preact-iso** - Lightweight router
- **@preact/signals** - Reactive state management
- **Hono** - Small web framework for the Worker API
- **Wrangler** - Cloudflare Workers tooling

## Getting Started

```bash
npm install
npm run dev
```

This starts the client at http://localhost:5293 and the Worker at http://localhost:8817. Vite proxies `/api` to the Worker, so `/api/health` works from the client.

## Project Structure

```
client/             Preact app (npm workspace)
└── src/
    ├── components/ Reusable UI components
    ├── hooks/      Custom hooks
    ├── lib/        Helpers that aren't hooks or components
    ├── routes/     Page components
    ├── store/      State management (AppModel pattern)
    ├── app.tsx     Router setup
    ├── main.tsx    Entry point
    └── index.css   Tailwind import
server/             Cloudflare Worker API (npm workspace)
shared/             Code and types used by both, and tests
scripts/            dev.mjs and one-off tools
docs/               Project docs
└── recipes/        Guides for features only some projects need
```

## Recipes

The starter stays general. Sign-in, databases, push notifications and other features that only some projects need are written up as guides, listed in [docs/recipes](docs/recipes/README.md).

## State Management

Uses a class-based AppModel with Preact Signals, passed via context:

```tsx
// Access store in components
import { useStore } from './store';

function MyComponent() {
  const store = useStore();
  // store.user, store.someOtherDomain, etc.
}
```

## Scripts

Run these from the repo root.

- `npm run dev` - Start the client and server together
- `npm run dev:client` / `npm run dev:server` - Start one on its own
- `npm test` - Run the tests
- `npm run format` - Format the code with Prettier
- `npm run build` - Type-check everything, build the client and dry-run the Worker deploy
- `npm run preview` - Preview the production client build
- `npm run deploy:client` / `npm run deploy:server` - Deploy by hand
