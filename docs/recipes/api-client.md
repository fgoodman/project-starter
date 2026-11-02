# API client

One fetch wrapper for every call to the Worker, so errors, sign-in tokens and JSON are handled the same way everywhere.

**Use it when** the client calls the Worker.

**Source:** `nomp/client/src/lib/api.ts`. `percolatus/client/src/lib/api.ts` is a larger example.

## Steps

Create `client/src/lib/api.ts`:

```ts
const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  code: string | undefined;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api${path}`, init);
  } catch {
    throw new ApiError(0, "Couldn't reach the server. Check your connection and try again.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, data?.error ?? 'Something went wrong', data?.code);
  return data as T;
}

const post = (body: object, headers?: HeadersInit): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

export const api = {
  health: () => request<Health>('/health'),
};
```

Import shared types such as `Health` from `shared/types.ts`, and add each route to `api`. Components and stores call `api`, never `fetch`.

**With [Firebase Auth](firebase-auth.md)**, send the user's token on signed-in calls:

```ts
import { auth } from './firebase';

async function signedIn() {
  const user = auth.currentUser;
  if (!user) throw new ApiError(401, 'Sign in required', 'unauthenticated');
  return { authorization: `Bearer ${await user.getIdToken()}` };
}
```

**In production**, the client and Worker are on different domains. Set `VITE_API_URL=https://api.<domain>` in `client/.env.production`, and add the site's origin to `ALLOWED_ORIGINS` in `server/wrangler.jsonc`. In development it stays unset, and Vite proxies `/api` to the Worker.

## Check it works

- `api.health()` returns `{ status: 'ok' }` with `npm run dev` running.
- With the Worker stopped, it throws an `ApiError` with status 0 and the "Couldn't reach the server" message.
- A production build calls `api.<domain>`, with no CORS errors in the console.
