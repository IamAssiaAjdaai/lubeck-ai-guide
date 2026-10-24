import type { Brief, JobState, imageModels } from "./contract";

/** Contracts only. No implementation, credentials, SDK or provider selection in this sprint. */
export type FutureImageModel = (typeof imageModels)[number];
export interface FutureImageProvider {
  readonly model: FutureImageModel;
  createBackground(input: {
    brief: Brief;
    idempotencyKey: string;
    maximumChargeMicroEur: number;
    signal: AbortSignal;
  }): Promise<{
    bytes: Uint8Array;
    mime: "image/png" | "image/webp";
    receipt: ChargeReceipt;
  }>;
}
export type ChargeReceipt =
  | {
      status: "known";
      vendorRequestId: string;
      amountMicroEur: number;
      receiptHash: string;
    }
  | {
      status: "unknown";
      vendorRequestId: string | null;
      reservationRetained: true;
    };
export interface FutureSeedanceProvider {
  submit(input: {
    brief: Brief;
    idempotencyKey: string;
    maximumChargeMicroEur: number;
    signal: AbortSignal;
  }): Promise<{ providerJobId: string; receipt: ChargeReceipt }>;
  poll(
    providerJobId: string,
    signal: AbortSignal,
  ): Promise<{
    state: JobState;
    receipt: ChargeReceipt;
    privateOutput?: Uint8Array;
  }>;
  // Acknowledging cancellation is not evidence of zero charge. Late output is discarded.
  cancel(
    providerJobId: string,
    signal: AbortSignal,
  ): Promise<{ acknowledged: boolean; receipt: ChargeReceipt }>;
  reconcile(providerJobId: string, signal: AbortSignal): Promise<ChargeReceipt>;
}
