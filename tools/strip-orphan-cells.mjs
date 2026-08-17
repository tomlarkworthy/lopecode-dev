/**
 * Excise the orphaned export machinery from the legacy @tomlarkworthy/exporter.
 *
 * `cellToDefines` depends on `sourceModule`, imported from
 * @tomlarkworthy/observablejs-toolchain, which no copy in the corpus defines. An
 * unresolved import is never delivered, so every cell downstream of it is inert:
 * cellToDefines, generate_define, generate_module_source, module_specs{,_new,_old},
 * book, report, tomlarkworthy_exporter_task and one anonymous cell.
 *
 * The module's live export, `exporter`, does NOT reach any of them — that is what the
 * three notebooks embedding this module actually import — so removing the sub-graph
 * plus the dangling bridge is a no-op at runtime and leaves preflight clean.
 *
 * Recomputes the poisoned set per notebook rather than trusting a hard-coded list, and
 * refuses if anything poisoned is imported elsewhere in the same notebook.
 *
 * Usage: node tools/strip-orphan-cells.mjs [--apply]
 */
import { readFileSync, writeFileSync } from 'fs';

const apply = process.argv.includes('--apply');
const MODULE = '@tomlarkworthy/exporter';
const ROOT_MISSING = 'sourceModule';
const FILES = [
  'lopebooks/notebooks/@tomlarkworthy_vr-hackerspace.html',
  'lopebooks/notebooks/@tomlarkworthy_moldable-webpage.html',
  'lopebooks/notebooks/@tomlarkworthy_robocoop3-training.html',
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const blockRe = (id) => new RegExp(`(<script\\s+id="${esc(id)}"[^>]*>)([\\s\\S]*?)(</script>)`);

for (const file of FILES) {
  const html = readFileSync(file, 'utf8');
  const m = blockRe(MODULE).exec(html);
  if (!m) { console.log(`${file}: ${MODULE} absent, skipping`); continue; }
  let body = m[2];

  // pid -> name (anonymous cells carry `null`, and are addressed by pid)
  const pidOf = new Map();
  const deps = new Map();
  for (const d of body.matchAll(/\$def\(\s*"([^"]*)"\s*,\s*("[^"]+"|null)\s*,\s*\[([^\]]*)\]/g)) {
    const name = d[2] === 'null' ? d[1] : d[2].slice(1, -1);
    pidOf.set(name, d[1]);
    deps.set(name, [...d[3].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
  }
  for (const d of body.matchAll(/main\.define\("([^"]+)",\s*\[([^\]]*)\]/g))
    if (!deps.has(d[1])) deps.set(d[1], [...d[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]));

  // everything transitively downstream of the name that never resolves
  const poisoned = new Set([ROOT_MISSING]);
  for (let changed = true; changed; ) {
    changed = false;
    for (const [n, ds] of deps)
      if (!poisoned.has(n) && ds.some((d) => poisoned.has(d))) { poisoned.add(n); changed = true; }
  }

  // refuse if any other module in this notebook imports something poisoned
  const imported = new Set();
  for (const b of html.matchAll(/<script\s+id="([^"]+)"([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!/data-mime="application\/javascript"/.test(b[2]) || b[1] === MODULE) continue;
    for (const s of b[3].matchAll(
      new RegExp(`main\\.define\\("[^"]*",\\s*\\[\\s*"module ${esc(MODULE)}",[^\\]]*\\][^)]*\\)\\s*=>\\s*v\\.import\\("([^"]+)"`, 'g')))
      imported.add(s[1]);
  }
  const clash = [...imported].filter((s) => poisoned.has(s));
  if (clash.length) { console.log(`${file}: REFUSED — still imported: ${clash.join(', ')}`); continue; }

  // drop each poisoned cell's function const and its $def registration
  let dropped = [];
  for (const name of poisoned) {
    if (name === ROOT_MISSING) continue;
    const pid = pidOf.get(name);
    if (!pid) continue;
    // a cell body runs from `const <pid> = ` to the next top-level `const _`,
    // the registration section, or `export default` — never past the block
    const start = body.indexOf(`const ${pid} = `);
    if (start < 0) continue;
    const rest = body.slice(start + 1);
    const nexts = [/\nconst _/.exec(rest), /\n\s*main\.define\(/.exec(rest), /\nexport default/.exec(rest)]
      .filter(Boolean).map((x) => x.index);
    if (!nexts.length) continue;
    const end = start + 1 + Math.min(...nexts) + 1;
    body = body.slice(0, start) + body.slice(end);
    body = body.replace(new RegExp(`^[ \\t]*\\$def\\(\\s*"${esc(pid)}"[^\\n]*\\n`, 'm'), '');
    dropped.push(`${name} (${pid})`);
  }
  // and the bridge that started it
  body = body.replace(
    new RegExp(`^[ \\t]*main\\.define\\("${ROOT_MISSING}",\\s*\\["module [^"]+",\\s*"@variable"\\][^\\n]*\\n`, 'm'), '');

  console.log(`${file.split('/').pop()}: ${apply ? 'dropped' : 'would drop'} ${dropped.length} cell(s) + the ${ROOT_MISSING} bridge`);
  for (const d of dropped) console.log(`    ${d}`);
  if (apply) {
    const out = html.slice(0, m.index) + m[1] + body + m[3] + html.slice(m.index + m[0].length);
    writeFileSync(file, out);
  }
}
