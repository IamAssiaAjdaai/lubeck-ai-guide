import type { AdminCapability } from "@/lib/admin/permissions";

export const MARKETING_PAGE_STATES = [
  "draft",
  "in_review",
  "approved",
  "published",
  "archived",
] as const;

export type MarketingPageState = (typeof MARKETING_PAGE_STATES)[number];

export const MARKETING_SOCIAL_STATES = [
  "idea",
  "draft",
  "in_review",
  "approved",
  "ready",
  "published",
  "archived",
] as const;

export type MarketingSocialState = (typeof MARKETING_SOCIAL_STATES)[number];

export type MarketingWorkflowTransition<TState extends string> = Readonly<{
  from: TState;
  to: TState;
  label: string;
  capability: AdminCapability;
}>;

export const MARKETING_PAGE_TRANSITIONS: readonly MarketingWorkflowTransition<MarketingPageState>[] = [
  { from: "draft", to: "in_review", label: "Submit for review", capability: "marketing:manage" },
  { from: "in_review", to: "draft", label: "Return to draft", capability: "publishing:review" },
  { from: "in_review", to: "approved", label: "Approve", capability: "publishing:review" },
  { from: "approved", to: "draft", label: "Return to draft", capability: "publishing:review" },
  { from: "approved", to: "published", label: "Publish page", capability: "publishing:publish" },
  { from: "published", to: "archived", label: "Archive page", capability: "publishing:publish" },
  { from: "archived", to: "draft", label: "Restore as draft", capability: "publishing:publish" },
];

export const MARKETING_SOCIAL_TRANSITIONS: readonly MarketingWorkflowTransition<MarketingSocialState>[] = [
  { from: "idea", to: "draft", label: "Move to draft", capability: "marketing:manage" },
  { from: "draft", to: "in_review", label: "Submit for review", capability: "marketing:manage" },
  { from: "in_review", to: "draft", label: "Return to draft", capability: "publishing:review" },
  { from: "in_review", to: "approved", label: "Approve", capability: "publishing:review" },
  { from: "approved", to: "draft", label: "Return to draft", capability: "publishing:review" },
  { from: "approved", to: "ready", label: "Mark ready", capability: "publishing:publish" },
  { from: "ready", to: "published", label: "Mark published", capability: "publishing:publish" },
  { from: "published", to: "archived", label: "Archive content", capability: "publishing:publish" },
  { from: "archived", to: "draft", label: "Restore as draft", capability: "publishing:publish" },
];

export function getMarketingPageTransition(
  from: MarketingPageState,
  to: MarketingPageState,
) {
  return MARKETING_PAGE_TRANSITIONS.find(
    (transition) => transition.from === from && transition.to === to,
  );
}

export function getMarketingSocialTransition(
  from: MarketingSocialState,
  to: MarketingSocialState,
) {
  return MARKETING_SOCIAL_TRANSITIONS.find(
    (transition) => transition.from === from && transition.to === to,
  );
}

export function isMarketingPageState(value: unknown): value is MarketingPageState {
  return MARKETING_PAGE_STATES.includes(value as MarketingPageState);
}

export function isMarketingSocialState(value: unknown): value is MarketingSocialState {
  return MARKETING_SOCIAL_STATES.includes(value as MarketingSocialState);
}
