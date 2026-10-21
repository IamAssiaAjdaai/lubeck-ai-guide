import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Deliberately a separate local UI host; no CITYWALK Next.js/admin routes.
export default defineConfig({
  root: dirname(fileURLToPath(import.meta.url)),
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 3108,
    strictPort: true,
    proxy: { "/api": { target: "http://127.0.0.1:3109", changeOrigin: false } },
  },
  preview: {
    host: "127.0.0.1",
    port: 3108,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
