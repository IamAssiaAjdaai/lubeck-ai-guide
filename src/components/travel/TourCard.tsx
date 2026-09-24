import { Clock3, Footprints, Route } from "lucide-react";
import TrackedLink from "@/components/TrackedLink";

type TourCardProps = { eyebrow: string; title: string; duration: string; stops: string; ctaLabel: string; href: string; locale: string; tourId: string; startLandmarkSlug: string };

export default function TourCard({ eyebrow, title, duration, stops, ctaLabel, href, locale, tourId, startLandmarkSlug }: TourCardProps) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-blue-100 bg-blue-50/70 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-accent shadow-sm"><Footprints aria-hidden="true" size={21} strokeWidth={1.8} /></span>
        <div className="min-w-0">
          <p className="eyebrow text-blue-700">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em]">{title}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-secondary">
            <p className="flex items-center gap-1.5"><Clock3 aria-hidden="true" size={16} strokeWidth={1.8} />{duration}</p>
            <p className="flex items-center gap-1.5"><Route aria-hidden="true" size={16} strokeWidth={1.8} />{stops}</p>
          </div>
        </div>
      </div>
      <TrackedLink href={href} eventName="tour_started" properties={{ locale, start_landmark_slug: startLandmarkSlug, tour_id: tourId }} className="button-primary mt-5 w-full">{ctaLabel}</TrackedLink>
    </section>
  );
}
