# Firebase Auth

Google sign-in on the client, token checks on the Worker, and a local emulator so development needs no real Firebase project.

**Use it when** the app has user accounts. Skip it for apps with no sign-in.

**Cost:** adds about 105 KB (32 KB gzipped) to the client's JavaScript.

## Steps

Pick the project's name wherever `my-app` appears, its domain wherever `my-app.com` appears, and a unique emulator port wherever `9109` appears.

### 1. Install

Add to `client/package.json`:

```json
"firebase": "^13.1.0"
```

Add to the root `package.json`. Firebase depends on an old `@grpc/grpc-js` with known vulnerabilities:

```json
"overrides": {
  "@grpc/grpc-js": "^1.14.7"
}
```

Also add a `dev:auth` script to the root `package.json`, and `server/src/*.test.ts` to its `test` script:

```json
"dev:auth": "cd firebase && npx firebase-tools@15 emulators:start --only auth --project demo-my-app",
"test": "node --test shared/*.test.ts server/src/*.test.ts",
```

Then run `npm install`. If `npm audit` still lists `@grpc/grpc-js`, run `npm update @grpc/grpc-js`.

### 2. Emulator

`firebase/firebase.json`:

```json
{
  "emulators": {
    "auth": { "port": 9109 },
    "ui": { "enabled": false }
  }
}
```

Add an entry to `.claude/launch.json`:

```json
{
  "name": "auth",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "dev:auth"],
  "port": 9109
}
```

The auth emulator doesn't need Java.

### 3. Client config

`client/.env.development`:

```bash
# The Auth emulator (npm run dev:auth) needs no real Firebase project. A "demo-" project id tells
# Firebase tools to stay local, and the API key only has to be present.
VITE_FIREBASE_API_KEY=demo
VITE_FIREBASE_AUTH_DOMAIN=demo-my-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=demo-my-app
VITE_FIREBASE_APP_ID=demo
VITE_FIREBASE_AUTH_EMULATOR=http://127.0.0.1:9109
```

`client/.env.production`, with values from Firebase console → Project settings → Your apps:

```bash
# Firebase web config is public by design, so this file is safe to keep with the code.
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

The app won't start if these are empty, because `getAuth` throws without an API key.

### 4. Client code

`client/src/lib/firebase.ts`:

```ts
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from 'firebase/auth';

// Firebase web config is public by design, but getAuth throws without an API key.
export const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

if (import.meta.env.VITE_FIREBASE_AUTH_EMULATOR) {
  connectAuthEmulator(auth, import.meta.env.VITE_FIREBASE_AUTH_EMULATOR, { disableWarnings: true });
}
```

`client/src/store/auth.ts`:

```ts
import { signal } from '@preact/signals';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export class AuthStore {
  /** Null while signed out, and until Firebase has restored a session. */
  user = signal<User | null>(null);
  /** Firebase has restored a session or found there isn't one. */
  ready = signal(false);
  error = signal<string | null>(null);

  constructor() {
    onAuthStateChanged(auth, (user) => {
      this.user.value = user;
      this.ready.value = true;
    });
  }

  async signIn() {
    this.error.value = null;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      // Closing the popup isn't a mistake worth pointing out.
      const code = (e as { code?: string }).code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      this.error.value = "Couldn't sign in. Please try again.";
    }
  }

  async signOut() {
    await signOut(auth);
  }
}
```

Add it to `AppModel` in `client/src/store/index.tsx`:

```ts
import { AuthStore } from './auth';

export class AppModel {
  #auth = new AuthStore();

  get auth() {
    return this.#auth;
  }
}
```

The button text is "Sign in with Google". Call `store.auth.signIn()` from it, and show `store.auth.error` beside it. Wait for `store.auth.ready` before showing signed-in or signed-out UI.

### 5. Server config

Add to `vars` in `server/wrangler.jsonc`:

```jsonc
// Your Firebase project id. Local development overrides this in .dev.vars.
"FIREBASE_PROJECT_ID": "my-app"
```

`server/.dev.vars.example`. Copy it to `server/.dev.vars`, which is gitignored:

```bash
# Copy to .dev.vars for `wrangler dev`, so the Worker accepts tokens from the Auth emulator.
FIREBASE_PROJECT_ID=demo-my-app
FIREBASE_AUTH_EMULATOR=true
```

In `server/tsconfig.json`, add `src/**/*.test.ts` to `exclude`.

### 6. Server code

`server/src/env.ts`:

```ts
/** `Env` comes from `wrangler types`. The emulator flag is only ever set in `.dev.vars`, so it's never deployed. */
export type Bindings = Env & {
  FIREBASE_AUTH_EMULATOR?: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: {
    /** The signed-in user's Firebase uid. */
    uid: string;
  };
};
```

`server/src/auth.ts`:

```ts
// Verifies Firebase Auth ID tokens with WebCrypto.
// https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const CLOCK_SKEW_S = 60;

let keyCache: { keys: Map<string, CryptoKey>; expires: number; fetchedAt: number } | null = null;

