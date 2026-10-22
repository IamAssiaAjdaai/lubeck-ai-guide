// @vitest-environment node
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  assemble,
  draftSchema,
  hash,
  OfflineReviewHistory,
  policyChecks,
  type Reviewer,
} from "./engine";
import { authoredDraft, fixtureCases, sourceFor } from "./fixtures";
import { attacks, executeAttack } from "./adversarial";
import { artifacts, comparison } from "./evaluate";
const s = fixtureCases[1];
const reviewer: Reviewer = {
  tenantId: "synthetic-tenant",
  projectId: s.id,
  actorId: "synthetic-reviewer",
  authorized: true,
  specialist: false,
};
function setup(index = 1) {
  const s = fixtureCases[index],
    source = sourceFor(s),
    draft = authoredDraft(s),
    proposal = assemble(draft, source);
  return {
    s,
    source,
    draft,
    proposal,
    history: new OfflineReviewHistory(proposal),
  };
}
const decisions = (p: ReturnType<typeof assemble>) =>
  p.flags.map((f) => ({
    flagId: f.id,
    rationale: "Synthetic test decision only; not an actual human grade.",
  }));
function approved() {
  const f = setup();
  f.history.approve(
    1,
    f.proposal.contentHash,
    f.source,
    decisions(f.proposal),
    reviewer,
  );
  return f;
}
describe("authored offline v2 corpus", () => {
  it.each(fixtureCases)(
    "$id uses confirmed immutable snapshots and distinct annotated facts",
    (s) => {
      const p = assemble(authoredDraft(s), sourceFor(s));
      expect(p.state).toBe("needs_review");
      expect(p.draft.schemaVersion).toBe(2);
      expect(p.draft.posts).toHaveLength(Math.min(3, s.facts.length));
      expect(p.draft.days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(new Set(p.draft.days.map((d) => d.task)).size).toBe(7);
      expect(p.flags.some((f) => f.code === "truth_and_conflict_review")).toBe(
        true,
      );
      if (s.facts.length < 3)
        expect(p.draft.missingInformation.length).toBeGreaterThan(0);
      if (s.risk !== "ordinary")
        expect(
          p.flags.some((f) => f.code === "regulated_specialist_review"),
        ).toBe(true);
      for (const c of p.draft.claims) {
        expect(c.snapshotHash).toBe(p.source.hash);
        expect(c.text).toBe(
          p.source.facts.find((f) => f.id === c.factIds[0])!.statement,
        );
      }
    },
  );
  it("compares exactly the frozen ten scenario IDs, with human scores still blank", () => {
    const rows = comparison();
    expect(rows.map((r) => r.id)).toEqual(fixtureCases.map((s) => s.id));
    expect(rows.reduce((a, r) => a + r.v2.posts, 0)).toBe(24);
    expect(
      rows.every(
        (r) =>
          r.v1.originalEditorialWords === 0 &&
          r.v2.authoredEditorialWords > 0 &&
          r.v2.humanScores === null,
      ),
    ).toBe(true);
    expect(
      rows
        .filter((r) => r.approvedFacts >= 3)
        .every((r) => r.v2.distinctFactAngleProxy === 3),
    ).toBe(true);
  });
  it("separate schema refuses v1 and v1 production sources remain identical", () => {
    expect(draftSchema.safeParse(comparison()[0].v1.pack).success).toBe(false);
    for (const file of [
      "pack.contract.ts",
      "pack.prompt.ts",
      "pack.provider.ts",
      "packs.ts",
    ]) {
      const path = `apps/marketing-saas-api/src/${file}`;
      // Committed #417 fingerprints also work in CI's shallow merge checkout.
      const baseline = JSON.parse(
        readFileSync("docs/qa/marketing-saas/ai-416/results.json", "utf8"),
      ).summary.sourceHashes;
      expect(
        createHash("sha256").update(readFileSync(path)).digest("hex"),
      ).toBe(baseline[file]);
    }
  });
  it("only QA copies correct the mock AI label", () => {
    const files = artifacts();
    expect(files["samples/s02-v1.md"]).toContain("keine KI-Generierung");
    expect(files["samples/s02-v1.md"]).not.toContain("KI-gestützter Entwurf");
    expect(files["samples/s02-v2.md"]).toContain("redaktionell verfasst");
  });
});
describe("adversarial lexical checks and fail-to-review boundaries", () => {
  it("requires three posts when at least three facts are available", () => {
    const f = setup();
    f.draft.posts.pop();
    f.draft.claims.pop();
    expect(
      assemble(f.draft, f.source).flags.some(
        (flag) =>
          flag.code === "insufficient_posts" && flag.state === "blocked",
      ),
    ).toBe(true);
  });
  it("a factual post cannot silently become wholly editorial", () => {
    const f = setup(9);
    f.draft.posts[0].segments = [
      { kind: "editorial", text: "Welche Aufgabe möchtest du besprechen?" },
    ];
    f.draft.claims = [];
    expect(
      assemble(f.draft, f.source).flags.some(
        (flag) =>
          flag.code === "missing_factual_basis" && flag.state === "blocked",
      ),
    ).toBe(true);
  });

  it.each(attacks)("$id -> $expected", (attack) => {
    const result = executeAttack(attack);
    expect(result.observed).toBe(attack.expected);
    if (attack.lexicalExpected) expect(result.lexicalDetected).toBe(true);
  });
  it("scarce facts cannot produce fabricated variety or omit owner questions", () => {
    const f = setup(9);
    f.draft.posts.push(structuredClone(f.draft.posts[0]));
    expect(
      assemble(f.draft, f.source).flags.some(
        (f) => f.code === "fabricated_variety" && f.state === "blocked",
      ),
    ).toBe(true);
    f.draft.posts.pop();
    f.draft.missingInformation = [];
    expect(assemble(f.draft, f.source).state).toBe("blocked");
  });
  it("paraphrase gets no entailment certificate even with correct fact IDs", () => {
    const f = setup();
    f.draft.claims[0].text = "Wir sind der Partner für Dacharbeiten in Bonn.";
    const p = assemble(f.draft, f.source);
    expect(p.state).toBe("needs_review");
    expect(
      p.flags.some(
        (f) => f.code === "unproven_paraphrase_entity_service_location",
      ),
    ).toBe(true);
  });
  it("benign B2B and Wohnzimmer do not trigger digit or always sentinels", () => {
    expect(
      policyChecks("B2B: Welche Idee hast du für dein Wohnzimmer?"),
    ).toEqual([]);
  });
  it("tampered snapshot content cannot retain the old hash", () => {
    const f = setup();
    f.source.facts[0].statement = "Wir arbeiten in Bonn.";
    expect(() => assemble(f.draft, f.source)).toThrow("INVALID_SNAPSHOT");
  });
});
describe("exact-version human approval and manual export proposal", () => {
  it("does not overwrite an existing immutable approval record", () => {
    const f = approved(),
      previous = f.history.history();
    expect(() =>
      f.history.approve(
        1,
        f.proposal.contentHash,
        f.source,
        decisions(f.proposal),
        reviewer,
      ),
    ).toThrow("ALREADY_REVIEWED");
    expect(f.history.history()).toEqual(previous);
  });
  it("requires per-item decisions, not a checkbox", () => {
    const f = setup();
    expect(() =>
      f.history.export(1, f.proposal.contentHash, f.source, reviewer),
    ).toThrow("REVIEW_REQUIRED");
    expect(() =>
      f.history.approve(1, f.proposal.contentHash, f.source, [], reviewer),
    ).toThrow("UNRESOLVED_REVIEW");
  });
  it("allows a synthetic reviewed manual export of the exact version", () => {
    const f = approved();
    expect(
      f.history.export(1, f.proposal.contentHash, f.source, reviewer),
    ).toContain("keine KI-Generierung");
  });
  it("all approval mutations enforce scope", () => {
    const f = setup();
    for (const actor of [
      { ...reviewer, authorized: false },
      { ...reviewer, tenantId: "other" },
      { ...reviewer, projectId: "other" },
    ]) {
      expect(() =>
        f.history.approve(
          1,
          f.proposal.contentHash,
          f.source,
          decisions(f.proposal),
          actor,
        ),
      ).toThrow("FORBIDDEN");
      expect(() =>
        f.history.edit(f.draft, 1, f.proposal.contentHash, actor, f.source),
      ).toThrow("FORBIDDEN");
      expect(() =>
        f.history.export(1, f.proposal.contentHash, f.source, actor),
      ).toThrow("FORBIDDEN");
    }
  });
  it("content edit invalidates review, preserving the previous immutable version", () => {
    const f = approved(),
      old = f.history.history();
    f.draft.hooks[0] = "Welche Frage ist dir besonders wichtig?";
    const next = f.history.edit(
      f.draft,
      1,
      f.proposal.contentHash,
      reviewer,
      f.source,
    );
    expect(next.version).toBe(2);
    expect(next.approval).toBeUndefined();
    expect(f.history.history()[0]).toEqual(old[0]);
    expect(() =>
      f.history.export(1, f.proposal.contentHash, f.source, reviewer),
    ).toThrow("STALE_VERSION_HASH_OR_CONTEXT");
    expect(() =>
      f.history.export(2, next.proposal.contentHash, f.source, reviewer),
    ).toThrow("REVIEW_REQUIRED");
    expect(() =>
      f.history.approve(
        2,
        f.proposal.contentHash,
        f.source,
        decisions(next.proposal),
        reviewer,
      ),
    ).toThrow("STALE_VERSION_HASH_OR_CONTEXT");
  });
  it("rejects changed context, goal, policy or provenance after review", () => {
    const f = approved();
    for (const change of ["revision", "goal", "risk", "provenance"]) {
      const source = structuredClone(f.source);
      if (change === "revision") source.revision++;
      if (change === "goal") source.goal = "sichtbarkeit";
      if (change === "risk") source.risk = "medical";
      if (change === "provenance")
        source.facts[0].provenance[0].locator = "https://changed.example";
      const data = Object.fromEntries(
        Object.entries(source).filter(([key]) => key !== "hash"),
      );
      source.hash = hash(data);
      expect(() =>
        f.history.export(1, f.proposal.contentHash, source, reviewer),
      ).toThrow("STALE_VERSION_HASH_OR_CONTEXT");
      expect(() =>
        f.history.approve(
          1,
          f.proposal.contentHash,
          source,
          decisions(f.proposal),
          reviewer,
        ),
      ).toThrow("STALE_VERSION_HASH_OR_CONTEXT");
    }
  });
  it("cannot waive a hard policy flag through human decisions", () => {
    const f = setup();
    f.draft.cta = "Garantiert weniger Steuern!";
    const p = assemble(f.draft, f.source),
      history = new OfflineReviewHistory(p);
    expect(() =>
      history.approve(1, p.contentHash, f.source, decisions(p), {
        ...reviewer,
        specialist: true,
      }),
    ).toThrow("POLICY_BLOCKED");
  });
  it.each([2, 3])(
    "regulated case %s requires authorized specialist",
    (index) => {
      const f = setup(index),
        actor = { ...reviewer, projectId: f.s.id };
      expect(() =>
        f.history.approve(
          1,
          f.proposal.contentHash,
          f.source,
          decisions(f.proposal),
          actor,
        ),
      ).toThrow("SPECIALIST_REQUIRED");
      f.history.approve(
        1,
        f.proposal.contentHash,
        f.source,
        decisions(f.proposal),
        { ...actor, specialist: true },
      );
      expect(f.history.current().approval?.hash).toBe(f.proposal.contentHash);
    },
  );
  it("external mutation of returned versions cannot modify stored history", () => {
    const f = approved(),
      copy = f.history.current();
    copy.proposal.draft.cta = "Changed";
    copy.approval!.hash = "forged";
    expect(f.history.current().proposal.contentHash).toBe(
      f.proposal.contentHash,
    );
    expect(
      f.history.export(1, f.proposal.contentHash, f.source, reviewer),
    ).not.toContain("forged");
  });
});
describe("offline runner with fake ambient credentials", () => {
  it("reproduces evidence with AI enable true and fake key; denies live argument", () => {
    const env = {
      ...process.env,
      MARKETING_AI_ENABLED: "true",
      OPENAI_API_KEY: "synthetic-noncredential-for-offline-test",
    };
    const command = [
      "--conditions=react-server",
      "--import",
      "tsx",
      "scripts/marketing-saas-ai-v2-eval.mjs",
    ];
    const result = spawnSync(process.execPath, [...command, "--check"], {
      env,
      encoding: "utf8",
    });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('"requests":0');
    expect(
      spawnSync(process.execPath, [...command, "--live"], {
        env,
        encoding: "utf8",
      }).status,
    ).not.toBe(0);
    expect(
      spawnSync(process.execPath, [...command, "--check", "--require-go"], {
        env,
        encoding: "utf8",
      }).status,
    ).toBe(2);
  });
});
