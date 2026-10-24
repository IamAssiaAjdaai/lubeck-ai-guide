CREATE TABLE IF NOT EXISTS mkt_organizations (
 id uuid PRIMARY KEY, name text NOT NULL, plan text NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','growth')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mkt_memberships (
 organization_id uuid NOT NULL REFERENCES mkt_organizations(id), user_id text NOT NULL REFERENCES "user"(id),
 role text NOT NULL CHECK (role IN ('owner','editor','viewer')), PRIMARY KEY(organization_id,user_id)
);
CREATE INDEX IF NOT EXISTS mkt_memberships_user_idx ON mkt_memberships(user_id);
CREATE TABLE IF NOT EXISTS mkt_projects (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES mkt_organizations(id), name text NOT NULL,
 revision integer NOT NULL DEFAULT 0 CHECK(revision>=0), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,organization_id)
);
CREATE TABLE IF NOT EXISTS mkt_brand_versions (
 project_id uuid NOT NULL REFERENCES mkt_projects(id), revision integer NOT NULL CHECK(revision>0), context jsonb NOT NULL,
 evidence jsonb NOT NULL DEFAULT '[]', actor_id text NOT NULL REFERENCES "user"(id), action text NOT NULL CHECK(action IN ('revise','confirm')),
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(project_id,revision)
);
