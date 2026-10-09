"use client";

import { useState, useTransition } from "react";

import type { AiContentQaReport } from "@/lib/contentQa/aiReview";

export function MarketingQaPanel({
  action,
  verifiedPlaces = [],
  showPlaceSelection = true,
}: Readonly<{
  action: (placeId?: number) => Promise<AiContentQaReport>;
  verifiedPlaces?: readonly Readonly<{ id: number; slug: string }>[];
  showPlaceSelection?: boolean;
}>) {
  const [report, setReport] = useState<AiContentQaReport | null>(null);
  const [error, setError] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [pending, startTransition] = useTransition();

  const run = () => {
    setError(false);
    setReport(null);
    startTransition(async () => {
      try {
        const next = await action(selectedPlaceId ? Number(selectedPlaceId) : undefined);
        setReport(next);
      } catch {
        // Do not disclose staff authorization state or provider/internal errors.
        setError(true);
      }
    });
  };

  return (
    <section className="surface-card mt-6 p-5 sm:p-6" aria-labelledby="marketing-qa-title">
      <p className="eyebrow">Editorial quality checks</p>
      <h2 className="mt-2 text-xl font-extrabold" id="marketing-qa-title">
        Content QA
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
        Save your edits first, then run QA on the latest saved draft. Run it again
        after saving corrections. Warnings are advisory; only a human can approve
        or publish content.
      </p>
      {showPlaceSelection ? (
        <>
      <label className="mt-4 block max-w-lg text-sm font-semibold">
        <span>Verified place context (optional)</span>
        <select
          className="mt-2 min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
          disabled={pending}
          value={selectedPlaceId}
          onChange={(event) => {
            setSelectedPlaceId(event.target.value);
            setReport(null);
            setError(false);
          }}
        >
          <option value="">No place selected — deterministic checks only</option>
          {verifiedPlaces.map((place) => (
            <option key={place.id} value={place.id}>{place.slug}</option>
          ))}
        </select>
      </label>
      <p className="mt-2 max-w-2xl text-xs leading-5 text-text-secondary">
        Select a published place with verified English knowledge only when the copy is
        about that place. This does not verify citywide or multi-place claims.
        {verifiedPlaces.length === 0 ? " No eligible verified places are available." : ""}
      </p>
        </>
      ) : (
        <p className="mt-3 text-xs leading-5 text-text-secondary">
          Place draft facts and linked references are not verified knowledge.
          Factual claims still need human source review; AI factual review stays off without trusted evidence.
        </p>
      )}
      <button
        className="button-secondary mt-4 min-h-11 px-5"
        disabled={pending}
        onClick={run}
        type="button"
      >
        {pending ? "Running QA…" : report ? "Run QA again" : "Run QA"}
      </button>

      <div aria-live="polite" className="mt-4">
        {pending ? <p className="text-sm text-text-secondary">Checking the saved draft…</p> : null}
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            QA could not be completed. Refresh the page and try again, or review the draft manually.
          </p>
        ) : null}
        {report ? (
          <div className="space-y-4">
            <p className="text-sm font-semibold">
              {report.findings.length === 0
                ? "No issues detected by the available checks."
                : String(report.findings.length) + (report.findings.length === 1 ? " finding to review" : " findings to review")}
            </p>
            <p className="text-xs leading-5 text-text-secondary">
              Factual accuracy is not certified. AI review: {report.aiStatus}.
              {report.findings.some((item) => item.checkId === "ai.evidence_unavailable")
                ? " No verified place was selected; AI factual review cannot run without trusted evidence."
                : report.aiStatus === "skipped"
                  ? " The AI provider was not used; review warnings manually."
                  : ""}
            </p>
            {report.findings.length > 0 ? (
              <ul className="space-y-3" aria-label="QA findings">
                {report.findings.map((finding, index) => (
                  <li
                    className="rounded-xl border border-border bg-slate-50 p-4"
                    key={finding.checkId + "-" + (finding.affectedField ?? "") + "-" + index}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide">
                      <span>{finding.severity}</span>
                      <span className="text-text-secondary">{finding.origin.replace("_", " ")}</span>
                      <code className="text-text-secondary">{finding.checkId}</code>
                    </div>
                    <p className="mt-2 text-sm leading-6">{finding.message}</p>
                    {finding.affectedField ? (
                      <p className="mt-1 text-xs text-text-secondary">
                        Field: {finding.affectedField}
                      </p>
                    ) : null}
                    {finding.evidence?.length ? (
                      <p className="mt-1 text-xs text-text-secondary">
                        Evidence: {finding.evidence.map((evidence) => evidence.kind + ": " + (evidence.label ?? evidence.id)).join("; ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="text-xs text-text-secondary">
              Review and correct warnings manually. This tool never changes workflow status.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
