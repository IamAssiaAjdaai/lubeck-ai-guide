#!/usr/bin/env node
// Read-only preflight. Approval evidence is supplied by the operator, not inferred from DNS.
import { readFileSync } from "node:fs";
import { isIP } from "node:net";
import { fileURLToPath } from "node:url";

export function checkBetaEnvironment({ approval, origin, profile, profiles, now = Date.now() }) {
  const errors = [];
  if (!["preview", "store-beta"].includes(profile)) errors.push("Use preview or store-beta only.");
  const build = profiles?.[profile];
  if (build?.environment !== "preview" || build?.env?.EXPO_PUBLIC_CITYWALK_ENV !== "preview") {
    errors.push("Profile must select the Preview environment.");
  }
  let url;
  try { url = new URL(origin); } catch { errors.push("An explicit approved HTTPS origin is required."); }
  if (url) {
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash || url.port) {
      errors.push("Use a credential-free HTTPS origin on the default port.");
    }
    // Require a named public host; reject every IP literal rather than guessing its routability.
    if (isIP(host.replace(/^\[|\]$/g, "")) || !host.includes(".") ||
        /(?:^|\.)(?:localhost|local|internal|test|invalid|example)$/.test(host) ||
        host === "getcitywalk.com" || host.endsWith(".getcitywalk.com")) {
      errors.push("Production, local, reserved and IP hosts are not beta backends.");
    }
    if (approval?.origin !== url.origin) errors.push("Origin must exactly match the approval record.");
    if (build?.env?.EXPO_PUBLIC_CITYWALK_API_ORIGIN && build.env.EXPO_PUBLIC_CITYWALK_API_ORIGIN !== url.origin) {
      errors.push("Profile API origin conflicts with the approval record.");
    }
  }
  if (approval?.isolated !== true) errors.push("Explicit isolated-backend approval is required.");
  for (const field of ["approvalReference", "databaseEvidence", "storageEvidence"]) {
    if (typeof approval?.[field] !== "string" || !approval[field].trim()) errors.push(`Missing ${field}.`);
  }
  if (!/^[a-f0-9]{40}$/i.test(approval?.backendCommit ?? "")) errors.push("Record the deployed backend commit SHA.");
  const expiry = Date.parse(approval?.expiresAt ?? "");
  if (!Number.isFinite(expiry) || expiry <= now) errors.push("Backend approval is missing or expired.");
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const [profile, approvalPath, ...extra] = process.argv.slice(2);
    if (!profile || !approvalPath || extra.length) throw new Error("Usage: npm run beta:preflight -- preview|store-beta /private/path/approval.json");
    const approval = JSON.parse(readFileSync(approvalPath, "utf8"));
    const profiles = JSON.parse(readFileSync(new URL("../eas.json", import.meta.url), "utf8")).build;
    const errors = checkBetaEnvironment({ approval, origin: process.env.EXPO_PUBLIC_CITYWALK_API_ORIGIN, profile, profiles });
    if (process.env.EXPO_PUBLIC_CITYWALK_ENV !== "preview") errors.push("Set EXPO_PUBLIC_CITYWALK_ENV=preview.");
    if (process.env.EXPO_PUBLIC_CITYWALK_OBSERVABILITY && process.env.EXPO_PUBLIC_CITYWALK_OBSERVABILITY !== "0") errors.push("SDK 57 observability must remain disabled.");
    if (process.env.EXPO_PUBLIC_CITYWALK_BILLING || process.env.EXPO_PUBLIC_CITYWALK_UNLOCK_PREVIEW === "1") errors.push("Use ordinary beta configuration without billing/QA unlock overrides.");
    if (errors.length) {
      console.error(errors.join("\n"));
      process.exitCode = 1;
    } else {
      console.log("Beta configuration preflight passed. Approval evidence still requires human verification; no network, build, upload or device test was performed.");
    }
  } catch {
    // Do not echo a malformed manifest, URL credentials, or secret file content.
    console.error("Beta preflight failed. Check arguments, environment and the non-secret approval record; see docs/qa/mobile-release-2026-10-18/BETA.md.");
    process.exitCode = 1;
  }
}
