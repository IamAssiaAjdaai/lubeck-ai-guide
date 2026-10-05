import type { Metadata } from "next";

import { LandingPreview } from "@/components/landing/LandingPreview";

export const metadata: Metadata = {
  title: "CITYWALK — A better way to walk a city",
  description:
    "Build a personal city walk around your time and interests, with local stories, audio and an estimated return time.",
  robots: { index: true, follow: true },
};

export default function HomePage() {
  return <LandingPreview />;
}
