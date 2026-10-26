-- Database schema for Journey Log.
-- The official postgres Docker image runs any .sql file placed in
-- /docker-entrypoint-initdb.d/ the first time the database starts.
-- The API also creates this table on startup, so either path works.

CREATE TABLE IF NOT EXISTS entries (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  topic VARCHAR(50) NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A few starter rows so the app is not empty on first run.
INSERT INTO entries (title, topic, notes, completed) VALUES
  ('Practised staging and committing', 'git', 'git add, git commit -m, git log --oneline', TRUE),
  ('Resolved my first merge conflict', 'git', 'Removed the <<<<<<< ======= >>>>>>> markers, then committed', TRUE),
  ('Write a Dockerfile for this API', 'docker', 'Use a small base image and run as a non-root user', FALSE);
