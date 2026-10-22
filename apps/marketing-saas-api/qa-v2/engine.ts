/** OFFLINE SPIKE ONLY. No routes, provider SDK or database; reuses v1 enums only. */
import { createHash } from "node:crypto";
import { z } from "zod";
import { brandContextSchema, getApprovedBrandFacts } from "@marketing/core";
import { channels, goals } from "../src/pack.contract";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b, "en"))
        .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
export const hash = (value: unknown) =>
  createHash("sha256").update(canonical(value)).digest("hex");
const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const text = z.string().trim().min(1).max(1500);
export const draftSchema = z.strictObject({
  schemaVersion: z.literal(2),
  origin: z.literal("authored-offline-mock"),
  snapshotHash: digest,
  claims: z
    .array(
      z.strictObject({
        id,
        text,
        factIds: z.array(id).min(1).max(3),
        snapshotHash: digest,
      }),
    )
    .max(24),
  posts: z
    .array(
      z.strictObject({
        angle: text,
        channel: z.enum(channels),
        segments: z
          .array(
            z.discriminatedUnion("kind", [
              z.strictObject({ kind: z.literal("claim"), claimId: id }),
              z.strictObject({ kind: z.literal("editorial"), text }),
            ]),
          )
          .min(1)
          .max(8),
      }),
    )
    .min(1)
    .max(3),
  hooks: z.array(text).length(3),
  cta: text,
  days: z
    .array(
      z.strictObject({
        day: z.number().int().min(1).max(7),
        channel: z.enum(channels),
        task: text,
        factIds: z.array(id).min(1).max(3),
      }),
    )
    .length(7),
  missingInformation: z.array(text).max(12),
});
export type Draft = z.infer<typeof draftSchema>;
/** Only call with host-authorized stored context and server-owned policy metadata. */
export function snapshot(
  stored: unknown,
  policy: {
    tenantId: string;
    risk: "ordinary" | "medical" | "tax";
    goal: (typeof goals)[number];
    audience: string;
    channel: (typeof channels)[number];
  },
) {
  const context = brandContextSchema.parse(stored);
  const facts = getApprovedBrandFacts(context);
  if (
    !facts.length ||
    facts.length > 24 ||
    facts.some((f) => f.statement.length > 500)
  )
    throw new Error("FACT_BOUNDS");
  const data = {
    tenantId: id.parse(policy.tenantId),
    projectId: context.projectId,
    contextId: context.contextId,
    revision: context.revision,
    businessName: context.identity.name,
    facts,
    tone: context.tone,
    risk: z.enum(["ordinary", "medical", "tax"]).parse(policy.risk),
    goal: z.enum(goals).parse(policy.goal),
    audience: text.parse(policy.audience),
    channel: z.enum(channels).parse(policy.channel),
  };
  return { ...data, hash: hash(data) };
}
export type Snapshot = ReturnType<typeof snapshot>;
export type Flag = {
  id: string;
  path: string;
  code: string;
  state: "blocked" | "needs_review";
};
const normalize = (s: string) =>
  s
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase();
/** Deliberately conservative lexical sentinels, NOT semantic entailment. */
export function policyChecks(value: string): string[] {
  const s = normalize(value);
  const rules: [string, RegExp][] = [
    [
      "instruction",
      /ignore|ignorier|system\s*prompt|developer\s*message|previous instructions|anweisungen|ignora|忽略|تجاهل|réponds|reveal|api.?key/iu,
    ],
    [
      "guarantee_or_benefit",
      /garant|heilung|heilen|schmerzfrei|beseitigt.*schmerz|weniger steuern|steuern sparen|rechtssicher|risikofrei|ohne risiko|spart.*zeit|verdoppel|effizien|stressfrei|sicherer|jederzeit|sofort|\bimmer\b|nie wieder/iu,
    ],
    [
      "number_price_date",
      /(?<![\p{L}\p{N}])\p{N}+(?![\p{L}\p{N}])|€|\$|prozent|rabatt|kostenlos|preis|euro|januar|dezember|montag|wochen|morgen|hundert|fünfzig|sieben tage|rund um die uhr/iu,
    ],
    [
      "certification_testimonial",
      /zertifi|\biso\b|\bfsc\b|meister|testsieger|ausgezeichnet|kundin|kunde sagt|bewertung|testimonial|„|“/iu,
    ],
    ["external_link", /https?:|www\.|mailto:|@[a-z0-9]/iu],
  ];
  return rules.filter(([, re]) => re.test(s)).map(([code]) => code);
}
export function assemble(raw: unknown, source: Snapshot) {
  const { hash: expected, ...data } = source;
  if (hash(data) !== expected) throw new Error("INVALID_SNAPSHOT");
  const draft = draftSchema.parse(raw);
  if (
    draft.snapshotHash !== source.hash ||
    draft.claims.some((c) => c.snapshotHash !== source.hash)
  )
    throw new Error("STALE_SNAPSHOT");
  const facts = new Map(source.facts.map((f) => [f.id, f]));
  const claims = new Map(draft.claims.map((c) => [c.id, c]));
  if (
    claims.size !== draft.claims.length ||
    new Set(draft.days.map((d) => d.day)).size !== 7
  )
    throw new Error("DUPLICATE_ID_OR_DAY");
  for (const entry of [...draft.claims, ...draft.days])
    if (
      new Set(entry.factIds).size !== entry.factIds.length ||
      entry.factIds.some((f) => !facts.has(f))
    )
      throw new Error("UNAPPROVED_REFERENCE");
  const used = draft.posts.flatMap((p) =>
    p.segments.flatMap((s) => (s.kind === "claim" ? [s.claimId] : [])),
  );
  if (
    used.some((c) => !claims.has(c)) ||
    [...claims.keys()].some((c) => !used.includes(c))
  )
    throw new Error("UNLINKED_CLAIM");
  if ([...draft.posts, ...draft.days].some((p) => p.channel !== source.channel))
    throw new Error("CHANNEL_MISMATCH");
  const flags: Flag[] = [];
  function flag(
    path: string,
    code: string,
    state: Flag["state"] = "needs_review",
  ) {
    flags.push({ id: `${path}:${code}`, path, code, state });
  }
  function scan(value: string, path: string, quote = false) {
    // Numbers in even exact quotes need review; prohibited policies cannot be overridden.
    for (const code of policyChecks(value))
      flag(
        path,
        code,
        code === "number_price_date" && quote ? "needs_review" : "blocked",
      );
    for (const forbidden of source.tone.forbiddenClaims)
      if (normalize(value).includes(normalize(forbidden)))
        flag(path, "forbidden_context_policy", "blocked");
  }
  // Scan approved sources too: confirmation is not a policy waiver or factual verification.
  source.facts.forEach((f) => {
    scan(f.statement, `facts.${f.id}`, true);
    flag(`facts.${f.id}`, "truth_and_conflict_review");
  });
  for (let a = 0; a < source.facts.length; a++) {
    for (let b = a + 1; b < source.facts.length; b++) {
      const left = normalize(source.facts[a].statement),
        right = normalize(source.facts[b].statement);
      if (
        /\bnicht\b/u.test(left) !== /\bnicht\b/u.test(right) &&
        left.replace(/\bnicht\s*/gu, "") === right.replace(/\bnicht\s*/gu, "")
      )
        flag("context", "contradictory_approved_facts", "blocked");
    }
  }
  scan(source.businessName, "businessName");
  scan(source.audience, "audience");
  draft.claims.forEach((c) => {
    const exact =
      c.factIds.length === 1 && c.text === facts.get(c.factIds[0])!.statement;
    scan(c.text, `claims.${c.id}`, exact);
    flag(
      `claims.${c.id}`,
      exact
        ? "exact_snapshot_quote_not_truth"
        : "unproven_paraphrase_entity_service_location",
    );
    // Arbitrary new names/location/service are never silently approved even if lexical sentinels miss them.
  });
  if (source.facts.length >= 3 && draft.posts.length !== 3)
    flag("posts", "insufficient_posts", "blocked");
  draft.posts.forEach((p, i) => {
    if (!p.segments.some((s) => s.kind === "claim"))
      flag(`posts.${i}`, "missing_factual_basis", "blocked");
    flag(`posts.${i}`, "angle_goal_channel_review");
    scan(p.angle, `posts.${i}.angle`);
    p.segments.forEach((s, j) => {
      if (s.kind === "editorial") {
        scan(s.text, `posts.${i}.${j}`);
        flag(`posts.${i}.${j}`, "editorial_may_contain_hidden_claim");
      }
    });
  });
  [...draft.hooks, draft.cta, ...draft.missingInformation].forEach((v, i) => {
    scan(v, `copy.${i}`);
    flag(`copy.${i}`, "copy_semantics");
  });
  draft.days.forEach((d) => {
    scan(d.task, `days.${d.day}`);
    flag(`days.${d.day}`, "owner_task_semantics");
  });
  const signatures = draft.posts.map((p) =>
    p.segments
      .flatMap((s) =>
        s.kind === "claim" ? claims.get(s.claimId)!.factIds : [],
      )
      .sort()
      .join("|"),
  );
  if (
    new Set(draft.posts.map((p) => normalize(p.angle))).size !==
      draft.posts.length ||
    new Set(signatures).size !== signatures.length
  )
    flag("posts", "repeated_angle", "blocked");
  if (
    new Set(draft.hooks.map(normalize)).size !== 3 ||
    new Set(draft.days.map((d) => normalize(d.task))).size !== 7
  )
    flag("copy", "repetition", "blocked");
  if (source.facts.length < 3) {
    flag("context", "insufficient_facts");
    if (
      draft.posts.length > source.facts.length ||
      !draft.missingInformation.length
    )
      flag("context", "fabricated_variety", "blocked");
  }
  if (source.risk !== "ordinary")
    flag("context", "regulated_specialist_review");
  const contentHash = hash({ source, draft });
  return {
    schemaVersion: 2 as const,
    draft,
    source,
    contentHash,
    flags,
    state: flags.some((f) => f.state === "blocked")
      ? ("blocked" as const)
      : ("needs_review" as const),
  };
}
export type Proposal = ReturnType<typeof assemble>;
export type Reviewer = {
  tenantId: string;
  projectId: string;
  actorId: string;
  authorized: boolean;
  specialist: boolean;
};
/** In-memory trust-boundary experiment, not authentication or a persisted audit store.
 * Host must supply authenticated, server-authorized reviewer and current snapshot.
 * Private history makes edits immutable and old approvals unusable for current export.
 */
