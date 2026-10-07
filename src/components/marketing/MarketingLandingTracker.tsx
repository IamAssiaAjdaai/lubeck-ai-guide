"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { getAnalyticsConsent } from "@/lib/analyticsConsent";
import { marketingAttributionPostHogProperties, type MarketingAttribution } from "@/lib/marketingAttribution";

type Props=Readonly<{city:string;landingVariant:string;campaignSlug?:string;attribution:MarketingAttribution;ctaHref?:string;ctaLabel?:string}>;
export default function MarketingLandingTracker({city,landingVariant,campaignSlug,attribution,ctaHref,ctaLabel}:Props){
 const tracked=useRef(false); const effective={...attribution,source:attribution.source??"direct",campaign:attribution.campaign??campaignSlug}; const properties={city,landing_variant:landingVariant,...marketingAttributionPostHogProperties(effective)};
 useEffect(()=>{if(tracked.current)return;tracked.current=true;capture("landing_view",properties);},[properties]);
 if(!ctaHref||!ctaLabel)return null;
 return <Link href={ctaHref} className="button-primary inline-flex min-h-12 items-center justify-center px-6" onClick={()=>capture("build_walk_clicked",properties)}>{ctaLabel}</Link>;
}
function capture(eventName:"landing_view"|"build_walk_clicked",properties:Readonly<Record<string,string>>){try{if(getAnalyticsConsent()!=="granted"||posthog.has_opted_out_capturing())return;posthog.capture(eventName,properties);}catch(error){if(process.env.NODE_ENV==="development")console.warn("Marketing analytics could not be captured:",error);}}
