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
  attachMarketingContentMedia,
  createLubeckStarterCampaign,
  createMarketingCampaign,
  createMarketingContentItem,
  createMarketingPage,
  detachMarketingContentMedia,
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
  const cityId = formCityId(formData);
  let destination = withCityContext("/admin/marketing/campaigns/new", cityId);
  try {
    const campaign = await createMarketingCampaign(
      marketingCampaignInputFromFormData(formData),
    );
    revalidateMarketing();
    destination = withCityContext(`/admin/marketing/campaigns/${campaign.id}?saved=1`, cityId);
  } catch (error) {
    destination = appendQuery(destination, "error", actionError(error));
  }
  redirect(destination);
}

export async function updateMarketingCampaignAction(
  id: number,
  formData: FormData,
) {
  const cityId = formCityId(formData);
  let destination = withCityContext(`/admin/marketing/campaigns/${id}`, cityId);
  try {
    await updateMarketingCampaign(id, marketingCampaignInputFromFormData(formData));
    revalidateMarketing();
    destination = appendQuery(destination, "saved", "1");
  } catch (error) {
    destination = appendQuery(destination, "error", actionError(error));
  }
  redirect(destination);
}

export async function createMarketingPageAction(formData: FormData) {
  const cityId = formCityId(formData);
  let destination = withCityContext("/admin/marketing/pages/new", cityId);
  try {
    const page = await createMarketingPage(marketingPageInputFromFormData(formData));
    revalidateMarketing();
    destination = withCityContext(`/admin/marketing/pages/${page.id}?saved=1`, cityId);
  } catch (error) {
    destination = appendQuery(destination, "error", actionError(error));
  }
  redirect(destination);
}

export async function updateMarketingPageAction(id: number, formData: FormData) {
  const cityId = formCityId(formData);
  let destination = withCityContext(`/admin/marketing/pages/${id}`, cityId);
  try {
    await updateMarketingPage(id, marketingPageInputFromFormData(formData));
    revalidateMarketing();
    destination = appendQuery(destination, "saved", "1");
  } catch (error) {
    destination = appendQuery(destination, "error", actionError(error));
  }
  redirect(destination);
}

export async function createMarketingContentAction(formData: FormData) {
  const cityId = formCityId(formData);
  let destination = withCityContext("/admin/marketing/social/new", cityId);
  try {
    const item = await createMarketingContentItem(
      marketingContentInputFromFormData(formData),
    );
    revalidateMarketing();
    destination = withCityContext(`/admin/marketing/social/${item.id}?saved=1`, cityId);
  } catch (error) {
    destination = appendQuery(destination, "error", actionError(error));
  }
  redirect(destination);
}

export async function updateMarketingContentAction(
  id: number,
  formData: FormData,
) {
  const cityId = formCityId(formData);
  let destination = withCityContext(`/admin/marketing/social/${id}`, cityId);
  try {
    await updateMarketingContentItem(
      id,
      marketingContentInputFromFormData(formData),
    );
    revalidateMarketing();
    destination = appendQuery(destination, "saved", "1");
  } catch (error) {
    destination = appendQuery(destination, "error", actionError(error));
  }
  redirect(destination);
}


export async function attachMarketingContentMediaAction(
  contentId: number,
  formData: FormData,
) {
  const cityId = formCityId(formData);
  let destination = withCityContext(
    `/admin/marketing/social/${contentId}`,
    cityId,
  );

  try {
    const mediaAssetId = Number(formData.get("mediaAssetId"));
    await attachMarketingContentMedia(contentId, mediaAssetId);
    revalidateMarketing();
    revalidatePath(`/admin/marketing/social/${contentId}`);
    destination = appendQuery(destination, "saved", "1");
  } catch (error) {
    destination = appendQuery(destination, "error", actionError(error));
  }

  redirect(destination);
}

export async function detachMarketingContentMediaAction(
  contentId: number,
  attachmentId: number,
  formData: FormData,
) {
  const cityId = formCityId(formData);
  let destination = withCityContext(
    `/admin/marketing/social/${contentId}`,
    cityId,
  );

  try {
    await detachMarketingContentMedia(contentId, attachmentId);
    revalidateMarketing();
    revalidatePath(`/admin/marketing/social/${contentId}`);
    destination = appendQuery(destination, "saved", "1");
  } catch (error) {
    destination = appendQuery(destination, "error", actionError(error));
  }

  redirect(destination);
}

export async function changeMarketingPageWorkflowAction(
  id: number,
  formData: FormData,
) {
  const cityId = formCityId(formData);
  let destination = withCityContext(`/admin/marketing/pages/${id}`, cityId);
  try {
    await changeMarketingPageWorkflowStatus(id, formData.get("status"));
    revalidateMarketing();
    revalidatePath("/admin/review");
    revalidatePath(`/admin/marketing/pages/${id}`);
    destination = appendQuery(destination, "saved", "1");
  } catch (error) {
    destination = appendQuery(destination, "error", actionError(error));
  }
  redirect(destination);
}

export async function changeMarketingSocialWorkflowAction(
  id: number,
  formData: FormData,
) {
  const cityId = formCityId(formData);
  let destination = withCityContext(`/admin/marketing/social/${id}`, cityId);
  try {
    await changeMarketingSocialWorkflowStatus(
      id,
      formData.get("status"),
      formData.get("publishedUrl"),
    );
    revalidateMarketing();
    revalidatePath("/admin/review");
    revalidatePath(`/admin/marketing/social/${id}`);
    destination = appendQuery(destination, "saved", "1");
  } catch (error) {
    destination = appendQuery(destination, "error", actionError(error));
  }
  redirect(destination);
}

function revalidateMarketing() {
  revalidatePath("/admin/marketing");
  revalidatePath("/admin/marketing/campaigns");
  revalidatePath("/admin/marketing/pages");
  revalidatePath("/admin/marketing/social");
}

function formCityId(formData: FormData): number | undefined {
  const cityId = Number(formData.get("cityId"));
  return Number.isInteger(cityId) && cityId > 0 ? cityId : undefined;
}

function withCityContext(path: string, cityId?: number): string {
  return cityId ? appendQuery(path, "cityId", String(cityId)) : path;
}

function appendQuery(path: string, key: string, value: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`;
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
