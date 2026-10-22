import { bindings, defineConfig, defineWorker } from "cf/config";
import { NATIVE_PREVIEW_SECRETS, NATIVE_PREVIEW_TEXT } from "../../src/cloudflare/nativePreviewBindings.mjs";
import { requirePreviewHyperdrive } from "../cloudflare-preview/contract.mjs";
import { requireRevision } from "./provenance.mjs";

export default defineConfig({ worker: defineWorker({
  name: "citywalk-api-preview",
  entrypoint: "./src/cloudflare/nativePreviewEntrypoint.ts",
  compatibilityDate: "2026-10-03", compatibilityFlags: ["nodejs_compat"],
  workersDev: false, previewUrls: false,
  // Domain activation creates DNS/certificates: deliberately NOT authorized here.
  domains: [], triggers: [],
  assets: { notFoundHandling: "none", runWorkerFirst: true },
  env: {
    ASSETS: bindings.assets(),
    HYPERDRIVE: bindings.hyperdrive({ id: requirePreviewHyperdrive(process.env.CITYWALK_PREVIEW_HYPERDRIVE_ID) }),
    ...Object.fromEntries(Object.entries(NATIVE_PREVIEW_TEXT).map(([key, value]) => [key, bindings.text(value)])),
    ...Object.fromEntries(NATIVE_PREVIEW_SECRETS.map(key => [key, bindings.secret()])),
    CITYWALK_BUILD_REVISION: bindings.text(requireRevision(process.env.CITYWALK_BUILD_REVISION)),
    CITYWALK_PREVIEW_BOUND_HYPERDRIVE: bindings.text(requirePreviewHyperdrive(process.env.CITYWALK_PREVIEW_HYPERDRIVE_ID)),
  },
}) });
