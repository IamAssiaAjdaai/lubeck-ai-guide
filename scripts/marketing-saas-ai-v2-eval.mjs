import { installOfflineGuard } from "./marketing-saas-offline/guard.mjs";
if (
  process.argv
    .slice(2)
    .some((arg) => !["--check", "--require-go"].includes(arg))
)
  throw new Error("OFFLINE_ARGUMENT_NOT_SUPPORTED");
const { transformSync } = await import("esbuild");
transformSync("const offlineCompilerWarmup: boolean = true", { loader: "ts" });
installOfflineGuard();
process.env.MARKETING_AI_ENABLED = "false";
const { run } = await import("../apps/marketing-saas-api/qa-v2/evaluate.ts");
await run(process.argv.includes("--check"));
if (process.argv.includes("--require-go")) process.exitCode = 2;
