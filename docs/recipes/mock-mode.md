# Mock mode

`npm run dev:mock` runs the client with fake data and no sign-in or Worker. Most UI work is faster this way, and any screen can be shown on demand.

**Use it when** the app has an API, and especially when it has sign-in. Add it early, because mocks are easier to grow alongside the API than to write later.

**Source:** `percolatus/client/src/mock/` and `percolatus/client/vite.config.ts`.

**Needs:** the [API client](api-client.md), with `api` exported from `client/src/lib/api.ts`.

## How it works

In `mock` mode, Vite swaps real modules for fakes by rewriting their imports. Production builds never include the mocks.

## Steps

1. Add a script to `client/package.json`, on its own port, and one to the root `package.json`:

   ```json
   "dev:mock": "vite --mode mock --port 5294"
   ```

   ```json
   "dev:mock": "npm run dev:mock -w client"
   ```

2. Make `client/vite.config.ts` a function of `mode`:

   ```ts
   import { fileURLToPath } from 'node:url';

   const mock = (file: string) => fileURLToPath(new URL(`./src/mock/${file}`, import.meta.url));

   export default defineConfig(({ mode }) => ({
     plugins: [preact({ prefreshEnabled: false }), tailwindcss()],
     resolve:
       mode === 'mock'
         ? { alias: [{ find: /^(?:\.\/|(?:\.\.\/)+lib\/)api$/, replacement: mock('api.ts') }] }
         : undefined,
     server: {
       port: 5293,
       strictPort: true,
       proxy: mode === 'mock' ? undefined : { '/api': 'http://localhost:8817' },
     },
   }));
   ```

   Vite's `--port` overrides the port here. The regex catches both `./api` and `../lib/api`, so imports must not include the `.ts` extension.

3. Create `client/src/mock/api.ts`, typed against the real module so TypeScript flags any mock that falls out of step:

   ```ts
   // In-memory stand-in for `src/lib/api.ts`, used only by `npm run dev:mock`.
   // Data resets on page reload.
   import type { api as realApi } from '../lib/api';

   export { ApiError } from '../lib/api';

   export const api: typeof realApi = {
     health: async () => ({ status: 'ok' }),
   };
   ```

   If the real module's import would pull in Firebase, define `ApiError` in the mock instead, as Percolatus does.

4. Add a `client-mock` entry to `.claude/launch.json`.

5. **With [Firebase Auth](firebase-auth.md)**, also fake sign-in. Add these aliases:

   ```ts
   { find: 'firebase/auth', replacement: mock('firebase-auth.ts') },
   { find: /^(?:\.\/|(?:\.\.\/)+lib\/)firebase$/, replacement: mock('firebase.ts') },
   ```

   `client/src/mock/firebase.ts`:

   ```ts
   export const auth = {};
   export const googleProvider = {};
   ```

   `client/src/mock/firebase-auth.ts`:

   ```ts
   export interface User {
     uid: string;
     email: string;
     getIdToken(): Promise<string>;
   }

   const testUser: User = { uid: 'me', email: 'you@example.com', getIdToken: async () => 'mock-token' };

   let current: User | null = testUser;
   const listeners = new Set<(u: User | null) => void>();

   function emit() {
     for (const cb of listeners) cb(current);
   }

   export function onAuthStateChanged(_auth: unknown, cb: (u: User | null) => void) {
     listeners.add(cb);
     setTimeout(() => cb(current), 50);
     return () => listeners.delete(cb);
   }

   export async function signInWithPopup() {
     current = testUser;
     emit();
   }

   export async function signOut() {
     current = null;
     emit();
   }
   ```

6. Fill the mock with realistic sample data, including long names, empty lists and error cases.

**Keep it up to date:** when the API changes, update `client/src/mock/api.ts` in the same change.

## Check it works

- `npm run dev:mock` shows the app with sample data and nothing else running.
- `npm run build` passes, and no mock code appears in `client/dist`.
- Removing a method from the mock makes the type check fail.
