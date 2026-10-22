import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import {
  actions,
  hooks,
  callsToAction,
  assemblePack,
  packMarkdown,
  type PackSelection,
} from "../src/pack.contract";
import { scenarioInput } from "../qa/scenarios";
import { assemble, render, hash } from "./engine";
import { fixtureCases, sourceFor, authoredDraft } from "./fixtures";
import { attacks, executeAttack } from "./adversarial";
export const baseCommit = "7e67061362762020f97d707898927a82c21b2994";
export function comparison() {
  return fixtureCases.map((s) => {
    const input = scenarioInput(s);
    const selection: PackSelection = {
      schemaVersion: 1,
      days: actions.map((action, i) => ({
        day: i + 1,
        channel: s.channel,
        action,
        time: "09:00",
        factIds: [input.facts[i % input.facts.length].id],
      })),
      posts: [0, 1, 2].map((i) => ({
        channel: s.channel,
        hook: hooks[i],
        factIds: [input.facts[i % input.facts.length].id],
      })),
      hooks: [hooks[0], hooks[1], hooks[2]],
      cta: callsToAction[0],
    };
    const v1 = assemblePack(selection, input),
      v2 = assemble(authoredDraft(s), sourceFor(s));
    const annotations = new Map(s.facts.map((f) => [f.id, f.angle]));
    const v1angles = new Set(
      v1.posts.map((p) =>
        p.factIds
          .map((id) => annotations.get(id))
          .sort()
          .join("|"),
      ),
    ).size;
    const v2angles = new Set(
      v2.draft.posts.map((p) =>
        p.segments
          .flatMap((segment) =>
            segment.kind === "claim"
              ? v2.draft.claims
                  .find((c) => c.id === segment.claimId)!
                  .factIds.map((id) => annotations.get(id))
              : [],
          )
          .sort()
          .join("|"),
      ),
    ).size;
    return {
      id: s.id,
      business: s.businessName,
      goal: s.goal,
      channel: s.channel,
      risk: s.risk,
      approvedFacts: input.facts.length,
      v1: {
        pack: v1,
        distinctFactAngleProxy: v1angles,
        originalEditorialWords: 0,
        distinctTasks: new Set(v1.days.map((d) => d.task)).size,
      },
      v2: {
        proposal: v2,
        posts: v2.draft.posts.length,
        distinctFactAngleProxy: v2angles,
        authoredEditorialWords: v2.draft.posts.flatMap((p) =>
          p.segments.flatMap((seg) =>
            seg.kind === "editorial" ? seg.text.split(/\s+/u) : [],
          ),
        ).length,
        distinctTasks: new Set(v2.draft.days.map((d) => d.task)).size,
        knownUnsupportedClaimsInAuthoredGold: 0,
        specificityFactRefs: v2.draft.posts.length,
        actionabilityHumanScore: null,
        germanHumanScore: null,
        humanScores: null,
      },
    };
  });
}
export function artifacts() {
  const rows = comparison(),
    negatives = attacks.map(executeAttack);
  if (
    negatives.some((n) => n.observed !== n.expected) ||
    rows.some((r) => r.v2.proposal.state === "blocked")
  )
    throw new Error("V2_EVALUATION_REGRESSION");
  const lexicalUnsafe = negatives.filter(
    (n) =>
      n.truth === "unsafe" &&
      n.observed !== "reject" &&
      ![
        "repeated-angle-label",
        "same-facts-new-angle-label",
        "repeated-actions",
      ].includes(n.id),
  );
  const misses = lexicalUnsafe.filter((n) => !n.lexicalDetected);
  const benign = negatives.filter((n) => n.truth === "benign");
  const sourceHashes = Object.fromEntries(
    [
      "apps/marketing-saas-api/qa-v2/engine.ts",
      "apps/marketing-saas-api/qa-v2/fixtures.ts",
      "apps/marketing-saas-api/qa-v2/adversarial.ts",
      "apps/marketing-saas-api/qa-v2/evaluate.ts",
      "apps/marketing-saas-api/qa/scenarios.ts",
      "apps/marketing-saas-api/src/pack.contract.ts",
      "scripts/marketing-saas-ai-v2-eval.mjs",
      "scripts/marketing-saas-offline/guard.mjs",
    ].map((path) => [path, hash(readFileSync(path, "utf8"))]),
  );
  const summary = {
    baseCommit,
    sourceHashes,
    sourceHashAlgorithm: "SHA-256 of canonical JSON string",
    origin: "HUMAN_AUTHORED_OFFLINE_MOCK_NOT_MODEL_OUTPUT",
    requests: 0,
    actualSpendEur: 0,
    scenarios: 10,
    v2Posts: rows.reduce((a, r) => a + r.v2.posts, 0),
    humanScoresCompleted: 0,
    commercial: "NO-GO",
    feasibility: "GO for further offline research only",
    semanticSafety: "NOT PROVEN",
    lexicalAdversarialUnsafe: lexicalUnsafe.length,
    lexicalFalseNegatives: misses.map((n) => n.id),
    falsePositivePolicyBlocks: benign
      .filter((n) => n.observed === "blocked")
      .map((n) => n.id),
    benignReviewBurden: benign.length,
    unsafeAutoApproved: 0,
    pendingReviews: rows.reduce((n, r) => n + r.v2.proposal.flags.length, 0),
    goldLimit:
      "Known unsupported=0 is authored fixture annotation, not independently verified semantic accuracy.",
    v1TaskWordings: new Set(
      rows.flatMap((r) => r.v1.pack.days.map((d) => d.task)),
    ).size,
    v2TaskWordings: new Set(
      rows.flatMap((r) => r.v2.proposal.draft.days.map((d) => d.task)),
    ).size,
  };
  const files: Record<string, string> = {};
  files["results.json"] = JSON.stringify({ summary, rows }, null, 2) + "\n";
  files["adversarial.json"] = JSON.stringify(negatives, null, 2) + "\n";
  files["human-scorecard.csv"] =
    "case,mode,sample_hash,natural_german_1_5,specificity_1_5,goal_fit_1_5,angle_variety_1_5,actionability_1_5,claim_accuracy_1_5,notes\n" +
    rows
      .flatMap((r) =>
        ["v1", "v2"].map(
          (mode) =>
            `${r.id},${mode},${hash(mode === "v1" ? r.v1.pack : r.v2.proposal.draft)},,,,,,,`,
        ),
      )
      .join("\n") +
    "\n";
  for (const row of rows) {
    // Evaluation-only label correction: shared production packMarkdown is unchanged.
    files[`samples/${row.id}-v1.md`] =
      packMarkdown(
        row.v1.pack,
        "offline-mock",
        "authored-selector-v1",
        1,
      ).replace(
        "KI-gestützter Entwurf. Keine Veröffentlichung erfolgt.",
        "OFFLINE / SYNTHETISCH — verfasste Mock-Auswahl, keine KI-Generierung. Keine Veröffentlichung erfolgt.",
      ) + "\n";
    files[`samples/${row.id}-v2.md`] = render(row.v2.proposal) + "\n";
  }
  files["REPORT.md"] =
    [
      "# #418 — Offline v1/v2 feasibility report",
      `Base: ${baseCommit}. Authored synthetic candidates; zero AI calls, zero spend. **NO-GO external paid pilot.**`,
      "| Case | Facts | v1 angles/posts | v2 angles/posts | v2 state / flags | Missing-info fallback |",
      "| --- | --- | --- | --- | --- | --- |",
      ...rows.map(
        (r) =>
          `| ${r.id} | ${r.approvedFacts} | ${r.v1.distinctFactAngleProxy}/3 | ${r.v2.distinctFactAngleProxy}/${r.v2.posts} | ${r.v2.proposal.state} / ${r.v2.proposal.flags.length} | ${r.v2.proposal.draft.missingInformation.length ? "yes" : "not required"} |`,
      ),
      `\nSeven-day task wording: v1 ${summary.v1TaskWordings}/70 distinct, v2 ${summary.v2TaskWordings}/70. V2 wording is deliberately authored business/goal-specific, not measured model capability. Fact-angle proxies use the SAME #417 annotations and do not grade semantics. CTA goal variants are authored; channel formatting and naturalness remain unscored.`,
      `\nKnown unsupported/prohibited claims in curated gold: 0 (author annotation, not independent scoring). Every candidate has unresolved human review. Pending items: ${summary.pendingReviews}; human grades: 0/20. Unsupported location, new name, service, implied benefit, implicit promise can evade lexical checks; all remain needs_review. Exact negation conflicts are blocked by a narrow lexical rule; broader contradictions remain unproven.`,
      `\nAdversarial lexical false negatives (${misses.length}/${lexicalUnsafe.length} targeted unsafe nonstructural cases): ${misses.map((n) => n.id).join(", ")}. These are NOT called safe; review catches them procedurally, not semantically. Unsafe auto-approved/exported: 0. Policy false positives: ${summary.falsePositivePolicyBlocks.length}/${benign.length} benign sentinels (${summary.falsePositivePolicyBlocks.join(", ")}). All ${benign.length} benign sentinels require review: intentional review burden, not high precision. Purposive tiny corpus, no population accuracy estimate.`,
      "\nSource quote hashes prove snapshot membership, not truth. Contradictions, entities, hidden implications, understated promises, German nuance and regulated context require humans. Regulated candidates require a specialist; hard policy flags cannot be waived. Different angle labels alone cannot pass repeated fact-reference checks, but this still does not prove genuinely different commercial angles.",
      "\nThe one-fact garden case produces one post. Two-fact cases produce two. Five businesses with at least three facts produce three separate supported fact angles. Missing facts are owner questions, never unapproved promises. Original editorial support is demonstrated by authored prose; genuine model quality is unmeasured.",
      "\nGO: isolated offline feasibility / further authored and human tests. NO-GO: replacing v1, live requests, external paid pilot, public availability or release. See README.md and FUTURE-CONTRACT.md for exact boundaries and cost proposal.",
    ]
      .join("\n\n")
      .replace(/\n\n(?=\|)/g, "\n") + "\n";
  return files;
}
export async function run(check: boolean) {
  const guard = (globalThis as Record<symbol, { blocked: number }>)[
    Symbol.for("marketing.offline.guard")
  ];
  if (!guard) throw new Error("OFFLINE_GUARD_REQUIRED");
  const files = artifacts(),
    root = join(process.cwd(), "docs/qa/marketing-saas/ai-418");
  for (const [name, value] of Object.entries(files)) {
    const target = join(root, name);
    if (check) {
      if ((await readFile(target, "utf8")) !== value)
        throw new Error("EVIDENCE_DRIFT:" + name);
    } else {
      await mkdir(join(target, ".."), { recursive: true });
      await writeFile(target, value);
    }
  }
  if (guard.blocked !== 0) throw new Error("OFFLINE_TRANSPORT_ATTEMPT");
  console.log(
    JSON.stringify({
      offline: "PASS",
      artifacts: Object.keys(files).length,
      check,
      requests: 0,
      spendEur: 0,
      commercial: "NO-GO",
    }),
  );
}
