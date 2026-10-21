import { z } from "zod";
export function configuration(env = process.env) {
  const databaseUrl = env.MARKETING_DATABASE_URL;
  if (!databaseUrl) throw new Error("MARKETING_DATABASE_URL_REQUIRED");
  const url = new URL(databaseUrl);
  // This deliverable is deliberately local-only. Release configuration is a separate gate.
  if (url.hostname !== "127.0.0.1" || !/^marketing_[a-z0-9_]+$/.test(url.pathname.slice(1)) || url.port === "5432") throw new Error("ISOLATED_LOCAL_MARKETING_DB_REQUIRED");
  const origin = env.MARKETING_ORIGIN ?? "http://127.0.0.1:3108";
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) throw new Error("LOCAL_ORIGIN_REQUIRED");
  const secret = z.string().min(32).parse(env.MARKETING_AUTH_SECRET);
  return { databaseUrl, origin, secret, demo: env.MARKETING_DEMO_MODE === "true", mailDirectory: env.MARKETING_MAIL_DIRECTORY ?? ".qa-mail", port: Number(env.MARKETING_API_PORT ?? 3109) };
}
