import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";

type FeaturedCityCardProps = {
  href: string;
  image: string;
  name: string;
  country: string;
  description: string;
  ctaLabel: string;
};

export function FeaturedCityCard({ href, image, name, country, description, ctaLabel }: FeaturedCityCardProps) {
  return (
    <article className="surface-card overflow-hidden shadow-[0_14px_36px_rgb(23_23_23_/_0.06)]">
      <div className="relative aspect-[16/9] bg-surface">
        <Image src={image} alt={`${name}, ${country}`} fill sizes="(max-width: 480px) calc(100vw - 48px), 432px" className="object-cover" />
      </div>
      <div className="p-5">
        <p className="flex items-center gap-1.5 text-sm font-medium text-text-secondary"><MapPin aria-hidden="true" size={16} strokeWidth={1.9} />{country}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-[-0.025em]">{name}</h2>
        <p className="mt-2 text-[15px] leading-6 text-text-secondary">{description}</p>
        <Link href={href} className="button-primary mt-5 w-full">
          {ctaLabel}
        </Link>
      </div>
    </article>
  );
}

type ComingSoonCityCardProps = { name: string; status: string };

export function ComingSoonCityCard({ name, status }: ComingSoonCityCardProps) {
  return (
    <article className="surface-card flex min-h-28 flex-col justify-between p-4 opacity-80">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-text-muted"><MapPin aria-hidden="true" size={18} strokeWidth={1.8} /></span>
      <div className="mt-4 min-w-0">
        <h3 className="truncate text-[15px] font-semibold">{name}</h3>
        <p className="mt-1 text-xs font-medium text-text-muted">{status}</p>
      </div>
    </article>
  );
}
