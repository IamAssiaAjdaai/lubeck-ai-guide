-- Local Creative QA only: no v1 Pack, Brand Context, auth or tenant contract changes.
ALTER TABLE mkt_creative_charges ADD COLUMN metadata_erased_at timestamptz;
CREATE TABLE mkt_creative_erasures (
 project_id uuid PRIMARY KEY REFERENCES mkt_creative_projects(project_id),
 organization_id uuid NOT NULL REFERENCES mkt_organizations(id),
 request_hash text NOT NULL,
 requested_at timestamptz NOT NULL,
 completed_at timestamptz,
 policy_version integer NOT NULL DEFAULT 1,
 erased_versions integer NOT NULL,
 erased_assets integer NOT NULL,
 erased_jobs integer NOT NULL
);
CREATE TABLE mkt_creative_retention_events (
 id uuid PRIMARY KEY,
 project_id uuid NOT NULL REFERENCES mkt_creative_projects(project_id),
 created_at timestamptz NOT NULL,
 erased_versions integer NOT NULL,
 erased_assets integer NOT NULL,
 erased_jobs integer NOT NULL
);
