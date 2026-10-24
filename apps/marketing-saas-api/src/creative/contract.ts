import { z } from "zod";

export const imageModels = [
  "gpt-image-2.5-flare",
  "gpt-image-2.5-sunburst",
] as const;
export const kitSchema = z.strictObject({
  expectedRevision: z.number().int().min(0),
  colors: z
    .array(z.string().regex(/^#[0-9a-fA-F]{6}$/))
    .min(2)
    .max(5),
  typography: z.enum(["Manrope", "Fraunces"]),
  style: z.enum(["ruhig", "klar", "editorial"]),
  logoId: z.uuid().nullable(),
  photoIds: z.array(z.uuid()).max(8),
});
export type Kit = Omit<z.infer<typeof kitSchema>, "expectedRevision"> & {
  revision: number;
};
export type Asset = {
  id: string;
  revision: number;
  name: string;
  alt: string;
  role: "logo" | "business_photo";
  origin: "owner_uploaded";
  rights: "owner_declared";
  status: "pending" | "approved" | "deleted";
  hash: string;
  bytes: number;
  width: number;
  height: number;
  createdAt: string;
  deletedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
};
export const assetMetadata = z.strictObject({
  expectedRevision: z.number().int().positive(),
  name: z.string().trim().min(1).max(100),
  alt: z.string().trim().min(1).max(240),
  role: z.enum(["logo", "business_photo"]),
});
export const creativeOptions = z.strictObject({
  style: z.enum(["abstrakt", "editorial", "geometrisch"]),
  operation: z.enum(["generate", "edit"]),
  referenceIds: z.array(z.uuid()).max(4),
  outputFormat: z.enum(["png", "webp"]),
});
export const imageCommand = z.strictObject({
  generationId: z.uuid(),
  expectedVersion: z.number().int().positive(),
  postIndex: z.number().int().min(0).max(2),
  objective: z.enum([
    "leistung_erklaeren",
    "gespraech_anregen",
    "wiedererkennung",
  ]),
  ratio: z.enum(["1:1", "4:5", "16:9"]),
  idempotencyKey: z.uuid(),
  creative: creativeOptions.optional(),
  reviewedBriefHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
});
export type ImageCommand = z.infer<typeof imageCommand>;
export type Binding = {
  generationId: string;
  version: number;
  postIndex: number;
  postHash: string;
  contextRevision: number;
  contextHash: string;
  kitRevision: number;
  assets: { id: string; revision: number; hash: string }[];
};
export type Brief = {
  schemaVersion: 1;
  creative?: z.infer<typeof creativeOptions>;
  synthetic: true;
  objective: ImageCommand["objective"];
  ratio: ImageCommand["ratio"];
  facts: { id: string; statement: string }[];
  editorialText: string;
  constraints: string[];
  binding: Binding;
  kit: Kit;
};
export type JobState =
  "queued" | "processing" | "completed" | "failed" | "cancelled" | "expired";
export type Job = {
  id: string;
  kind: "image" | "video";
  state: JobState;
  provider: "mock" | "openai";
  createdAt: string;
  expiresAt: string;
  phaseAt: string;
  providerPending: boolean;
  brief: Brief;
  disclosureVersion?: 2 | 3;
  providerOutputHash?: string;
  providerModel?: string;
  outputKey?: string;
  outputHash?: string;
  outputMime?: "image/png" | "application/json";
  // Mock video output is a manifest, explicitly NOT an encoded playable video.
  error?: string;
  review?: { bindingHash: string; actor: string; at: string };
  attached?: boolean;
};
export type CreativeState = {
  kit: Kit;
  assets: Asset[];
  jobs: Job[];
  pendingDeletes?: string[];
  erasure?: { requestedAt: string; completedAt?: string; policyVersion: 1 };
};
export const initialState = (): CreativeState => ({
  kit: {
    revision: 0,
    colors: ["#162D2C", "#F0F3EC", "#D0EB8D", "#C8BCEE"],
    typography: "Manrope",
    style: "ruhig",
    logoId: null,
    photoIds: [],
  },
  assets: [],
  jobs: [],
});
export const limits = {
  image: {
    attempts: 10,
    concurrent: 2,
    reservation: 100_000,
    budget: 1_000_000,
  },
  video: {
    attempts: 3,
    concurrent: 1,
    reservation: 500_000,
    budget: 1_500_000,
  },
} as const;
