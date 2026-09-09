import "server-only";

import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import {
  CityManifestValidationError,
  validateCityManifest,
  type CityManifest,
} from "@/lib/admin/content/cityManifest";

const MAX_MANIFEST_BYTES = 5 * 1024 * 1024;

export async function loadCityManifestFile(
  manifestPath: string,
  workingDirectory = process.cwd(),
): Promise<CityManifest> {
  if (!manifestPath.trim()) {
    throw new CityManifestValidationError(["manifest path is required"]);
  }

  const absolutePath = resolve(workingDirectory, manifestPath);
  const metadata = await stat(absolutePath);
  if (!metadata.isFile()) {
    throw new CityManifestValidationError(["manifest path must identify a file"]);
  }
  if (metadata.size > MAX_MANIFEST_BYTES) {
    throw new CityManifestValidationError(["manifest exceeds the 5 MB import limit"]);
  }

  let document: unknown;
  try {
    document = JSON.parse(await readFile(absolutePath, "utf8"));
  } catch {
    throw new CityManifestValidationError(["manifest must be valid JSON"]);
  }

  try {
    return validateCityManifest(document as CityManifest);
  } catch (error) {
    if (error instanceof CityManifestValidationError) throw error;
    throw new CityManifestValidationError(["manifest structure is invalid"]);
  }
}
