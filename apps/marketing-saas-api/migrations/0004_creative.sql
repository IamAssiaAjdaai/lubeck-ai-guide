-- Optional local QA extension. Existing v1/v2 tables and contracts are untouched.
CREATE TABLE mkt_creative_projects (
  project_id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  state jsonb NOT NULL,
  FOREIGN KEY(project_id, organization_id) REFERENCES mkt_projects(id, organization_id)
);
CREATE TABLE mkt_creative_versions (
  project_id uuid NOT NULL REFERENCES mkt_creative_projects(project_id),
  revision integer NOT NULL CHECK (revision > 0),
  actor_id text NOT NULL REFERENCES "user"(id),
  action text NOT NULL,
  state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(project_id, revision)
);
CREATE TABLE mkt_creative_charges (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES mkt_organizations(id),
  project_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('image','video')),
  month text NOT NULL,
  idempotency_key uuid NOT NULL,
  request_hash text NOT NULL,
  reserved_micro_eur integer NOT NULL CHECK (reserved_micro_eur >= 0),
  finalized_micro_eur integer CHECK (finalized_micro_eur >= 0),
  uncertain boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, kind, idempotency_key),
  FOREIGN KEY(project_id, organization_id) REFERENCES mkt_projects(id, organization_id)
);
CREATE INDEX mkt_creative_charges_budget ON mkt_creative_charges(organization_id, kind, month);
