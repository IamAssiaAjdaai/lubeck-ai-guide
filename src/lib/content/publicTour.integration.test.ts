// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { Client } from "pg";

vi.mock("server-only", () => ({}));

import { createRequestDatabase, runWithRequestDatabase } from "@/db/client";
import { getPublicCitySnapshot } from "./publicRepository.server";

// Run only against the explicitly selected disposable integration database.
describe.runIf(process.env.CMS_DB_INTEGRATION === "1")("public tour PostgreSQL integrity", () => {
  it("serves five fixed historic stops independently of the 25-place catalog", async () => {
    const snapshot = await getPublicCitySnapshot("lubeck", "database");
    expect(snapshot.places).toHaveLength(25);
    expect(snapshot.tours.find(t => t.slug === "historic-center-walk")?.stops.map(s => s.placeSlug)).toEqual([
      "holstentor", "marienkirche", "rathaus", "heiligen-geist-hospital", "buddenbrookhaus",
    ]);
  });

  it.each(["empty", "truncated", "reordered", "substituted"])(
    "fails closed when stored Historic Tour is %s, without changing the catalog",
    async scenario => {
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      await client.connect();
      try {
        await client.query("BEGIN");
        const result = await client.query<{ id: number }>(
          "SELECT t.id FROM tours t JOIN cities c ON c.id = t.city_id WHERE c.slug = 'lubeck' AND t.slug = 'historic-center-walk'",
        );
        expect(result.rows).toHaveLength(1);
        const tourId = result.rows[0].id;
        if (scenario === "empty" || scenario === "truncated") {
          await client.query("DELETE FROM tour_stops WHERE tour_id = $1 AND position >= $2", [tourId, scenario === "empty" ? 1 : 5]);
        } else if (scenario === "reordered") {
          await client.query("UPDATE tour_stops SET position = position + 100 WHERE tour_id = $1", [tourId]);
          await client.query("UPDATE tour_stops SET position = 106 - position WHERE tour_id = $1", [tourId]);
        } else {
          await client.query(`UPDATE tour_stops SET place_id = (
            SELECT p.id FROM places p JOIN tours t ON p.city_id = t.city_id
            WHERE t.id = $1 AND p.id NOT IN (SELECT place_id FROM tour_stops WHERE tour_id = $1)
            ORDER BY p.id LIMIT 1
          ) WHERE tour_id = $1 AND position = 5`, [tourId]);
        }
        await expect(runWithRequestDatabase(createRequestDatabase(client), () =>
          getPublicCitySnapshot("lubeck", "database"),
        )).rejects.toThrow(/Published (historic tour|tour stop graph)/);
        expect((await client.query("SELECT count(*)::int AS count FROM places p JOIN cities c ON c.id = p.city_id WHERE c.slug = 'lubeck'")).rows[0].count).toBe(25);
      } finally {
        await client.query("ROLLBACK");
        await client.end();
      }
    },
  );
});
