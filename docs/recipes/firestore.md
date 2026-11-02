# Firestore

Firebase's NoSQL database, used only by the Worker over REST. The Firebase client SDK isn't used for data.

**Use it when** the data suits documents, such as posts and profiles. Use [D1](d1.md) for SQL, and [Durable Objects](durable-objects.md) for real-time.

**Source:** `percolatus/server/src/firestore.ts`, `percolatus/server/src/google.ts` and `percolatus/firebase/`.

## Steps

1. Create the Firestore database in the Firebase console.

2. Lock out direct client access in `firebase/firestore.rules`. All reads and writes go through the Worker, whose service account bypasses these rules:

   ```
   rules_version = '2';

   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if false;
       }
     }
   }
   ```

3. Copy `firestore.ts` and `google.ts` to `server/src/`.

4. Generate a service account key in the Firebase console, under Project settings → Service accounts. Store it as a secret, and never commit it or print it:

   ```bash
   npx wrangler secret put FIREBASE_SERVICE_ACCOUNT
   ```

   For local development, put it on one line in the gitignored `server/.dev.vars`:

   ```bash
   echo "FIREBASE_SERVICE_ACCOUNT='$(jq -c . path/to/service-account.json)'" > server/.dev.vars
   ```

5. Add `FIREBASE_SERVICE_ACCOUNT: string` to `Bindings` in `server/src/env.ts`, and `FIREBASE_PROJECT_ID` to `vars` in `server/wrangler.jsonc`.

6. Create the client in middleware, and read and write through it:

   ```ts
   c.set('db', new Firestore(c.env.FIREBASE_PROJECT_ID, c.env.FIREBASE_SERVICE_ACCOUNT));
   ```

   It has `get`, `set`, `update`, `delete`, `getMany`, `list`, `query`, `count` and `commit`.

7. Keep indexes in `firebase/firestore.indexes.json`, and deploy them with the Firebase CLI.

8. Document the data model in the README.

**Local data:** `npm run dev:server` uses the real Firestore database. Use a second Firebase project for an isolated sandbox.

## Cost

Firestore bills by document read and written.

- A request that lists or counts many documents reads all of them, so keep counters on documents instead.
- Each document write also counts toward Worker subrequests.

## Check it works

- A route that writes then reads a document works under `npm run dev`.
- A direct read from the browser with the Firebase SDK is denied.
- `git status` shows no key files, and `git grep private_key` finds nothing.
