-- Every finished round is stored as one row. Leaderboards are derived from
-- the best value per game. `id` is generated on the client so retries and
-- sendBeacon re-sends never create duplicates.
CREATE TABLE IF NOT EXISTS scores (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  game       TEXT NOT NULL,
  hand       CHAR(1) NOT NULL,
  value      INTEGER NOT NULL,
  pct        REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scores_game_value_idx ON scores (game, value DESC, created_at ASC);
