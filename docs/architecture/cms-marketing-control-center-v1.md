# CITYWALK Marketing Control Center — V1 implementation checkpoint

This checkpoint turns the existing CMS into the first usable Marketing workspace without changing the public traveler application or enabling autonomous publishing.

## Scope

- Add `Marketing` to the Control Center navigation.
- Add a Marketing dashboard with Campaigns, Pages and Social content.
- Add additive PostgreSQL schema for `marketing_campaigns`, `marketing_pages` and `marketing_content`.
- Keep all marketing records city-aware.
- Keep CMS publication and marketing lifecycle separate.
- Do not duplicate PostHog behavior analytics into the CMS database.
- Do not let AI auto-publish content.

## Lifecycle

Campaign status: `draft`, `active`, `paused`, `completed`, `archived`.

Page status: `draft`, `in_review`, `approved`, `published`, `archived`.

Social content status: `idea`, `draft`, `in_review`, `approved`, `ready`, `published`, `archived`.

## V1 content model

Campaigns carry the objective, audience, message, CTA and optional schedule.

Pages are either `landing` or `blog`, carry SEO metadata, route path and publishing state, and may belong to a campaign.

Social content belongs to a campaign and/or city and carries a stable content code, platform, format, hook, script/caption, CTA and optional linked page.

## Boundaries

- Published traveler places/tours remain the verified factual source of truth.
- Marketing records can reference cities but do not edit traveler facts.
- AI drafting comes in a later checkpoint and must remain human-approved before publish.
- Public rendering of campaign landing/blog pages comes after the CMS CRUD foundation.
- Sharing/referral storage is a later checkpoint.
