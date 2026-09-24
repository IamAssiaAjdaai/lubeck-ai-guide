import { MapPinCheck } from "lucide-react";

import TrackedLink from "@/components/TrackedLink";
import {
  formatMessage,
  type Locale,
} from "@/lib/i18n";

type ArrivalNoticeProps = Readonly<{
  placeName: string;
  href: string;
  messageTemplate: string;
  storyLabel: string;
  city: string;
  locale: Locale;
}>;

export default function ArrivalNotice({
  placeName,
  href,
  messageTemplate,
  storyLabel,
  city,
  locale,
}: ArrivalNoticeProps) {
  return (
    <section className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
          <MapPinCheck
            aria-hidden="true"
            size={20}
            strokeWidth={1.8}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p
            role="status"
            aria-live="polite"
            className="text-sm font-semibold text-text-primary"
          >
            {formatMessage(
              messageTemplate,
              {
                place: placeName,
              },
            )}
          </p>

          <TrackedLink
            href={`${href}#audio-guide`}
            eventName="arrival_story_started"
            properties={{
              city,
              locale,
              place_slug: href
                .split("/")
                .filter(Boolean)
                .at(-1) ?? "",
            }}
            className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            {storyLabel}
          </TrackedLink>
        </div>
      </div>
    </section>
  );
}