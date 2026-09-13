import type { PublicMedia } from "@/lib/media/types";

type MediaAttributionValue = NonNullable<PublicMedia["attribution"]>;

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

export function MediaAttribution({
  attribution,
  as: Component = "p",
  className = "",
}: Readonly<{
  attribution?: MediaAttributionValue;
  as?: "figcaption" | "p";
  className?: string;
}>) {
  if (!attribution) return null;

  const parts = attribution.text.split(URL_PATTERN);

  return (
    <Component className={`text-[11px] leading-4 text-text-muted ${className}`.trim()}>
      {parts.map((part, index) =>
        isSafeAttributionUrl(part) ? (
          <a
            key={`${part}-${index}`}
            href={part}
            rel="noreferrer"
            target="_blank"
            className="break-all underline decoration-current/40 underline-offset-2 hover:text-text-secondary focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </Component>
  );
}

function isSafeAttributionUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
