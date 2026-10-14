import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "citywalk-production",
    entrypoint: "./src/cloudflare/entrypoint.ts",
    compatibilityDate: "2026-10-03",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    env: {
      ASSETS: bindings.assets(),
      CITYWALK_CONTENT_SOURCE: bindings.text("database"),
      CITYWALK_MEDIA_STORAGE: bindings.text("s3"),
      CITYWALK_DATABASE_RUNTIME: bindings.text("hyperdrive"),
      CITYWALK_RUNTIME_ENV: bindings.text("production"),
      CITYWALK_LEGAL_ENTITY_TYPE: bindings.text("individual"),
      CITYWALK_LEGAL_OPERATOR_COUNTRY: bindings.text("Germany"),
      // Owner-supplied public identity, kept out of source and build artifacts.
      CITYWALK_LEGAL_OPERATOR_NAME: bindings.secret(),
      CITYWALK_LEGAL_OPERATOR_STREET_ADDRESS: bindings.secret(),
      CITYWALK_LEGAL_OPERATOR_POSTAL_CITY: bindings.secret(),
      HYPERDRIVE: bindings.hyperdrive({
        id: "390958927c2946be8571ec5282b35ce6",
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
});
