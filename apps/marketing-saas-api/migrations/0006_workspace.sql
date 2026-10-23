-- Local UX experiment: additive, no v1/v2 table or content replacement.
CREATE TABLE mkt_workspace_drafts (
 project_id uuid NOT NULL REFERENCES mkt_projects(id), user_id text NOT NULL REFERENCES "user"(id),
 data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(project_id,user_id)
);
CREATE TABLE mkt_workspace_reviews (
 generation_id uuid NOT NULL REFERENCES mkt_generations(id), version integer NOT NULL,
 post_index integer NOT NULL CHECK(post_index BETWEEN 0 AND 2), binding_hash text NOT NULL,
 image jsonb, actor_id text NOT NULL REFERENCES "user"(id), created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(generation_id,version,post_index)
);
