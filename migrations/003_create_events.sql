CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  location_text VARCHAR(255) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT events_capacity_check CHECK (capacity IS NULL OR capacity > 0)
);

CREATE TABLE rsvps (
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'going',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id),
  CONSTRAINT rsvps_status_check CHECK (status IN ('going', 'maybe', 'cancelled'))
);

CREATE INDEX idx_events_group ON events (group_id);
CREATE INDEX idx_events_starts_at ON events (starts_at);
CREATE INDEX idx_rsvps_user ON rsvps (user_id);