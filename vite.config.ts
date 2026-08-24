import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  /**
   * Six pages, six bundles. Neither the Donut Lab nor the catalogue is a
   * route: the site has no router, and a separate HTML entry keeps the build
   * fully static — the homepage does not pay for the builder's art and logic,
   * `/donut-lab/` does not pay for the homepage, and `/shop/` pays for
   * neither.
   *
   * `/shop/` is a page rather than the overlay it used to be because the
   * design calls for the global navbar to sit above the catalogue. An overlay
   * covers the navbar by definition; a page sits under it.
   */
  build: {
    /**
     * Both of these exist to route around a local toolchain fault, not a
     * preference.
     *
     * esbuild cannot delete its own temp file on this machine — it fails with
     * `Access is denied` partway through `vite:esbuild-transpile`, which is
     * antivirus holding the handle, not the code. It is a race, so it fails
     * intermittently rather than every time. Redirecting TMP/TEMP does not
     * help; esbuild is holding its own handle.
     *
     * Vite reaches for esbuild twice in that plugin: once to downlevel syntax
     * to `build.target`, and once to minify. `esnext` removes the first call
     * and terser replaces the second, so esbuild is never spawned and the
     * build is reproducible (verified 3/3 with both, 0/3 with either alone).
     *
     * The cost is real: `esnext` ships modern syntax undownlevelled, so the
     * output needs an evergreen browser. Revisit both lines if the esbuild
     * fault is ever fixed on the build machine.
     */
    target: 'esnext',
    minify: 'terser',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        donutLab: path.resolve(__dirname, 'donut-lab/index.html'),
        shop: path.resolve(__dirname, 'shop/index.html'),
        contact: path.resolve(__dirname, 'contact/index.html'),
        careers: path.resolve(__dirname, 'careers/index.html'),
        bulkOrders: path.resolve(__dirname, 'bulk-orders/index.html')
      }
    }
  },
  /* Both servers take their port from the environment when one is given, so
     the harness can assign a free one instead of the config pinning a number
     that another process may already hold. `vite preview` does not read PORT
     on its own, hence the second line. */
  server: { port: Number(process.env.PORT) || undefined },
  preview: { port: Number(process.env.PORT) || undefined }
});
