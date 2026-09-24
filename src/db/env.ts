export function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not configured. A PostgreSQL connection is required for database operations.",
    );
  }

  return databaseUrl;
}