import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "@/db/authSchema";

function createTimestamps() {
  return {
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  };
}

export const travelerProfiles = pgTable("traveler_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  preferredLocale: text("preferred_locale").default("en").notNull(),
  ...createTimestamps(),
});

export const travelerGuestLinks = pgTable(
  "traveler_guest_links",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id").notNull(),
    sessionId: text("session_id").notNull(),
    ...createTimestamps(),
  },
  (table) => [
    index("traveler_guest_links_user_id_idx").on(table.userId),
    uniqueIndex("traveler_guest_links_visitor_id_unique").on(table.visitorId),
  ],
);

export type TravelerProfileRow = typeof travelerProfiles.$inferSelect;
export type TravelerGuestLinkRow = typeof travelerGuestLinks.$inferSelect;
