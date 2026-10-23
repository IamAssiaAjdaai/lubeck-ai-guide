// Owner-operated future experiment. Default invocation is a credential-free, network-free preflight.
import { readFile, stat } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash = /^[0-9a-f]{64}$/;
export function experimentPreflight(m, now = Date.now()) {
  const blockers = [];
  if (
    m.schemaVersion !== 1 ||
    m.model !== "gpt-image-2.5-flare-2026-09-08" ||
    m.maximumRequests !== 1 ||
    m.maximumConcurrent !== 1 ||
    m.maximumSpendMicroEur !== 100000 ||
    m.quality !== "low" ||
    m.size !== "1024x1024" ||
    m.outputFormat !== "png"
  )
    blockers.push("EXACT_ONE_REQUEST_010_EUR_CONTRACT_REQUIRED");
  if (!m.ownerApproval || m.status !== "AUTHORIZED")
    blockers.push("SEPARATE_EXPLICIT_OWNER_AUTHORIZATION_REQUIRED");
  const end = Date.parse(m.expiresAt ?? "");
  if (!Number.isFinite(end) || end <= now || end > now + 3600000)
    blockers.push("FRESH_MAXIMUM_ONE_HOUR_WINDOW_REQUIRED");
  if (
    !m.providerBoundEvidence?.reviewed ||
    !hash.test(m.providerBoundEvidence.sha256 ?? "") ||
    !Number.isSafeInteger(m.providerBoundEvidence.enforcedMaximumMicroEur) ||
    m.providerBoundEvidence.enforcedMaximumMicroEur < 1 ||
    m.providerBoundEvidence.enforcedMaximumMicroEur > 100000 ||
    m.providerBoundEvidence.includesCurrencyFeesAndTaxes !== true
  )
    blockers.push(
      "ENFORCEABLE_VENDOR_SPEND_BOUND_WITH_FX_FEES_TAXES_UNVERIFIED",
    );
  if (!m.modelAccessEvidence)
    blockers.push("ACCOUNT_MODEL_ELIGIBILITY_UNVERIFIED");
  if (
    ![m.projectId, m.generationId, m.idempotencyKey].every(
      (v) => typeof v === "string" && uuid.test(v),
    ) ||
    !hash.test(m.reviewedBriefHash ?? "") ||
    !Number.isSafeInteger(m.expectedVersion) ||
    m.expectedVersion < 1
  )
    blockers.push(
      "EXACT_SYNTHETIC_PROJECT_POST_VERSION_AND_HUMAN_REVIEWED_BRIEF_REQUIRED",
    );
  return {
    status: blockers.length
      ? "BLOCKED"
      : "READY_FOR_OWNER_AUTHORIZED_EXECUTION",
    maximumRequests: 1,
    maximumSpendMicroEur: 100000,
    blockers,
  };
}
export async function runExperiment(m, auth, localFetch = fetch) {
  const verdict = experimentPreflight(m);
  if (verdict.blockers.length) throw Error("LIVE_EXPERIMENT_PREFLIGHT_BLOCKED");
  const origin = "http://127.0.0.1:3168";
  // Local authenticated session only. Never accept a provider key or configurable destination URL.
  const cookies = auth.cookies.filter(
    (c) =>
      c.domain === "127.0.0.1" &&
      (!c.expires || c.expires === -1 || c.expires * 1000 > Date.now()),
  );
  if (
    !cookies.length ||
    cookies.some((c) => /[\r\n;]/.test(c.name) || /[\r\n;]/.test(c.value))
  )
    throw Error("PRIVATE_LOCAL_AUTH_SESSION_REQUIRED");
  async function api(path, body) {
    const r = await localFetch(origin + path, {
      method: body ? "POST" : "GET",
      redirect: "error",
      signal: AbortSignal.timeout(35000),
      headers: {
        Origin: origin,
        Cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; "),
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!r.ok) throw Error("LOCAL_EXPERIMENT_API_REJECTED");
    return r.json();
  }
  const cap = await api("/api/creative-capabilities");
  if (!cap.enabled || cap.provider !== "openai")
    throw Error("REAL_TRANSPORT_SERVER_NOT_AUTHORIZED");
  const root = `/api/projects/${m.projectId}/creative`;
  const command = {
    generationId: m.generationId,
    expectedVersion: m.expectedVersion,
    postIndex: 0,
    objective: "leistung_erklaeren",
    ratio: "1:1",
    creative: {
      operation: "generate",
      referenceIds: [],
      style: "abstrakt",
      outputFormat: "png",
    },
    idempotencyKey: m.idempotencyKey,
    reviewedBriefHash: m.reviewedBriefHash,
  };
  const preview = await api(root + "/brief", command);
  if (preview.briefHash !== m.reviewedBriefHash)
    throw Error("HUMAN_REVIEWED_BRIEF_STALE");
  const j = await api(root + "/jobs", command);
  if (!uuid.test(j.id)) throw Error("LOCAL_EXPERIMENT_JOB_INVALID");
  const result = await api(root + `/jobs/${j.id}/process`, {});
  // Never automatically review, attach, export, retry or reconcile a charge.
  return {
    jobId: j.id,
    state: result.state,
    billing: "UNRESOLVED_RESERVATION_RETAINED",
    automaticRetry: false,
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const [
      mode = "preflight",
      manifest = "docs/qa/marketing-saas/creative-04/live-experiment.proposed.json",
      authFile,
    ] = process.argv.slice(2);
    const m = JSON.parse(await readFile(manifest, "utf8"));
    const verdict = experimentPreflight(m);
    console.log(JSON.stringify(verdict, null, 2));
    if (mode === "preflight") {
      if (verdict.blockers.length) process.exitCode = 2;
    } else if (mode === "run") {
      if (
        verdict.blockers.length ||
        !authFile ||
        !authFile.startsWith("/private/tmp/") ||
        (await stat(authFile)).mode & 0o077
      )
        throw Error("LIVE_EXPERIMENT_NOT_AUTHORIZED_OR_AUTH_FILE_NOT_PRIVATE");
      console.log(
        JSON.stringify(
          await runExperiment(m, JSON.parse(await readFile(authFile, "utf8"))),
        ),
      );
    } else throw Error("USE_PREFLIGHT_OR_RUN");
  } catch {
    console.error("EXPERIMENT_STOPPED_NO_AUTOMATIC_RETRY");
    process.exitCode = 1;
  }
}
