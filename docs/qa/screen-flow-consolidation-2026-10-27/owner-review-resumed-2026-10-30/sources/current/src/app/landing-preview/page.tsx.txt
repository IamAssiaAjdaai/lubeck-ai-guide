import type { Metadata } from "next";
import { LandingPreview } from "@/components/landing/LandingPreview";

// An isolated design-review route, not the public homepage or a store listing.
export const metadata: Metadata = {
  title: "CITYWALK — landing design preview",
  description: "Preview of the CITYWALK app landing page. Not a release announcement.",
  robots: { index: false, follow: false },
};

export default function LandingPreviewPage() {
  return <LandingPreview />;
}
