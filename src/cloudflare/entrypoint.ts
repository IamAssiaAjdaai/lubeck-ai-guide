import { Client } from "pg";
import handler from "vinext/server/fetch-handler";

import {
  createRequestDatabase,
  runWithRequestDatabase,
} from "@/db/client";
import { emitOperationalFailure } from "@/lib/operations/operationalEvent";
import { runScheduledAccountErasures } from "./accountErasureSchedule";
import {
  isAccountErasureScheduleConfigured,
  type AccountErasureScheduleEnvironment,
} from "./accountErasureScheduleConfig";

type VinextFetch = typeof handler.fetch;
type VinextEnvironment = Parameters<VinextFetch>[1];
type VinextContext = Parameters<VinextFetch>[2];

type CitywalkWorkerEnvironment = VinextEnvironment &
  AccountErasureScheduleEnvironment & {
    HYPERDRIVE: {
      connectionString: string;
    };
  };

type ScheduledControllerLike = Readonly<{
  cron: string;
  scheduledTime: number;
}>;

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
      emitOperationalFailure(
        {
          category: "database",
          code: "DATABASE_CONNECT_FAILED",
          severity: "critical",
          retryable: true,
          httpStatus: 503,
        },
        { environment: env as unknown as Readonly<Record<string, unknown>> },
      );
      return new Response("Service temporarily unavailable.", { status: 503 });
    }

    // Hyperdrive owns the durable origin connection pool. Cloudflare cleans up
    // this request-scoped edge client automatically when the invocation ends.
    return runWithRequestDatabase(createRequestDatabase(client), () =>
      handler.fetch(request, env, ctx),
    );
  },

  async scheduled(
    controller: ScheduledControllerLike,
    env: CitywalkWorkerEnvironment,
    ctx: VinextContext,
  ): Promise<void> {
    void controller;
    void ctx;

    // Code-only foundation: cloudflare.config.ts intentionally has no scheduled
    // trigger. This handler remains dormant until a production cron is approved.
    if (!isAccountErasureScheduleConfigured(env)) {
      console.warn("CITYWALK_ACCOUNT_ERASURE_SCHEDULE_SKIPPED_NOT_CONFIGURED");
      return;
    }

    const client = new Client({
      connectionString: env.HYPERDRIVE.connectionString,
    });

    try {
      await client.connect();
      const result = await runWithRequestDatabase(
        createRequestDatabase(client),
        () => runScheduledAccountErasures(env),
      );

      if (result.status === "skipped_not_configured") {
        console.warn("CITYWALK_ACCOUNT_ERASURE_SCHEDULE_SKIPPED_NOT_CONFIGURED");
        return;
      }

      console.log(
        `CITYWALK_ACCOUNT_ERASURE_SCHEDULE_PROCESSED claimed=${result.claimed} completed=${result.completed} failed=${result.failed} lostLeases=${result.lostLeases}`,
      );
    } catch {
      emitOperationalFailure(
        {
          category: "account_lifecycle",
          code: "ACCOUNT_ERASURE_SCHEDULE_FAILED",
          severity: "critical",
          retryable: true,
        },
        { environment: env as unknown as Readonly<Record<string, unknown>> },
      );
      throw new Error("CITYWALK_ACCOUNT_ERASURE_SCHEDULE_FAILED");
    } finally {
      await client.end().catch(() => undefined);
    }
  },
};
