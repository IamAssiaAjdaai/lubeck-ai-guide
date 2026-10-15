import { readFile } from "node:fs/promises";
import baseline from "../docs/deployment/cloudflare-production-binding-baseline.json" with { type: "json" };
import { checkActiveVersion, checkBindingContract } from "./lib/cloudflare-binding-contract.mjs";

const config = JSON.parse(await readFile(".cloudflare/output/v0/workers/default/worker.config.json", "utf8"));
const result = checkBindingContract(config, baseline);
if (process.argv.length > 2) {
  if (process.argv[2] !== "--active-version-file" || !process.argv[3] || process.argv.length !== 4) throw new Error("Usage: check-cloudflare-bindings.mjs [--active-version-file <private-metadata-file>]");
  const version = JSON.parse(await readFile(process.argv[3], "utf8"));
  checkActiveVersion(version, baseline);
  console.log("Authenticated active-version metadata matches the reviewed baseline. Traffic must be checked separately.");
}
console.log(`Cloudflare bindings verified: ${result.preserved.length} preserved, ${result.added.length} reviewed additions; secret values not inspected.`);
