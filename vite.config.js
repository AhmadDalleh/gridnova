import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The build must produce ONE index.html that runs from file:// (no server, no module files).
// singlefile inlines JS + CSS; the very large assetsInlineLimit turns the woff2 fonts into data URIs.
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 5000,
    // Vite's modulepreload polyfill contains a fetch() call; with one inline script there is nothing to preload.
    modulePreload: false,
  },
  test: {
    include: ['tests/unit/**/*.test.js'],
  },
});
