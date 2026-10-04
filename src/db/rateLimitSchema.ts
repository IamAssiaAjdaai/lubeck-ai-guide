import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const rateLimitEventsTable = pgTable(
  "rate_limit_events",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    scope: text("scope").notNull(),
    identifierHash: text("identifier_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("rate_limit_events_scope_identifier_created_idx").on(
      table.scope,
      table.identifierHash,
      table.createdAt,
    ),
    index("rate_limit_events_created_at_idx").on(table.createdAt),
  ],
);

export type RateLimitEventRow = typeof rateLimitEventsTable.$inferSelect;
