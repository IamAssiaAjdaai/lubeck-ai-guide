import { loadDatabaseEnvironment } from "@/db/loadEnvironment";

loadDatabaseEnvironment();

type Mode = "inventory" | "probe-source" | "connectivity" | "copy";

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  const [
    { closeDb },
    { S3MediaObjectStore },
    {
      assertDistinctStorageMigrationEnvironments,
      getStorageMigrationDestinationEnvironment,
      getStorageMigrationSourceEnvironment,
      getStoredMediaInventory,
    },
    {
      getStorageErrorCategory,
      isStorageCapExceeded,
      migrateStoredMediaObjects,
      verifyObjectStoreConnectivity,
    },
  ] = await Promise.all([
    import("@/db/client"),
    import("@/lib/media/storage/s3ObjectStore.server"),
    import("@/lib/media/storageMigration.server"),
    import("@/lib/media/storageMigration"),
  ]);

  try {
    const inventory = await getStoredMediaInventory();
    if (mode === "inventory") {
      console.log(`Stored media inventory: ${inventory.length} objects`);
      for (const item of inventory) {
        console.log(
          `asset=${item.assetId} city=${item.citySlug} type=${item.mimeType} size=${item.expectedSizeBytes ?? "unknown"} status=${item.lifecycleStatus} attachments=${item.attachmentCount}`,
        );
      }
      return;
    }

    if (mode === "probe-source") {
      const first = inventory[0];
      if (!first) {
        console.log("Source probe skipped: inventory is empty");
        return;
      }
      const source = new S3MediaObjectStore(
        getStorageMigrationSourceEnvironment(),
      );
      try {
        await source.readObjectRange(first.objectKey, 0, 0);
        console.log(`Source probe succeeded for asset ${first.assetId}`);
      } catch (error) {
        console.error(
          isStorageCapExceeded(error)
            ? `Source probe blocked by storage cap; ${inventory.length} objects remain blocked`
            : `Source probe failed (${getStorageErrorCategory(error)})`,
        );
        process.exitCode = 1;
      }
      return;
    }

    const destinationEnvironment =
      getStorageMigrationDestinationEnvironment();
    const destination = new S3MediaObjectStore(destinationEnvironment);
    if (mode === "connectivity") {
      await verifyObjectStoreConnectivity(destination);
      console.log(
        "Destination connectivity: put/head/get/range/delete/presigned-upload passed",
      );
      return;
    }

    const sourceEnvironment = getStorageMigrationSourceEnvironment();
    assertDistinctStorageMigrationEnvironments(
      sourceEnvironment,
      destinationEnvironment,
    );
    const source = new S3MediaObjectStore(sourceEnvironment);
    const result = await migrateStoredMediaObjects({
      inventory,
      source,
      destination,
    });
    console.log(
      `Storage migration: expected=${result.totalExpected} copied=${result.copied} verified=${result.verified} skipped=${result.skipped} failed=${result.failed}`,
    );
    if (result.blockedAssetIds.length > 0) {
      console.error(
        `Source storage cap blocked asset IDs: ${result.blockedAssetIds.join(",")}`,
      );
    }
    if (result.failed > 0 || result.verified !== result.totalExpected) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("Storage migration command could not be completed.");
    if (process.env.NODE_ENV !== "production") {
      console.error(error instanceof Error ? error.name : "unknown_error");
    }
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}

function parseMode(args: readonly string[]): Mode {
  const modes = args.filter((arg): arg is `--${Mode}` =>
    ["--inventory", "--probe-source", "--connectivity", "--copy"].includes(
      arg,
    ),
  );
  if (modes.length !== 1 || args.length !== 1) {
    throw new Error(
      "Choose exactly one mode: --inventory, --probe-source, --connectivity, or --copy.",
    );
  }
  return modes[0].slice(2) as Mode;
}

void main();
