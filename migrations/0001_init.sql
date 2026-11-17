CREATE TABLE IF NOT EXISTS links (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  destination TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  created_by TEXT,
  imported_from TEXT,
  bitly_engagements INTEGER
);

CREATE TABLE IF NOT EXISTS clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  clicked_at TEXT NOT NULL,
  country TEXT,
  referrer TEXT
);

CREATE INDEX IF NOT EXISTS idx_clicks_slug_time ON clicks (slug, clicked_at);
CREATE INDEX IF NOT EXISTS idx_links_created ON links (created_at DESC, slug ASC);
