/**
 * Remove import bridges that can never resolve and that nothing consumes.
 *
 * The exporter emits one `main.define(name, ["module <provider>", "@variable"], …)`
 * line per imported symbol. When the provider stopped defining that symbol — or
 * never did, as with the anonymous `_0`/`_1` cells old notebooks imported — the
 * bridge dangles. The Observable runtime never delivers an unresolved import, so
 * it throws nothing; the cost is silent, and lope-preflight reports it as
 * `missing-export`.
 *
 * Two conditions must BOTH hold before a line is removed, so this can only ever
 * delete something already inert:
 *   1. no copy of the provider anywhere in the corpus defines the symbol — if some
 *      copy does, the importer is fine and the notebook just has a stale provider,
 *      which is a resync, not a deletion;
 *   2. no cell in the importing block lists the symbol as a dependency — if one
 *      does, that cell is genuinely broken and needs a real fix, not a quieter
 *      preflight.
 *
 * Usage:
 *   bun tools/lope-preflight.ts --json /tmp/pf.json
 *   node tools/strip-dead-imports.mjs /tmp/pf.json [--apply]
 * Without --apply it only reports.
 */
import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'fs';

const pfPath = process.argv[2];
const apply = process.argv.includes('--apply');
if (!pfPath) {
  console.error('usage: node tools/strip-dead-imports.mjs <preflight.json> [--apply]');
  process.exit(2);
}

const blockRe = (id) =>
  new RegExp(`<script\\s+id="${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"([^>]*)>([\\s\\S]*?)</script>`);

const corpus = [
  ...globSync('lopecode/notebooks/*.html'),
  ...globSync('lopebooks/notebooks/*.html'),
];

/** Names a module block defines: `$def(pid, "name", …)` plus plain `main.define("name", …)`. */
function definedNames(src) {
  const out = new Set();
  for (const m of src.matchAll(/\$def\(\s*"[^"]*"\s*,\s*"([^"]+)"/g)) out.add(m[1]);
  for (const m of src.matchAll(/main\.define\("([^"]+)"/g)) out.add(m[1]);
  return out;
}

/** Every name any cell in this block lists as a dependency, ignoring `self`'s own bridge. */
function consumedNames(src, self) {
  const out = new Set();
  for (const m of src.matchAll(/\$def\(\s*"[^"]*"\s*,\s*(?:"[^"]*"|null)\s*,\s*\[([^\]]*)\]/g))
    for (const d of m[1].matchAll(/"([^"]+)"/g)) out.add(d[1]);
  for (const m of src.matchAll(/main\.define\("([^"]+)",\s*\[([^\]]*)\]/g)) {
    if (m[1] === self) continue;
    for (const d of m[2].matchAll(/"([^"]+)"/g)) out.add(d[1]);
  }
  return out;
}

// One pass over the corpus: id -> { copies, names } where `names` counts, per symbol,
// how many copies of that module define it. Scanning per provider instead re-ran a
// backtracking `[\s\S]*?` over every 2-5 MB file and ran the heap out at 4 GB.
const corpusDefs = new Map();
for (const f of corpus) {
  const html = readFileSync(f, 'utf8');
  for (const m of html.matchAll(/<script\s+id="([^"]+)"([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!/data-mime="application\/javascript"/.test(m[2]) || /data-encoding=/.test(m[2])) continue;
    let e = corpusDefs.get(m[1]);
    if (!e) corpusDefs.set(m[1], (e = { copies: 0, names: new Map() }));
    e.copies++;
    for (const n of definedNames(m[3])) e.names.set(n, (e.names.get(n) ?? 0) + 1);
  }
}

/** How many copies of `provider` across the corpus define `sym`. */
function providersDefining(provider, sym) {
  const e = corpusDefs.get(provider);
  if (!e) return { have: 0, total: 0 };
  return { have: e.names.get(sym) ?? 0, total: e.copies };
}

const pf = JSON.parse(readFileSync(pfPath, 'utf8'));
const edits = new Map(); // file -> [{importer, sym, provider}]
const skipped = [];

for (const [nb, probs] of Object.entries(pf)) {
  for (const p of probs) {
    if (!/^missing-export/.test(p.kind)) continue;
    const m = /^(\S+) imports (\S+) from (\S+),/.exec(p.detail);
    if (!m) continue;
    const [, importer, sym, provider] = m;
    const { have, total } = providersDefining(provider, sym);
    if (have > 0) {
      skipped.push(`${nb}  ${importer}/${sym}: provider defines it in ${have}/${total} copies — stale provider, resync instead`);
      continue;
    }
    const blk = blockRe(importer).exec(readFileSync(nb, 'utf8'));
    if (!blk) { skipped.push(`${nb}  ${importer}: block not found`); continue; }
    if (consumedNames(blk[2], sym).has(sym)) {
      skipped.push(`${nb}  ${importer}/${sym}: a cell depends on it — real breakage, needs a fix not a deletion`);
      continue;
    }
    if (!edits.has(nb)) edits.set(nb, []);
    edits.get(nb).push({ importer, sym, provider });
  }
}

let removed = 0;
for (const [nb, list] of edits) {
  let html = readFileSync(nb, 'utf8');
  for (const { importer, sym } of list) {
    const blk = blockRe(importer).exec(html);
    if (!blk) continue;
    const body = blk[2];
    // Anchor on the whole line so the splice cannot disturb the block's `<!--/-->`
    // end marker, which lives outside the <script> element.
    const lineRe = new RegExp(`^[ \\t]*main\\.define\\("${sym}",\\s*\\["module [^"]+",\\s*"@variable"\\][^\\n]*\\n`, 'm');
    const hit = lineRe.exec(body);
    if (!hit) { skipped.push(`${nb}  ${importer}/${sym}: bridge line not matched`); continue; }
    const next = body.slice(0, hit.index) + body.slice(hit.index + hit[0].length);
    const start = blk.index + blk[0].indexOf(body, blk[1].length);
    html = html.slice(0, start) + next + html.slice(start + body.length);
    removed++;
    console.log(`${apply ? 'removed' : 'would remove'}  ${nb.split('/').pop()}  ${importer} -> ${sym}`);
  }
  if (apply) writeFileSync(nb, html);
}

if (skipped.length) {
  console.log(`\nskipped ${skipped.length}:`);
  for (const s of skipped) console.log('  ' + s);
}
console.log(`\n${apply ? 'removed' : 'would remove'} ${removed} bridge(s) across ${edits.size} notebook(s)`);
