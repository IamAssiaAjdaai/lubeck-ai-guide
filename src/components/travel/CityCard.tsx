import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";

import type { Locale, TextDirection } from "@/lib/i18n";

type FeaturedCityCardProps = {
  image?: string;
  name: string;
  description?: string;
  href: string;
  actionLabel: string;
  contentLocale: Locale;
  contentDirection: TextDirection;
  interfaceLocale: Locale;
  interfaceDirection: TextDirection;
};

export function FeaturedCityCard({
  image,
  name,
  description,
  href,
  actionLabel,
  contentLocale,
  contentDirection,
  interfaceLocale,
  interfaceDirection,
}: FeaturedCityCardProps) {
  const ExploreIcon = interfaceDirection === "rtl" ? ArrowLeft : ArrowRight;
  return (
    <article className="surface-card w-full overflow-hidden shadow-[0_14px_36px_rgb(23_23_23_/_0.06)]">
      <div className="relative aspect-[16/9] bg-surface">
        {image ? (
          <Image src={image} alt={name} fill sizes="(max-width: 480px) calc(100vw - 48px), 432px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,var(--color-surface),var(--color-background))] text-primary" aria-hidden="true">
            <MapPin size={42} strokeWidth={1.4} />
          </div>
        )}
      </div>
      <div lang={contentLocale} dir={contentDirection} className="p-5">
        <h2 className="text-2xl font-bold tracking-[-0.025em]">{name}</h2>
        {description ? <p className="mt-2 text-[15px] leading-6 text-text-secondary">{description}</p> : null}
        <Link
          href={href}
          lang={interfaceLocale}
          dir={interfaceDirection}
          className="button-primary mt-5 h-14 min-h-14 w-full justify-between gap-3 whitespace-nowrap rounded-2xl px-6 text-[17px] font-semibold shadow-[0_10px_22px_rgb(37_99_235_/_0.18)] hover:shadow-[0_12px_26px_rgb(37_99_235_/_0.24)] active:translate-y-px"
        >
          <span className="shrink-0">{actionLabel}</span>
          <ExploreIcon aria-hidden="true" size={18} strokeWidth={1.8} className="shrink-0" />
        </Link>
      </div>
    </article>
  );
}
