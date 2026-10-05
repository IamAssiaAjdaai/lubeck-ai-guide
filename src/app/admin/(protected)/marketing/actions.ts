"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AdminAuthorizationError } from "@/lib/admin/authorization.server";
import {
  marketingCampaignInputFromFormData,
  marketingContentInputFromFormData,
  marketingPageInputFromFormData,
} from "@/lib/admin/marketing/formData";
import {
  createLubeckStarterCampaign,
  createMarketingCampaign,
  createMarketingContentItem,
  createMarketingPage,
  MarketingConflictError,
  MarketingNotFoundError,
  updateMarketingCampaign,
  updateMarketingContentItem,
  updateMarketingPage,
} from "@/lib/admin/marketing/service.server";
import { MarketingValidationError } from "@/lib/admin/marketing/validation";

export async function createLubeckStarterCampaignAction() {
  await createLubeckStarterCampaign();
  revalidatePath("/admin/marketing");
}

export async function createMarketingCampaignAction(formData: FormData) {
  let destination = "/admin/marketing/campaigns/new";
  try {
    const campaign = await createMarketingCampaign(
      marketingCampaignInputFromFormData(formData),
    );
    revalidateMarketing();
    destination = `/admin/marketing/campaigns/${campaign.id}?saved=1`;
  } catch (error) {
    destination += `?error=${encodeURIComponent(actionError(error))}`;
  }
  redirect(destination);
}

export async function updateMarketingCampaignAction(
  id: number,
  formData: FormData,
) {
  let destination = `/admin/marketing/campaigns/${id}`;
  try {
    await updateMarketingCampaign(id, marketingCampaignInputFromFormData(formData));
    revalidateMarketing();
    destination += "?saved=1";
  } catch (error) {
    destination += `?error=${encodeURIComponent(actionError(error))}`;
  }
  redirect(destination);
}

export async function createMarketingPageAction(formData: FormData) {
  let destination = "/admin/marketing/pages/new";
  try {
    const page = await createMarketingPage(marketingPageInputFromFormData(formData));
    revalidateMarketing();
    destination = `/admin/marketing/pages/${page.id}?saved=1`;
  } catch (error) {
    destination += `?error=${encodeURIComponent(actionError(error))}`;
  }
  redirect(destination);
}

export async function updateMarketingPageAction(id: number, formData: FormData) {
  let destination = `/admin/marketing/pages/${id}`;
  try {
    await updateMarketingPage(id, marketingPageInputFromFormData(formData));
    revalidateMarketing();
    destination += "?saved=1";
  } catch (error) {
    destination += `?error=${encodeURIComponent(actionError(error))}`;
  }
  redirect(destination);
}

export async function createMarketingContentAction(formData: FormData) {
  let destination = "/admin/marketing/social/new";
  try {
    const item = await createMarketingContentItem(
      marketingContentInputFromFormData(formData),
    );
    revalidateMarketing();
    destination = `/admin/marketing/social/${item.id}?saved=1`;
  } catch (error) {
    destination += `?error=${encodeURIComponent(actionError(error))}`;
  }
  redirect(destination);
}

export async function updateMarketingContentAction(
  id: number,
  formData: FormData,
) {
  let destination = `/admin/marketing/social/${id}`;
  try {
    await updateMarketingContentItem(
      id,
      marketingContentInputFromFormData(formData),
    );
    revalidateMarketing();
    destination += "?saved=1";
  } catch (error) {
    destination += `?error=${encodeURIComponent(actionError(error))}`;
  }
  redirect(destination);
}

function revalidateMarketing() {
  revalidatePath("/admin/marketing");
  revalidatePath("/admin/marketing/campaigns");
  revalidatePath("/admin/marketing/pages");
  revalidatePath("/admin/marketing/social");
}

function actionError(error: unknown): string {
  if (
    error instanceof MarketingValidationError ||
    error instanceof MarketingConflictError ||
    error instanceof MarketingNotFoundError ||
    error instanceof AdminAuthorizationError
  ) {
    return error.message;
  }

  return "Marketing operation failed.";
}
