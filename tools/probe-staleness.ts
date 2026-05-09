#!/usr/bin/env bun
/**
 * probe-staleness.ts — Detect notebooks that have drifted from ObservableHQ
 *
 * Scans per-notebook .json specs in lopecode/notebooks/ and lopebooks/notebooks/,
 * fetches the current Observable document version for each (in parallel), and
 * reports drift relative to the locally recorded `observable_version`.
 *
 * Usage:
 *   bun tools/probe-staleness.ts [--dir <path>]... [--concurrency <n>] [--json]
 *
 * Exit code is always 0 — drift is informational, not failure.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';

type Spec = {
  notebook?: string;
  'observablehq.com'?: string;
  upstreams?: Record<string, Record<string, string>>;
  observable_version?: number;
  observable_update_time?: string;
};

type Probe = {
  notebook: string;
  module?: string;
  observableUrl: string;
  localVersion: number | null;
  localUpdateTime: string | null;
  remoteVersion: number | null;
  remoteUpdateTime: string | null;
  status: 'fresh' | 'stale' | 'unknown' | 'removed' | 'error' | 'skipped';
  message?: string;
};

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const opts = {
    dirs: [] as string[],
    concurrency: 16,
    json: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dir' && args[i + 1]) opts.dirs.push(args[++i]);
    else if (a === '--concurrency' && args[i + 1]) opts.concurrency = parseInt(args[++i], 10);
    else if (a === '--json') opts.json = true;
    else if (a === '--help' || a === '-h') {
      console.log(`probe-staleness.ts — report Observable drift per notebook

Usage:
  bun tools/probe-staleness.ts [--dir <path>]... [--concurrency <n>] [--json]

Defaults to scanning lopecode/notebooks and lopebooks/notebooks.`);
      process.exit(0);
    }
  }
  if (opts.dirs.length === 0) {
    opts.dirs = ['lopecode/notebooks', 'lopebooks/notebooks'];
  }
  return opts;
}

function listSpecs(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const f of entries) {
    if (!f.endsWith('.json')) continue;
    const p = join(dir, f);
    try {
      if (statSync(p).isFile()) out.push(p);
    } catch { /* skip */ }
  }
  return out;
}

function toApiUrl(observableUrl: string): string | null {
  const prefix = 'https://observablehq.com/';
  if (!observableUrl.startsWith(prefix)) return null;
  return 'https://api.observablehq.com/document/' + observableUrl.slice(prefix.length);
}

function daysBetween(aIso: string | null, bIso: string | null): number | null {
  if (!aIso || !bIso) return null;
  const a = Date.parse(aIso), b = Date.parse(bIso);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.floor(Math.abs(b - a) / 86400000);
}

async function probeUrl(
  notebook: string,
  module: string | undefined,
  observableUrl: string,
  localVersion: number | null,
  localUpdateTime: string | null,
): Promise<Probe> {
  const apiUrl = toApiUrl(observableUrl);
  const base = { notebook, module, observableUrl, localVersion, localUpdateTime };
  if (!apiUrl) {
    return { ...base, remoteVersion: null, remoteUpdateTime: null, status: 'skipped', message: 'unsupported URL form' };
  }

  let res: Response;
  try {
    res = await fetch(apiUrl, { headers: { accept: 'application/json' } });
  } catch (e) {
    return { ...base, remoteVersion: null, remoteUpdateTime: null, status: 'error', message: `fetch: ${(e as Error).message}` };
  }
  if (res.status === 404) {
    return { ...base, remoteVersion: null, remoteUpdateTime: null, status: 'removed', message: 'API returned 404' };
  }
  if (!res.ok) {
    return { ...base, remoteVersion: null, remoteUpdateTime: null, status: 'error', message: `HTTP ${res.status}` };
  }

  let body: { version?: number; update_time?: string };
  try {
    body = await res.json() as typeof body;
  } catch (e) {
    return { ...base, remoteVersion: null, remoteUpdateTime: null, status: 'error', message: `json: ${(e as Error).message}` };
  }

  const remoteVersion = typeof body.version === 'number' ? body.version : null;
  const remoteUpdateTime = body.update_time ?? null;

  let status: Probe['status'];
  if (localVersion == null) status = 'unknown';
  else if (remoteVersion == null) status = 'error';
  else if (localVersion >= remoteVersion) status = 'fresh';
  else status = 'stale';

  return { ...base, remoteVersion, remoteUpdateTime, status };
}

