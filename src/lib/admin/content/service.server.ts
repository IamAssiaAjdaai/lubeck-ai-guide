import "server-only";

import {
  requireAdminCapability,
  requireCityCapability,
  type AdminContext,
} from "@/lib/admin/authorization.server";
import {
  createCmsCity,
  createCmsPlace,
  createCmsTour,
  approveAndPublishCmsContent,
  createOrReuseCmsSourceForCity,
  createOrReuseCmsSourceForPlace,
  deleteCmsDraft,
  getCmsCity,
  getCmsPlace,
  getCmsTour,
  listCmsCities,
  listCmsPlaces,
  listCmsTags,
  listCmsTours,
  setCmsPublicationStatus,
  updateCmsCity,
  updateCmsPlace,
  updateCmsTour,
  withdrawCmsPublishedPlaceRevision,
  CmsContentIntegrityError,
  CmsContentNotFoundError,
} from "@/lib/admin/content/repository.server";
import {
  validateCityInput,
  validatePlaceInput,
  validatePublicationStatus,
  validateTourInput,
  type CityInput,
  type PlaceInput,
  type PublicationStatus,
  type TourInput,
} from "@/lib/admin/content/validation";
import type { AdminCapability } from "@/lib/admin/permissions";
import {
  getEditorialTransition,
  normalizeCanonicalSourceUrl,
} from "@/lib/admin/content/editorialWorkflow";
import {
  validateContentSourceInput,
  type ContentSourceInput,
} from "@/lib/admin/content/sources";

type CmsEntity = "city" | "place" | "tour";

export async function listAuthorizedCities() {
  const context = await requireAdminCapability("cities:view");
  return filterCityScope(await listCmsCities(), context);
}

export async function getAuthorizedCity(id: number) {
  await requireAdminCapability("cities:view");
  const city = await getCmsCity(id);
  if (!city) throw new CmsContentNotFoundError("City");
  await requireCityCapability(city.id, "cities:view");
  return city;
}

export async function createAuthorizedCity(input: CityInput) {
  const context = await requireAdminCapability("cities:manage");
  requireGlobalAccess(context);
  const validated = validateCityInput(input);
  if (validated.publicationStatus !== "draft") {
    throw new CmsContentIntegrityError("New content must start as a draft.");
  }
  return createCmsCity(validated, context.user.id);
}

export async function updateAuthorizedCity(
  id: number,
  input: CityInput,
  expectedUpdatedAt: string,
) {
  await requireAdminCapability("cities:manage");
  const current = await getCmsCity(id);
  if (!current) throw new CmsContentNotFoundError("City");
  const context = await requireCityCapability(id, "cities:manage");
  requireEditableStatus(context, current.publicationStatus);
  const validated = validateCityInput(input);
  if (validated.publicationStatus !== current.publicationStatus) {
    throw new CmsContentIntegrityError(
      "Use the publication action to change publication status.",
    );
  }
  return updateCmsCity(id, validated, context.user.id, expectedUpdatedAt);
}

export async function listAuthorizedPlaces() {
  const context = await requireAdminCapability("places:view");
  return filterCityScope(await listCmsPlaces(), context);
}

export async function getAuthorizedPlace(id: number) {
  await requireAdminCapability("places:view");
  const place = await getCmsPlace(id);
  if (!place) throw new CmsContentNotFoundError("Place");
  await requireCityCapability(place.cityId, "places:view");
  return place;
}

export async function createAuthorizedPlace(input: PlaceInput) {
  const validated = validatePlaceInput(input);
  const context = await requireCityCapability(
    validated.cityId,
    "places:manage",
  );
  if (validated.publicationStatus !== "draft") {
    throw new CmsContentIntegrityError("New content must start as a draft.");
  }
  return createCmsPlace(validated, context.user.id);
}

export async function updateAuthorizedPlace(
  id: number,
  input: PlaceInput,
  expectedUpdatedAt: string,
) {
  await requireAdminCapability("places:manage");
  const current = await getCmsPlace(id);
  if (!current) throw new CmsContentNotFoundError("Place");
  const context = await requireCityCapability(
    current.cityId,
    "places:manage",
  );
  if (input.cityId !== current.cityId) {
    await requireCityCapability(input.cityId, "places:manage");
  }
  requireEditableStatus(
    context,
    current.publicationStatus,
    Boolean(current.publishedRevision),
  );
  const validated = validatePlaceInput(input);
  if (validated.publicationStatus !== current.publicationStatus) {
    throw new CmsContentIntegrityError(
      "Use the publication action to change publication status.",
    );
  }
  return updateCmsPlace(id, validated, context.user.id, expectedUpdatedAt);
}

