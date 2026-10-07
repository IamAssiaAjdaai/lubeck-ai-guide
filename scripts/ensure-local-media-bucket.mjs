import { pathToFileURL } from "node:url";

import {
  CreateBucketCommand,
  PutBucketCorsCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const endpoint = "http://localhost:4566";
const region = "us-east-1";
const bucket = "citywalk-local";
const credentials = {
  accessKeyId: "test",
  secretAccessKey: "test",
};

export async function ensureLocalMediaBucket(
  client = new S3Client({
    endpoint,
    region,
    credentials,
    forcePathStyle: true,
  }),
) {
  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  } catch (error) {
    if (!isBucketAlreadyPresent(error)) throw error;
  }

  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "HEAD", "PUT"],
            AllowedOrigins: [
              "http://localhost:3000",
              "http://127.0.0.1:3000",
            ],
            ExposeHeaders: ["ETag"],
          },
        ],
      },
    }),
  );
}

function isBucketAlreadyPresent(error) {
  if (!error || typeof error !== "object") return false;
  return ["BucketAlreadyOwnedByYou", "BucketAlreadyExists"].includes(error.name);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await ensureLocalMediaBucket();
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : "Local media bucket setup failed unexpectedly.",
    );
    process.exitCode = 1;
  }
}
