import { Clock3, Footprints, Route } from "lucide-react";
import TrackedLink from "@/components/TrackedLink";
import type { TextDirection } from "@/lib/i18n";

export type TourCardStop = Readonly<{
  name: string;
  language: string;
  direction: TextDirection;
}>;

type TourCardProps = {
  eyebrow: string;
  title: string;
  description?: string;
  contentLanguage?: string;
  contentDirection?: TextDirection;
  duration?: string;
  stops: string;
  stopNames?: readonly TourCardStop[];
  ctaLabel: string;
  href: string;
  locale: string;
  tourId: string;
  startLandmarkSlug: string;
};

export default function TourCard({ eyebrow, title, description, contentLanguage, contentDirection, duration, stops, stopNames, ctaLabel, href, locale, tourId, startLandmarkSlug }: TourCardProps) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-blue-100 bg-blue-50/70 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-accent shadow-sm"><Footprints aria-hidden="true" size={21} strokeWidth={1.8} /></span>
        <div className="min-w-0">
          <p className="eyebrow text-blue-700">{eyebrow}</p>
          <div lang={contentLanguage} dir={contentDirection}>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em]">{title}</h2>
            {description ? (
              <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-secondary">
            {duration ? (
              <p className="flex items-center gap-1.5"><Clock3 aria-hidden="true" size={16} strokeWidth={1.8} />{duration}</p>
            ) : null}
            <p className="flex items-center gap-1.5"><Route aria-hidden="true" size={16} strokeWidth={1.8} />{stops}</p>
          </div>
        </div>
      </div>
      {stopNames && stopNames.length > 0 ? (
        <ol className="mt-4 grid gap-2 border-t border-blue-100 pt-4">
          {stopNames.map((stop, index) => (
            <li key={`${index}-${stop.name}`} className="flex items-start gap-2.5 text-sm text-text-secondary">
              <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-blue-700">
                {index + 1}
              </span>
              <span lang={stop.language} dir={stop.direction} className="pt-0.5">
                {stop.name}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
      <TrackedLink href={href} eventName="tour_started" properties={{ locale, start_landmark_slug: startLandmarkSlug, tour_id: tourId }} className="button-primary mt-5 w-full">{ctaLabel}</TrackedLink>
    </section>
  );
}
