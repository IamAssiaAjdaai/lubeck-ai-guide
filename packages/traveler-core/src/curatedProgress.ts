export type CuratedExecutionState = "active" | "paused" | "ended";

/** Execution state is separate from the immutable editorial stop definition. */
export type CuratedProgress = {
  version: 1; executionState?: CuratedExecutionState; citySlug: string; tourSlug: string; stopSlugs: string[];
  statuses: ("pending" | "visited" | "skipped")[]; startedAt: number; updatedAt: number;
};
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function createCuratedProgress(citySlug: string, tourSlug: string, stopSlugs: readonly string[], now = Date.now()): CuratedProgress {
  if (typeof citySlug !== "string" || typeof tourSlug !== "string" || !slug.test(citySlug) || !slug.test(tourSlug) || !Array.isArray(stopSlugs) || !stopSlugs.length || stopSlugs.length > 100 || new Set(stopSlugs).size !== stopSlugs.length || stopSlugs.some(s => typeof s !== "string" || !slug.test(s)) || !Number.isFinite(now)) throw Error("Invalid curated tour");
  return { version: 1, citySlug, tourSlug, stopSlugs: [...stopSlugs], statuses: stopSlugs.map(() => "pending"), startedAt: now, updatedAt: now };
}
export function parseCuratedProgress(value: unknown): CuratedProgress | undefined {
  if (!value || typeof value !== "object") return;
  const p = value as CuratedProgress;
  try { createCuratedProgress(p.citySlug, p.tourSlug, p.stopSlugs, p.startedAt); } catch { return; }
  if (p.version !== 1 || !Number.isFinite(p.updatedAt) || p.updatedAt < p.startedAt || !Array.isArray(p.statuses) || p.statuses.length !== p.stopSlugs.length || p.statuses.some(s => !["pending", "visited", "skipped"].includes(s))) return;
  if (p.executionState !== undefined && !["active", "paused", "ended"].includes(p.executionState)) return;
  const pending = p.statuses.indexOf("pending");
  if (pending >= 0 && p.statuses.slice(pending).some(status => status !== "pending")) return;
  return { version: 1, ...(p.executionState !== undefined ? { executionState: p.executionState } : {}), citySlug: p.citySlug, tourSlug: p.tourSlug, stopSlugs: [...p.stopSlugs], statuses: [...p.statuses], startedAt: p.startedAt, updatedAt: p.updatedAt };
}
export function curatedResumeIndex(progress: CuratedProgress) { return progress.statuses.indexOf("pending"); }
export function markCuratedStop(progress: CuratedProgress, index: number, status: "visited" | "skipped", now = Date.now()): CuratedProgress {
  if (!parseCuratedProgress(progress) || (progress.executionState !== undefined && progress.executionState !== "active") || !Number.isInteger(index) || index < 0 || index !== curatedResumeIndex(progress) || !["visited", "skipped"].includes(status) || !Number.isFinite(now)) throw Error("Invalid curated progress");
  return { ...progress, stopSlugs: [...progress.stopSlugs], statuses: progress.statuses.map((s, i) => i === index ? status : s), updatedAt: Math.max(now, progress.updatedAt) };
}

/** Legacy records without executionState remain active; statuses/order never reset. */
export function setCuratedExecutionState(progress: CuratedProgress, state: CuratedExecutionState, now = Date.now()): CuratedProgress {
  const parsed = parseCuratedProgress(progress);
  if (!parsed || !["active", "paused", "ended"].includes(state) || !Number.isFinite(now)) throw Error("Invalid curated execution state");
  if (curatedResumeIndex(parsed) < 0 && state !== "ended") throw Error("Curated tour complete");
  if (parsed.executionState === "ended" && state === "paused") throw Error("Ended curated tour must be explicitly resumed");
  return { ...parsed, executionState: state, updatedAt: Math.max(now, parsed.updatedAt) };
}
