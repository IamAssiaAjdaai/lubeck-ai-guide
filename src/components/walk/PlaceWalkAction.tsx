import { Plus } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { walkCopy, walkCopyLocale } from "@/lib/walk/copy";
export default function PlaceWalkAction({
  locale,
  citySlug,
  placeSlug,
}: {
  locale: Locale;
  citySlug: string;
  placeSlug: string;
}) {
  return (
    <a
      href={`/${locale}/${citySlug}?add=${encodeURIComponent(placeSlug)}#build-walk`}
      className="button-secondary my-5 w-full"
      lang={walkCopyLocale(locale)}
    >
      <Plus size={18} />
      {walkCopy(locale).addToWalk}
    </a>
  );
}
