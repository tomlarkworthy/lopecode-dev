# Querying and Maintaining the Lopecode Structured Knowledgebase

Two complementary stores hold structured knowledge about lopecode-dev:

1. **`kb/`** in this repo — DuckDB views over existing on-disk JSON (`content.json`, `tools/depmap.json`, per-notebook `*.json`). Deterministic facts derived from the repo's own data. No duplication, no manual curation.
2. **A personal mempalace knowledge graph** at `~/.mempalace/knowledge_graph.sqlite3` — curated decision and temporal facts that don't appear in JSON, with optional links to verbatim session drawers.

This document covers `kb/`. For mempalace, see its README under `vendor/mempalace/` if you've vendored it; otherwise it is a per-developer concern.

## Why two stores?

- **Structural facts** (X imports Y, X is published at URL Z, X is bundled in notebook N) derive from JSON. Putting them in mempalace's KG would duplicate the JSON — every notebook update would require a sync. Keeping them as DuckDB views over JSON means the kb auto-tracks reality.
- **Decision facts** ("exporter-3 was created because of file-sync", "the migration to v3 is in progress as of $DATE") come from sessions, not JSON. Putting them in `kb/` would mean fabricating non-existent on-disk evidence; their justification *is* a conversation, so they belong somewhere with drawer-level provenance.

So:
- `kb/` for *what is mechanically true about the code right now*
- mempalace KG for *why decisions were made and when*

If you don't use mempalace, the second category lives only as prose in this `knowledge/` directory.

## What `kb/` contains

```
kb/
└── views.sql        # DuckDB view definitions (the implementation)
```

That's it. No data — the data is in `content.json`, `tools/depmap.json`, and per-notebook `*.json` files, which the views read from. No materialised database is committed; you build one transient DB per query session.

## Predicate vocabulary

| Predicate | Subject | Object | Source |
|---|---|---|---|
| `observableUrl` | module slug (`@tomlarkworthy/exporter-3`) | URL on observablehq.com | `content.json[*].sourceUrl` |
| `publishedAt` | module slug | URL on tomlarkworthy.github.io | `content.json[*].url` |
| `containsModule` | notebook id (`@tomlarkworthy_exporter-3`) | module slug | `tools/depmap.json` (inverted) |
| `repoLocation` | notebook id | file path within repo | `lopecode/notebooks/<id>.html` and/or `lopebooks/notebooks/<id>.html` (whichever exist) |

### Two subject namespaces

The kb has two different identity conventions for related entities:

- **Module slug** — `@tomlarkworthy/exporter-3` (slash form). Identifies a module as published on Observable.
- **Notebook id** — `@tomlarkworthy_exporter-3` (underscore form). Identifies an HTML artifact in this repo. Derived from the slug by replacing `/` with `_`.

The `containsModule` predicate is the bridge: its subject is a notebook id, its object is a module slug. To find *everything* about a thing called "exporter-3," query both forms, or pivot through `containsModule`.

The asymmetry is intrinsic to lopecode's design (modules and notebooks have different lifecycles even when they share a name); the kb surfaces it rather than papering over it.

**Vocabulary is closed by design.** Adding a new predicate requires editing both `kb/views.sql` and this table. This is on purpose — open vocabularies degrade fast (`supersedes` vs `replaces` vs `supercedes` typo). If you find yourself wanting a free-form predicate, that's a signal it belongs in mempalace's KG, not here.

## Querying

DuckDB CLI is the simplest path. Install once:

```bash
brew install duckdb
```

Then from the `lopecode-dev` root:

```bash
duckdb -c ".read kb/views.sql; SELECT * FROM kb_triples WHERE subject = '@tomlarkworthy_exporter-3'"
```

For programmatic access, DuckDB has Python (`duckdb` on pip) and Node (`@duckdb/node-api`) bindings.

For ad-hoc shell queries, `jq` works directly on the JSON without going through DuckDB:

```bash
# Observable URL for a module
jq -r '.entries[] | select(.slug=="@tomlarkworthy/exporter-3") | .sourceUrl' content.json

# Notebooks bundling a module (from depmap)
jq -r '.["@tomlarkworthy/runtime-sdk"][]' tools/depmap.json
```

