import type { ReactNode } from "react";

import { StatusBadge } from "@/components/admin/AdminContentUi";

export type MarketingWorkflowAction = Readonly<{
  to: string;
  label: string;
}>;

type WorkflowAction = (formData: FormData) => Promise<void>;

export function MarketingWorkflowPanel({
  action,
  actions,
  cityId,
  currentStatus,
  description,
  publishedUrl,
  title,
}: Readonly<{
  action: WorkflowAction;
  actions: readonly MarketingWorkflowAction[];
  cityId?: number;
  currentStatus: string;
  description: string;
  publishedUrl?: string | null;
  title: string;
}>) {
  return (
    <section className="surface-card mt-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Review & publishing</p>
          <h2 className="mt-2 text-xl font-extrabold">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
            {description}
          </p>
        </div>
        <StatusBadge status={currentStatus} />
      </div>

      {actions.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-text-secondary">
          No workflow action is available for your role at this status.
        </p>
      ) : (
        <div className="mt-5 flex flex-wrap gap-3">
          {actions.map((transition) => (
            <WorkflowForm
              action={action}
              cityId={cityId}
              key={`${currentStatus}-${transition.to}`}
              label={transition.label}
              publishedUrl={publishedUrl}
              requiresPublishedUrl={transition.to === "published"}
              to={transition.to}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function WorkflowForm({
  action,
  cityId,
  label,
  publishedUrl,
  requiresPublishedUrl,
  to,
}: Readonly<{
  action: WorkflowAction;
  cityId?: number;
  label: string;
  publishedUrl?: string | null;
  requiresPublishedUrl: boolean;
  to: string;
}>) {
  if (requiresPublishedUrl && publishedUrl !== undefined) {
    return (
      <form action={action} className="w-full rounded-xl border border-border bg-slate-50 p-4">
        <input name="status" type="hidden" value={to} />
        {cityId ? <input name="cityId" type="hidden" value={cityId} /> : null}
        <label className="block text-sm font-semibold">
          <span>Published URL</span>
          <input
            className="mt-2 min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100"
            defaultValue={publishedUrl ?? ""}
            name="publishedUrl"
            placeholder="https://www.instagram.com/reel/..."
            required
            type="url"
          />
        </label>
        <button className="button-primary mt-3 min-h-10 px-4" type="submit">
          {label}
        </button>
      </form>
    );
  }

  return (
    <form action={action}>
      <input name="status" type="hidden" value={to} />
      {cityId ? <input name="cityId" type="hidden" value={cityId} /> : null}
      <button className={buttonClass(to)} type="submit">
        {label}
      </button>
    </form>
  );
}

function buttonClass(to: string) {
  return to === "draft" || to === "archived"
    ? "button-secondary min-h-10 px-4"
    : "button-primary min-h-10 px-4";
}

export function MarketingTrackingPanel({
  children,
  trackingPath,
}: Readonly<{
  children?: ReactNode;
  trackingPath: string | null;
}>) {
  return (
    <section className="surface-card mt-6 p-5 sm:p-6">
      <p className="eyebrow">Attribution</p>
      <h2 className="mt-2 text-xl font-extrabold">Tracking link</h2>
      {trackingPath ? (
        <>
          <code className="mt-4 block overflow-x-auto rounded-xl bg-slate-950 px-4 py-3 text-xs leading-6 text-slate-100">
            {trackingPath}
          </code>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            UTM source, campaign and content code stay deterministic so the public page can map them to PostHog attribution properties later.
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          Link this social draft to a Marketing page to generate a deterministic tracking URL.
        </p>
      )}
      {children}
    </section>
  );
}
