#!/usr/bin/env bun
/**
 * lope-bootconf.ts - Read/write a notebook's bootconf.json `mains` without corrupting the HTML.
 *
 * Why this exists: several modules embed the literal string `<script id="bootconf.json"` inside
 * exporter template code, so a naive regex matches the WRONG block and a non-greedy rewrite can
 * swallow tens of thousands of lines — producing variants that silently fail to boot. This picks
 * the block that is both `data-mime="application/json"` AND parses as JSON, and rewrites only the
 * single `"mains": [...]` line inside it.
 *
 * Usage:
 *   bun tools/lope-bootconf.ts <notebook.html> --get-mains
 *   bun tools/lope-bootconf.ts <notebook.html> --set-mains a,b,c   --out variant.html
 *   bun tools/lope-bootconf.ts <notebook.html> --drop @user/module --out variant.html
 *   bun tools/lope-bootconf.ts <notebook.html> --only @user/module --out variant.html
 *
 * --drop keeps every main except the named one; --only keeps just @tomlarkworthy/bootloader plus
 * the named one. Both are the workhorses of a leave-one-out bisect over booted modules.
 * Without --out the rewrite is written back in place.
 */
import fs from 'fs';

function parseArgs(argv: string[]) {
  const a = argv.slice(2);
  const o: any = { file: null, get: false, set: null, drop: null, only: null, out: null };
  for (let i = 0; i < a.length; i++) {
    const arg = a[i];
    if (arg === '--get-mains') o.get = true;
    else if (arg === '--set-mains') o.set = a[++i];
    else if (arg === '--drop') o.drop = a[++i];
    else if (arg === '--only') o.only = a[++i];
    else if (arg === '--out') o.out = a[++i];
    else if (!arg.startsWith('--')) o.file = arg;
  }
  if (!o.file || (!o.get && !o.set && !o.drop && !o.only)) {
    console.error('Usage: bun tools/lope-bootconf.ts <notebook.html> (--get-mains | --set-mains a,b | --drop M | --only M) [--out file]');
    process.exit(1);
  }
  return o;
}

const BLOCK_RE = /<script id="bootconf\.json"[^>]*>([\s\S]*?)<\/script>/g;

/** The real bootconf block: json mime, and its body parses. */
export function findBootconf(html: string) {
  for (const m of html.matchAll(BLOCK_RE)) {
    if (!/data-mime="application\/json"/.test(m[0])) continue;
    try {
      const conf = JSON.parse(m[1].trim());
      if (conf && typeof conf === 'object') return { match: m[0], body: m[1], conf, index: m.index! };
    } catch { /* exporter template, not the real block */ }
  }
  return null;
}

export function readMains(html: string): string[] {
  const b = findBootconf(html);
  if (!b) throw new Error('bootconf.json block not found (no json-mime block parsed)');
  return Array.isArray(b.conf.mains) ? b.conf.mains : [];
}

/** Rewrite only the `"mains": [...]` line inside the real bootconf block. */
export function writeMains(html: string, mains: string[]): string {
  const b = findBootconf(html);
  if (!b) throw new Error('bootconf.json block not found');
  const lineRe = /^(\s*)"mains":\s*(\[[\s\S]*?\])(,?)\s*$/m;
  if (!lineRe.test(b.body)) throw new Error('"mains" key not found in bootconf block');
  const newBody = b.body.replace(lineRe, (_, indent, __, comma) => `${indent}"mains": ${JSON.stringify(mains)}${comma}`);
  if (newBody === b.body) throw new Error('mains rewrite was a no-op');
  const newBlock = b.match.replace(b.body, newBody);
  return html.slice(0, b.index) + newBlock + html.slice(b.index + b.match.length);
}

if (import.meta.main) {
  const opts = parseArgs(process.argv);
  const html = fs.readFileSync(opts.file, 'utf8');
  const mains = readMains(html);

  if (opts.get) {
    console.log(JSON.stringify(mains, null, 2));
    process.exit(0);
  }

  let next: string[];
  if (opts.set) next = opts.set.split(',').map((s: string) => s.trim()).filter(Boolean);
  else if (opts.drop) next = mains.filter((m) => m !== opts.drop);
  else next = ['@tomlarkworthy/bootloader', opts.only].filter((m, i, a) => a.indexOf(m) === i);

  if (opts.drop && next.length === mains.length) console.error(`warning: --drop ${opts.drop} matched nothing`);

  const out = writeMains(html, next);
  const dest = opts.out || opts.file;
  fs.writeFileSync(dest, out);
  console.log(`${dest}: mains ${mains.length} -> ${next.length}  ${JSON.stringify(next)}`);
}
