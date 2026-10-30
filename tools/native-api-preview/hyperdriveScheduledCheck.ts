import { probePreviewHyperdrive } from "./hyperdriveProbe";

type Env = {
  CITYWALK_DB_PROBE_ENABLED?: string;
  HYPERDRIVE: {
    connectionString: string;
  };
};

export default {
  // HTTP requests must never execute a database query.
  fetch(): Response {
    return new Response("Diagnostic disabled.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  },

  // Only an explicitly invoked scheduled test may run the query.
  async scheduled(
    _controller: unknown,
    env: Env,
    _ctx: unknown,
  ): Promise<void> {
    if (env.CITYWALK_DB_PROBE_ENABLED !== "1") {
      console.log("CITYWALK_PREVIEW_DB_CHECK_LOCKED");
      return;
    }

    const result = await probePreviewHyperdrive(env);

    console.log(
      result === "pass"
        ? "CITYWALK_PREVIEW_DB_CHECK_PASS"
        : "CITYWALK_PREVIEW_DB_CHECK_FAIL",
    );
  },
};
