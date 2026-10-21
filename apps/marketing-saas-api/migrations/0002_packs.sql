CREATE TABLE mkt_usage_month (
 organization_id uuid NOT NULL REFERENCES mkt_organizations(id), month text NOT NULL,
 packs integer NOT NULL DEFAULT 0 CHECK(packs>=0), cost_micro_eur bigint NOT NULL DEFAULT 0 CHECK(cost_micro_eur>=0),
 PRIMARY KEY(organization_id,month)
);
CREATE TABLE mkt_global_usage (month text PRIMARY KEY,cost_micro_eur bigint NOT NULL DEFAULT 0 CHECK(cost_micro_eur>=0),blocked boolean NOT NULL DEFAULT false);
CREATE TABLE mkt_rate_windows (scope text NOT NULL, minute bigint NOT NULL, total integer NOT NULL,PRIMARY KEY(scope,minute));
CREATE TABLE mkt_generations (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, project_id uuid NOT NULL, user_id text NOT NULL REFERENCES "user"(id),
 idempotency_key uuid NOT NULL, request_hash text NOT NULL, operation text NOT NULL DEFAULT 'marketing_pack', month text NOT NULL,
 status text NOT NULL CHECK(status IN ('running','completed','failed')), input jsonb NOT NULL, context_revision integer NOT NULL,
 provider text NOT NULL, model text NOT NULL, prompt_version text NOT NULL, reserved_micro_eur bigint NOT NULL,
 cost_micro_eur bigint NOT NULL, input_tokens integer, output_tokens integer, retries integer NOT NULL DEFAULT 0,
 cost_kind text NOT NULL DEFAULT 'reserved_estimate', error_code text, output_revision integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 FOREIGN KEY(project_id,organization_id) REFERENCES mkt_projects(id,organization_id), UNIQUE(organization_id,idempotency_key)
);
CREATE INDEX mkt_generations_project_idx ON mkt_generations(project_id,created_at);
CREATE TABLE mkt_pack_versions (
 generation_id uuid NOT NULL REFERENCES mkt_generations(id), version integer NOT NULL, content jsonb NOT NULL,
 actor_id text NOT NULL REFERENCES "user"(id), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(generation_id,version)
);
CREATE TABLE mkt_pack_events (
 id uuid PRIMARY KEY,generation_id uuid NOT NULL REFERENCES mkt_generations(id),version integer NOT NULL,
 actor_id text NOT NULL REFERENCES "user"(id),event text NOT NULL CHECK(event IN ('manual_edit','manual_export')),
 created_at timestamptz NOT NULL DEFAULT now()
);
