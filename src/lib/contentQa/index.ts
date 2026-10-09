export {
  CONTENT_QA_ORIGINS,
  CONTENT_QA_SEVERITIES,
} from "./types";
export type {
  ContentQaBrandRules,
  ContentQaClaim,
  ContentQaComparisonText,
  ContentQaDuplicateCheck,
  ContentQaEvidence,
  ContentQaFactAvailability,
  ContentQaFactCategory,
  ContentQaField,
  ContentQaOrigin,
  ContentQaReport,
  ContentQaResult,
  ContentQaSeverity,
  ContentQaSourceReference,
  DeterministicContentQaInput,
} from "./types";
export {
  evaluateDeterministicContentQa,
  runDeterministicContentQa,
  textSimilarity,
} from "./deterministic";
