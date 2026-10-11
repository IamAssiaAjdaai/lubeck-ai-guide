/**
 * Real CITYWALK local /api/guide smoke + optional human review capture.
 * Explicit opt-in; never invoked by CI or app runtime.
 *
 * Examples:
 * CITYWALK_RUN_LIVE_AI_EVAL=YES CITYWALK_EVAL_MAX_CALLS=2 \
 *   node scripts/evaluate-citywalk-guide-api.mjs
 *
 * To save synthetic fixture answers for a HUMAN to review:
 * CITYWALK_RUN_LIVE_AI_EVAL=YES CITYWALK_EVAL_MAX_CALLS=2 \
 * CITYWALK_EVAL_CAPTURE_ANSWERS=YES node scripts/evaluate-citywalk-guide-api.mjs
 *
 * Only localhost HTTP targets are accepted. Each /api/guide request may
 * make up to two billable provider calls. Never logs answer or prompt text.
 * Captured test answers live in a private OS temp dir; delete after reviewing.
 */
import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { guideEvaluationFixtures, scoreGuideManualReviews } from "./evaluation/score-citywalk-guide.mjs";

if (process.env.CITYWALK_RUN_LIVE_AI_EVAL !== "YES") {
  console.log("Local guide API evaluation disabled (opt-in required).");
  process.exit(0);
}
const maxCalls = Number(process.env.CITYWALK_EVAL_MAX_CALLS);
if (!Number.isSafeInteger(maxCalls) || maxCalls < 1 || maxCalls > guideEvaluationFixtures.length) {
  throw new Error("CITYWALK_EVAL_MAX_CALLS must be 1.." + guideEvaluationFixtures.length);
}
const capture = process.env.CITYWALK_EVAL_CAPTURE_ANSWERS === "YES";
const target = new URL(process.env.CITYWALK_EVAL_BASE_URL || "http://127.0.0.1:3000");
if (
  target.protocol !== "http:" ||
  !["127.0.0.1", "localhost", "[::1]"].includes(target.hostname) ||
  target.username || target.password || target.pathname !== "/" ||
  target.search || target.hash
) {
  throw new Error("Only a plain HTTP localhost origin is permitted for evaluation.");
}

const rows = [];
const reviewRows = [];
for (const fixture of guideEvaluationFixtures.slice(0, maxCalls)) {
  const start = performance.now();
  let status = 0;
  let code = "unknown";
  let sourcesCount = 0;
  let answer = "";
  let sources = [];
  try {
    const response = await fetch(new URL("/api/guide", target), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        citySlug: "lubeck", placeSlug: "holstentor",
        locale: fixture.locale, question: fixture.question,
        visitorId: randomUUID(),
      }),
      signal: AbortSignal.timeout(20000),
      redirect: "error",
    });
    status = response.status;
    const body = await response.json();
    code = typeof body.code === "string" ? body.code : status === 200 ? "ok" : "http_error";
    answer = typeof body.answer === "string" ? body.answer : "";
    sources = Array.isArray(body.sources) ? body.sources : [];
    sourcesCount = sources.length;
  } catch {
    code = "network_or_parse_error";
  }

  rows.push({
    id: fixture.id, expected: fixture.expected, status, code,
    hasSources: sourcesCount > 0, sourcesCount,
    contains1900ForManualReview: /\b1900\b/.test(answer),
    latencyMs: Math.round(performance.now() - start),
    humanSemanticReview: "pending",
  });
  reviewRows.push({
    id: fixture.id, status, humanVerdict: "unreviewed",
    question: fixture.question, expected: fixture.expected,
    // Synthetic questions only: this is intentionally restricted to local review.
    answer, sources,
  });
}

let localReviewPath = null;
if (capture) {
  const dir = await mkdtemp(join(tmpdir(), "citywalk-guide-eval-"));
  localReviewPath = join(dir, "manual-review.json");
  await writeFile(localReviewPath, JSON.stringify({ rows: reviewRows }, null, 2), {
    mode: 0o600, flag: "wx",
  });
}
const successfulRequests = rows.filter((r) => r.status === 200).length;
console.log(JSON.stringify({
  kind: "citywalk_real_guide_api_eval",
  total: rows.length, successfulRequests,
  rows,
  humanScoring: scoreGuideManualReviews(rows.map((r) => ({
    id: r.id, humanVerdict: "unreviewed",
  }))),
  localReviewPath,
  reviewCommand: localReviewPath
    ? "After manually labeling humanVerdict: node scripts/evaluation/score-citywalk-guide.mjs <localReviewPath>"
    : "To enable private manual answer review, set CITYWALK_EVAL_CAPTURE_ANSWERS=YES.",
  limitations: [
    "200 OK and source counts are NOT factual accuracy scores.",
    "Only explicit human labels produce factual and false-refusal metrics.",
    "Only synthetic fixtures; this cannot estimate live-user quality.",
    "No provider token or currency data exposed by the app endpoint.",
    "Each local request may produce up to two billable provider attempts.",
    "Delete temporary review material after use; never commit it.",
  ],
}, null, 2));
if (successfulRequests !== rows.length) process.exitCode = 1;
