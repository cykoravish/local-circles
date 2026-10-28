CREATE TABLE interests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  city VARCHAR(100) NOT NULL,
  interest_id INTEGER NOT NULL REFERENCES interests(id) ON DELETE RESTRICT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE group_members (
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id),
  CONSTRAINT group_members_role_check CHECK (role IN ('member', 'admin'))
);

CREATE INDEX idx_groups_city ON groups (city);
CREATE INDEX idx_groups_interest ON groups (interest_id);
CREATE INDEX idx_group_members_user ON group_members (user_id);

INSERT INTO interests (name) VALUES
  ('Running'), ('Chess'), ('Photography'), ('Startups'), ('Board Games'), ('Language Exchange');