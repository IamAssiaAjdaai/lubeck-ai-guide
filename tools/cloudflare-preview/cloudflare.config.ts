import { bindings, defineConfig, defineWorker } from "cf/config";
import { PREVIEW_SECRET_BINDINGS, PREVIEW_TEXT_BINDINGS } from "../../src/cloudflare/previewBindings.mjs";
import { requirePreviewHyperdrive } from "./contract.mjs";

// Selected by the isolated workspace's canonical cloudflare.config.ts.
// No production config is imported, merged or changed.
export default defineConfig({
  worker: defineWorker({
    name: "citywalk-api-preview",
    entrypoint: "./src/cloudflare/previewEntrypoint.ts",
    compatibilityDate: "2026-10-03",
    compatibilityFlags: ["nodejs_compat"],
    workersDev: false,
    previewUrls: false,
    domains: [],
    triggers: [],
    assets: { notFoundHandling: "none", runWorkerFirst: true },
    env: {
      ASSETS: bindings.assets(),
      HYPERDRIVE: bindings.hyperdrive({ id: requirePreviewHyperdrive(process.env.CITYWALK_PREVIEW_HYPERDRIVE_ID) }),
      ...Object.fromEntries(Object.entries(PREVIEW_TEXT_BINDINGS).map(([key, value]) => [key, bindings.text(value)])),
      ...Object.fromEntries(PREVIEW_SECRET_BINDINGS.map(key => [key, bindings.secret()])),
    },
  }),
});
