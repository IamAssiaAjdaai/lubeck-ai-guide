export type MapFailureReason =
  | "webgl2-unavailable"
  | "constructor"
  | "style"
  | "startup-timeout";

type MapErrorEventLike = Readonly<{
  error?: unknown;
  sourceId?: unknown;
  tile?: unknown;
}>;

export const MAP_STARTUP_TIMEOUT_MS = 30_000;

const MAP_FAILURE_DEVELOPMENT_CODES: Readonly<
  Record<MapFailureReason, string>
> = {
  "webgl2-unavailable": "webgl2_unavailable",
  constructor: "constructor_error",
  style: "style_error",
  "startup-timeout": "startup_timeout",
};

export function getMapFailureDevelopmentLabel(
  reason: MapFailureReason,
): string {
  return `DEV: ${MAP_FAILURE_DEVELOPMENT_CODES[reason]}`;
}

export function isWebGL2Supported(probe?: () => unknown): boolean {
  if (probe) {
    try {
      return Boolean(probe());
    } catch {
      return false;
    }
  }

  if (typeof document === "undefined") return false;

  try {
    const context = document.createElement("canvas").getContext("webgl2");
    if (!context) return false;

    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function getErrorName(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string"
  ) {
    return error.name;
  }

  return "UnknownError";
}

export function getFatalMapErrorReason(
  event: MapErrorEventLike,
  hasLoaded: boolean,
): MapFailureReason | undefined {
  if (getErrorName(event.error) === "GPUInitializationError") {
    return "webgl2-unavailable";
  }

  if (hasLoaded || event.sourceId !== undefined || event.tile !== undefined) {
    return undefined;
  }

  return "style";
}

export function reportMapInitializationFailure(
  reason: MapFailureReason,
  error?: unknown,
  options: Readonly<{
    environment?: string;
    logger?: (message: string, details: unknown) => void;
  }> = {},
) {
  const environment = options.environment ?? process.env.NODE_ENV;
  if (environment !== "development") return;

  const logger = options.logger ?? console.error;
  logger("[CITYWALK map] Interactive map initialization failed.", {
    reason,
    errorName: getErrorName(error),
  });
}