export class OfflineReviewHistory {
  #versions: {
    proposal: Proposal;
    approval?: {
      version: number;
      hash: string;
      snapshotHash: string;
      actorId: string;
      decisions: { flagId: string; rationale: string }[];
    };
  }[] = [];
  constructor(proposal: Proposal) {
    this.#versions.push({
      proposal: structuredClone(assemble(proposal.draft, proposal.source)),
    });
  }
  current() {
    return structuredClone({
      version: this.#versions.length,
      reviewState: this.#versions.at(-1)!.approval
        ? ("approved" as const)
        : this.#versions.at(-1)!.proposal.state,
      ...this.#versions.at(-1)!,
    });
  }
  history() {
    return structuredClone(this.#versions);
  }
  #scope(reviewer: Reviewer) {
    const s = this.#versions.at(-1)!.proposal.source;
    if (
      !reviewer.authorized ||
      !reviewer.actorId ||
      reviewer.tenantId !== s.tenantId ||
      reviewer.projectId !== s.projectId
    )
      throw new Error("FORBIDDEN");
  }
  #expected(version: number, contentHash: string, current: Snapshot) {
    const p = this.#versions.at(-1)!.proposal;
    if (
      version !== this.#versions.length ||
      p.contentHash !== contentHash ||
      current.hash !== p.source.hash ||
      hash(current) !== hash(p.source)
    )
      throw new Error("STALE_VERSION_HASH_OR_CONTEXT");
  }
  edit(
    raw: unknown,
    expectedVersion: number,
    expectedHash: string,
    reviewer: Reviewer,
    current: Snapshot,
  ) {
    this.#scope(reviewer);
    this.#expected(expectedVersion, expectedHash, current);
    this.#versions.push({ proposal: structuredClone(assemble(raw, current)) });
    return this.current();
  }
  approve(
    version: number,
    contentHash: string,
    current: Snapshot,
    decisions: { flagId: string; rationale: string }[],
    reviewer: Reviewer,
  ) {
    this.#scope(reviewer);
    this.#expected(version, contentHash, current);
    const entry = this.#versions.at(-1)!,
      p = entry.proposal;
    if (entry.approval) throw new Error("ALREADY_REVIEWED");
    if (p.state === "blocked") throw new Error("POLICY_BLOCKED");
    if (p.source.risk !== "ordinary" && !reviewer.specialist)
      throw new Error("SPECIALIST_REQUIRED");
    if (
      decisions.length !== p.flags.length ||
      new Set(decisions.map((d) => d.flagId)).size !== decisions.length ||
      p.flags.some(
        (f) =>
          !decisions.some(
            (d) => d.flagId === f.id && d.rationale.trim().length >= 20,
          ),
      )
    )
      throw new Error("UNRESOLVED_REVIEW");
    entry.approval = structuredClone({
      version,
      hash: contentHash,
      snapshotHash: current.hash,
      actorId: reviewer.actorId,
      decisions,
    });
    return this.current();
  }
  export(
    version: number,
    contentHash: string,
    current: Snapshot,
    reviewer: Reviewer,
  ) {
    this.#scope(reviewer);
    this.#expected(version, contentHash, current);
    const entry = this.#versions.at(-1)!;
    if (
      !entry.approval ||
      entry.approval.hash !== contentHash ||
      entry.approval.version !== version ||
      entry.approval.snapshotHash !== current.hash
    )
      throw new Error("REVIEW_REQUIRED");
    return render(entry.proposal).replace(
      "menschliche Prüfung ausstehend.",
      `synthetische Testfreigabe für Version ${version} durch ${entry.approval.actorId}; kein echtes menschliches Qualitätsurteil.`,
    );
  }
}
/** Evidence renderer is not an export authorization boundary. */
export function render(p: Proposal) {
  const claims = new Map(p.draft.claims.map((c) => [c.id, c]));
  return [
    "# OFFLINE / SYNTHETISCH — redaktionell verfasst, keine KI-Generierung",
    `Status: ${p.state}; menschliche Prüfung ausstehend. Hash: ${p.contentHash}`,
    ...p.draft.posts.map(
      (post, i) =>
        `## Beitrag ${i + 1}: ${post.angle}\n${post.segments.map((s) => (s.kind === "editorial" ? s.text : `${claims.get(s.claimId)!.text} [${s.claimId}]`)).join("\n\n")}`,
    ),
    "## Einstiege",
    ...p.draft.hooks,
    "## CTA",
    p.draft.cta,
    "## Wochenplan — nur manuelle Vorschläge",
    ...p.draft.days.map((d) => `${d.day}. ${d.task} [${d.factIds.join(", ")}]`),
    "## Fehlende Informationen",
    ...p.draft.missingInformation,
    "## Claim Ledger",
    ...p.draft.claims.map(
      (c) => `${c.id}: ${c.factIds.join(", ")} · ${c.snapshotHash}`,
    ),
    "Keine automatische Veröffentlichung. Quellen und Entscheidungen: results.json.",
  ].join("\n\n");
}
