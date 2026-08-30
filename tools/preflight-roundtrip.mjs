#!/usr/bin/env node
// Does every compiled cell in the corpus survive decompile -> compile unchanged?
//
// Uses the REAL @tomlarkworthy/observablejs-toolchain cells (imported headlessly, not copied),
// with the three browser-only deps injected: `parser` is the notebook's own parser-6.1.0.js.gz
// attachment unpacked to tools/vendor-parser, `acorn`/`acorn_walk` come from node_modules.
//
// Work is memoized on the sha256 of the module block, which is what makes this affordable:
// the corpus holds 11,719 (notebook, module) pairs but only 424 distinct blocks.
//
//   node tools/preflight-roundtrip.mjs [--limit N] [--module @user/x] [--verbose]

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { globSync } from 'node:fs';
import * as acorn from 'acorn';
import * as acornWalk from 'acorn-walk';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i < 0 ? d : argv[i + 1]; };
const has = (n) => argv.includes(n);
const LIMIT = Number(flag('--limit', Infinity));
const ONLY = flag('--module', null);
const VERBOSE = has('--verbose');

// ---------- load the toolchain's own compile/decompile ----------
// define() builds its FileAttachment map eagerly through window.lopecode.contentSync, so the
// shim has to answer before the module can be instantiated at all. It serves the real block
// bytes; nothing forces the attachment because `parser` is overridden below.
{
  const html = readFileSync('lopecode/notebooks/@tomlarkworthy_observablejs-toolchain.html', 'utf8');
  const store = new Map();
  for (const m of html.matchAll(/<script\s+id="([^"]+)"([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!m[2].includes('data-encoding="base64"')) continue;
    store.set(m[1], { status: 200, mime: (m[2].match(/data-mime="([^"]+)"/) || [])[1],
      bytes: Buffer.from(m[3].trim(), 'base64') });
  }
  globalThis.window ??= globalThis;
  globalThis.window.lopecode ??= { contentSync: (id) => store.get(id) ?? { status: 404 } };
}
// The vendored core Runtime has no fileAttachments()/createObjectURL; define() calls both while
// wiring the attachment map. Neither is reached again -- `parser` is overridden below.
{
  const { Runtime } = await import('@observablehq/runtime');
  Runtime.prototype.fileAttachments ??= function (res) { return (name) => res(name); };
  globalThis.URL.createObjectURL ??= () => 'blob:stub';
}
const parser = await import('./vendor-parser/parser-6.1.0.mjs');
const { importNotebookModule } = await import('./notebook-import.ts');
const tc = await importNotebookModule('modules/@tomlarkworthy/observablejs-toolchain.js', {
  overrides: { parser, acorn, acorn_walk: acornWalk },
});
const compile = await tc.value('compile');
const decompile = await tc.value('decompile');

// ---------- pull cells out of a module block, statically ----------
// The block is `const _pid = function _name(deps){...};` declarations plus a define() body of
// `$def("_pid", "name", ["dep"], _pid)` calls. The $def call is the authority on name/inputs;
// the declaration supplies the definition text decompile wants.
function extractCells(src) {
  const ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'module', ranges: true });
  const decls = new Map();
  acornWalk.simple(ast, {
    VariableDeclarator(n) {
      if (n.id.type !== 'Identifier' || !n.init) return;
      if (n.init.type !== 'FunctionExpression' && n.init.type !== 'ArrowFunctionExpression') return;
      decls.set(n.id.name, src.slice(n.init.start, n.init.end));
    },
  });
  const cells = [];
  acornWalk.simple(ast, {
    CallExpression(n) {
      if (n.callee.type !== 'Identifier' || n.callee.name !== '$def') return;
      const [, nameNode, depsNode, fnNode] = n.arguments;
      if (!fnNode || fnNode.type !== 'Identifier') return;
      const def = decls.get(fnNode.name);
      if (def === undefined) return;
      const name = nameNode.type === 'Literal' ? nameNode.value : null;
      const inputs = depsNode?.type === 'ArrayExpression'
        ? depsNode.elements.map((e) => e.value) : [];
      cells.push({ _name: name, _inputs: inputs, _definition: def });
    },
  });
  return groupCells(cells);
}

// One authored CELL can emit several runtime VARIABLES, and only the parent has source:
//   viewof X  -> [viewof X, X(["Generators","viewof X"])]
//   mutable X -> [initial X, mutable X(["Mutable","initial X"]), X(["mutable X"])]
// Feeding the synthetic companions to decompile individually asks it to invert code no author
// ever wrote. cell-map groups them in-browser; this is the static equivalent.
function groupCells(cells) {
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const out = [];
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    const g = [c];
    const viewof = c._name && c._name.startsWith('viewof ') && c._name.slice(7);
    const initial = c._name && c._name.startsWith('initial ') && c._name.slice(8);
    if (viewof) {
      const nx = cells[i + 1];
      if (nx && nx._name === viewof && eq(nx._inputs, ['Generators', c._name])) { g.push(nx); i++; }
    } else if (initial) {
      const m = cells[i + 1], v = cells[i + 2];
      if (m && m._name === `mutable ${initial}` && eq(m._inputs, ['Mutable', c._name])) {
        g.push(m); i++;
        if (v && v._name === initial && eq(v._inputs, [m._name])) { g.push(v); i++; }
      }
    }
    out.push(g);
  }
  return out;
}

