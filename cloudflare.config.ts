import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "citywalk-production",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-03",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    env: {
      ASSETS: bindings.assets(),
      CITYWALK_CONTENT_SOURCE: bindings.text("database"),
      CITYWALK_MEDIA_STORAGE: bindings.text("s3"),
      DATABASE_URL: bindings.secret(),
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