async function probeOne(specPath: string): Promise<Probe[]> {
  let spec: Spec;
  try {
    spec = JSON.parse(readFileSync(specPath, 'utf-8'));
  } catch (e) {
    return [{
      notebook: basename(specPath, '.json'),
      observableUrl: '',
      localVersion: null, localUpdateTime: null,
      remoteVersion: null, remoteUpdateTime: null,
      status: 'error',
      message: `parse: ${(e as Error).message}`,
    }];
  }
  const notebook = spec.notebook ?? basename(specPath, '.json');
  const localVersion = spec.observable_version ?? null;
  const localUpdateTime = spec.observable_update_time ?? null;

  // Preferred schema: upstreams[host][module] = url. One probe per module.
  const obsUpstreams = spec.upstreams?.['observablehq.com'];
  if (obsUpstreams && Object.keys(obsUpstreams).length > 0) {
    const entries = Object.entries(obsUpstreams);
    const isMulti = entries.length > 1;
    return Promise.all(entries.map(([module, url]) =>
      // For multi-source bundles, top-level observable_version only describes
      // the primary; non-primary modules show as "unknown" until per-module
      // versions are recorded.
      probeUrl(notebook, module, url,
        !isMulti || module === entries[0][0] ? localVersion : null,
        !isMulti || module === entries[0][0] ? localUpdateTime : null,
      ),
    ));
  }

  // Legacy schema: top-level "observablehq.com" string.
  const observableUrl = spec['observablehq.com'];
  if (!observableUrl) return [];
  return [await probeUrl(notebook, undefined, observableUrl, localVersion, localUpdateTime)];
}

async function runWithConcurrency<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

function formatLine(p: Probe): string {
  const display = p.module ? `${p.notebook} [${p.module}]` : p.notebook;
  const name = display.padEnd(48);
  switch (p.status) {
    case 'stale': {
      const days = daysBetween(p.localUpdateTime, p.remoteUpdateTime);
      const drift = days != null ? `, ${days}d` : '';
      return `stale:   ${name} (local v${p.localVersion} → remote v${p.remoteVersion}${drift})`;
    }
    case 'removed':
      return `removed: ${name} (local v${p.localVersion ?? '?'}; ${p.message})`;
    case 'unknown':
      return `unknown: ${name} (no observable_version recorded; remote v${p.remoteVersion})`;
    case 'error':
      return `error:   ${name} (${p.message})`;
    case 'skipped':
      return `skipped: ${name} (${p.message})`;
    case 'fresh':
      return '';
  }
}

async function main() {
  const opts = parseArgs(process.argv);
  const root = process.cwd();
  const specPaths: string[] = [];
  for (const d of opts.dirs) {
    const abs = resolve(root, d);
    specPaths.push(...listSpecs(abs));
  }
  if (specPaths.length === 0) {
    process.stderr.write('No .json specs found in: ' + opts.dirs.join(', ') + '\n');
    process.exit(0);
  }

  const probeBatches = await runWithConcurrency(specPaths, opts.concurrency, probeOne);
  const meaningful: Probe[] = probeBatches.flat();

  if (opts.json) {
    process.stdout.write(JSON.stringify(meaningful, null, 2) + '\n');
    process.exit(0);
  }

  const stale = meaningful.filter(p => p.status === 'stale');
  const removed = meaningful.filter(p => p.status === 'removed');
  const unknown = meaningful.filter(p => p.status === 'unknown');
  const errors = meaningful.filter(p => p.status === 'error');
  const skipped = meaningful.filter(p => p.status === 'skipped');
  const fresh = meaningful.filter(p => p.status === 'fresh');

  stale.sort((a, b) =>
    (daysBetween(b.localUpdateTime, b.remoteUpdateTime) ?? 0) -
    (daysBetween(a.localUpdateTime, a.remoteUpdateTime) ?? 0));
  for (const p of stale) console.log(formatLine(p));
  for (const p of removed) console.log(formatLine(p));
  for (const p of unknown) console.log(formatLine(p));
  for (const p of errors) console.log(formatLine(p));
  for (const p of skipped) console.log(formatLine(p));

  const checked = stale.length + fresh.length;
  console.log('');
  console.log(`fresh:   ${fresh.length} / ${checked}`);
  if (unknown.length) console.log(`unknown: ${unknown.length} (no observable_version yet — re-jumpgate to populate)`);
  if (removed.length) console.log(`removed: ${removed.length}`);
  if (errors.length)  console.log(`errors:  ${errors.length}`);
  if (skipped.length) console.log(`skipped: ${skipped.length}`);
  const localOnly = probeBatches.filter(b => b.length === 0).length;
  console.log(`(${localOnly} spec(s) with no upstream URL — local-only)`);

  process.exit(0);
}

main();
