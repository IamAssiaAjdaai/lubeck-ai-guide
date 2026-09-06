import { describe, expect, it } from "vitest";

import { placeInputFromFormData } from "@/lib/admin/content/formData";

function validPlaceFormData() {
  const data = new FormData();
  const fields = {
    cityId: "7",
    slug: "test-place",
    category: "see",
    latitude: "53.86",
    longitude: "10.68",
    durationMinutes: "20",
    environment: "outdoor",
    pricing: "unknown",
    status: "",
    statusVerifiedAt: "",
    visitNoteVerifiedAt: "",
    visitNoteValidUntil: "",
    image: "",
    tagSlugs: "history, history, hidden-gem",
    publicationStatus: "draft",
    locale: "en",
    name: "Test place",
    shortDescription: "An authored description.",
    description: "",
    story: "",
    visitNotes: "",
    facts: "Period | Medieval",
  };
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

describe("CMS form payload parsing", () => {
  it("maps only supported content fields and ignores client actor or role claims", () => {
    const formData = validPlaceFormData();
    formData.set("actorId", "attacker-controlled-user");
    formData.set("role", "super_admin");
    formData.set("cityIds", "7,8,9");

    const input = placeInputFromFormData(formData);

    expect(input).not.toHaveProperty("actorId");
    expect(input).not.toHaveProperty("role");
    expect(input).not.toHaveProperty("cityIds");
    expect(input.cityId).toBe(7);
  });

  it("keeps fact content structured for server validation", () => {
    expect(placeInputFromFormData(validPlaceFormData()).localizations[0]?.facts)
      .toEqual([{ label: "Period ", value: " Medieval" }]);
  });
});
