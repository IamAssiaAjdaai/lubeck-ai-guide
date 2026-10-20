import { defineConfig } from "vitest/config";
import base from "./vitest.config";

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    // These files share one disposable outbox; the worker's fixture cleanup must
    // not race with account deletion fixtures created by another file.
    fileParallelism: false,
    include: [
      "src/lib/auth/lifecycle/lifecycle.integration.test.ts",
      "src/lib/auth/lifecycle/externalAccountErasureWorker.integration.test.ts",
      "src/lib/auth/lifecycle/webDeletionRequest.integration.test.ts",
      "src/lib/account/dataExport.integration.test.ts",
    ],
  },
});
