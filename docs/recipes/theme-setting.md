# Theme setting

A setting with "Follow system preference" as the default, plus Light and Dark. Without a settings page, Tailwind's `dark:` classes already follow `prefers-color-scheme`, so this isn't needed.

**Use it when** the app has a settings page.

**Source:** `percolatus/client/src/lib/theme.ts`, `percolatus/client/index.html` and `percolatus/client/src/index.css`.

## Steps

1. Make `dark:` follow the choice, in `client/src/index.css`:

   ```css
   /* `dark:` follows the theme chosen in Settings (lib/theme.ts), not just the system's. */
   @custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *));
   ```

2. Add this to the top of `<head>` in `client/index.html`, with a storage key for the app. It sets the theme before anything paints, so there's no flash of the wrong one:

   ```html
   <script>
     try {
       var theme = localStorage.getItem('my-app.theme');
       var dark = theme === 'dark' || (theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
       document.documentElement.dataset.theme = dark ? 'dark' : 'light';
     } catch (e) {}
   </script>
   ```

3. Copy `percolatus/client/src/lib/theme.ts` to `client/src/lib/theme.ts`, and change `STORAGE_KEY` to match.

4. Call `watchSystemTheme()` in `client/src/main.tsx`, so the app follows the system changing at sunset.

5. In settings, show the three choices, and call `setThemePreference('system' | 'light' | 'dark')`. Label the first "Follow system preference".

## Check it works

- With each choice, reload the page: there's no flash of the wrong theme.
- With "Follow system preference", changing the system setting updates the open app.
- The choice survives a reload.
