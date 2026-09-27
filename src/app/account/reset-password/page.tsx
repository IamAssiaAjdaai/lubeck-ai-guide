import type { Metadata } from "next";
import { isSharedLocale } from "@citywalk/i18n";
import ResetPasswordForm from "./ResetPasswordForm";
export const metadata: Metadata = { title: "CITYWALK", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ locale?: string }> }) {
  const { locale } = await searchParams;
  return <ResetPasswordForm locale={isSharedLocale(locale) ? locale : "en"} />;
}
