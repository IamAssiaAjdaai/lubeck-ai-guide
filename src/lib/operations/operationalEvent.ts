export type OperationalFailureCategory =
  | "ai"
  | "auth"
  | "commerce"
  | "database"
  | "media"
  | "account_lifecycle";

export type OperationalFailureCode =
  | "AI_PROVIDER_NOT_CONFIGURED"
  | "AI_GUIDE_REQUEST_FAILED"
  | "REVENUECAT_NOT_CONFIGURED"
  | "REVENUECAT_WEBHOOK_PROCESSING_FAILED"
  | "DATABASE_CONNECT_FAILED"
  | "MEDIA_DELIVERY_FAILED"
  | "ACCOUNT_ERASURE_SCHEDULE_FAILED"
  | "AUTH_SIGN_IN_FAILED"
  | "AUTH_RATE_LIMITED"
  | "AUTH_PROVIDER_CALLBACK_FAILED"
  | "AUTH_RECOVERY_FAILED"
  | "AUTH_REQUEST_REJECTED"
  | "AUTH_SERVER_FAILED";

export type OperationalFailureSeverity = "warning" | "error" | "critical";

type Environment = Readonly<Record<string, unknown>>;

export type OperationalFailureEvent = Readonly<{
  event: "citywalk_operational_failure";
  category: OperationalFailureCategory;
  code: OperationalFailureCode;
  severity: OperationalFailureSeverity;
  environment: "development" | "preview" | "production" | "test" | "unknown";
  release: string;
  occurredAt: string;
  retryable: boolean;
  httpStatus?: number;
}>;

type EmitOptions = Readonly<{
  environment?: Environment;
  now?: Date;
  sink?: (line: string) => void;
}>;

function stringValue(environment: Environment, name: string): string | undefined {
  const value = environment[name];
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function runtimeEnvironment(
  environment: Environment,
): OperationalFailureEvent["environment"] {
  const explicit = stringValue(environment, "CITYWALK_RUNTIME_ENV")?.toLowerCase();
  if (
    explicit === "development" ||
    explicit === "preview" ||
    explicit === "production" ||
    explicit === "test"
  ) return explicit;

  const vercel = stringValue(environment, "VERCEL_ENV")?.toLowerCase();
  if (vercel === "development" || vercel === "preview" || vercel === "production") {
    return vercel;
  }

  const node = stringValue(environment, "NODE_ENV")?.toLowerCase();
  if (node === "development" || node === "production" || node === "test") return node;
  return "unknown";
}

function releaseIdentifier(environment: Environment): string {
  const raw =
    stringValue(environment, "CITYWALK_RELEASE") ||
    stringValue(environment, "VERCEL_GIT_COMMIT_SHA") ||
    "";
  if (!raw || !/^[A-Za-z0-9._-]+$/.test(raw)) return "unknown";
  return raw.slice(0, 64);
}

export function emitOperationalFailure(
  failure: Readonly<{
    category: OperationalFailureCategory;
    code: OperationalFailureCode;
    severity: OperationalFailureSeverity;
    retryable: boolean;
    httpStatus?: number;
  }>,
  options: EmitOptions = {},
): OperationalFailureEvent {
  const environment = options.environment ?? process.env;
  const event: OperationalFailureEvent = Object.freeze({
    event: "citywalk_operational_failure",
    category: failure.category,
    code: failure.code,
    severity: failure.severity,
    environment: runtimeEnvironment(environment),
    release: releaseIdentifier(environment),
    occurredAt: (options.now ?? new Date()).toISOString(),
    retryable: failure.retryable,
    ...(typeof failure.httpStatus === "number" &&
    Number.isInteger(failure.httpStatus) &&
    failure.httpStatus >= 100 &&
    failure.httpStatus <= 599
      ? { httpStatus: failure.httpStatus }
      : {}),
  });

  (options.sink ?? console.error)(JSON.stringify(event));
  return event;
}
