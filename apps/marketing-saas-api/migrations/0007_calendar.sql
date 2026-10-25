-- WIRKFADEN Calendar V1: local, manual planning only. No publisher or credentials.
CREATE TABLE mkt_calendar_entries (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES mkt_projects(id) ON DELETE CASCADE,
  generation_id uuid NOT NULL REFERENCES mkt_generations(id),
  post_index integer NOT NULL CHECK (post_index BETWEEN 0 AND 2),
  pack_version integer NOT NULL CHECK (pack_version > 0),
  planned_at timestamptz NOT NULL,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_by text NOT NULL REFERENCES "user"(id),
  published_manually_at timestamptz,
  published_manually_by text REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mkt_calendar_once_per_post UNIQUE (project_id, generation_id, post_index)
);
CREATE INDEX mkt_calendar_project_time ON mkt_calendar_entries(project_id, planned_at, id);
