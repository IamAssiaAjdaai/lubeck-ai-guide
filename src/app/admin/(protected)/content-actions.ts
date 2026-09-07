"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  cityInputFromFormData,
  expectedUpdatedAtFromFormData,
  placeInputFromFormData,
  tourInputFromFormData,
} from "@/lib/admin/content/formData";
import {
  changeAuthorizedPublicationStatus,
  addAuthorizedPlaceReference,
  approveAndPublishAuthorizedContent,
  createAuthorizedCity,
  createAuthorizedPlace,
  createAuthorizedTour,
  deleteAuthorizedDraft,
  updateAuthorizedCity,
  updateAuthorizedPlace,
  updateAuthorizedTour,
} from "@/lib/admin/content/service.server";
import {
  CmsContentConflictError,
  CmsContentIntegrityError,
  CmsContentNotFoundError,
} from "@/lib/admin/content/repository.server";
import { CmsValidationError } from "@/lib/admin/content/validation";
import { AdminAuthorizationError } from "@/lib/admin/authorization.server";
import { isLocale } from "@/lib/i18n";

export async function createCityAction(formData: FormData) {
  let destination = "/admin/cities/new";
  try {
    const city = await createAuthorizedCity(cityInputFromFormData(formData));
    revalidatePath("/admin/cities");
    destination = `/admin/cities/${city.id}?saved=1`;
  } catch (error) {
    destination += `?error=${encodeURIComponent(actionError(error))}`;
  }
  redirect(destination);
}

export async function updateCityAction(id: number, formData: FormData) {
  let destination = `/admin/cities/${id}`;
  const locale = formLocale(formData);
  try {
    await updateAuthorizedCity(
      id,
      cityInputFromFormData(formData),
      expectedUpdatedAtFromFormData(formData),
    );
    revalidatePath("/admin/cities");
    destination += `?saved=1${localeQuery(locale)}`;
  } catch (error) {
    destination += `?error=${encodeURIComponent(actionError(error))}${localeQuery(locale)}`;
  }
  redirect(destination);
}

export async function createPlaceAction(formData: FormData) {
  let destination = "/admin/places/new";
  try {
    const place = await createAuthorizedPlace(placeInputFromFormData(formData));
    revalidatePath("/admin/places");
    destination = `/admin/places/${place.id}?saved=1`;
  } catch (error) {
    destination += `?error=${encodeURIComponent(actionError(error))}`;
  }
  redirect(destination);
}

export async function updatePlaceAction(id: number, formData: FormData) {
  let destination = `/admin/places/${id}`;
  const locale = formLocale(formData);
  try {
    await updateAuthorizedPlace(
      id,
      placeInputFromFormData(formData),
      expectedUpdatedAtFromFormData(formData),
    );
    revalidatePath("/admin/places");
    destination += `?saved=1${localeQuery(locale)}`;
  } catch (error) {
    destination += `?error=${encodeURIComponent(actionError(error))}${localeQuery(locale)}`;
  }
  redirect(destination);
}

export async function createTourAction(formData: FormData) {
  let destination = "/admin/tours/new";
  try {
    const tour = await createAuthorizedTour(tourInputFromFormData(formData));
    revalidatePath("/admin/tours");
    destination = `/admin/tours/${tour.id}?saved=1`;
  } catch (error) {
    destination += `?error=${encodeURIComponent(actionError(error))}`;
  }
  redirect(destination);
}

export async function updateTourAction(id: number, formData: FormData) {
  let destination = `/admin/tours/${id}`;
  const locale = formLocale(formData);
  try {
    await updateAuthorizedTour(
      id,
      tourInputFromFormData(formData),
      expectedUpdatedAtFromFormData(formData),
    );
    revalidatePath("/admin/tours");
    destination += `?saved=1${localeQuery(locale)}`;
  } catch (error) {
    destination += `?error=${encodeURIComponent(actionError(error))}${localeQuery(locale)}`;
  }
  redirect(destination);
}

export async function changePublicationAction(
  entity: "city" | "place" | "tour",
  id: number,
  formData: FormData,
) {
  let destination = `/admin/${entity === "city" ? "cities" : `${entity}s`}/${id}`;
  try {
    await changeAuthorizedPublicationStatus(
      entity,
      id,
      formData.get("publicationStatus"),
    );
    revalidatePath(destination);
    destination += "?saved=1";
  } catch (error) {
    destination += `?error=${encodeURIComponent(actionError(error))}`;
  }
  redirect(destination);
}

export async function approveAndPublishAction(
  entity: "city" | "place" | "tour",
  id: number,
) {
  let destination = `/admin/${entity === "city" ? "cities" : `${entity}s`}/${id}`;
  try {
    await approveAndPublishAuthorizedContent(entity, id);
    revalidatePath(destination);
    destination += "?saved=1";
  } catch (error) {
    destination += `?error=${encodeURIComponent(actionError(error))}`;
  }
  redirect(destination);
}

export async function addPlaceSourceAction(id: number, formData: FormData) {
  let destination = `/admin/places/${id}`;
  try {
    await addAuthorizedPlaceReference(id, textField(formData, "referenceUrl"));
    revalidatePath(destination);
    destination += "?saved=1";
  } catch (error) {
    destination += `?error=${encodeURIComponent(actionError(error))}`;
  }
  redirect(destination);
}

export async function deleteDraftAction(
  entity: "city" | "place" | "tour",
  id: number,
) {
  const collection = entity === "city" ? "cities" : `${entity}s`;
  let destination = `/admin/${collection}`;
  try {
    await deleteAuthorizedDraft(entity, id);
    revalidatePath(destination);
  } catch (error) {
    destination += `?error=${encodeURIComponent(actionError(error))}`;
  }
  redirect(destination);
}

function actionError(error: unknown): string {
  if (
    error instanceof CmsValidationError ||
    error instanceof CmsContentConflictError ||
    error instanceof CmsContentIntegrityError ||
    error instanceof CmsContentNotFoundError ||
    error instanceof AdminAuthorizationError
  ) {
    return error.message;
  }

  return "Content operation failed.";
}

function formLocale(formData: FormData): string | undefined {
  const locale = formData.get("locale");
  return isLocale(locale) ? locale : undefined;
}

function localeQuery(locale: string | undefined): string {
  return locale ? `&locale=${encodeURIComponent(locale)}` : "";
}

function textField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
