import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";


// Generic persistence contracts. Host identity/scope is deliberately separate.
export const brandContextEventEnum = pgEnum("brand_context_event", ["created", "facts_confirmed", "corrected"]);
export const brandProjects = pgTable("brand_projects", {
  id: uuid("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const brandContexts = pgTable("brand_contexts", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id").notNull().references(() => brandProjects.id, { onDelete: "cascade" }),
  currentRevision: integer("current_revision").notNull(),
}, t => [
  uniqueIndex("brand_context_owner_unique").on(t.id, t.projectId),
  uniqueIndex("brand_context_project_idx").on(t.projectId),
  check("brand_context_revision_positive", sql`${t.currentRevision} > 0`),
]);
export const brandContextRevisions = pgTable("brand_context_revisions", {
  contextId: uuid("context_id").notNull(),
  projectId: uuid("project_id").notNull(),
  revision: integer("revision").notNull(),
  schemaVersion: integer("schema_version").notNull(),
  contextJson: jsonb("context_json").$type<Record<string, unknown>>().notNull(),
  digest: text("digest").notNull(),
}, t => [
  primaryKey({ columns: [t.contextId, t.revision] }),
  foreignKey({ columns: [t.contextId, t.projectId], foreignColumns: [brandContexts.id, brandContexts.projectId], name: "brand_revision_context_owner_fk" }).onDelete("cascade"),
  check("brand_revision_shape", sql`${t.revision} > 0 AND ${t.schemaVersion} = 1 AND jsonb_typeof(${t.contextJson}) = 'object' AND octet_length(${t.contextJson}::text) <= 1048576 AND ${t.contextJson}->>'contextId' = ${t.contextId}::text AND ${t.contextJson}->>'projectId' = ${t.projectId}::text AND ${t.contextJson}->>'revision' = ${t.revision}::text AND ${t.contextJson}->>'schemaVersion' = '1' AND ${t.contextJson} ?& ARRAY['contextId','projectId','revision','schemaVersion'] AND ${t.digest} ~ '^[a-f0-9]{64}$'`),
]);
export const brandContextAudit = pgTable("brand_context_audit", {
  contextId: uuid("context_id").notNull(),
  revision: integer("revision").notNull(),
  event: brandContextEventEnum("event").notNull(),
  actorId: uuid("actor_id").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  factIds: jsonb("fact_ids").$type<string[]>().notNull(),
}, t => [
  primaryKey({ columns: [t.contextId, t.revision] }),
  foreignKey({ name: "brand_audit_revision_fk", columns: [t.contextId, t.revision], foreignColumns: [brandContextRevisions.contextId, brandContextRevisions.revision] }).onDelete("cascade"),
  index("brand_audit_actor_idx").on(t.actorId),
  check("brand_audit_facts_shape", sql`jsonb_typeof(${t.factIds}) = 'array' AND jsonb_array_length(${t.factIds}) <= 100 AND ((${t.event} = 'facts_confirmed' AND jsonb_array_length(${t.factIds}) > 0) OR (${t.event} <> 'facts_confirmed' AND ${t.factIds} = '[]'::jsonb))`),
]);
