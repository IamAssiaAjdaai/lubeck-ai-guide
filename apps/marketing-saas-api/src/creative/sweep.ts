import { Pool } from "pg";
import { configuration } from "../config";
import { PrivateMedia } from "./storage";
import { reconcileLocal } from "./reconcile";
const config = configuration();
if (!config.creative || !config.demo) throw new Error("CREATIVE_QA_REQUIRED");
const pool = new Pool({ connectionString: config.databaseUrl });
try {
  const result = await reconcileLocal(
    pool,
    new PrivateMedia(config.mediaDirectory),
  );
  console.log("CREATIVE_QA_RECONCILIATION_OK " + JSON.stringify(result));
} finally {
  await pool.end();
}
