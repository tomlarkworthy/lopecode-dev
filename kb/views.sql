-- ============================================================
-- kb/views.sql — DuckDB views over lopecode-dev's committed JSON
-- ============================================================
-- Run from the lopecode-dev repo root:
--   duckdb -c ".read kb/views.sql; SELECT * FROM kb_triples LIMIT 10"
--
-- See knowledge/querying-and-maintaining-the-lopecode-structured-knowledgebase.md
-- for the predicate vocabulary, design rationale, and maintenance notes.
--
-- Source files (all tracked in git):
--   content.json        — module catalogue (observableUrl, publishedAt)
--   tools/depmap.json   — module → notebook bundling map
-- Per-notebook *.json files are build artifacts (not committed); they are
-- intentionally NOT used here — see the knowledge doc.
-- ============================================================

-- ---------- Source views (1:1 with the JSON files) ----------

-- content.json structure: { version, categories: [...], entries: [...] }
-- Each entry has: slug, url, title, description, sourceUrl, category, ...
CREATE OR REPLACE VIEW catalogue AS
SELECT entry.* FROM (
  SELECT UNNEST(entries) AS entry
  FROM read_json_auto('content.json', maximum_object_size=104857600)
);

-- depmap.json structure: { module: [notebook_id, ...] }
-- DuckDB types this as MAP(VARCHAR, VARCHAR[]).
-- Flatten to (module, notebook) edge rows.
CREATE OR REPLACE VIEW depmap_edges AS
WITH dm AS (SELECT json FROM read_json_auto('tools/depmap.json'))
SELECT
  entry.key AS module,
  notebook
FROM dm,
     UNNEST(map_entries(dm.json)) AS m(entry),
     UNNEST(entry.value) AS n(notebook);

-- ---------- Triple-shaped views (one per predicate) ----------

-- module → observableUrl → URL
CREATE OR REPLACE VIEW kb_observable_url AS
SELECT slug AS subject, 'observableUrl' AS predicate, sourceUrl AS object
FROM catalogue
WHERE sourceUrl IS NOT NULL;

-- module → publishedAt → URL  (GitHub Pages location)
CREATE OR REPLACE VIEW kb_published_at AS
SELECT slug AS subject, 'publishedAt' AS predicate, url AS object
FROM catalogue
WHERE url IS NOT NULL;

-- notebook → containsModule → module
-- Flips depmap_edges so the subject is the notebook (more natural for queries).
CREATE OR REPLACE VIEW kb_contains_module AS
SELECT
  notebook AS subject,
  'containsModule' AS predicate,
  module AS object
FROM depmap_edges;

-- notebook → repoLocation → file path
-- Use glob() to enumerate actually-existing notebook HTML files,
-- then derive the notebook id from the filename.
CREATE OR REPLACE VIEW kb_repo_location AS
SELECT
  regexp_replace(regexp_replace(file, '^.*/', ''), '\.html$', '') AS subject,
  'repoLocation' AS predicate,
  file AS object
FROM glob(['lopecode/notebooks/*.html', 'lopebooks/notebooks/*.html']);

-- ---------- Unified triple view (the main query surface) ----------

CREATE OR REPLACE VIEW kb_triples AS
  SELECT * FROM kb_observable_url
  UNION ALL SELECT * FROM kb_published_at
  UNION ALL SELECT * FROM kb_contains_module
  UNION ALL SELECT * FROM kb_repo_location;
