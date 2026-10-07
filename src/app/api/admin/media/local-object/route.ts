import { requireCityCapability } from "@/lib/admin/authorization.server";
import {
  assertTrustedMutationOrigin,
  mediaErrorResponse,
} from "@/lib/media/http.server";
import {
  deliverPrivateMediaObject,
  mediaUnavailableResponse,
} from "@/lib/media/mediaDelivery.server";
import { validateUploadedObject } from "@/lib/media/policy";
import { getMediaAssetByObjectKey } from "@/lib/media/repository.server";
import { getMediaObjectStore } from "@/lib/media/storage/storage.server";
import {
  MediaIntegrityError,
  MediaNotFoundError,
} from "@/lib/media/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: Request): Promise<Response> {
  try {
    assertTrustedMutationOrigin(request);
    const objectKey = getObjectKey(request);
    const store = getLocalDevelopmentStore();
    const asset = await getAuthorizedAsset(objectKey, "media:manage");

    if (
      asset.sourceType !== "upload" ||
      asset.approvalStatus !== "uploading" ||
      asset.expectedSizeBytes === null
    ) {
      throw new MediaIntegrityError("This local media upload is no longer writable.");
    }

    const bytes = new Uint8Array(await request.arrayBuffer());
    validateUploadedObject(
      {
        kind: asset.kind,
        mimeType: asset.mimeType,
        sizeBytes: asset.expectedSizeBytes,
      },
      {
        sizeBytes: bytes.byteLength,
        mimeType: request.headers.get("content-type") ?? undefined,
        initialBytes: bytes.slice(0, 64),
      },
    );

    await store.writeObject(objectKey, bytes, asset.mimeType);
    return new Response(null, { status: 204 });
  } catch (error) {
    return mediaErrorResponse(error);
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    const objectKey = getObjectKey(request);
    getLocalDevelopmentStore();
    const asset = await getAuthorizedAsset(objectKey, "media:view");
    if (
      asset.sourceType !== "upload" ||
      asset.approvalStatus === "uploading" ||
      asset.approvalStatus === "archived" ||
      asset.sizeBytes === null
    ) {
      return mediaUnavailableResponse();
    }
    return deliverPrivateMediaObject(
      request,
      {
        objectKey,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
      },
      "Admin local media",
    );
  } catch (error) {
    return mediaErrorResponse(error);
  }
}

function getObjectKey(request: Request): string {
  const objectKey = new URL(request.url).searchParams.get("objectKey")?.trim();
  if (!objectKey) throw new MediaNotFoundError();
  return objectKey;
}

function getLocalDevelopmentStore() {
  const store = getMediaObjectStore();
  if (
    process.env.NODE_ENV !== "development" ||
    store.providerId !== "local-filesystem"
  ) {
    throw new MediaNotFoundError();
  }
  return store;
}

async function getAuthorizedAsset(
  objectKey: string,
  capability: "media:manage" | "media:view",
) {
  const asset = await getMediaAssetByObjectKey(objectKey);
  if (!asset) throw new MediaNotFoundError();
  await requireCityCapability(asset.cityId, capability);
  return asset;
}
