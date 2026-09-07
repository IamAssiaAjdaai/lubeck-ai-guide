import {
  ensureLocalInfrastructure,
  LocalInfrastructureError,
} from "./local-development-infrastructure.mjs";

try {
  await ensureLocalInfrastructure();
} catch (error) {
  const message = error instanceof LocalInfrastructureError
    ? error.message
    : "Local infrastructure setup failed unexpectedly.";
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}
