# Stored data versioning

Tags saved objects with a schema version, so the app never loads state its current code doesn't understand.

**Use it when** the app saves whole objects whose shape may change, such as games in progress.

**Source:** `rummy-dummy/shared/engine/save.ts` and `rummy-dummy/shared/test/save.test.ts`.

## Steps

1. Create a file in `shared/` that lists the saved fields and a version:

   ```ts
   // Bump this whenever the shape or meaning of saved state changes.
   export const SAVE_SCHEMA_VERSION = 1;

   export const SAVED_FIELDS = ['status', 'players', 'turnNumber'];
   ```

2. Build a schema id from the version and the field list, and store it with each save.

3. On load, reject state whose id doesn't match, with a message that says so.

4. Add a test that fails if the object gains a field that isn't listed as saved or transient, so forgotten fields get caught.

**Changes:** bumping the version means saves from before it can no longer be loaded. If users must keep them, write a migration rather than rejecting them.

**API changes:** an old copy of the app left open can still call a new API. When changing a response, keep the old fields until open copies have reloaded. See [PWA and deploys](pwa-and-deploys.md).

## Check it works

- Loading a save with a different version is rejected with a clear message.
- Adding a field without listing it fails `npm test`.
