import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Deliberately a separate local UI host; no CITYWALK Next.js/admin routes.
const apiOrigin = process.env.MARKETING_API_ORIGIN ?? "http://127.0.0.1:3109";
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(apiOrigin))
  throw new Error("LOCAL_API_REQUIRED");
export default defineConfig({
  root: dirname(fileURLToPath(import.meta.url)),
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 3108,
    strictPort: true,
    fs: { deny: ["**/.qa-creative-media/**", "**/.env*", "**/.git/**"] },
    proxy: { "/api": { target: apiOrigin, changeOrigin: false } },
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
