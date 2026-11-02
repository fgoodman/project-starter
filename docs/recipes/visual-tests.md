# Visual tests

Playwright goes through every page state, at phone and desktop sizes, and compares each one with its approved image. A failure shows exactly which states changed. `CLAUDE.md` says how to use the results when showing a visual change.

**Use it when** the project has pages. Every project should have this, so add it with the first real page.

**Source:** `nomp/playwright.config.ts` and `nomp/visual/`.

## Steps

1. Install Playwright from the repo root:

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

4. Create `playwright.config.ts` in the repo root, with a port no other project uses:

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

   /** The whole page. The mouse moves away first, so nothing is left looking hovered. */
   export async function shot(page: Page, file: string) {
     await page.mouse.move(0, 0);
     await expect(page).toHaveScreenshot(`${file}.png`, { fullPage: true });
   }
   ```

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

7. Make the first approved images, and look through them:

   ```bash
   npm run test:visual:update
   ```

8. Commit `visual/screenshots` along with the tests.

**With [Firebase Auth](firebase-auth.md):** fake the signed-in user and their saved data as well, so signed-in states need no real account. See `nomp/visual/account.ts`.

**Gallery:** to see every state on one page, copy `nomp/visual/gallery.ts`, change its groups to suit the app, and add `visual/gallery.html` to `.gitignore`.

**Add a state** by adding a `shot`, named in order such as `checkout-1-cart` and `checkout-2-paid`.

## What counts as a state

Cover each page and each way it can look:

- Signed out and signed in
- Loading, empty, full and error
- Each step of a flow, including its end states
- Open menus, modals and toasts
- Long names and long lists

**Size:** images are small. Nomp's 82 use 3.5 MB.

**CI:** the approved images are made on a Mac, and fonts render differently on Linux, so these tests run locally and aren't part of CI.

## Check it works

- `npm run test:visual` passes twice in a row with no changes.
- Changing a colour makes the states using it fail, and `npm run test:visual:report` shows the difference.
- The run works with `npm run dev` running or stopped.
