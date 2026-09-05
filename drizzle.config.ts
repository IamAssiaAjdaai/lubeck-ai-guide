import { defineConfig } from "drizzle-kit";

import { loadDatabaseEnvironment } from "./src/db/loadEnvironment";

loadDatabaseEnvironment();

const databaseUrl = process.env.DATABASE_URL;
const requiresDatabaseConnection = process.argv.includes("migrate");

if (requiresDatabaseConnection && !databaseUrl) {
  throw new Error(
    "DATABASE_URL is required to run Drizzle database migrations.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/db/schema.ts", "./src/db/authSchema.ts"],
  out: "./drizzle",
  ...(databaseUrl
    ? {
        dbCredentials: {
          url: databaseUrl,
        },
      }
    : {}),
});
