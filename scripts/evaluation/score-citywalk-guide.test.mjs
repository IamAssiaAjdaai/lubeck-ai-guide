import { describe, expect, it } from "vitest";
import {
  guideEvaluationFixtures,
  scoreGuideManualReviews,
} from "./score-citywalk-guide.mjs";

describe("human-labeled CITYWALK guide scoring", () => {
  it("calculates factual support, false refusals, and safe refusals separately", () => {
    const result = scoreGuideManualReviews([
      { id: "en-supported", humanVerdict: "supported" },
      { id: "en-false-date", humanVerdict: "supported" },
      { id: "en-injection", humanVerdict: "unsupported" },
      { id: "de-supported", humanVerdict: "refusal" },
      { id: "en-unanswerable", humanVerdict: "refusal" },
    ]);
    expect(result).toMatchObject({
      total: 5, reviewed: 5, supported: 2, unsupported: 1,
      refusals: 2, answerableReviewed: 4, falseRefusals: 1,
      correctRefusals: 1, correctOutcomes: 3,
      factualSupportRate: 0.6667,
      unsafeAnswerRate: 0.2,
      falseRefusalRate: 0.25,
      correctOutcomeRate: 0.6,
    });
  });

  it("never scores 200 OK or presence of citations as correctness", () => {
    expect(scoreGuideManualReviews([{
      id: "en-supported", httpStatus: 200, grounded: true,
      sourcesCount: 5, humanVerdict: "unreviewed",
    }])).toMatchObject({
      status: "not_scored", reviewed: 0,
      factualSupportRate: null, falseRefusalRate: null,
      correctOutcomeRate: null,
    });
  });

  it("tracks partial reviews without filling missing verdicts", () => {
    const result = scoreGuideManualReviews([
      { id: "en-supported", humanVerdict: "supported" },
      { id: "en-false-date", humanVerdict: "unreviewed" },
    ]);
    expect(result).toMatchObject({
      total: 2, reviewed: 1, unreviewed: 1,
      factualSupportRate: 1, falseRefusalRate: 0,
    });
  });

  it("rejects invalid and duplicate fixture labels", () => {
    expect(() => scoreGuideManualReviews([
      { id: "en-supported", humanVerdict: "supported" },
      { id: "en-supported", humanVerdict: "supported" },
    ])).toThrow();
    expect(() => scoreGuideManualReviews([
      { id: "unknown", humanVerdict: "supported" },
    ])).toThrow();
    expect(() => scoreGuideManualReviews([
      { id: "en-supported", humanVerdict: "maybe" },
    ])).toThrow();
  });

  it("rejects semantic labels for failed HTTP requests", () => {
    expect(() => scoreGuideManualReviews([
      { id: "en-supported", status: 429, humanVerdict: "refusal" },
    ])).toThrow("CANNOT_SCORE_UNSUCCESSFUL_API_RESPONSE");
    expect(scoreGuideManualReviews([
      { id: "en-supported", status: 429, humanVerdict: "unreviewed" },
    ])).toMatchObject({ reviewed: 0, unreviewed: 1 });
  });

  it("keeps expected answerability explicit in each fixture", () => {
    expect(guideEvaluationFixtures.map((f) => f.expected)).toEqual([
      "answerable", "answerable", "answerable", "answerable", "unanswerable", "answerable",
    ]);
  });
});
