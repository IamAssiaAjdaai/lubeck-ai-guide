import { beforeEach, describe, expect, it, vi } from "vitest";

const { transaction } = vi.hoisted(() => ({
  transaction: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  getDb: () => ({ transaction }),
}));

import { seedLubeckDatabase } from "@/db/seed";

describe("Lubeck database seed transaction", () => {
  beforeEach(() => {
    transaction.mockReset();
  });

  it("inserts missing canonical rows without deleting CMS-authored content", async () => {
    const transactionOperations: string[][] = [];

    transaction.mockImplementation(async (callback) => {
      const operations: string[] = [];
      transactionOperations.push(operations);
      let insertCount = 0;
      const insert = vi.fn(() => ({
        values: vi.fn(() => {
          insertCount += 1;
          if (insertCount === 1) {
            operations.push("city-insert-if-missing");
            return {
              onConflictDoNothing: vi.fn(() => ({
                returning: vi.fn().mockResolvedValue([{ id: 7 }]),
              })),
            };
          }
          operations.push("place-insert-if-missing");
          return {
            onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
          };
        }),
      }));

      return callback({ insert });
    });

    const first = await seedLubeckDatabase();
    const second = await seedLubeckDatabase();

    expect(first.placeCount).toBe(25);
    expect(second.placeCount).toBe(25);
    expect(transactionOperations).toHaveLength(2);
    for (const operations of transactionOperations) {
      expect(operations.filter((operation) => operation === "city-insert-if-missing")).toHaveLength(1);
      expect(operations.filter((operation) => operation === "place-insert-if-missing")).toHaveLength(25);
      expect(operations).not.toContain("place-delete");
    }
  });
});
