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
  CmsContentIntegrityError,
  CmsContentNotFoundError,
} from "@/lib/admin/content/repository.server";
import {
  canTransitionPublication,
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
    await requireAdminCapability("publishing:publish");
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
    await requireCityCapability(validated.cityId, "publishing:publish");
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
  requireEditableStatus(context, current.publicationStatus);
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
    await requireCityCapability(validated.cityId, "publishing:publish");
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
  await requireAdminCapability("publishing:publish");
  const status = validatePublicationStatus(requestedStatus);
  const record = await loadEntity(entity, id);
  const context = await requireCityCapability(
    getEntityCityId(entity, record),
    "publishing:publish",
  );
  if (!canTransitionPublication(record.publicationStatus, status)) {
    throw new CmsContentIntegrityError(
      `Cannot transition ${record.publicationStatus} to ${status}.`,
    );
  }
  if (status === "published") {
    await assertPublishable(entity, id);
  }
  return setCmsPublicationStatus(entity, id, status, context.user.id);
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

async function assertPublishable(entity: CmsEntity, id: number) {
  const record = await loadEntity(entity, id);
  if (record.localizations.length === 0) {
    throw new CmsContentIntegrityError(
      "Published content requires at least one authored localization.",
    );
  }
  if (entity === "tour" && "stops" in record && record.stops.length === 0) {
    throw new CmsContentIntegrityError(
      "Published tours require at least one stop.",
    );
  }
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
) {
  if (context.staff.role === "content_editor" && status !== "draft") {
    throw new CmsContentIntegrityError(
      "Content editors may only change draft content.",
    );
  }
}

export const CMS_ENTITY_CAPABILITIES = {
  city: "cities:manage",
  place: "places:manage",
  tour: "tours:manage",
} as const satisfies Readonly<Record<CmsEntity, AdminCapability>>;
