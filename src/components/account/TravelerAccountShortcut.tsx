"use client";

import { BookmarkPlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { getAccountCopy } from "@/lib/account/copy";
import { isLocale } from "@/lib/i18n";

export default function TravelerAccountShortcut() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const locale = segments[0];

  if (!isLocale(locale) || segments[1] === "account") {
    return null;
  }

  const copy = getAccountCopy(locale);
  const accountHref = `/${locale}/account?next=${encodeURIComponent(pathname)}`;

  return (
    <Link
      href={accountHref}
      className="fixed bottom-4 end-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-lg transition hover:-translate-y-0.5 hover:border-blue-200"
    >
      <BookmarkPlus aria-hidden="true" size={18} strokeWidth={1.8} />
      {copy.saveTrip}
    </Link>
  );
}
