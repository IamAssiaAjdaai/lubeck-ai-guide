import { probePreviewHyperdrive, type ProbeBinding } from "./hyperdriveProbe";

export default {
  fetch(): Response {
    return new Response("Diagnostic disabled", { status: 503 });
  },

  async scheduled(
    _controller: ScheduledController,
    env: ProbeBinding,
  ): Promise<void> {
    const result = await probePreviewHyperdrive(env);
    console.log(
      result === "pass"
        ? "CITYWALK_PREVIEW_DB_TLS_CHECK_PASS"
        : "CITYWALK_PREVIEW_DB_TLS_CHECK_FAIL"
    );
  },
};
