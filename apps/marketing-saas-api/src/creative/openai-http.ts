import "server-only";
import sharp from "sharp";
import { z } from "zod";
import {
  ImageProviderError,
  prepareOpenAI,
  providerFailure,
  type CreativeImageProvider,
  type ImageInput,
} from "./image-adapter";
import { digest, normalizeImage } from "./provider";

export const imageTransportContract = Object.freeze({
  model: "gpt-image-2.5-flare-2026-09-08" as const,
  endpoint: "https://api.openai.com/v1/images/generations",
  maximumResponseBytes: 4 * 1024 * 1024 + 65536,
  maximumImageBytes: 3 * 1024 * 1024,
  maximumPromptBytes: 8192,
  timeoutMs: 30000,
  attempts: 1,
});
export type TransportGates = {
  enabled: () => boolean;
  killSwitch: () => boolean;
  spendApproved: () => boolean;
  priceBoundVerified: () => boolean;
  secret: () => string | undefined;
};
const resultSchema = z
  .object({
    data: z
      .array(
        z
          .object({
            b64_json: z
              .string()
              .min(4)
              .max(4 * 1024 * 1024),
            url: z.never().optional(),
            revised_prompt: z.string().max(32000).optional(),
          })
          .strict(),
      )
      .length(1),
    output_format: z.literal("png").optional(),
    size: z.string().optional(),
    // Billing data is not a charge receipt. Never release a reservation from this response.
    usage: z.unknown().optional(),
  })
  .passthrough();
async function readBounded(response: Response, signal: AbortSignal) {
  const max = imageTransportContract.maximumResponseBytes;
  const length = response.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > max)) {
    await response.body?.cancel();
    throw new ImageProviderError("IMAGE_RESPONSE_TOO_LARGE", "unknown");
  }
  if (!response.body)
    throw new ImageProviderError("IMAGE_RESULT_INVALID", "unknown");
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  const abort = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    while (true) {
      if (signal.aborted)
        throw new ImageProviderError("IMAGE_CANCELLED", "unknown");
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > max)
        throw new ImageProviderError("IMAGE_RESPONSE_TOO_LARGE", "unknown");
      chunks.push(Buffer.from(chunk.value));
    }
    if (signal.aborted)
      throw new ImageProviderError("IMAGE_CANCELLED", "unknown");
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } finally {
    signal.removeEventListener("abort", abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
/** Real HTTP implementation. Tests inject an intercepted fetch. No retries, URL downloads, redirects or SDK. */
export function createOpenAIHttpProvider(
  gates: TransportGates,
  transport: typeof fetch = (...args) => fetch(...args),
): CreativeImageProvider {
  return {
    id: "openai",
    async generate(input: ImageInput) {
      // Fail before touching credentials or transport, even if a credential exists in the environment.
      if (!gates.enabled() || gates.killSwitch())
        throw new ImageProviderError(
          "LIVE_IMAGE_PROVIDER_DISABLED",
          "known_zero",
        );
      if (!gates.spendApproved() || !gates.priceBoundVerified())
        throw new ImageProviderError(
          "LIVE_IMAGE_SPEND_NOT_AUTHORIZED",
          "known_zero",
        );
      const request = prepareOpenAI(input, imageTransportContract.model);
      if (
        request.encoding !== "json" ||
        input.references.length ||
        input.brief.creative?.referenceIds.length ||
        request.body.output_format !== "png"
      )
        throw new ImageProviderError(
          "LIVE_IMAGE_TEXT_ONLY_PNG_REQUIRED",
          "known_zero",
        );
      if (
        Buffer.byteLength(request.body.prompt, "utf8") >
          imageTransportContract.maximumPromptBytes ||
        !z.uuid().safeParse(input.idempotencyKey).success
      )
        throw new ImageProviderError(
          "IMAGE_REQUEST_BOUND_INVALID",
          "known_zero",
        );
      const key = gates.secret();
      if (!key || key.length < 16 || key.length > 512 || /[\r\n]/.test(key))
        throw new ImageProviderError(
          "IMAGE_SERVER_CREDENTIAL_REQUIRED",
          "known_zero",
        );
      // Gates can change while a job is queued; check again immediately before dispatch.
      if (!gates.enabled() || gates.killSwitch() || input.signal.aborted)
        throw new ImageProviderError(
          "LIVE_IMAGE_PROVIDER_DISABLED",
          "known_zero",
        );
      try {
        const response = await transport(imageTransportContract.endpoint, {
          method: "POST",
          redirect: "error",
          signal: input.signal,
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            // Local DB claiming is authoritative. Do not assume the vendor deduplicates this header.
            "Idempotency-Key": input.idempotencyKey,
          },
          body: JSON.stringify(request.body),
        });
        if (response.status !== 200) {
          await response.body?.cancel();
          throw providerFailure(response.status);
        }
        if (
          !/^application\/json(?:\s*;|$)/i.test(
            response.headers.get("content-type") ?? "",
          )
        ) {
          await response.body?.cancel();
          throw new ImageProviderError(
            "IMAGE_RESPONSE_MIME_INVALID",
            "unknown",
          );
        }
        const result = resultSchema.parse(
          await readBounded(response, input.signal),
        );
        const encoded = result.data[0].b64_json;
        const bytes = Buffer.from(encoded, "base64");
        if (
          bytes.toString("base64") !== encoded ||
          bytes.length > imageTransportContract.maximumImageBytes
        )
          throw new ImageProviderError("IMAGE_RESULT_INVALID", "unknown");
        const [width, height] = request.body.size.split("x").map(Number);
        const meta = await sharp(bytes, {
          limitInputPixels: 16_777_216,
        }).metadata();
        // Validate source pixels BEFORE normalization/composition. No cropping to hide wrong dimensions.
        if (
          meta.format !== "png" ||
          meta.width !== width ||
          meta.height !== height ||
          (meta.pages ?? 1) !== 1 ||
          (result.size && result.size !== request.body.size)
        )
          throw new ImageProviderError(
            "IMAGE_RESULT_DIMENSIONS_OR_TYPE_INVALID",
            "unknown",
          );
        const normalized = await normalizeImage(bytes, "image/png");
        if (input.signal.aborted || gates.killSwitch())
          throw new ImageProviderError("IMAGE_CANCELLED", "unknown");
        return {
          bytes: normalized.data,
          mime: "image/png",
          mock: false,
          providerOutputHash: digest(bytes),
          providerModel: imageTransportContract.model,
          charge: "unknown",
        };
      } catch (error) {
        if (error instanceof ImageProviderError) throw error;
        // Never serialize vendor error bodies, request objects, credentials or thrown transport messages.
        throw new ImageProviderError(
          input.signal.aborted
            ? "IMAGE_CANCELLED"
            : "IMAGE_PROVIDER_RESPONSE_FAILED",
          "unknown",
        );
      }
    },
  };
}
