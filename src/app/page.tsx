import type { Metadata } from "next";

import { LandingNext } from "@/components/landing-next/LandingNext";
import { citywalkPublicUrl } from "@/lib/site";

const title = "CITYWALK — Make every city your own";
const description =
  "Discover cities at your pace with personal walks and local stories. CITYWALK starts in Lübeck, with iPhone and Android apps preparing for launch.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: citywalkPublicUrl("/") },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: citywalkPublicUrl("/"),
    locale: "en_US",
    siteName: "CITYWALK",
    images: [{
      url: citywalkPublicUrl("/brand/citywalk-home-og.png"),
      width: 1200,
      height: 630,
      alt: "CITYWALK — Make every city your own",
    }],
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    images: [{ url: citywalkPublicUrl("/brand/citywalk-home-og.png"), alt: "CITYWALK — Make every city your own" }],
    title,
    description,
  },
};

export default function HomePage() {
  return <LandingNext />;
}