function base64UrlDecode(input: string) {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getSigningKey(kid: string) {
  const now = Date.now();
  const stale = !keyCache || now > keyCache.expires;
  // Refetch on an unknown kid (Google rotated keys), but at most once a minute.
  const unknownKid = keyCache && !keyCache.keys.has(kid) && now - keyCache.fetchedAt > 60_000;
  if (stale || unknownKid) {
    const response = await fetch(JWKS_URL);
    if (!response.ok) throw new Error(`Failed to fetch Firebase signing keys (${response.status})`);
    const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get('cache-control') ?? '')?.[1] ?? 3600);
    const { keys } = (await response.json()) as { keys: (JsonWebKey & { kid: string })[] };
    const map = new Map<string, CryptoKey>();
    for (const jwk of keys) {
      map.set(jwk.kid, await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
    }
    keyCache = { keys: map, expires: now + maxAge * 1000, fetchedAt: now };
  }
  return keyCache!.keys.get(kid);
}

interface FirebaseClaims {
  aud: string;
  iss: string;
  sub: string;
  exp: number;
  iat: number;
  auth_time: number;
}

/**
 * Returns the signed-in user's uid, or null if the token is missing, invalid or expired.
 * The Auth emulator's tokens are unsigned, so `emulator` skips the signature check. Everything else still applies.
 */
export async function verifyIdToken(token: string, projectId: string, emulator = false) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string; kid?: string };
  let claims: FirebaseClaims;
  try {
    const decoder = new TextDecoder();
    header = JSON.parse(decoder.decode(base64UrlDecode(headerB64)));
    claims = JSON.parse(decoder.decode(base64UrlDecode(payloadB64)));
  } catch {
    return null;
  }

  if (!emulator) {
    if (header.alg !== 'RS256' || !header.kid) return null;
    const key = await getSigningKey(header.kid);
    if (!key) return null;
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, base64UrlDecode(signatureB64), new TextEncoder().encode(`${headerB64}.${payloadB64}`));
    if (!valid) return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (
    claims.aud !== projectId ||
    claims.iss !== `https://securetoken.google.com/${projectId}` ||
    typeof claims.sub !== 'string' ||
    !claims.sub ||
    claims.exp <= now - CLOCK_SKEW_S ||
    claims.iat > now + CLOCK_SKEW_S ||
    claims.auth_time > now + CLOCK_SKEW_S
  ) {
    return null;
  }

  return claims.sub;
}
```

`server/src/auth.test.ts`:

```ts
import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { test } from 'node:test';
import { verifyIdToken } from './auth.ts';

const PROJECT = 'my-app';
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const other = generateKeyPairSync('rsa', { modulusLength: 2048 });

globalThis.fetch = (async () =>
  new Response(JSON.stringify({ keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' }] }), {
    headers: { 'cache-control': 'max-age=600' },
  })) as typeof fetch;

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const goodClaims = { aud: PROJECT, iss: `https://securetoken.google.com/${PROJECT}`, sub: 'user', iat: now - 10, auth_time: now - 10, exp: now + 3600 };

function token(claims: object = goodClaims, key = privateKey, header: object = { alg: 'RS256', kid: 'k1' }) {
  const body = `${encode(header)}.${encode(claims)}`;
  return `${body}.${createSign('RSA-SHA256').update(body).sign(key).toString('base64url')}`;
}
const unsigned = (claims: object = goodClaims) => `${encode({ alg: 'none' })}.${encode(claims)}.`;

test('accepts a token signed by Google for this project', async () => {
  assert.equal(await verifyIdToken(token(), PROJECT), 'user');
});

test('rejects a token signed by anyone else', async () => {
  assert.equal(await verifyIdToken(token(goodClaims, other.privateKey), PROJECT), null);
});

test('rejects another project, an expired token and a tampered one', async () => {
  assert.equal(await verifyIdToken(token({ ...goodClaims, aud: 'other' }), PROJECT), null);
  assert.equal(await verifyIdToken(token({ ...goodClaims, exp: now - 3600 }), PROJECT), null);
  const [header, , signature] = token().split('.');
  assert.equal(await verifyIdToken(`${header}.${encode({ ...goodClaims, sub: 'someone-else' })}.${signature}`, PROJECT), null);
});

test('rejects unsigned tokens outside the emulator', async () => {
  assert.equal(await verifyIdToken(unsigned(), PROJECT), null);
});

test('the emulator skips only the signature check', async () => {
  assert.equal(await verifyIdToken(unsigned(), PROJECT, true), 'user');
  assert.equal(await verifyIdToken(unsigned({ ...goodClaims, aud: 'other' }), PROJECT, true), null);
});
```

`server/src/requireAuth.ts`, which uses `fail` from the starter's `server/src/validate.ts`:

```ts
import { createMiddleware } from 'hono/factory';
import { verifyIdToken } from './auth';
import type { AppEnv } from './env';
import { fail } from './validate';

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = c.req.header('authorization')?.match(/^Bearer (.+)$/)?.[1];
  const uid = token ? await verifyIdToken(token, c.env.FIREBASE_PROJECT_ID, c.env.FIREBASE_AUTH_EMULATOR === 'true') : null;
  if (!uid) fail(401, 'Sign in required', 'unauthenticated');
  c.set('uid', uid);
  await next();
});
```

In `server/src/index.ts`, use the new types and add a route that proves sign-in works:

```ts
import type { AppEnv, Bindings } from './env';
import { requireAuth } from './requireAuth';

