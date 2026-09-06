import { loadDatabaseEnvironment } from "@/db/loadEnvironment";

loadDatabaseEnvironment();

async function main() {
  const [
    { closeDb },
    {
      createSuperAdmin,
      readSuperAdminBootstrapInput,
      SuperAdminBootstrapError,
    },
  ] = await Promise.all([
    import("@/db/client"),
    import("@/lib/admin/bootstrap.server"),
  ]);

  try {
    const result = await createSuperAdmin(
      readSuperAdminBootstrapInput(),
    );
    console.log(
      result.status === "created"
        ? "Created active global CITYWALK super admin."
        : "The active global CITYWALK super admin is already configured.",
    );
  } catch (error) {
    console.error(
      error instanceof SuperAdminBootstrapError
        ? error.message
        : "Super-admin bootstrap failed. Check the server environment, migration, and database availability.",
    );
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}

void main();
