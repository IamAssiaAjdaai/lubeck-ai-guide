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
    const [city] = await tx
      .insert(citiesTable)
      .values(lubeckCitySeed)
      .onConflictDoUpdate({
        target: citiesTable.slug,
        set: {
          name: lubeckCitySeed.name,
        },
      })
      .returning({
        id: citiesTable.id,
      });

    if (!city) {
      throw new Error("Failed to create or update Lübeck.");
    }

    await tx
      .delete(placesTable)
      .where(eq(placesTable.cityId, city.id));

    await tx.insert(placesTable).values(
      lubeckPlaceSeeds.map((place) => ({
        ...place,
        cityId: city.id,
      })),
    );

    return {
      cityId: city.id,
      placeCount: lubeckPlaceSeeds.length,
    };
  });
}