// ---------- corpus ----------
const explicit = argv.filter((a) => a.endsWith('.html'));
const files = explicit.length ? explicit : [
  ...globSync('lopecode/notebooks/*.html'),
  ...globSync('lopebooks/notebooks/*.html'),
].sort();
const BLOCK = /<script\s+id="([^"]+)"([^>]*)>([\s\S]*?)<\/script>/g;
const blocks = new Map(); // sha -> {id, src, copies}
for (const f of files) {
  const html = readFileSync(f, 'utf8');
  for (const m of html.matchAll(BLOCK)) {
    const [, id, attrs, body] = m;
    if (!attrs.includes('application/javascript') || attrs.includes('data-encoding=')) continue;
    if (!id.startsWith('@')) continue;
    if (ONLY && id !== ONLY) continue;
    const sha = createHash('sha256').update(body).digest('hex');
    const e = blocks.get(sha);
    if (e) { e.copies++; continue; }
    blocks.set(sha, { id, src: body, copies: 1, file: f });
  }
}

// ---------- round-trip ----------
const t0 = Date.now();
const stat = { blocks: 0, cells: 0, identical: 0, differs: 0, decompileErr: 0, decompile2Err: 0, compileErr: 0, extractErr: 0 };
const diffs = [];
let n = 0;
for (const [sha, blk] of blocks) {
  if (++n > LIMIT) break;
  stat.blocks++;
  let cells;
  try { cells = extractCells(blk.src); } catch (e) { stat.extractErr++; continue; }
  for (const group of cells) {
    const cell = group[0];
    stat.cells++;
    let source;
    try { source = await decompile(group); }
    catch (e) { stat.decompileErr++; diffs.push({ mod: blk.id, name: cell._name, kind: 'decompile', msg: String(e.message ?? e).slice(0, 120) }); continue; }
    // Compiled-form equality is the WRONG axis: the corpus blocks were emitted by the exporter's
    // compiler, this one formats differently ("{return(\n x \n)}" vs "{return (x);}") while
    // agreeing on name and inputs. The toolchain's own invariant is the source fixpoint.
    let back, source2;
    try { back = compile(source); }
    catch (e) { stat.compileErr++; diffs.push({ mod: blk.id, name: cell._name, kind: 'compile', msg: String(e.message ?? e).slice(0, 120) }); continue; }
    try { source2 = await decompile(back); }
    catch (e) { stat.decompile2Err++; diffs.push({ mod: blk.id, name: cell._name, kind: 'decompile2', msg: String(e.message ?? e).slice(0, 120) }); continue; }
    const sig = (vs) => vs.map((v) => `${v._name}(${(v._inputs || []).join(',')})`).join(' | ');
    const got = back[0];
    const nameOk = sig(back) === sig(group);
    if (source2 === source && nameOk) stat.identical++;
    else {
      stat.differs++;
      diffs.push({ mod: blk.id, name: cell._name, kind: 'differs',
        why: source2 !== source ? 'source' : 'signature',
        nameGot: got?._name, inputsGot: sig(back), inputsWant: sig(group),
        src1: source.slice(0, 300), src2: String(source2).slice(0, 300) });
    }
  }
}
const secs = (Date.now() - t0) / 1000;

const pairs = [...blocks.values()].reduce((a, b) => a + b.copies, 0);
console.log(`\nblocks processed   ${stat.blocks}   (would be ${pairs} without memoization, ${(pairs / Math.max(stat.blocks, 1)).toFixed(1)}x)`);
console.log(`cells              ${stat.cells}`);
console.log(`  identical        ${stat.identical}  (${(stat.identical / stat.cells * 100).toFixed(1)}%)`);
console.log(`  differs          ${stat.differs}`);
console.log(`  decompile threw  ${stat.decompileErr}`);
console.log(`  compile threw    ${stat.compileErr}`);
console.log(`  re-decompile threw ${stat.decompile2Err}`);
console.log(`  block unparsable ${stat.extractErr}`);
console.log(`elapsed            ${secs.toFixed(1)}s  (${(stat.cells / secs).toFixed(0)} cells/s)`);

const byKind = {};
for (const d of diffs) byKind[d.kind] = (byKind[d.kind] ?? 0) + 1;
console.log('\nfailures by kind:', JSON.stringify(byKind));
if (VERBOSE) for (const d of diffs.slice(0, 40)) console.log(JSON.stringify(d, null, 2));
else for (const d of diffs.slice(0, 15)) console.log(`  ${d.kind.padEnd(10)} ${String(d.mod).padEnd(38)} ${String(d.name).slice(0, 30).padEnd(30)} ${(d.msg ?? '').slice(0, 60)}`);

mkdirSync('tools/staging', { recursive: true });
writeFileSync('tools/staging/roundtrip-diffs.json', JSON.stringify(diffs, null, 2));
console.log(`\n${diffs.length} failures written to tools/staging/roundtrip-diffs.json`);
tc.dispose();
