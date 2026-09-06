import "server-only";

import { MediaIntegrityError } from "@/lib/media/types";

export type S3MediaEnvironment = Readonly<{
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
}>;

export function getS3MediaEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): S3MediaEnvironment {
  const provider = environment.CITYWALK_MEDIA_STORAGE?.trim();
  if (provider !== "s3") {
    throw new MediaIntegrityError("Media storage is not configured.");
  }
  const config = {
    endpoint: required(environment, "CITYWALK_MEDIA_S3_ENDPOINT"),
    region: required(environment, "CITYWALK_MEDIA_S3_REGION"),
    bucket: required(environment, "CITYWALK_MEDIA_S3_BUCKET"),
    accessKeyId: required(environment, "CITYWALK_MEDIA_S3_ACCESS_KEY_ID"),
    secretAccessKey: required(environment, "CITYWALK_MEDIA_S3_SECRET_ACCESS_KEY"),
    publicBaseUrl: required(environment, "CITYWALK_MEDIA_PUBLIC_BASE_URL"),
  };
  validateUrl(config.endpoint, "CITYWALK_MEDIA_S3_ENDPOINT", true);
  validateUrl(config.publicBaseUrl, "CITYWALK_MEDIA_PUBLIC_BASE_URL", false);
  return config;
}

function required(
  environment: Readonly<Record<string, string | undefined>>,
  name: string,
): string {
  const value = environment[name]?.trim();
  if (!value) throw new MediaIntegrityError(`${name} is required for media operations.`);
  return value;
}

function validateUrl(value: string, name: string, allowLocalHttp: boolean): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new MediaIntegrityError(`${name} must be a valid absolute URL.`);
  }
  const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(allowLocalHttp && local && url.protocol === "http:")) {
    throw new MediaIntegrityError(`${name} must use HTTPS.`);
  }
  if (url.username || url.password) {
    throw new MediaIntegrityError(`${name} must not contain credentials.`);
  }
}

