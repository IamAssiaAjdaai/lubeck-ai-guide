import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { getLegalOperator } from "../src/lib/legal";

// Optional owner-managed env file. Never print identity values or serialize it.
const file = process.argv[2];
const operator = getLegalOperator(file ? parse(readFileSync(file)) : process.env);
if (!operator.isConfigured) {
  console.error(`Legal launch blocked. Missing or incomplete: ${operator.missingRequiredFields.join(", ")}.`);
  process.exitCode = 1;
} else {
  console.log("Legal configuration is structurally complete. Owner/legal review of identity, address and disclosures is still required.");
}
