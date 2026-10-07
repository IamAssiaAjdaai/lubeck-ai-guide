import "server-only";

import { sql } from "drizzle-orm";

import { getDb } from "@/db/client";

export type RuntimeEnvironment =
  | "development"
  | "preview"
  | "production"
  | "test"
  | "unknown";

export type HealthCheckStatus =
  | "ok"
  | "missing"
  | "error"
  | "not_required";

export type OperationalHealth = Readonly<{
  service: "citywalk";
  status: "ok" | "degraded";
  environment: RuntimeEnvironment;
  release: string;
  checkedAt: string;
  checks: Readonly<{
    database: HealthCheckStatus;
    authConfiguration: HealthCheckStatus;
    mediaConfiguration: HealthCheckStatus;
    emailConfiguration: HealthCheckStatus;
    aiConfiguration: HealthCheckStatus;
  }>;
}>;

type HealthEnvironment = Readonly<Record<string, string | undefined>>;

type HealthOptions = Readonly<{
  environment?: HealthEnvironment;
  databaseProbe?: () => Promise<void>;
  now?: Date;
}>;

function configured(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function allConfigured(
  environment: HealthEnvironment,
  names: readonly string[],
): boolean {
  return names.every((name) => configured(environment[name]));
}

export function getRuntimeEnvironment(
  environment: HealthEnvironment = process.env,
): RuntimeEnvironment {
  const explicit = environment.CITYWALK_RUNTIME_ENV?.trim().toLowerCase();
  if (
    explicit === "development" ||
    explicit === "preview" ||
    explicit === "production" ||
    explicit === "test"
  ) {
    return explicit;
  }

  const vercel = environment.VERCEL_ENV?.trim().toLowerCase();
  if (vercel === "preview" || vercel === "production" || vercel === "development") {
    return vercel;
  }

  const node = environment.NODE_ENV?.trim().toLowerCase();
  if (node === "development" || node === "test") return node;
  if (node === "production") return "production";
  return "unknown";
}

export function getReleaseIdentifier(
  environment: HealthEnvironment = process.env,
): string {
  const raw =
    environment.CITYWALK_RELEASE?.trim() ||
    environment.VERCEL_GIT_COMMIT_SHA?.trim() ||
    "";

  if (!raw || !/^[A-Za-z0-9._-]+$/.test(raw)) return "unknown";
  return raw.slice(0, 64);
}

async function probeDatabase(): Promise<void> {
  await getDb().execute(sql`select 1 as citywalk_health`);
}

function configStatus(required: boolean, ready: boolean): HealthCheckStatus {
  if (!required) return "not_required";
  return ready ? "ok" : "missing";
}

export async function getOperationalHealth(
  options: HealthOptions = {},
): Promise<OperationalHealth> {
  const environment = options.environment ?? process.env;
  const runtime = getRuntimeEnvironment(environment);
  const strictConfiguration =
    runtime === "production" || runtime === "preview";

  let database: HealthCheckStatus = "ok";
  try {
    await (options.databaseProbe ?? probeDatabase)();
  } catch {
    database = "error";
  }

  const authConfiguration = configStatus(
    strictConfiguration,
    allConfigured(environment, ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL"]),
  );
  const mediaConfiguration = configStatus(
    strictConfiguration,
    environment.CITYWALK_MEDIA_STORAGE?.trim() === "s3" &&
      allConfigured(environment, [
        "CITYWALK_MEDIA_S3_ENDPOINT",
        "CITYWALK_MEDIA_S3_REGION",
        "CITYWALK_MEDIA_S3_BUCKET",
        "CITYWALK_MEDIA_S3_ACCESS_KEY_ID",
        "CITYWALK_MEDIA_S3_SECRET_ACCESS_KEY",
      ]),
  );
  const emailConfiguration = configStatus(
    strictConfiguration,
    allConfigured(environment, ["RESEND_API_KEY", "CITYWALK_EMAIL_FROM"]),
  );
  const aiConfiguration = configStatus(
    strictConfiguration,
    configured(environment.GROQ_API_KEY),
  );

  const checks = {
    database,
    authConfiguration,
    mediaConfiguration,
    emailConfiguration,
    aiConfiguration,
  } as const;

  const degraded = Object.values(checks).some(
    (status) => status === "missing" || status === "error",
  );

  return Object.freeze({
    service: "citywalk",
    status: degraded ? "degraded" : "ok",
    environment: runtime,
    release: getReleaseIdentifier(environment),
    checkedAt: (options.now ?? new Date()).toISOString(),
    checks: Object.freeze(checks),
  });
}
