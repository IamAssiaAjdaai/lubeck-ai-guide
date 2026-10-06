import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { marketingCampaignsTable, marketingPagesTable } from "@/db/marketingSchema";
import { citiesTable } from "@/db/schema";

export type PublicMarketingPage = Readonly<{ id:number; kind:"landing"|"blog"; slug:string; path:string; title:string; body:string; seoTitle?:string; seoDescription?:string; cta?:string; city:Readonly<{slug:string;name:string}>; campaign?:Readonly<{slug:string}> }>;

export async function getPublishedMarketingPageByPath(path:string):Promise<PublicMarketingPage|undefined>{
 const [row]=await getDb().select({id:marketingPagesTable.id,kind:marketingPagesTable.kind,slug:marketingPagesTable.slug,path:marketingPagesTable.path,title:marketingPagesTable.title,body:marketingPagesTable.body,seoTitle:marketingPagesTable.seoTitle,seoDescription:marketingPagesTable.seoDescription,cta:marketingPagesTable.cta,citySlug:citiesTable.slug,cityName:citiesTable.name,campaignSlug:marketingCampaignsTable.slug}).from(marketingPagesTable).innerJoin(citiesTable,eq(marketingPagesTable.cityId,citiesTable.id)).leftJoin(marketingCampaignsTable,eq(marketingPagesTable.campaignId,marketingCampaignsTable.id)).where(and(eq(marketingPagesTable.path,path),eq(marketingPagesTable.publicationStatus,"published"),eq(citiesTable.publicationStatus,"published"))).limit(1);
 if(!row)return undefined;
 return {id:row.id,kind:row.kind,slug:row.slug,path:row.path,title:row.title,body:row.body,...(row.seoTitle?{seoTitle:row.seoTitle}:{}),...(row.seoDescription?{seoDescription:row.seoDescription}:{}),...(row.cta?{cta:row.cta}:{}),city:{slug:row.citySlug,name:row.cityName},...(row.campaignSlug?{campaign:{slug:row.campaignSlug}}:{})};
}
