# Visual tests

Playwright goes through every page state, at phone and desktop sizes, and compares each one with its approved image. A failure shows exactly which states changed. `CLAUDE.md` says how to use the results when showing a visual change.

**Use it when** the project has pages. Every project should have this, so add it with the first real page.

**Source:** `nomp/playwright.config.ts` and `nomp/visual/`.

## Steps

1. Install Playwright from the repo root. The browser installs separately:

   ```bash
   npm install -D @playwright/test
   npx playwright install chromium
   ```

2. Add scripts to the root `package.json`:

   ```json
   "test:visual": "playwright test",
   "test:visual:update": "playwright test --update-snapshots",
   "test:visual:report": "playwright show-report visual/report"
   ```

3. Add this to `.gitignore`. The approved images in `visual/screenshots` are kept:

   ```
   # Playwright output
   visual/report
   visual/results
   ```

4. Create `playwright.config.ts` in the repo root, with a port no other project uses. Playwright starts the dev server on it by itself:

   ```ts
   import { defineConfig } from '@playwright/test';

   /** Its own port, so a run neither needs nor disturbs the usual dev servers. */
   const PORT = 5295;

   export default defineConfig({
     testDir: 'visual',
     // No platform in the path, so these are Mac images. CI would need its own set, made in Playwright's Linux container.
     snapshotPathTemplate: '{testDir}/screenshots/{projectName}/{arg}{ext}',
     outputDir: 'visual/results',
     fullyParallel: true,
     reporter: [['list'], ['html', { outputFolder: 'visual/report', open: 'never' }]],
     expect: { toHaveScreenshot: { animations: 'disabled' } },
     use: { baseURL: `http://localhost:${PORT}`, locale: 'en-US', timezoneId: 'UTC' },
     // One size in each theme keeps the number of images down while still covering both.
     projects: [
       {
         name: 'phone',
         use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: 'dark' },
       },
       { name: 'desktop', use: { viewport: { width: 1280, height: 800 }, colorScheme: 'light' } },
     ],
     webServer: { command: `npm run dev -w client -- --port ${PORT}`, url: `http://localhost:${PORT}` },
   });
   ```

5. Create `visual/setup.ts`, which removes everything that would differ between runs:

   ```ts
   import { expect, type Page } from '@playwright/test';

   /** A fixed moment, so the page shows the same dates on every run. */
   export const NOW = Date.UTC(2026, 10, 1, 12);

   /** Stands in for the API, so nothing depends on a server or on real data. */
   async function fakeApi(page: Page) {
     await page.route('**/api/**', async (route) => {
       const path = new URL(route.request().url()).pathname.replace('/api', '');

       if (path === '/health') return route.fulfill({ json: { status: 'ok' } });

       return route.fulfill({ status: 500, json: { error: `The fake API has no ${path}` } });
     });
   }

   /** Everything that would otherwise differ between runs: the data, the time, and random picks. */
   export async function steady(page: Page) {
     await fakeApi(page);
     await page.clock.setFixedTime(NOW);
     await page.addInitScript(() => {
       Math.random = () => 0.5;
     });
   }

   /** Moves the clock on from the start of the test. Timers keep running, so the page catches up by itself. */
   export const secondsLater = (page: Page, seconds: number) => page.clock.setFixedTime(NOW + seconds * 1000);

   /** The whole page. The mouse moves away first, so nothing is left looking hovered. */
   export async function shot(page: Page, file: string) {
     await page.mouse.move(0, 0);
     await expect(page).toHaveScreenshot(`${file}.png`, { fullPage: true });
   }
   ```

   Keep `fullPage` here, on each screenshot, because it isn't valid in the config.

6. Create `visual/pages.spec.ts`, and wait for each state to be ready before taking its image:

   ```ts
   import { expect, test } from '@playwright/test';
   import { shot, steady } from './setup.ts';

   test.beforeEach(({ page }) => steady(page));

   test('pages', async ({ page }) => {
     await page.goto('/');
     await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
     await shot(page, 'home');

     await page.goto('/no-such-page');
     await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
     await shot(page, 'not-found');
   });
   ```

7. Type-check the tests, because Playwright doesn't. Create `visual/tsconfig.json` from `shared/tsconfig.json`, with `"lib": ["ES2023", "DOM"]` and `"include": [".", "../playwright.config.ts"]`. Then add `&& tsc --noEmit -p ../visual` after the `shared` step of the `check` script in `server/package.json`, so `npm run build` and CI cover it.

8. Make the first approved images, and look through them:

   ```bash
   npm run test:visual:update
   ```

9. Commit `visual/screenshots` along with the tests.

**Add a state** by adding a `shot`, named in order such as `checkout-1-cart` and `checkout-2-paid`.

**Gallery:** to see every state on one page, copy `nomp/visual/gallery.ts`, change its groups to suit the app, and add `visual/gallery.html` to `.gitignore`.

**Size:** images are small. Nomp's 82 use 3.5 MB.

**CI:** images are specific to the OS, so these run on your Mac and aren't part of CI. To add them to CI, make a separate set in Playwright's Linux container.

## Fake APIs

- The most recently added route runs first, so a test can override any fake from `steady`.
- Keep fake data in a plain object tests can change, to imitate another device.
- Return a 500 naming the path for anything unhandled, so a missing fake is easy to spot.

## Fake Firebase sign-in

With [Firebase Auth](firebase-auth.md), signed-in states need no real account and no changes to app code. Firebase restores a session it finds in `localStorage`, then checks it with the emulator, and the test answers for the emulator.

Create `visual/account.ts`:

```ts
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { NOW } from './setup.ts';