export async function listAuthorizedTags() {
  await requireAdminCapability("places:view");
  return listCmsTags();
}

export async function listAuthorizedTours() {
  const context = await requireAdminCapability("tours:view");
  return filterCityScope(await listCmsTours(), context);
}

export async function getAuthorizedTour(id: number) {
  await requireAdminCapability("tours:view");
  const tour = await getCmsTour(id);
  if (!tour) throw new CmsContentNotFoundError("Tour");
  await requireCityCapability(tour.cityId, "tours:view");
  return tour;
}

export async function createAuthorizedTour(input: TourInput) {
  const validated = validateTourInput(input);
  const context = await requireCityCapability(
    validated.cityId,
    "tours:manage",
  );
  if (validated.publicationStatus !== "draft") {
    throw new CmsContentIntegrityError("New content must start as a draft.");
  }
  return createCmsTour(validated, context.user.id);
}

export async function updateAuthorizedTour(
  id: number,
  input: TourInput,
  expectedUpdatedAt: string,
) {
  await requireAdminCapability("tours:manage");
  const current = await getCmsTour(id);
  if (!current) throw new CmsContentNotFoundError("Tour");
  const context = await requireCityCapability(
    current.cityId,
    "tours:manage",
  );
  if (input.cityId !== current.cityId) {
    await requireCityCapability(input.cityId, "tours:manage");
  }
  requireEditableStatus(context, current.publicationStatus);
  const validated = validateTourInput(input);
  if (validated.publicationStatus !== current.publicationStatus) {
    throw new CmsContentIntegrityError(
      "Use the publication action to change publication status.",
    );
  }
  return updateCmsTour(id, validated, context.user.id, expectedUpdatedAt);
}

export async function changeAuthorizedPublicationStatus(
  entity: CmsEntity,
  id: number,
  requestedStatus: unknown,
) {
  await requireAdminCapability("admin:view");
  const status = validatePublicationStatus(requestedStatus);
  const record = await loadEntity(entity, id);
  const transition = getEditorialTransition(record.publicationStatus, status);
  if (!transition) {
    throw new CmsContentIntegrityError(
      `Cannot transition ${record.publicationStatus} to ${status}.`,
    );
  }
  const capability = transitionCapability(entity, transition.from, transition.action);
  const context = await requireCityCapability(
    getEntityCityId(entity, record),
    capability,
  );
  return setCmsPublicationStatus(entity, id, status, context.user.id);
}

export async function approveAndPublishAuthorizedContent(
  entity: CmsEntity,
  id: number,
) {
  await requireAdminCapability("admin:view");
  const record = await loadEntity(entity, id);
  const cityId = getEntityCityId(entity, record);
  const reviewContext = await requireCityCapability(cityId, "publishing:review");
  await requireCityCapability(cityId, "publishing:publish");
  return approveAndPublishCmsContent(entity, id, reviewContext.user.id);
}

export async function withdrawAuthorizedPublishedPlaceRevision(id: number) {
  await requireAdminCapability("admin:view");
  const place = await getCmsPlace(id);
  if (!place) throw new CmsContentNotFoundError("Place");
  const context = await requireCityCapability(
    place.cityId,
    "publishing:publish",
  );
  return withdrawCmsPublishedPlaceRevision(id, context.user.id);
}

export async function addAuthorizedPlaceSource(
  placeId: number,
  input: ContentSourceInput,
) {
  await requireAdminCapability("sources:manage");
  const place = await getCmsPlace(placeId);
  if (!place) throw new CmsContentNotFoundError("Place");
  const context = await requireCityCapability(place.cityId, "sources:manage");
  return createOrReuseCmsSourceForPlace(
    placeId,
    validateContentSourceInput(input),
    context.user.id,
  );
}

