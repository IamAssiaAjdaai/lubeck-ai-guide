import { hamburgCityManifest } from "@/data/cities/hamburg";
import { closeDb } from "@/db/client";
import { loadDatabaseEnvironment } from "@/db/loadEnvironment";
import type { CityManifest } from "@/lib/admin/content/cityManifest";
import { loadCityManifestFile } from "@/lib/admin/content/cityManifestFile.server";
import { importCityManifest } from "@/lib/admin/content/importCityManifest.server";

loadDatabaseEnvironment();

const bootstrapFixtures: Readonly<Record<string, CityManifest>> = {
  hamburg: hamburgCityManifest,
};

async function main() {
  const arguments_ = process.argv.slice(2);
  const manifestPath = arguments_
    .find((argument) => argument.startsWith("--manifest="))
    ?.slice("--manifest=".length) ?? arguments_.find(
      (argument) => !argument.startsWith("--"),
    );
  const citySlug = arguments_
    .find((argument) => argument.startsWith("--city="))
    ?.slice("--city=".length);
  const manifest = manifestPath
    ? await loadCityManifestFile(manifestPath)
    : citySlug
      ? bootstrapFixtures[citySlug]
      : undefined;

  if (!manifest) {
    throw new Error(
      `Pass a JSON manifest path, use --manifest=<path>, or use a bundled bootstrap fixture with --city=<slug>. Available fixtures: ${Object.keys(bootstrapFixtures).join(", ")}.`,
    );
  }

  const result = await importCityManifest(manifest);
  console.log(
    `Imported ${result.citySlug}: ${result.placeCount} places, ${result.sourceLinkCount} source links, ${result.tourCount} tour, ${result.verifiedKnowledgeCount} verified knowledge chunks.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "City import failed.");
    process.exitCode = 1;
  })
  .finally(async () => closeDb());