## Common queries

```sql
-- All facts about a notebook
SELECT * FROM kb_triples WHERE subject = '@tomlarkworthy_exporter-3';

-- Notebooks containing a module (reverse edge)
SELECT subject FROM kb_triples
WHERE predicate = 'containsModule' AND object = '@tomlarkworthy/runtime-sdk';

-- Top-10 most-bundled modules (the "everybody depends on" list)
SELECT object, COUNT(*) AS notebooks
FROM kb_triples WHERE predicate = 'containsModule'
GROUP BY object ORDER BY notebooks DESC LIMIT 10;

-- Modules that are booted (in bootconf.mains) anywhere
SELECT DISTINCT object FROM kb_triples WHERE predicate = 'mainModule';

-- Notebooks that exist in both lopecode/ and lopebooks/
SELECT subject FROM kb_triples
WHERE predicate = 'repoLocation'
GROUP BY subject HAVING COUNT(*) > 1;

-- Observable URL given a module slug
SELECT object FROM kb_triples
WHERE subject = '@tomlarkworthy/exporter-3' AND predicate = 'observableUrl';
```

DuckDB also supports recursive CTEs, useful if you later add transitive predicates (e.g. `imports` — see *Open items* below).

## Maintenance

`kb/` is **derived data**. No manual maintenance for typical changes:

- **Adding a notebook** → run lope-reader to generate the per-notebook `.json`, regenerate `tools/depmap.json` via existing tooling, optionally add an entry to `content.json`. Views auto-pick up new data on next query.
- **Updating a module** → re-jumpgate. Same.
- **Removing a notebook** → delete the `.html` and `.json`, regenerate depmap. Views shrink automatically.

**The only manual change** is when you want to add a new predicate:

1. Add `CREATE OR REPLACE VIEW kb_<predicate> AS ...` to `kb/views.sql`.
2. Add it to the `kb_triples` UNION ALL at the bottom of the same file.
3. Add a row to the predicate vocabulary table in this doc.
4. Commit both files together.

Vocabulary changes deserve a real PR review — they shape every downstream query.

## Relationship to mempalace

If you use mempalace and want kb facts also queryable inside Claude Code via the `mempalace_kg_query` MCP tool, a sync step replays the views into mempalace's KG:

```bash
duckdb -c ".read kb/views.sql;
  COPY (SELECT * FROM kb_triples) TO '/tmp/kb_dump.tsv' (FORMAT CSV, DELIMITER E'\t', HEADER FALSE);"
# then a small script reads /tmp/kb_dump.tsv and calls mempalace_kg_add for each row
```

The direction is `kb` → mempalace, never reversed. mempalace becomes a queryable view of `kb`, not a parallel store. mempalace's KG retains its own role — curated decision facts that don't derive from JSON.

If you don't use mempalace, this section is irrelevant; DuckDB queries are sufficient.

## Open items

1. **Module → module imports edges** are not in any committed JSON. They live in compiled `lope-file` blocks inside the `*.html` notebooks (the `main.define("module @author/X", ...)` lines, decoded by `tools/lope-reader.ts --get-module`). To add an `imports` predicate to `kb/`, either:
   - Extend `tools/lope-reader.ts` to emit the edges into a committed `tools/imports.json` cache, and add a view over it.
   - Or compute on demand (slow — would require parsing 188 notebooks × N modules each).
2. **`mainModule` predicate** (which modules a notebook boots, from `bootconf.mains`) is dropped because per-notebook `*.json` files generated by `lope-reader.ts` are not committed. To re-introduce, either commit those files or extract the data into a committed cache file.
3. **Mempalace sync script** — if/when adopted, lives at `tools/kb-sync-mempalace.ts` and gets its own short knowledge doc.
4. **Recursive submodule init.** This repo has nested submodules (`lopecode/`, `lopebooks/`, `vendor/*`). To run `kb_repo_location` queries from a fresh clone, run `git submodule update --init --recursive` first so the `*.html` files exist on disk for `glob()` to find.
