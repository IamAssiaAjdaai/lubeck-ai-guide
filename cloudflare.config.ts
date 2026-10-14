import { bindings, defineConfig, defineWorker } from "cf/config";
import {
  CITYWALK_PRODUCTION_HYPERDRIVE_ID,
  requireIsolatedPreviewHyperdriveId,
} from "./src/cloudflare/previewConfig.ts";

// Only an explicit Vite preview mode can target the isolated Worker.
// The default build/deployment remains the existing production configuration.
export default defineConfig(({ mode }) => {
  const preview = mode === "preview";
  return {
    worker: defineWorker({
      name: preview ? "citywalk-share-preview" : "citywalk-production",
      entrypoint: "./src/cloudflare/entrypoint.ts",
      compatibilityDate: "2026-10-03",
      compatibilityFlags: ["nodejs_compat"],
      assets: { notFoundHandling: "none" },
      env: {
        ASSETS: bindings.assets(),
        CITYWALK_CONTENT_SOURCE: bindings.text("database"),
        CITYWALK_MEDIA_STORAGE: bindings.text("s3"),
        CITYWALK_DATABASE_RUNTIME: bindings.text("hyperdrive"),
        CITYWALK_RUNTIME_ENV: bindings.text(preview ? "preview" : "production"),
        // Never reuse production Hyperdrive: preview must be attached to an
        // independently provisioned Neon preview database.
        HYPERDRIVE: bindings.hyperdrive({
          id: preview
            ? requireIsolatedPreviewHyperdriveId(process.env.CITYWALK_PREVIEW_HYPERDRIVE_ID)
            : CITYWALK_PRODUCTION_HYPERDRIVE_ID,
        }),
        BETTER_AUTH_SECRET: bindings.secret(),
        BETTER_AUTH_URL: bindings.secret(),
        RESEND_API_KEY: bindings.secret(),
        CITYWALK_EMAIL_FROM: bindings.secret(),
        CITYWALK_MEDIA_S3_ENDPOINT: bindings.secret(),
        CITYWALK_MEDIA_S3_REGION: bindings.secret(),
        CITYWALK_MEDIA_S3_BUCKET: bindings.secret(),
        CITYWALK_MEDIA_S3_ACCESS_KEY_ID: bindings.secret(),
        CITYWALK_MEDIA_S3_SECRET_ACCESS_KEY: bindings.secret(),
        GROQ_API_KEY: bindings.secret(),
      },
    }),
  };
});
