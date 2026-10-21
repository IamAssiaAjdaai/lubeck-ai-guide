import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const mode = process.argv[2];
if (!["demo", "migrate", "verify"].includes(mode))
  throw new Error(
    "Use demo or migrate; real provider mode requires explicit operator configuration.",
  );
const env = {
  ...process.env,
  MARKETING_DATABASE_URL:
    process.env.MARKETING_DATABASE_URL ??
    "postgresql://marketing_qa:local_marketing_qa_only@127.0.0.1:55498/marketing_mvp_local",
  MARKETING_AUTH_SECRET:
    process.env.MARKETING_AUTH_SECRET ?? randomBytes(48).toString("hex"),
  MARKETING_ORIGIN: "http://127.0.0.1:3108",
  MARKETING_MAIL_DIRECTORY: root + ".qa-mail",
  MARKETING_DEMO_MODE: "true",
  MARKETING_AI_ENABLED: "false",
};
const children = [];
function run(args) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    env,
    stdio: "inherit",
  });
  children.push(child);
  return child;
}
if (mode === "migrate" || mode === "verify")
  run([
    "--conditions=react-server",
    "--import",
    "tsx",
    `apps/marketing-saas-api/src/${mode}.ts`,
  ]).on("exit", (code) => {
    process.exitCode = code ?? 1;
  });
else {
  run([
    "--conditions=react-server",
    "--import",
    "tsx",
    "apps/marketing-saas-api/src/server.ts",
  ]);
  run([
    "node_modules/vite/bin/vite.js",
    "--config",
    "apps/marketing-saas/vite.config.ts",
  ]);
  for (const child of children)
    child.on("exit", (code) => {
      for (const sibling of children)
        if (sibling !== child) sibling.kill("SIGTERM");
      process.exitCode = code ?? 1;
    });
}
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    for (const child of children) child.kill("SIGTERM");
  });
