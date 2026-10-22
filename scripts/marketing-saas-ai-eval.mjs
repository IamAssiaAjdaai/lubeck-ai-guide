// TSX is preloaded by npm's pinned command. Guard before loading any provider/evaluation code.
import { installOfflineGuard } from "./marketing-saas-offline/guard.mjs";
if (
  process.argv
    .slice(2)
    .some((arg) => !["--check", "--guard-probe", "--require-go"].includes(arg))
)
  throw new Error("OFFLINE_ARGUMENT_NOT_SUPPORTED");
const { transformSync } = await import("esbuild");
transformSync("const offlineCompilerWarmup: boolean = true", { loader: "ts" });
const state = installOfflineGuard();
process.env.MARKETING_AI_ENABLED = "false";
if (process.argv.includes("--guard-probe")) {
  const { default: net } = await import("node:net");
  const { default: http } = await import("node:http");
  const { default: tls } = await import("node:tls");
  const { default: dns } = await import("node:dns");
  const { default: child } = await import("node:child_process");
  const probes = [
    () => fetch("https://api.openai.com/v1/responses"),
    () => http.get("http://127.0.0.1:1"),
    () => net.connect({ host: "example.com", port: 443 }),
    () => tls.connect(443, "api.openai.com"),
    () => dns.lookup("api.openai.com"),
    () => child.spawn("curl", ["https://api.openai.com"]),
  ];
  for (const probe of probes) {
    let denied = false;
    try {
      await probe();
    } catch (e) {
      denied = e.message === "OFFLINE_NETWORK_OR_PROCESS_BLOCKED";
    }
    if (!denied) throw new Error("OFFLINE_GUARD_PROBE_FAILED");
  }
  console.log(
    JSON.stringify({
      guard: state.mode,
      blocked: state.blocked,
      probe: "PASS",
    }),
  );
} else {
  const { runEvaluation } =
    await import("../apps/marketing-saas-api/qa/evaluate.ts");
  await runEvaluation({ check: process.argv.includes("--check") });
}
