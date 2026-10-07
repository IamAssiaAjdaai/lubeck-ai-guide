import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Clock3, MapPin } from "lucide-react";

import { getAuthorizedPlace } from "@/lib/admin/content/service.server";
import { getAuthorizedPlacePreviewMedia } from "@/lib/media/service.server";
import { isApplicationMediaPath } from "@/lib/media/imageDelivery";

export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

const CATEGORY_LABELS = {
  see: "See",
  eat: "Eat",
  fun: "Fun",
} as const;

export default async function AdminPlacePreviewPage({
  params,
}: PageProps<"/admin/preview/places/[id]">) {
  await connection();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();

  const place = await getAuthorizedPlace(id);
  const localization =
    place.localizations.find(({ locale }) => locale === "en") ??
    place.localizations.find(({ locale }) => locale === "de") ??
    place.localizations[0];
  const image = await getAuthorizedPlacePreviewMedia(id);

  return (
    <main>
      <div
        className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900"
        role="status"
      >
        Traveler preview — Draft content, not published
      </div>

      <div className="mx-auto mt-6 max-w-[448px] overflow-hidden rounded-[28px] border border-border bg-white shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-secondary">
            CITYWALK · {place.city?.name ?? "City"}
          </p>
        </div>

        {localization ? (
          <article className="pb-8">
            {image ? (
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface">
                <Image
                  src={image.url}
                  alt={localization.name || image.alt}
                  fill
                  priority
                  unoptimized={isApplicationMediaPath(image.url)}
                  sizes="448px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-surface px-6 text-center text-sm text-text-secondary">
                No approved hero image attached yet.
              </div>
            )}

            <div className="px-5 pt-5">
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <MapPin aria-hidden="true" size={16} strokeWidth={1.8} />
                  {CATEGORY_LABELS[place.category]}
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1.5">
                  <Clock3 aria-hidden="true" size={16} strokeWidth={1.8} />
                  {place.durationMinutes} min visit
                </span>
              </div>

              <div lang={localization.locale}>
                <h1 className="mt-2 text-[2rem] font-bold leading-tight tracking-[-0.03em]">
                  {localization.name}
                </h1>
                <p className="mt-3 text-base leading-7 text-text-secondary">
                  {localization.shortDescription}
                </p>

                {localization.visitNotes ? (
                  <p className="mt-4 rounded-xl border border-border bg-surface p-4 text-sm leading-6 text-text-secondary">
                    {localization.visitNotes}
                  </p>
                ) : null}

                {localization.description ? (
                  <section className="mt-9">
                    <h2 className="text-[1.375rem] font-semibold tracking-[-0.02em]">
                      Why it matters
                    </h2>
                    <p className="mt-3 text-base leading-7">
                      {localization.description}
                    </p>
                  </section>
                ) : null}

                {localization.story ? (
                  <section className="mt-9">
                    <h2 className="text-[1.375rem] font-semibold tracking-[-0.02em]">
                      Story
                    </h2>
                    <p className="mt-3 text-base leading-7">
                      {localization.story}
                    </p>
                  </section>
                ) : null}

                {localization.facts?.length ? (
                  <section className="mt-9">
                    <h2 className="text-[1.375rem] font-semibold tracking-[-0.02em]">
                      Quick facts
                    </h2>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {localization.facts.map((fact, index) => (
                        <div
                          className="rounded-xl border border-border bg-surface p-4 last:odd:col-span-2"
                          key={`${fact.label}-${fact.value}-${index}`}
                        >
                          <p className="text-[13px] text-text-secondary">{fact.label}</p>
                          <p className="mt-1 break-words text-[15px] font-semibold leading-6">
                            {fact.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {place.sourceLinks.length ? (
                  <section className="mt-9 rounded-xl border border-border p-4">
                    <p className="text-sm font-bold">Verified information</p>
                    <p className="mt-1 text-sm text-text-secondary">
                      {place.sourceLinks.length} source{place.sourceLinks.length === 1 ? "" : "s"} attached for editorial review.
                    </p>
                  </section>
                ) : null}
              </div>
            </div>
          </article>
        ) : (
          <p className="p-6">No authored localization is available to preview.</p>
        )}
      </div>

      <p className="mx-auto mt-4 max-w-[448px] text-center text-xs leading-5 text-text-secondary">
        This protected preview uses the current CMS draft and mirrors the traveler place-detail hierarchy. Interactive app actions are intentionally disabled.
      </p>
    </main>
  );
}
