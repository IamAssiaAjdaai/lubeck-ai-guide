import { beforeEach, describe, expect, it, vi } from "vitest";

const { transaction } = vi.hoisted(() => ({
  transaction: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  getDb: () => ({ transaction }),
}));

import { seedLubeckDatabase } from "@/db/seed";

describe("Lübeck database seed transaction", () => {
  beforeEach(() => {
    transaction.mockReset();
  });

  it("replaces the city's places on every run instead of appending", async () => {
    const transactionOperations: string[][] = [];
    const insertedPlaceCounts: number[] = [];

    transaction.mockImplementation(async (callback) => {
      const operations: string[] = [];
      transactionOperations.push(operations);
      const insert = vi
        .fn()
        .mockReturnValueOnce({
          values: vi.fn(() => {
            operations.push("city-upsert");
            return {
              onConflictDoUpdate: vi.fn(() => ({
                returning: vi.fn().mockResolvedValue([{ id: 7 }]),
              })),
            };
          }),
        })
        .mockReturnValueOnce({
          values: vi.fn((values: readonly unknown[]) => {
            operations.push("place-insert");
            insertedPlaceCounts.push(values.length);
            return Promise.resolve();
          }),
        });
      const remove = vi.fn(() => ({
        where: vi.fn(() => {
          operations.push("place-delete");
          return Promise.resolve();
        }),
      }));

      return callback({ insert, delete: remove });
    });

    const first = await seedLubeckDatabase();
    const second = await seedLubeckDatabase();

    expect(first.placeCount).toBe(25);
    expect(second.placeCount).toBe(25);
    expect(insertedPlaceCounts).toEqual([25, 25]);
    expect(transactionOperations).toEqual([
      ["city-upsert", "place-delete", "place-insert"],
      ["city-upsert", "place-delete", "place-insert"],
    ]);
  });
});
