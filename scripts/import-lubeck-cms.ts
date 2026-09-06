import { loadDatabaseEnvironment } from "@/db/loadEnvironment";

loadDatabaseEnvironment();

async function main() {
  const [{ closeDb }, { importCanonicalLubeckContent }] = await Promise.all([
    import("@/db/client"),
    import("@/lib/admin/content/importLubeck.server"),
  ]);
  try {
    const result = await importCanonicalLubeckContent();
    console.log(
      `Imported Lubeck CMS: ${result.cityCount} city, ${result.placeCount} places, ${result.placeLocalizationCount} authored place localizations, ${result.hiddenGemCount} Hidden Gems, ${result.tourCount} tour, ${result.tourStopCount} stops.`,
    );
  } catch (error) {
    console.error(
      "CMS import failed. Existing staff-authored rows were not overwritten.",
    );
    if (process.env.NODE_ENV !== "production") console.error(error);
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}

void main();
