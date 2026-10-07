import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import TravelerAccountShortcut from "@/components/account/TravelerAccountShortcut";
import { AnalyticsConsentBanner } from "@/components/AnalyticsConsentControl";
import VisitorJourneyTracker from "@/components/VisitorJourneyTracker";
import { CITYWALK_PUBLIC_ORIGIN } from "@/lib/site";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(CITYWALK_PUBLIC_ORIGIN),
  title: "CITYWALK",
  description: "Discover cities one step at a time with multilingual walking tours, audio stories, and a local AI guide.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AnalyticsConsentBanner />
        <VisitorJourneyTracker />
        <TravelerAccountShortcut />
        {children}
      </body>
    </html>
  );
}
