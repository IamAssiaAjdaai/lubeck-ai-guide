import type { Metadata } from "next";

import { LandingPreview } from "@/components/landing/LandingPreview";
import { CITYWALK_PUBLIC_ORIGIN } from "@/lib/site";

const title = "CITYWALK — A better way to walk a city";
const description =
  "Build a personal city walk around your time and interests, with local stories, audio and an estimated return time.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: CITYWALK_PUBLIC_ORIGIN,
    siteName: "CITYWALK",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function HomePage() {
  return <LandingPreview />;
}
