#!/usr/bin/env bun
/**
 * build-export-spec.ts — Generate bulk-jumpgate export specs from the kb DuckDB view.
 *
 * Produces one spec per content directory (lopecode/notebooks and lopebooks/notebooks)
 * so each can be bulk-exported in place.
 *
 * For each notebook HTML in kb_repo_location:
 *   - If a `.json` companion exists → take sources from kb_upstream
 *     (alphabetical; primary ordering doesn't affect correctness, see chat 2026-05-16)
 *   - Else → derive a single source from the filename convention
 *     (`@author_name` → `@author/name` at the first underscore)
 *
 * Single-source entries emit `{name}`. Multi-source entries (atproto, jumpgates)
 * emit `{sources, filename}`. Both forms are understood by the updated
 * @tomlarkworthy/bulk-jumpgate (see git: @tomlarkworthy/bulk-jumpgate: support multi-source spec entries).
 *
 * Usage:
 *   bun tools/build-export-spec.ts                       # write specs to lopecode/ and lopebooks/
 *   bun tools/build-export-spec.ts --dry-run             # print to stdout, write nothing
 *   bun tools/build-export-spec.ts --out-dir <dir>       # write specs to <dir>/{lopecode,lopebooks}_export_spec.json
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

type Row = {
  notebook: string;
  dir: string;
  sources: string[];
  is_multi: boolean;
};

type SpecEntry =
  | { name: string }
  | { sources: string[]; filename: string };

type Spec = {
  additionalMains: string[];
  notebooks: SpecEntry[];
};

function parseArgs(argv: string[]) {
  const opts = { dryRun: false, outDir: null as string | null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--dry-run') opts.dryRun = true;
    else if (argv[i] === '--out-dir' && argv[i + 1]) opts.outDir = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(`build-export-spec.ts — generate bulk-jumpgate export specs

Usage:
  bun tools/build-export-spec.ts [--dry-run] [--out-dir <dir>]

By default, writes lopecode/export_spec.json and lopebooks/export_spec.json
(both relative to repo root). --dry-run prints them to stdout instead.`);
      process.exit(0);
    }
  }
  return opts;
}

function runQuery(): Row[] {
  // DuckDB outputs JSON-per-row when given -json. We pipeline it once.
  // to_json wraps the list as a real JSON array string; we parse it client-side.
  // Without to_json, DuckDB emits its own [a, b] format which isn't valid JSON.
  const sql = `
    WITH derived_sources AS (
      SELECT subject AS notebook, list(object ORDER BY object) AS sources
      FROM kb_upstream GROUP BY subject
      UNION ALL
      SELECT subject AS notebook,
             [regexp_replace(subject, '^(@[^_]+)_(.+)$', '\\1/\\2')] AS sources
      FROM kb_repo_location
      WHERE subject NOT IN (SELECT subject FROM kb_upstream)
        AND starts_with(subject, '@')
    )
    SELECT
      loc.subject AS notebook,
      regexp_replace(loc.object, '/[^/]+$', '') AS dir,
      to_json(s.sources) AS sources_json,
      array_length(s.sources) > 1 AS is_multi
    FROM kb_repo_location loc
    JOIN derived_sources s ON loc.subject = s.notebook
    ORDER BY dir, loc.subject;
  `;
  const out = execFileSync(
    'duckdb',
    ['-init', 'kb/views.sql', '-json', '-c', sql],
    { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024 },
  );
  const trimmed = out.trim();
  if (!trimmed.startsWith('[')) throw new Error(`Expected JSON array start, got:\n${out.slice(0, 500)}`);
  const raw = JSON.parse(trimmed) as Array<{ notebook: string; dir: string; sources_json: string[]; is_multi: boolean }>;
  return raw.map((r) => ({
    notebook: r.notebook,
    dir: r.dir,
    sources: r.sources_json,
    is_multi: r.is_multi,
  }));
}

function buildEntry(row: Row): SpecEntry {
  if (row.is_multi) {
    return { sources: row.sources, filename: `${row.notebook}.html` };
  }
  return { name: row.sources[0] };
}

function buildSpec(entries: SpecEntry[]): Spec {
  return {
    additionalMains: ['@tomlarkworthy/lopepage'],
    notebooks: entries,
  };
}

function main() {
  const opts = parseArgs(process.argv);
  const rows = runQuery();

  const byDir = new Map<string, SpecEntry[]>();
  for (const row of rows) {
    if (!byDir.has(row.dir)) byDir.set(row.dir, []);
    byDir.get(row.dir)!.push(buildEntry(row));
  }

  for (const [dir, entries] of byDir) {
    const spec = buildSpec(entries);
    const multi = entries.filter((e) => 'sources' in e);
    const single = entries.length - multi.length;
    const summary = `${dir}: ${entries.length} notebook(s) (${single} single-source, ${multi.length} multi-source)`;

    if (opts.dryRun) {
      console.log(`# ${summary}`);
      console.log(JSON.stringify(spec, null, 2));
      console.log();
      continue;
    }

    // Output path: <repo>/export_spec.json (e.g. lopecode/export_spec.json)
    const repo = dir.split('/')[0];
    const outPath = opts.outDir
      ? resolve(opts.outDir, `${repo}_export_spec.json`)
      : resolve(`${repo}/export_spec.json`);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(spec, null, 2) + '\n');
    console.error(`[build-export-spec] ${summary} → ${outPath}`);

    if (multi.length > 0) {
      console.error(`[build-export-spec]   multi-source entries:`);
      for (const e of multi) {
        if ('sources' in e) {
          console.error(`[build-export-spec]     ${e.filename}: ${e.sources.join(', ')}`);
        }
      }
    }
  }
}

main();
