import {
  Check,
  LoaderCircle,
  Footprints,
  Circle,
  Map,
  Compass,
  RotateCw,
  ArrowLeft,
  Wifi,
  Sparkles,
} from "lucide-react";
import type { WalkCopy } from "@/lib/walk/copy";
export function LoadingProgress({ t, phase }: { t: WalkCopy; phase: number }) {
  return (
    <section role="status" aria-live="polite" className="walk-loading">
      <header className="walk-hero walk-loading-hero">
        <h2 className="text-3xl font-bold">{t.loading}</h2>
        <p className="mt-3 leading-7 text-text-secondary">
          {t.loadingSubtitle}
        </p>
      </header>
      <div className="walk-progress-ring" aria-hidden="true">
        <Footprints size={48} />
        <span className="walk-ring-orbit" />
      </div>
      <ol className="walk-loading-stages">
        {[t.matching, t.checking, t.fitting, t.choosing].map((label, index) => (
          <li
            key={label}
            className={`flex items-center gap-4 ${index > phase ? "text-text-secondary" : "text-text-primary"}`}
          >
            {index < phase ? (
              <Check className="stage-complete" size={28} />
            ) : index === phase ? (
              <LoaderCircle size={28} className="animate-spin text-primary" />
            ) : (
              <Circle size={28} className="text-text-muted" />
            )}
            <span>{label}</span>
            <span className="sr-only">
              {index < phase ? "✓" : index === phase ? "…" : ""}
            </span>
          </li>
        ))}
      </ol>
      <p className="walk-reassurance">
        <Sparkles aria-hidden="true" size={28} />
        <span>{t.reassurance}</span>
      </p>
    </section>
  );
}
export function WalkError({
  t,
  empty = false,
  retry,
  close,
}: {
  t: WalkCopy;
  empty?: boolean;
  retry: () => void;
  close: () => void;
}) {
  return (
    <section role="alert" className="walk-error">
      <div className="walk-status-art" aria-hidden="true">
        <Map size={110} />
        <Compass size={68} />
      </div>
      <h2 className="text-[1.8rem] font-bold leading-tight">
        {empty ? t.empty : t.error}
      </h2>
      <p className="mt-5 text-lg leading-7 text-text-secondary">
        {empty ? t.emptyHelp : t.errorHelp}
      </p>
      <button onClick={retry} className="button-primary mt-7 w-full">
        <RotateCw aria-hidden="true" />
        {empty ? t.customize : t.retry}
      </button>
      <button onClick={close} className="button-secondary mt-3 w-full">
        <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
        {t.backCity}
      </button>
      {!empty && (
        <p className="mt-7 flex items-start gap-3 text-sm leading-6 text-text-secondary">
          <Wifi size={24} className="shrink-0" aria-hidden="true" />
          {t.errorHint}
        </p>
      )}
    </section>
  );
}
