export const EDITORIAL_WORKFLOW_STATES = [
  "draft",
  "in_review",
  "approved",
  "published",
  "archived",
] as const;

export type EditorialWorkflowState =
  (typeof EDITORIAL_WORKFLOW_STATES)[number];

export type EditorialWorkflowAction =
  | "submitted_for_review"
  | "returned_to_draft"
  | "approved"
  | "published"
  | "archived";

export type EditorialTransition = Readonly<{
  from: EditorialWorkflowState;
  to: EditorialWorkflowState;
  action: EditorialWorkflowAction;
}>; 

export const EDITORIAL_TRANSITIONS: readonly EditorialTransition[] = [
  { from: "draft", to: "in_review", action: "submitted_for_review" },
  { from: "in_review", to: "draft", action: "returned_to_draft" },
  { from: "in_review", to: "approved", action: "approved" },
  { from: "approved", to: "draft", action: "returned_to_draft" },
  { from: "approved", to: "published", action: "published" },
  { from: "published", to: "archived", action: "archived" },
  { from: "archived", to: "draft", action: "returned_to_draft" },
];

export function getEditorialTransition(
  from: EditorialWorkflowState,
  to: EditorialWorkflowState,
): EditorialTransition | undefined {
  return EDITORIAL_TRANSITIONS.find(
    (transition) => transition.from === from && transition.to === to,
  );
}

export function isEditorialWorkflowState(
  value: unknown,
): value is EditorialWorkflowState {
  return EDITORIAL_WORKFLOW_STATES.includes(value as EditorialWorkflowState);
}

export function normalizeCanonicalSourceUrl(value: string): string {
  const parsed = new URL(value.trim());
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Source URL must use HTTP or HTTPS.");
  }
  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();
  if (
    (parsed.protocol === "https:" && parsed.port === "443") ||
    (parsed.protocol === "http:" && parsed.port === "80")
  ) {
    parsed.port = "";
  }
  if (parsed.pathname !== "/") {
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  }
  return parsed.toString();
}

export function isRequiredSourceValid(
  source: Readonly<{ verifiedAt: string; validUntil?: string | null }>,
  today = new Date(),
): boolean {
  const verifiedAt = parseIsoDate(source.verifiedAt);
  if (!verifiedAt || verifiedAt > endOfUtcDay(today)) return false;
  if (!source.validUntil) return true;
  const validUntil = parseIsoDate(source.validUntil);
  return Boolean(validUntil && validUntil >= startOfUtcDay(today));
}

function parseIsoDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
    ? parsed
    : undefined;
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function endOfUtcDay(value: Date): Date {
  return new Date(startOfUtcDay(value).valueOf() + 86_399_999);
}
