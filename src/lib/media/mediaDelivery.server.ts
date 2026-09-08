import "server-only";

import { getMediaObjectStore } from "@/lib/media/storage/storage.server";

export type DeliverableMediaAsset = Readonly<{
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
}>;

export async function deliverPrivateMediaObject(
  request: Request,
  asset: DeliverableMediaAsset,
  diagnosticLabel: string,
): Promise<Response> {
  const range = normalizeRange(request.headers.get("range"), asset.sizeBytes);
  if (range === null) {
    return new Response(null, {
      status: 416,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Range": `bytes */${asset.sizeBytes}`,
      },
    });
  }

  try {
    const object = await getMediaObjectStore().readObject(
      asset.objectKey,
      range ?? undefined,
    );
    if (!object) return mediaUnavailableResponse();
    const headers = new Headers({
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "Content-Type": asset.mimeType,
      "X-Content-Type-Options": "nosniff",
    });
    if (object.contentLength !== undefined) {
      headers.set("Content-Length", String(object.contentLength));
    }
    if (object.contentRange) headers.set("Content-Range", object.contentRange);
    return new Response(object.body, {
      status: object.contentRange ? 206 : 200,
      headers,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        `${diagnosticLabel} delivery failed`,
        error instanceof Error ? error.name : "unknown_error",
      );
    }
    return new Response("Media delivery is temporarily unavailable.", {
      status: 502,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}

export function mediaUnavailableResponse(): Response {
  return new Response("Media not found.", {
    status: 404,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export function normalizeRange(
  value: string | null,
  size: number,
): string | null | undefined {
  if (!value) return undefined;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return null;
  if (match[1]) {
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : undefined;
    if (!Number.isSafeInteger(start) || start >= size) return null;
    if (end !== undefined && (!Number.isSafeInteger(end) || end < start)) {
      return null;
    }
  } else {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
  }
  return value.trim();
}
