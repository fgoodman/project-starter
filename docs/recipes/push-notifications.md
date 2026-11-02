# Push notifications

Notifications through Firebase Cloud Messaging.

**Use it when** the app needs to reach people who don't have it open.

**Source:** `percolatus/client/src/lib/push.ts`, `percolatus/client/public/sw.js`, `percolatus/server/src/push.ts`. For real-time apps, `rummy-dummy/shared/hub/notifications.ts`.

**Needs:** [Firebase Auth](firebase-auth.md), and a service account as in [Firestore](firestore.md).

## Steps

1. In the Firebase console, go to Project settings → Cloud Messaging → Web Push certificates, and generate a key pair. The public key goes in `VITE_FIREBASE_VAPID_KEY`, and `VITE_FIREBASE_MESSAGING_SENDER_ID` goes with the web config. Add `messagingSenderId` to `initializeApp`.

2. Add `client/public/sw.js`. Copy Percolatus's, and change its default text and `url` handling. It has no `fetch` handler, so it never caches the app. It always shows a notification, because iOS revokes permission from apps that receive a push without showing anything.

3. Copy `push.ts` to `client/src/lib/`. Load `firebase/messaging` with a dynamic `import()`, so it isn't in the main bundle.

4. Add routes to save and delete a device's token. Store `{ uid, token, kinds }` under a SHA-256 hash of the token.

5. On the server, send data-only FCM messages: `{ title, body, url, tag }`. Send after responding, with `waitUntil`, so actions never wait on it. Delete tokens FCM reports as unregistered.

6. Refresh the token after sign-in, and turn notifications off on sign-out.

7. Add a settings switch, with a spinner beside it while saving. Show each state from `pushAvailability()`:
   - `ready`: show the switch.
   - `needsInstall`: iPhones and iPads only get push from the home-screen app, so explain that.
   - `blocked`: browsers never ask again once blocked, so tell the user to allow it in settings, in red.
   - `unsupported`: hide the setting.

## Rules that held up

- Ask for permission straight from a tap, because iOS only shows the prompt then.
- Never notify people about their own actions.
- Use `tag` so repeat notifications replace each other, such as several reactions on one post.
- Tapping a notification opens the exact thing it's about, and clears it from any in-app list.
- For real-time apps, only notify players without the app on screen.

**Limit:** a Worker can only make so many subrequests per run. Batch through a Queue once there are more devices than one run can reach.

## Check it works

- Turning the switch on prompts for permission, then saves a token.
- With the app closed, a notification arrives, and tapping it opens the right page.
- Test on an installed app on iOS and Android, as well as desktop.
- Signing out stops notifications on that device.
