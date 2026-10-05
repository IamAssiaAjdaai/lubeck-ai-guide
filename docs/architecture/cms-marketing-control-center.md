# CITYWALK CMS → Marketing Control Center

## Purpose

CITYWALK already has a production-oriented CMS foundation. The goal is not to replace it with a second CMS or a separate marketing admin. The goal is to simplify the existing console, keep PostgreSQL/CMS content as the source of truth, and add marketing workflows on top of the same content graph.

## Current CMS strengths

- Better Auth + staff RBAC with city-scoped permissions.
- Database-backed cities, places and curated tours.
- Localized authored content.
- Draft → review → approved → published → archived workflow.
- Published place revisions that keep the last live revision stable while new work is reviewed.
- Canonical content sources and publication-time source validation.
- Media library with review lifecycle, rights metadata and city/place/tour attachments.
- Translation and exact-language audio operations.
- Multi-city public repository/API.
- City launch-readiness model covering content, sources, imagery, rights, tours, AI coverage, audio and QA.

## UX problems found in the audit

- Navigation reflects technical areas more than daily work.
- Sources, Publishing and Staff were placeholder top-level destinations.
- Dashboard copy was stale and described the CMS as a future foundation even though editing/publishing is already implemented.
- City work is split across Cities, Places, Tours, Media and Operations.
- Tour list had no city/status workflow filters.
- Media filters displayed numeric city IDs instead of human city names.
- Launch readiness existed in backend/reporting but was not visible in the city editing workflow.
- Place editing is powerful but still exposes engineer-oriented fields such as comma-separated tag slugs and line-formatted facts.
- Marketing entities (campaigns, marketing pages, social content, attribution and referral performance) do not exist yet.

## Control-center information architecture

```text
Dashboard

Cities
  └─ City workspace
      ├─ Overview / readiness
      ├─ Places
      ├─ Tours
      ├─ Media
      └─ Languages / audio

Places
Tours
Media
Review queue
Operations
Commerce

Marketing (next checkpoint)
  ├─ Campaigns
  ├─ Pages
  ├─ Social content
  └─ Performance
```

## Source-of-truth rule

Create verified destination knowledge once and reuse it.

```text
City / Place / Tour CMS
        ↓
PostgreSQL
        ↓
Public content repository
        ↓
App + Website + Marketing drafts
```

Marketing generation may read published CMS content. It must not silently rewrite coordinates, source-backed facts, operational status, media rights or live traveler content.

## Marketing model planned for the next checkpoint

### Campaigns

A campaign groups one audience/message/goal with its pages and distributed content.

Example:

- Name: 2 Hours in Lübeck
- Goal: completed walk
- City: Lübeck
- Audience: short-stay/day-trip visitors
- Message: Got 2 hours in Lübeck?
- CTA: Build my walk

### Marketing pages

Use one page model with a kind instead of separate blog and landing silos.

- kind: landing | blog
- city
- campaign
- slug
- title / excerpt / body
- SEO metadata
- CTA
- publication status

### Social content

- campaign
- platform
- format
- hook
- script
- caption
- CTA
- tracking code
- publishing status / published URL

### Attribution

PostHog remains the analytics destination. Campaign/content identity travels with product funnel events instead of duplicating event data in CMS tables.

Planned funnel events:

- marketing_landing_view
- planner_started
- route_generated
- walk_started
- three_stops_reached
- walk_completed
- share_created
- share_clicked
- referral_landing_view
- referral_walk_completed

## Boundaries

- Main CITYWALK brand landing remains a controlled product/design surface.
- Campaign-specific landing/blog pages can become CMS-driven.
- CMS publication, product launch state and marketing campaign state remain separate concepts.
- Existing code/bootstrap content remains a migration/fallback path; new marketing content should read database CMS content.
- AI generation creates drafts only in V1. Human approval remains required.
- Social auto-publishing and external automation tools are not required for V1.
