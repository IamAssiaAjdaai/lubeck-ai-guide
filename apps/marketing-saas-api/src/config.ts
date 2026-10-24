import { join } from "node:path";
import { tmpdir } from "node:os";
import { z } from "zod";
export function configuration(
  env: Record<string, string | undefined> = process.env,
) {
  const databaseUrl = env.MARKETING_DATABASE_URL;
  if (!databaseUrl) throw new Error("MARKETING_DATABASE_URL_REQUIRED");
  const url = new URL(databaseUrl);
  // This deliverable is deliberately local-only. Release configuration is a separate gate.
  if (
    url.hostname !== "127.0.0.1" ||
    !/^marketing_[a-z0-9_]+$/.test(url.pathname.slice(1)) ||
    url.port === "5432"
  )
    throw new Error("ISOLATED_LOCAL_MARKETING_DB_REQUIRED");
  const origin = env.MARKETING_ORIGIN ?? "http://127.0.0.1:3108";
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
    throw new Error("LOCAL_ORIGIN_REQUIRED");
  const secret = z.string().min(32).parse(env.MARKETING_AUTH_SECRET);
  const creative = env.MARKETING_CREATIVE_QA_ENABLED === "true";
  if (creative && env.MARKETING_DEMO_MODE !== "true")
    throw new Error("CREATIVE_QA_REQUIRES_DEMO");
  return {
    localRegistration: env.MARKETING_DEMO_MODE === "true" && env.MARKETING_LOCAL_REGISTRATION_ENABLED === "true",
    creative,
    workspace: env.MARKETING_WORKSPACE_UX_ENABLED === "true" && env.MARKETING_DEMO_MODE === "true",
    // Three independent default-off approvals. None reads or validates a credential.
    realImage: {
      enabled: env.MARKETING_REAL_IMAGE_TRANSPORT_ENABLED === "true",
      authorizedUntil: env.MARKETING_REAL_IMAGE_AUTHORIZED_UNTIL ?? "",
      spendApproved: env.MARKETING_REAL_IMAGE_SPEND_APPROVED === "true",
      priceBoundVerified:
        env.MARKETING_REAL_IMAGE_PRICE_BOUND_VERIFIED === "true",
    },
    creativeGlobal: {
      attempts: z.coerce
        .number()
        .int()
        .min(1)
        .max(10000)
        .parse(env.MARKETING_IMAGE_GLOBAL_ATTEMPTS ?? 100),
      concurrent: z.coerce
        .number()
        .int()
        .min(1)
        .max(500)
        .parse(env.MARKETING_IMAGE_GLOBAL_CONCURRENT ?? 8),
      budget: z.coerce
        .number()
        .int()
        .min(1)
        .max(1_000_000_000)
        .parse(env.MARKETING_IMAGE_GLOBAL_BUDGET_MICRO_EUR ?? 10_000_000),
    },
    mediaDirectory: join(
      tmpdir(),
      `marketing-creative-${url.pathname.slice(1)}`,
      ".qa-creative-media",
    ),
    databaseUrl,
    origin,
    secret,
    demo: env.MARKETING_DEMO_MODE === "true",
    mailDirectory: env.MARKETING_MAIL_DIRECTORY ?? ".qa-mail",
    port: Number(env.MARKETING_API_PORT ?? 3109),
  };
}

/** A configuration assertion, not vendor billing enforcement or spending authorization. */
export function liveDeadlineValid(
  value: string,
  startedAt: number,
  now = Date.now(),
) {
  const deadline = Date.parse(value);
  return (
    Number.isFinite(deadline) &&
    deadline > now &&
    deadline <= startedAt + 3600000
  );
}
