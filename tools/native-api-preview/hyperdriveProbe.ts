// Isolated diagnostic module. NOT deployed. No route or trigger invokes this probe.
// A later operator-only invocation needs separate authorization and reviewed isolation.
import { Client } from "pg";

export type ProbeBinding = { HYPERDRIVE: { connectionString: string } };

export async function probePreviewHyperdrive(
  env: ProbeBinding,
  ClientType: typeof Client = Client,
): Promise<"pass" | "fail"> {
  const connectionString = env?.HYPERDRIVE?.connectionString;
  if (!connectionString || typeof connectionString !== "string") return "fail";
  const client = new ClientType({
    connectionString,
    connectionTimeoutMillis: 4000,
    query_timeout: 4000,
    statement_timeout: 4000,
  });
  try {
    await client.connect();
    const result = await client.query("SELECT 1 AS probe");
    return result.rows?.length === 1 && result.rows[0]?.probe === 1 ? "pass" : "fail";
  } catch {
    return "fail";
  } finally {
    await client.end().catch(() => undefined);
  }
}

// Fail-closed HTTP behavior even if someone mistakenly deploys the module.
// Do not expose probe execution through fetch, scheduled or queue handlers.
export default {
  fetch(): Response {
    return new Response("Preview diagnostic disabled.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    });
  },
};
