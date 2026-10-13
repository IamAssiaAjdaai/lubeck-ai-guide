import { foreignKey, index, integer, pgTable, primaryKey, text, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { brandProjects } from "./brandContextSchema";
import { user } from "./authSchema";
import { marketingCampaignsTable } from "./marketingSchema";
import { citiesTable } from "./schema";

// Durable host access envelope, independent of campaign lifecycle. Not SaaS tenancy.
export const citywalkBrandProjects = pgTable("citywalk_brand_projects", {
  projectId: uuid("project_id").notNull().references(() => brandProjects.id, { onDelete: "cascade" }),
  cityId: integer("city_id").notNull().references(() => citiesTable.id, { onDelete: "restrict" }),
}, t => [primaryKey({ columns: [t.projectId, t.cityId] })]);
export const citywalkBrandProjectCampaigns = pgTable("citywalk_brand_project_campaigns", {
  projectId: uuid("project_id").notNull(),
  campaignId: integer("campaign_id").notNull(),
  cityId: integer("city_id").notNull(),
}, t => [
  primaryKey({ columns: [t.projectId, t.campaignId] }),
  foreignKey({ name: "citywalk_brand_campaign_scope_fk", columns: [t.projectId, t.cityId], foreignColumns: [citywalkBrandProjects.projectId, citywalkBrandProjects.cityId] }).onDelete("cascade"),
  foreignKey({ name: "citywalk_brand_campaign_owner_fk", columns: [t.campaignId, t.cityId], foreignColumns: [marketingCampaignsTable.id, marketingCampaignsTable.cityId] }).onDelete("cascade"),
  index("citywalk_brand_campaign_idx").on(t.campaignId),
]);
export const citywalkBrandReviewers = pgTable("citywalk_brand_reviewers", {
  actorId: uuid("actor_id").primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
}, t => [uniqueIndex("citywalk_brand_reviewer_user_unique").on(t.userId)]);
