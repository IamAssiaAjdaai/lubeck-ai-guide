import { z } from "zod";
export const globalPolicySchema = z.strictObject({
  attempts: z.number().int().positive().max(10000),
  concurrent: z.number().int().positive().max(500),
  budget: z.number().int().positive().max(1_000_000_000),
});
export type GlobalImagePolicy = z.infer<typeof globalPolicySchema>;
// Finite defensive library bounds; explicit QA server policy is tighter. Neither authorizes provider spend.
export const defaultGlobalImagePolicy: GlobalImagePolicy = {
  attempts: 10000,
  concurrent: 500,
  budget: 1_000_000_000,
};
