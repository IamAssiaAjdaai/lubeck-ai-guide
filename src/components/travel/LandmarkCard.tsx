import Image from "next/image";
import { ChevronRight, Headphones } from "lucide-react";
import TrackedLink from "@/components/TrackedLink";
import type { TextDirection } from "@/lib/i18n";

type LandmarkCardProps = { href: string; image: string; name: string; duration: string; stopLabel: string; direction: TextDirection; locale: string; slug: string };

export default function LandmarkCard({ href, image, name, duration, stopLabel, direction, locale, slug }: LandmarkCardProps) {
  return (
    <TrackedLink href={href} eventName="landmark_selected" properties={{ landmark_slug: slug, locale }} className="group surface-card flex items-center gap-3 p-3 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface"><Image src={image} alt={name} fill sizes="80px" className="object-cover transition duration-300 group-hover:scale-105" /></div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent">{stopLabel}</p>
        <h3 className="mt-1 truncate text-[1rem] font-semibold leading-6">{name}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-[13px] text-text-secondary"><Headphones aria-hidden="true" size={15} strokeWidth={1.8} /><span>{duration}</span></p>
      </div>
      <ChevronRight aria-hidden="true" size={20} strokeWidth={1.8} className={`shrink-0 text-text-muted transition group-hover:text-text-primary ${direction === "rtl" ? "rotate-180" : ""}`} />
    </TrackedLink>
  );
}