const app = new Hono<AppEnv>();

// In the cors() origin option, cast to Bindings rather than Env: (c.env as Bindings).ALLOWED_ORIGINS

app.get('/api/me', requireAuth, (c) => c.json({ uid: c.get('uid') }));
```

### 7. Production setup

1. Create a project in the Firebase console, and add a web app.
2. Turn on Google under Authentication → Sign-in method.
3. Add your domain under Authentication → Settings → Authorized domains.
4. Fill in `client/.env.production`, and set `FIREBASE_PROJECT_ID` in `server/wrangler.jsonc`.

### 8. Sign-in on your own domain

By default, Google's sign-in screen says "to continue to my-app.firebaseapp.com". This step makes it name the app's own domain. Firebase recommends this approach: serve its sign-in pages from your domain and point `authDomain` there. Sign-in then also stops depending on another site's storage, which Safari blocks.

**Source:** `percolatus/functions/__/[[path]].ts` and `nomp/functions/__/[[path]].ts`.

Before starting, check:

- Where the app is hosted, and its production domain
- Which folder the host builds from. For Cloudflare Pages this is the Root directory setting, which the [deploy recipe](deploy.md) leaves as the repo root
- Whether sign-in uses `signInWithPopup` or `signInWithRedirect`. This recipe uses the popup, and both go through these pages
- Whether a service worker handles fetches, because it must not catch `/__/` paths. The one in [push notifications](push-notifications.md) has no fetch handler

1. Proxy everything under `/__/` to `https://my-app.firebaseapp.com`, keeping the path and query.

   On Cloudflare Pages, create `functions/__/[[path]].ts` in the folder Pages builds from, which is the repo root, not `client/`:

   ```ts
   // Firebase's sign-in pages, served from my-app.com so Google's sign-in screen names our domain
   // instead of my-app.firebaseapp.com. client/src/lib/firebase.ts points authDomain here in production.
   // Pages builds from the repo root, so this has to stay in the root's functions/.
   export const onRequest = ({ request }: { request: Request }) => {
     const { pathname, search } = new URL(request.url);
     return fetch(new Request(new URL(pathname + search, 'https://my-app.firebaseapp.com'), request));
   };
   ```

   Anything that runs `wrangler pages deploy` by hand must run from the folder that contains `functions/`, or the function is left out. The starter's `deploy` script in `client/package.json` already deploys from the repo root.

   On Firebase Hosting with a custom domain, no proxy is needed. On Vercel or Netlify, use a rewrite rule instead.

2. In `client/src/lib/firebase.ts`, use the app's domain only in production, so localhost and preview deploys keep working without the proxy:

   ```ts
   authDomain: location.hostname === 'my-app.com' ? 'my-app.com' : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
   ```

3. Check it locally. Build the client, then run this from the repo root:

   ```bash
   npx wrangler pages dev client/dist
   ```

   - `/__/auth/handler` returns Firebase's HTML with a 200.
   - `/__/auth/handler.js` returns a 200.
   - The app's own pages still load.

   A 404 for `/__/firebase/init.json` is fine, because it only exists when the project uses Firebase Hosting. Stop the server afterwards.

4. In the project README's Firebase setup, note that sign-in goes through `functions/__/`, and that the redirect URI in the next step is needed for it.

5. By hand:
   1. In Google Cloud Console → APIs & Services → Credentials, open "Web client (auto created by Google Service)".
   2. Under Authorized redirect URIs, add `https://my-app.com/__/auth/handler`, and keep the `firebaseapp.com` one.
   3. Save, and wait a few minutes before deploying.
   4. Check that `my-app.com` is in Firebase → Authentication → Settings → Authorized domains.
   5. After deploying, sign out and back in. The Google screen should say "to continue to my-app.com".

   If sign-in fails with `redirect_uri_mismatch`, the URI isn't saved or hasn't taken effect yet.

## Check it works

1. Run `npm test`, `npm run build` and `npm audit`.
2. Run `npm run dev` and `npm run dev:auth`.
3. `GET /api/me` with no token, or a bad one, returns 401.
4. Sign in on the emulator, then call `/api/me` with `Authorization: Bearer <token>`, using `await user.getIdToken()`. It returns 200 with the user's uid.
5. Signing out sets `store.auth.user` to null.

6. On the production domain, Google's sign-in screen says "to continue to my-app.com".

Google's real popup, a real Google-signed token and the custom sign-in domain can only be tested against a real Firebase project.
