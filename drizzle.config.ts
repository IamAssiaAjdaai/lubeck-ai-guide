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
  schema: [
    "./src/db/schema.ts",
    "./src/db/authSchema.ts",
    "./src/db/travelerSchema.ts",
    "./src/db/commerceSchema.ts",
    "./src/db/rateLimitSchema.ts",
    "./src/db/marketingSchema.ts",
    "./src/db/marketingGenerationSchema.ts",
    "./src/db/brandContextSchema.ts",
    "./src/db/citywalkBrandContextSchema.ts",
  ],
  out: "./drizzle",
  ...(databaseUrl
    ? {
        dbCredentials: {
          url: databaseUrl,
        },
      }
    : {}),
});
