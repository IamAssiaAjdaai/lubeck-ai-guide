// Verify the founder-approved Desktop + Mobile prototype before using it as a
// visual implementation reference. No network or external packages required.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("docs/design/marketing-saas/v1");
const expected = new Map([
  ["phase1_onboarding_v1.html", "4c38ecf1835fa0aa0f8ba1333e439d74e2d5120b8427c1b3907365c91ae16488"],
  ["desktop_onboarding.png", "2d38ebb42527393fd865d8d42b765df191e063dc30096625afcc5883efcfe7e7"],
  ["desktop_confirmation.png", "bcb35faa7d4aeeb404a1c15bc40dab45e384ddc80493427326b69de739b9bfb9"],
  ["mobile_onboarding.png", "af620dca1e903b0fc592846ff4acf48c6f89a1a41dccdf99ac735a1495e7f5e9"],
  ["mobile_details.png", "c931dc66b61a371a657971d599e7534a51edb1521380dab57adcf522a88fc4ff"],
  ["mobile_confirmation.png", "2deb29b724fdbfabf4ad9909cc126cdc4fe0e9c9e6cf466ff405683e411ca78b"],
]);

let failed = false;
for (const [fileName, sha256] of expected) {
  try {
    const bytes = await readFile(path.join(root, fileName));
    const actual = createHash("sha256").update(bytes).digest("hex");
    if (actual !== sha256) {
      console.error(`MISMATCH: ${fileName} expected ${sha256} got ${actual}`);
      failed = true;
    } else {
      console.log(`OK ${fileName}`);
    }
  } catch (error) {
    console.error(`MISSING: ${fileName}: ${error instanceof Error ? error.code ?? error.message : String(error)}`);
    failed = true;
  }
}
if (failed) {
  console.error("DESIGN_ARCHIVE_FAIL — do not implement against unverified/replaced visual files");
  process.exitCode = 1;
} else {
  console.log(`DESIGN_ARCHIVE_PASS — verified ${expected.size} founder-approved source files`);
}
