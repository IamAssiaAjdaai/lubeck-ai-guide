import "server-only";

import { MediaIntegrityError } from "@/lib/media/types";

export type S3MediaEnvironment = Readonly<{
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}>;

const LOCAL_MEDIA_DEFAULTS = {
  CITYWALK_MEDIA_STORAGE: "s3",
  CITYWALK_MEDIA_S3_ENDPOINT: "http://localhost:4566",
  CITYWALK_MEDIA_S3_REGION: "us-east-1",
  CITYWALK_MEDIA_S3_BUCKET: "citywalk-local",
  CITYWALK_MEDIA_S3_ACCESS_KEY_ID: "test",
  CITYWALK_MEDIA_S3_SECRET_ACCESS_KEY: "test",
} as const;

export function getS3MediaEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): S3MediaEnvironment {
  const resolved = withLocalDevelopmentDefaults(environment);
  const provider = resolved.CITYWALK_MEDIA_STORAGE?.trim();
  if (provider !== "s3") {
    throw new MediaIntegrityError("Media storage is not configured.");
  }
  const config = {
    endpoint: required(resolved, "CITYWALK_MEDIA_S3_ENDPOINT"),
    region: required(resolved, "CITYWALK_MEDIA_S3_REGION"),
    bucket: required(resolved, "CITYWALK_MEDIA_S3_BUCKET"),
    accessKeyId: required(resolved, "CITYWALK_MEDIA_S3_ACCESS_KEY_ID"),
    secretAccessKey: required(resolved, "CITYWALK_MEDIA_S3_SECRET_ACCESS_KEY"),
  };
  validateUrl(config.endpoint, "CITYWALK_MEDIA_S3_ENDPOINT", true);
  return config;
}

function withLocalDevelopmentDefaults(
  environment: Readonly<Record<string, string | undefined>>,
): Readonly<Record<string, string | undefined>> {
  if (environment.NODE_ENV !== "development") return environment;
  return Object.fromEntries(
    Object.entries({ ...LOCAL_MEDIA_DEFAULTS, ...environment }).map(([key, value]) => [
      key,
      typeof value === "string" && value.trim() === ""
        ? LOCAL_MEDIA_DEFAULTS[key as keyof typeof LOCAL_MEDIA_DEFAULTS] ?? value
        : value,
    ]),
  );
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
