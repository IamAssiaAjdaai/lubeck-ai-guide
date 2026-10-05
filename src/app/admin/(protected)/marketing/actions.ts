"use server";

import { revalidatePath } from "next/cache";

import { createLubeckStarterCampaign } from "@/lib/admin/marketing/service.server";

export async function createLubeckStarterCampaignAction() {
  await createLubeckStarterCampaign();
  revalidatePath("/admin/marketing");
}