const YEAR_MS = 365 * 86_400_000;
const API_KEY = readFileSync('client/.env.development', 'utf8').match(/VITE_FIREBASE_API_KEY=(.*)/)![1];

const USER = { uid: 'visual-test', email: 'you@example.com', displayName: 'Pat Example' };

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };

/** Firebase restores a session it finds in storage, and checks it with the Auth emulator, which this answers for. */
async function restoreSession(page: Page) {
  const stored = {
    ...USER,
    emailVerified: true,
    isAnonymous: false,
    providerData: [{ ...USER, providerId: 'google.com', phoneNumber: null, photoURL: null }],
    stsTokenManager: { refreshToken: 'fake', accessToken: 'fake', expirationTime: NOW + YEAR_MS },
    createdAt: String(NOW),
    lastLoginAt: String(NOW),
    apiKey: API_KEY,
    appName: '[DEFAULT]',
  };
  await page.addInitScript(
    ([key, user]) => localStorage.setItem(key, user),
    [`firebase:authUser:${API_KEY}:[DEFAULT]`, JSON.stringify(stored)],
  );
  await page.route('**/accounts:lookup*', (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const { uid: localId, ...user } = USER;
    return route.fulfill({
      headers: CORS,
      json: { users: [{ ...user, localId, emailVerified: true, createdAt: String(NOW), lastLoginAt: String(NOW) }] },
    });
  });
}

/** Opens `path` with this account signed in, once Firebase has restored the session. */
export async function openSignedIn(page: Page, path: string) {
  await restoreSession(page);
  await Promise.all([page.waitForResponse('**/accounts:lookup*'), page.goto(path)]);
}
```

Add the signed-in parts of the API to a route in `openSignedIn`, keeping the account's data in a plain object. See `fakeAccountApi` in `nomp/visual/account.ts`.

## Visual test coverage

Aim to see every state a user can land on, not every code path. A failure means "this looks different", and a person decides whether that's a problem.

Cover, for each main flow:

- Each step from start to finish, in one test per flow with a screenshot at each stop
- Every way the flow can end, including success, giving up, and timing out
- Empty, partly filled, full, and very long content
- Temporary UI, such as toasts, warnings, dialogs, and menus
- Signed-out and signed-in versions, covering only what differs
- Reachable failures, such as bad links, not found, and failed loads
- A phone and a desktop size, with one theme each to keep the image count down

Keep runs repeatable:

- Fake all network calls, so tests need no servers or real data
- Fix the time, timezone, locale, and random values, and turn off animations
- Confirm the page has reached the expected state before each screenshot
- Move the mouse away, and capture the full page

Before trusting a new or changed test:

- Run it three times to confirm the images match
- Make a deliberate visual change to confirm it fails
- Look at the approved images, because a passing test only matches what was approved

Don't use these tests to check logic, saving, real sign-in, or how animations feel. Cover those with other tests or by hand, and list what isn't covered.

## Check it works

- A new test passes the three checks under "Before trusting a new or changed test".
- After a failure, `npm run test:visual:report` shows the difference.
- `npm run build` fails on a type error in `visual/`.
- The run works with `npm run dev` running or stopped.
