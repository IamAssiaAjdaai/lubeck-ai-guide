import type { Pool } from "pg";
import { transaction } from "../store";
import { CreativeService } from "./service";
import { PrivateMedia } from "./storage";
import type { CreativeState } from "./contract";

/** Explicit operator-only local command. No HTTP endpoint; never consumes provider receipts. */
export async function reconcileLocal(
  pool: Pool,
  media: PrivateMedia,
  clock = () => new Date(),
) {
  const service = new CreativeService(pool, media, clock);
  const projects = await pool.query(
    "SELECT p.project_id AS id,(SELECT m.user_id FROM mkt_memberships m WHERE m.organization_id=p.organization_id AND m.role='owner' ORDER BY m.user_id LIMIT 1) AS actor FROM mkt_creative_projects p",
  );
  let retention = 0;
  let pending = 0,
    interrupted = 0;
  for (const p of projects.rows)
    if (p.actor) {
      interrupted += (await service.recoverInterrupted({ id: p.actor }, p.id))
        .interrupted;
      pending += (await service.expire({ id: p.actor }, p.id)).pending;
      const erased = await service.retainMetadata({ id: p.actor }, p.id);
      retention += erased.versions + erased.assets + erased.jobs;
    }
  const orphans = await pruneOrphanNamespace(pool, media, clock);
  return {
    projects: projects.rowCount,
    interrupted,
    retention,
    pendingDeletes: pending,
    orphans,
  };
}

/** Reference-aware pruning without advancing any project lifecycle. */
export async function pruneOrphanNamespace(
  pool: Pool,
  media: PrivateMedia,
  clock = () => new Date(),
) {
  return transaction(pool, async (client) => {
    // All service operations take the shared lock FIRST. Reference collection + pruning is atomic
    // against in-flight writers, including DB rollback/commit windows and other tenants.
    await client.query("SELECT pg_advisory_xact_lock(745012324)");
    const rows = await client.query("SELECT state FROM mkt_creative_projects");
    const referenced = new Set<string>();
    for (const row of rows.rows) {
      const state = row.state as CreativeState;
      for (const a of state.assets)
        if (a.status !== "deleted") referenced.add(a.id);
      for (const j of state.jobs) if (j.outputKey) referenced.add(j.outputKey);
      for (const key of state.pendingDeletes ?? []) referenced.add(key);
    }
    return media.pruneOrphans(
      referenced,
      new Date(+clock() - 24 * 60 * 60 * 1000),
    );
  });
}
