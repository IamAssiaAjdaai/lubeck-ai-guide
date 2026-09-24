import { ShieldCheck } from "lucide-react";
import type { PlaceSource } from "@/data/placeSources";
import type { Locale } from "@/lib/i18n";
import { walkCopy, walkCopyLocale } from "@/lib/walk/copy";
export default function VerifiedInfo({
  sources,
  locale,
}: {
  sources: readonly PlaceSource[];
  locale: Locale;
}) {
  if (!sources.length) return null;
  const t = walkCopy(locale);
  return (
    <section className="surface-card my-6 p-5" lang={walkCopyLocale(locale)}>
      <h2 className="flex items-center gap-2 font-semibold">
        <ShieldCheck className="text-success" size={21} />
        {t.verified}
      </h2>
      <p className="mt-2 text-xs leading-5 text-text-secondary">
        {t.verifiedHelp}
      </p>
      <ul className="mt-4 space-y-3">
        {sources.map((source) => (
          <li key={source.url} className="text-sm">
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
              lang="en"
            >
              {source.label}
            </a>
            <p className="mt-1 text-xs text-text-secondary">
              {t[source.type === "map" ? "sourceMap" : source.type]} ·{" "}
              {t.lastChecked}{" "}
              <time dateTime={source.verifiedAt}>
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                }).format(new Date(source.verifiedAt))}
              </time>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