export async function addAuthorizedCitySource(
  cityId: number,
  input: ContentSourceInput,
) {
  await requireAdminCapability("sources:manage");
  const city = await getCmsCity(cityId);
  if (!city) throw new CmsContentNotFoundError("City");
  const context = await requireCityCapability(city.id, "sources:manage");
  return createOrReuseCmsSourceForCity(
    cityId,
    validateContentSourceInput(input),
    context.user.id,
  );
}

export async function addAuthorizedCityReference(
  cityId: number,
  rawUrl: string,
) {
  let canonicalUrl: string;
  try {
    canonicalUrl = normalizeCanonicalSourceUrl(rawUrl);
  } catch {
    throw new CmsContentIntegrityError("Enter a valid HTTP or HTTPS reference link.");
  }
  const hostname = new URL(canonicalUrl).hostname;
  return addAuthorizedCitySource(cityId, {
    publisher: hostname,
    title: `Reference from ${hostname}`,
    canonicalUrl,
    verifiedAt: new Date().toISOString().slice(0, 10),
  });
}

export async function addAuthorizedPlaceReference(
  placeId: number,
  rawUrl: string,
) {
  let canonicalUrl: string;
  try {
    canonicalUrl = normalizeCanonicalSourceUrl(rawUrl);
  } catch {
    throw new CmsContentIntegrityError("Enter a valid HTTP or HTTPS reference link.");
  }
  const hostname = new URL(canonicalUrl).hostname;
  return addAuthorizedPlaceSource(placeId, {
    publisher: hostname,
    title: `Reference from ${hostname}`,
    canonicalUrl,
    verifiedAt: new Date().toISOString().slice(0, 10),
  });
}

export async function deleteAuthorizedDraft(entity: CmsEntity, id: number) {
  await requireAdminCapability(CMS_ENTITY_CAPABILITIES[entity]);
  const record = await loadEntity(entity, id);
  const capability = `${entity === "city" ? "cities" : `${entity}s`}:manage` as
    | "cities:manage"
    | "places:manage"
    | "tours:manage";
  await requireCityCapability(
    getEntityCityId(entity, record),
    capability,
  );
  return deleteCmsDraft(entity, id);
}

async function loadEntity(entity: CmsEntity, id: number) {
  const record =
    entity === "city"
      ? await getCmsCity(id)
      : entity === "place"
        ? await getCmsPlace(id)
        : await getCmsTour(id);
  if (!record) throw new CmsContentNotFoundError(entity);
  return record;
}

function getEntityCityId(
  entity: CmsEntity,
  record: Awaited<ReturnType<typeof loadEntity>>,
): number {
  if (entity === "city") return record.id;
  if ("cityId" in record) return record.cityId;
  throw new CmsContentIntegrityError("Content city scope is invalid.");
}

function filterCityScope<TRow extends { id?: number; cityId?: number }>(
  rows: readonly TRow[],
  context: AdminContext,
): readonly TRow[] {
  if (context.staff.role === "super_admin" || context.staff.globalAccess) {
    return rows;
  }
  return rows.filter((row) =>
    context.staff.cityIds.includes(row.cityId ?? row.id ?? -1),
  );
}

function requireGlobalAccess(context: AdminContext) {
  if (
    context.staff.role !== "super_admin" &&
    !context.staff.globalAccess
  ) {
    throw new CmsContentIntegrityError(
      "Creating a city requires global staff access.",
    );
  }
}

function requireEditableStatus(
  context: AdminContext,
  status: PublicationStatus,
  hasLiveRevision = false,
) {
  if (
    context.staff.role === "content_editor" &&
    status !== "draft" &&
    !(status === "published" && hasLiveRevision)
  ) {
    throw new CmsContentIntegrityError(
      "Content editors may only change draft content.",
    );
  }
}

function transitionCapability(
  entity: CmsEntity,
  from: PublicationStatus,
  action: "submitted_for_review" | "returned_to_draft" | "approved" | "published" | "archived",
): AdminCapability {
  if (action === "submitted_for_review") return CMS_ENTITY_CAPABILITIES[entity];
  if (from === "archived") return "publishing:publish";
  if (action === "returned_to_draft" || action === "approved") {
    return "publishing:review";
  }
  return "publishing:publish";
}

export const CMS_ENTITY_CAPABILITIES = {
  city: "cities:manage",
  place: "places:manage",
  tour: "tours:manage",
} as const satisfies Readonly<Record<CmsEntity, AdminCapability>>;
