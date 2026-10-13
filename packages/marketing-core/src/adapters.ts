import { createBrandContext } from "./context";
import { rawBusinessBriefSchema, type IntakeMetadata, type RawBusinessBrief } from "./schema";

/** Hosts resolve their own identities, authorization and source-specific trust. */
export interface BrandBriefAdapter<TInput> {
  readonly kind: string;
  normalize(input: TInput): RawBusinessBrief;
}

export const rawBusinessBriefAdapter: BrandBriefAdapter<unknown> = {
  kind: "raw_business_brief",
  normalize: (input) => rawBusinessBriefSchema.parse(input),
};

export function createBrandContextFromAdapter<TInput>(
  adapter: BrandBriefAdapter<TInput>,
  input: TInput,
  metadata: IntakeMetadata,
) {
  return createBrandContext(adapter.normalize(input), metadata);
}
