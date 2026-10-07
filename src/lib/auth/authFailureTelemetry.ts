import {
  emitOperationalFailure,
  type OperationalFailureCode,
  type OperationalFailureSeverity,
} from "@/lib/operations/operationalEvent";

type AuthFailureClassification = Readonly<{
  code: OperationalFailureCode;
  severity: OperationalFailureSeverity;
  retryable: boolean;
}>;

export function classifyAuthFailure(
  request: Request,
  status: number,
): AuthFailureClassification | null {
  if (!Number.isInteger(status) || status < 400 || status > 599) return null;

  if (status >= 500) {
    return {
      code: "AUTH_SERVER_FAILED",
      severity: "error",
      retryable: true,
    };
  }

  if (status === 429) {
    return {
      code: "AUTH_RATE_LIMITED",
      severity: "warning",
      retryable: true,
    };
  }

  const path = new URL(request.url).pathname;

  if (path.includes("/callback/")) {
    return {
      code: "AUTH_PROVIDER_CALLBACK_FAILED",
      severity: "warning",
      retryable: false,
    };
  }

  if (
    path.endsWith("/request-password-reset") ||
    path.endsWith("/reset-password")
  ) {
    return {
      code: "AUTH_RECOVERY_FAILED",
      severity: "warning",
      retryable: false,
    };
  }

  if (path.includes("/sign-in")) {
    return {
      code: "AUTH_SIGN_IN_FAILED",
      severity: "warning",
      retryable: false,
    };
  }

  return {
    code: "AUTH_REQUEST_REJECTED",
    severity: "warning",
    retryable: false,
  };
}

export function reportAuthFailure(request: Request, status: number): void {
  const failure = classifyAuthFailure(request, status);
  if (!failure) return;

  emitOperationalFailure({
    category: "auth",
    code: failure.code,
    severity: failure.severity,
    retryable: failure.retryable,
    httpStatus: status,
  });
}
