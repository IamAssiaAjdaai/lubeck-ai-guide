import Link from "next/link";
import { House, Compass, Luggage, Heart, UserRound } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { walkCopy, walkCopyLocale } from "@/lib/walk/copy";
export default function BottomNavigation({
  locale,
  citySlug,
  active = "home",
}: {
  locale: Locale;
  citySlug?: string;
  active?: string;
}) {
  const t = walkCopy(locale);
  const items = [
    { key: "home", label: t.home, icon: House, href: "/" },
    {
      key: "explore",
      label: t.explore,
      icon: Compass,
      href: citySlug ? `/${locale}/${citySlug}#places` : "/#available-cities",
    },
    {
      key: "trips",
      label: t.trips,
      icon: Luggage,
      href: `/${locale}/walks?view=trips`,
    },
    { key: "saved", label: t.saved, icon: Heart, href: `/${locale}/walks` },
    {
      key: "profile",
      label: t.profile,
      icon: UserRound,
      href: `/${locale}/account`,
    },
  ];
  return (
    <nav
      className="bottom-navigation"
      aria-label="CITYWALK"
      lang={walkCopyLocale(locale)}
    >
      {items.map(({ key, label, icon: Icon, href }) => (
        <Link
          key={key}
          href={href}
          aria-current={key === active ? "page" : undefined}
          className={key === active ? "text-primary" : "text-text-secondary"}
        >
          <Icon size={25} strokeWidth={1.7} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
