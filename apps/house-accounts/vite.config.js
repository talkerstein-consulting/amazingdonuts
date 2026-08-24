import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  base: "/accounts/",
  plugins: [react()],
  server: { port: 5174, proxy: { "/api": "http://127.0.0.1:3101" } },
  build: { outDir: path.resolve(root, "../../dist/accounts"), emptyOutDir: false }
});
