import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  // Hot updates leave stores and any route not on screen running old code, so every code change
  // reloads the page instead. Projects can remove this if hot updates suit them better.
  plugins: [preact({ prefreshEnabled: false }), tailwindcss()],
  server: {
    // Each project needs its own ports, so they can run side by side.
    port: 5293,
    strictPort: true,
    // In dev, the Worker runs under `wrangler dev` on :8817.
    proxy: { '/api': 'http://localhost:8817' },
  },
});
