// @vitest-environment node

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { loadCityManifestFile } from "@/lib/admin/content/cityManifestFile.server";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

async function writeManifest(value: unknown) {
  const directory = await mkdtemp(join(tmpdir(), "citywalk-manifest-"));
  temporaryDirectories.push(directory);
  const path = join(directory, "city.json");
  await writeFile(path, JSON.stringify(value), "utf8");
  return path;
}

function validManifest() {
  const source = {
    publisher: "Test city authority",
    title: "Test city information",
    canonicalUrl: "https://example.test/no-code-city",
    verifiedAt: "2026-09-09",
  };
  return {
    schemaVersion: 1,
    city: {
      slug: "no-code-city",
      name: "No-code City",
      countryCode: "DE",
      timezone: "Europe/Berlin",
      publicationStatus: "published",
      content: {
        de: {
          name: "No-Code-Stadt",
          shortDescription: "Eine Stadt aus einer JSON-Datei.",
          description: "Diese Einführung wird als Daten statt als Anwendungscode importiert.",
        },
        en: {
          name: "No-code City",
          shortDescription: "A city supplied by a JSON file.",
          description: "This introduction is imported as data rather than application code.",
        },
      },
      sources: [source],
    },
    coordinateQa: { latitude: [50, 55], longitude: [5, 15] },
    readiness: {
      targetPlaceCount: 1,
      requiredContentLocales: ["de", "en"],
      reviewedContentLocales: [],
      requiredAudioLocales: [],
      audioTargetPlaceCount: 0,
      minimumVerifiedAiPlaceCount: 0,
      webQaStatus: "pending",
      nativeQaStatus: "pending",
      travelerQaStatus: "pending",
      premiumContentStatus: "not_required",
    },
    places: [{
      slug: "no-code-place",
      category: "see",
      coordinates: { lat: 52, lng: 10 },
      durationMinutes: 20,
      environment: "outdoor",
      pricing: "free",
      status: "unknown",
      tags: [],
      publicationStatus: "published",
      content: {
        de: { name: "No-Code-Ort", shortDescription: "Ein Testort." },
        en: { name: "No-code Place", shortDescription: "A test place." },
      },
      sources: [source],
    }],
    tours: [],
    knowledge: [],
  };
}

describe("JSON city manifest loading", () => {
  it("loads and validates a data-only external city manifest", async () => {
    const path = await writeManifest(validManifest());

    await expect(loadCityManifestFile(path)).resolves.toMatchObject({
      city: { slug: "no-code-city" },
      places: [{ slug: "no-code-place" }],
    });
  });

  it("fails safely for invalid JSON and malformed structures", async () => {
    const malformedPath = await writeManifest({ city: { slug: "broken" } });
    await expect(loadCityManifestFile(malformedPath)).rejects.toThrow(
      /manifest structure is invalid/,
    );

    const directory = await mkdtemp(join(tmpdir(), "citywalk-manifest-"));
    temporaryDirectories.push(directory);
    const invalidJsonPath = join(directory, "invalid.json");
    await writeFile(invalidJsonPath, "not JSON", "utf8");
    await expect(loadCityManifestFile(invalidJsonPath)).rejects.toThrow(
      /valid JSON/,
    );
  });
});
