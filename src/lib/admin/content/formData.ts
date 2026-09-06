import type {
  CityInput,
  PlaceInput,
  PublicationStatus,
  TourInput,
} from "@/lib/admin/content/validation";
import { CmsValidationError } from "@/lib/admin/content/validation";

export function cityInputFromFormData(formData: FormData): CityInput {
  return {
    slug: field(formData, "slug"),
    publicationStatus: statusField(formData),
    localizations: [{
      locale: field(formData, "locale") as CityInput["localizations"][number]["locale"],
      name: field(formData, "name"),
      shortDescription: field(formData, "shortDescription"),
    }],
  };
}

export function placeInputFromFormData(formData: FormData): PlaceInput {
  const facts = field(formData, "facts")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const separator = line.indexOf("|");
      if (separator < 1 || separator === line.length - 1) {
        throw new CmsValidationError([
          `Fact line ${index + 1} must use Label | Value.`,
        ]);
      }
      return {
        label: line.slice(0, separator),
        value: line.slice(separator + 1),
      };
    });
  return {
    cityId: numberField(formData, "cityId"),
    slug: field(formData, "slug"),
    category: field(formData, "category") as PlaceInput["category"],
    latitude: numberField(formData, "latitude"),
    longitude: numberField(formData, "longitude"),
    durationMinutes: numberField(formData, "durationMinutes"),
    environment: field(formData, "environment") as PlaceInput["environment"],
    pricing: field(formData, "pricing") as PlaceInput["pricing"],
    status: optionalField(formData, "status") as PlaceInput["status"],
    statusVerifiedAt: optionalField(formData, "statusVerifiedAt"),
    visitNoteVerifiedAt: optionalField(formData, "visitNoteVerifiedAt"),
    visitNoteValidUntil: optionalField(formData, "visitNoteValidUntil"),
    image: optionalField(formData, "image"),
    tagSlugs: field(formData, "tagSlugs")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    publicationStatus: statusField(formData),
    localizations: [{
      locale: field(formData, "locale") as PlaceInput["localizations"][number]["locale"],
      name: field(formData, "name"),
      shortDescription: field(formData, "shortDescription"),
      description: optionalField(formData, "description"),
      story: optionalField(formData, "story"),
      visitNotes: optionalField(formData, "visitNotes"),
      facts,
    }],
  };
}

export function tourInputFromFormData(formData: FormData): TourInput {
  const stopIds = field(formData, "stopPlaceIds")
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((value) => Number(value));
  return {
    cityId: numberField(formData, "cityId"),
    slug: field(formData, "slug"),
    publicationStatus: statusField(formData),
    estimatedDurationMinutes: optionalNumberField(
      formData,
      "estimatedDurationMinutes",
    ),
    localizations: [{
      locale: field(formData, "locale") as TourInput["localizations"][number]["locale"],
      title: field(formData, "title"),
      shortDescription: optionalField(formData, "shortDescription"),
      description: optionalField(formData, "description"),
    }],
    stops: stopIds.map((placeId, index) => ({
      placeId,
      position: index + 1,
    })),
  };
}

export function expectedUpdatedAtFromFormData(formData: FormData): string {
  const value = field(formData, "expectedUpdatedAt");
  if (Number.isNaN(new Date(value).valueOf())) {
    throw new CmsValidationError(["The edit version is invalid."]);
  }
  return value;
}

function statusField(formData: FormData): PublicationStatus {
  return field(formData, "publicationStatus") as PublicationStatus;
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  if (typeof value !== "string") {
    throw new CmsValidationError([`${name} is required.`]);
  }
  return value;
}

function optionalField(formData: FormData, name: string): string | undefined {
  return field(formData, name).trim() || undefined;
}

function numberField(formData: FormData, name: string): number {
  return Number(field(formData, name));
}

function optionalNumberField(
  formData: FormData,
  name: string,
): number | undefined {
  const value = field(formData, name).trim();
  return value ? Number(value) : undefined;
}
