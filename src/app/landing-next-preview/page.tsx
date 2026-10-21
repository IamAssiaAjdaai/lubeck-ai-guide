import type { Metadata } from "next";

import { LandingNext } from "@/components/landing-next/LandingNext";
import { citywalkPublicUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "CITYWALK — Make every city your own | Design preview",
  description: "CITYWALK landing design preview: personal walks, local stories and city discovery, starting in Lübeck.",
  alternates: { canonical: citywalkPublicUrl("/") },
  robots: { index: false, follow: false },
};

export default function LandingNextPreviewPage() {
  return <LandingNext />;
}
