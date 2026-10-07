import "server-only";

import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

import type {
  CreateUploadUrlInput,
  MediaObjectStore,
  ReadableStoredObject,
  StoredObjectMetadata,
} from "@/lib/media/storage/types";

type StoredMetadata = Readonly<{
  contentType: string;
  checksumSha256: string;
}>;

export class LocalFilesystemMediaObjectStore implements MediaObjectStore {
  readonly providerId = "local-filesystem";

  constructor(
    private readonly rootDirectory = resolve(process.cwd(), ".citywalk", "media"),
  ) {}

  async createUploadUrl(input: CreateUploadUrlInput): Promise<string> {
    return `/api/admin/media/local-object?objectKey=${encodeURIComponent(input.objectKey)}`;
  }

  async writeObject(
    objectKey: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<void> {
    const objectPath = this.objectPath(objectKey);
    await mkdir(dirname(objectPath), { recursive: true });
    const checksumSha256 = createHash("sha256").update(bytes).digest("base64");
    await Promise.all([
      writeFile(objectPath, bytes),
      writeFile(
        this.metadataPath(objectPath),
        JSON.stringify({ contentType, checksumSha256 } satisfies StoredMetadata),
        "utf8",
      ),
    ]);
  }

  async headObject(objectKey: string): Promise<StoredObjectMetadata | undefined> {
    const objectPath = this.objectPath(objectKey);
    try {
      const [fileStat, metadata] = await Promise.all([
        stat(objectPath),
        this.readMetadata(objectPath),
      ]);
      if (!fileStat.isFile()) return undefined;
      return {
        sizeBytes: fileStat.size,
        ...(metadata?.contentType ? { contentType: metadata.contentType } : {}),
        ...(metadata?.checksumSha256
          ? { checksumSha256: metadata.checksumSha256 }
          : {}),
      };
    } catch (error) {
      if (isNotFound(error)) return undefined;
      throw error;
    }
  }

  async readObjectRange(
    objectKey: string,
    start: number,
    end: number,
  ): Promise<Uint8Array> {
    const bytes = new Uint8Array(await readFile(this.objectPath(objectKey)));
    return bytes.slice(start, end + 1);
  }

  async readObject(
    objectKey: string,
    range?: string,
  ): Promise<ReadableStoredObject | undefined> {
    try {
      const bytes = new Uint8Array(await readFile(this.objectPath(objectKey)));
      const bounds = range ? parseRange(range, bytes.byteLength) : undefined;
      if (range && !bounds) return undefined;
      const bodyBytes = bounds
        ? bytes.slice(bounds.start, bounds.end + 1)
        : bytes;
      return {
        body: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(bodyBytes);
            controller.close();
          },
        }),
        contentLength: bodyBytes.byteLength,
        ...(bounds
          ? {
              contentRange: `bytes ${bounds.start}-${bounds.end}/${bytes.byteLength}`,
            }
          : {}),
      };
    } catch (error) {
      if (isNotFound(error)) return undefined;
      throw error;
    }
  }

  async deleteObject(objectKey: string): Promise<void> {
    const objectPath = this.objectPath(objectKey);
    await Promise.all([
      rm(objectPath, { force: true }),
      rm(this.metadataPath(objectPath), { force: true }),
    ]);
  }

  async getAdminPreviewUrl(objectKey: string): Promise<string> {
    return `/api/admin/media/local-object?objectKey=${encodeURIComponent(objectKey)}`;
  }

  private objectPath(objectKey: string): string {
    if (!objectKey || objectKey.startsWith("/") || objectKey.includes("\0")) {
      throw new Error("Invalid local media object key.");
    }
    const candidate = resolve(this.rootDirectory, ...objectKey.split("/"));
    const relativePath = relative(this.rootDirectory, candidate);
    if (
      relativePath === "" ||
      relativePath === ".." ||
      relativePath.startsWith(`..${sep}`) ||
      resolve(this.rootDirectory, relativePath) !== candidate
    ) {
      throw new Error("Invalid local media object key.");
    }
    return candidate;
  }

  private metadataPath(objectPath: string): string {
    return `${objectPath}.metadata.json`;
  }

  private async readMetadata(objectPath: string): Promise<StoredMetadata | undefined> {
    try {
      const value = JSON.parse(
        await readFile(this.metadataPath(objectPath), "utf8"),
      ) as Partial<StoredMetadata>;
      if (
        typeof value.contentType !== "string" ||
        typeof value.checksumSha256 !== "string"
      ) {
        return undefined;
      }
      return {
        contentType: value.contentType,
        checksumSha256: value.checksumSha256,
      };
    } catch (error) {
      if (isNotFound(error) || error instanceof SyntaxError) return undefined;
      throw error;
    }
  }
}

function parseRange(
  range: string,
  size: number,
): { start: number; end: number } | undefined {
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match || (!match[1] && !match[2]) || size <= 0) return undefined;

  if (match[1]) {
    const start = Number(match[1]);
    const requestedEnd = match[2] ? Number(match[2]) : size - 1;
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(requestedEnd) ||
      start < 0 ||
      start >= size ||
      requestedEnd < start
    ) {
      return undefined;
    }
    return { start, end: Math.min(requestedEnd, size - 1) };
  }

  const suffixLength = Number(match[2]);
  if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return undefined;
  const length = Math.min(suffixLength, size);
  return { start: size - length, end: size - 1 };
}

function isNotFound(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT",
  );
}
