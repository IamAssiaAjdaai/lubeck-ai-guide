import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { citiesTable, placesTable } from "@/db/schema";
import {
  lubeckCitySeed,
  lubeckPlaceSeeds,
} from "@/db/seedData";

export async function seedLubeckDatabase() {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [createdCity] = await tx
      .insert(citiesTable)
      .values(lubeckCitySeed)
      .onConflictDoNothing({ target: citiesTable.slug })
      .returning({ id: citiesTable.id });

    const city =
      createdCity ??
      (
        await tx
          .select({ id: citiesTable.id })
          .from(citiesTable)
          .where(eq(citiesTable.slug, lubeckCitySeed.slug))
          .limit(1)
      )[0];

    if (!city) throw new Error("Failed to find or create Lubeck.");

    for (const place of lubeckPlaceSeeds) {
      await tx
        .insert(placesTable)
        .values({ ...place, cityId: city.id })
        .onConflictDoNothing({
          target: [placesTable.cityId, placesTable.slug],
        });
    }

    return {
      cityId: city.id,
      placeCount: lubeckPlaceSeeds.length,
    };
  });
}
