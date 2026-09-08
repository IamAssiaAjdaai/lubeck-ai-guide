import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { TravelerAccountPanel } from "@/components/account/TravelerAccountPanel";
import { getAccountCopy } from "@/lib/account/copy";
import { auth } from "@/lib/auth/server";
import { getDirection, isLocale } from "@/lib/i18n";

type TravelerAccountPageProps = Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
}>;

function resolveNextHref(locale: string, value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (
    candidate &&
    candidate.startsWith(`/${locale}/`) &&
    !candidate.startsWith("//") &&
    !candidate.includes("\\")
  ) {
    return candidate;
  }

  return `/${locale}/lubeck`;
}

export default async function TravelerAccountPage({
  params,
  searchParams,
}: TravelerAccountPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const nextHref = resolveNextHref(locale, (await searchParams).next);
  const copy = getAccountCopy(locale);
  const direction = getDirection(locale);
  const BackIcon = direction === "rtl" ? ArrowRight : ArrowLeft;
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <main lang={locale} dir={direction} className="app-shell">
      <section className="content-container py-8 sm:py-12">
        <Link
          href={nextHref}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-semibold text-text-secondary transition hover:border-blue-200 hover:text-primary"
        >
          <BackIcon aria-hidden="true" size={18} strokeWidth={1.8} />
          {copy.backToTrip}
        </Link>

        <header className="mt-7">
          <h1 className="text-[2rem] font-bold leading-tight tracking-[-0.03em]">
            {copy.title}
          </h1>
          <p className="mt-3 text-[15px] leading-6 text-text-secondary">
            {copy.description}
          </p>
        </header>

        <TravelerAccountPanel
          locale={locale}
          nextHref={nextHref}
          copy={copy}
          initialUser={
            session
              ? {
                  name: session.user.name,
                  email: session.user.email,
                }
              : undefined
          }
        />
      </section>
    </main>
  );
}
