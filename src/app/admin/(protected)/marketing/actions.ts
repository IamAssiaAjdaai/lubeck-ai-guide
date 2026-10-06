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
import {
  changeMarketingPageWorkflowStatus,
  changeMarketingSocialWorkflowStatus,
  MarketingWorkflowError,
} from "@/lib/admin/marketing/workflow.server";

export async function createLubeckStarterCampaignAction() {
  await createLubeckStarterCampaign();
  revalidatePath("/admin/marketing");
}

export async function createMarketingCampaignAction(formData: FormData) {
  let destination = createDestination("/admin/marketing/campaigns/new", formData);
  try {
    const campaign = await createMarketingCampaign(
      marketingCampaignInputFromFormData(formData),
    );
    revalidateMarketing();
    destination = `/admin/marketing/campaigns/${campaign.id}?saved=1`;
  } catch (error) {
    destination = appendQuery(destination, "error", actionError(error));
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
  let destination = createDestination("/admin/marketing/pages/new", formData);
  try {
    const page = await createMarketingPage(marketingPageInputFromFormData(formData));
    revalidateMarketing();
    destination = `/admin/marketing/pages/${page.id}?saved=1`;
  } catch (error) {
    destination = appendQuery(destination, "error", actionError(error));
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
  let destination = createDestination("/admin/marketing/social/new", formData);
  try {
    const item = await createMarketingContentItem(
      marketingContentInputFromFormData(formData),
    );
    revalidateMarketing();
    destination = `/admin/marketing/social/${item.id}?saved=1`;
  } catch (error) {
    destination = appendQuery(destination, "error", actionError(error));
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

export async function changeMarketingPageWorkflowAction(
  id: number,
  formData: FormData,
) {
  let destination = `/admin/marketing/pages/${id}`;
  try {
    await changeMarketingPageWorkflowStatus(id, formData.get("status"));
    revalidateMarketing();
    revalidatePath("/admin/review");
    revalidatePath(destination);
    destination += "?saved=1";
  } catch (error) {
    destination += `?error=${encodeURIComponent(actionError(error))}`;
  }
  redirect(destination);
}

export async function changeMarketingSocialWorkflowAction(
  id: number,
  formData: FormData,
) {
  let destination = `/admin/marketing/social/${id}`;
  try {
    await changeMarketingSocialWorkflowStatus(
      id,
      formData.get("status"),
      formData.get("publishedUrl"),
    );
    revalidateMarketing();
    revalidatePath("/admin/review");
    revalidatePath(destination);
    destination += "?saved=1";
  } catch (error) {
    destination += `?error=${encodeURIComponent(actionError(error))}`;
  }
  redirect(destination);
}

function createDestination(path: string, formData: FormData) {
  const citySlug = formData.get("citySlug");
  if (typeof citySlug !== "string" || !isCitySlug(citySlug)) return path;
  return appendQuery(path, "city", citySlug);
}

function appendQuery(path: string, key: string, value: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function isCitySlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
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
    error instanceof MarketingWorkflowError ||
    error instanceof AdminAuthorizationError
  ) {
    return error.message;
  }

  return "Marketing operation failed.";
}
