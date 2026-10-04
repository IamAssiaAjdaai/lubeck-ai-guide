import { Client } from "pg";
import handler from "vinext/server/fetch-handler";

import {
  createRequestDatabase,
  runWithRequestDatabase,
} from "@/db/client";

type VinextFetch = typeof handler.fetch;
type VinextEnvironment = Parameters<VinextFetch>[1];
type VinextContext = Parameters<VinextFetch>[2];

type CitywalkWorkerEnvironment = VinextEnvironment & {
  HYPERDRIVE: {
    connectionString: string;
  };
};

export default {
  async fetch(
    request: Request,
    env: CitywalkWorkerEnvironment,
    ctx: VinextContext,
  ): Promise<Response> {
    const client = new Client({
      connectionString: env.HYPERDRIVE.connectionString,
    });

    try {
      await client.connect();
    } catch {
      console.error("CITYWALK_DB_CONNECT_FAILED");
      return new Response("Service temporarily unavailable.", { status: 503 });
    }

    // Hyperdrive owns the durable origin connection pool. Cloudflare cleans up
    // this request-scoped edge client automatically when the invocation ends.
    return runWithRequestDatabase(createRequestDatabase(client), () =>
      handler.fetch(request, env, ctx),
    );
  },
};
