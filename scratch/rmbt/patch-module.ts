// Apply the live-only edits to the module working copy, browserlessly.
//
// The tab is hidden, so both export paths starve on a flowQueue that never gets
// serviced. Everything changed lives in ONE module, so rather than fight the
// exporter this rewrites the working copy from the live definitions and lets
// sync-module splice it back -- the documented corpus path.
//
// Reuses each existing $def/main.define LINE verbatim and only generates the two
// new ones, so a bug here cannot silently rewrite 144 untouched cells. Aborts if
// any existing line would be dropped.
import { readFileSync, writeFileSync } from "node:fs";

const JS = "modules/@tomlarkworthy/coded-landmark-tracking.js";
const live = JSON.parse(readFileSync("scratch/rmbt/live-cells.json", "utf8")) as {
  cells: Record<string, { name: string | null; inputs: string[]; def: string } | null>;
  order: { pid: string; name: string | null }[];
};
let src = readFileSync(JS, "utf8");

// ---- 1. const declarations -------------------------------------------------
const constRe = /^const (_[A-Za-z0-9]+) = ([\s\S]*?);\n(?=const _|export default function define)/gm;
const consts = new Map<string, string>();
let m: RegExpExecArray | null;
while ((m = constRe.exec(src))) consts.set(m[1], m[0]);
console.log(`working copy: ${consts.size} const declarations`);

const NEW = ["_1k65scp", "_h0321j"];
let replaced = 0;
for (const [pid, cell] of Object.entries(live.cells)) {
  if (!cell) throw new Error(`live dump missing ${pid}`);
  const block = `const ${pid} = ${cell.def};\n`;
  if (consts.has(pid)) {
    src = src.replace(consts.get(pid)!, block);
    replaced++;
  } else if (!NEW.includes(pid)) {
    throw new Error(`${pid} is neither on disk nor declared new`);
  }
}
console.log(`replaced ${replaced} const declarations`);

// New consts go immediately before define(), order irrelevant here -- placement
// in the file body does not affect display; the $def sequence does.
const anchor = "export default function define(runtime, observer) {";
if (!src.includes(anchor)) throw new Error("define() anchor not found");
const newBlocks = NEW.map((p) => `const ${p} = ${live.cells[p]!.def};\n`).join("");
src = src.replace(anchor, newBlocks + anchor);
console.log(`inserted ${NEW.length} new const declarations`);

// ---- 2. reorder the $def / main.define sequence ----------------------------
const body = src.slice(src.indexOf(anchor));
const lineRe = /^ {2}(\$def\("(_[A-Za-z0-9]+)"[^\n]*|main\.define\("([^"]+)"[^\n]*)$/gm;
const byPid = new Map<string, string>();
const byName = new Map<string, string>();
const seq: string[] = [];
while ((m = lineRe.exec(body))) {
  seq.push(m[0]);
  if (m[2]) byPid.set(m[2], m[0]);
  else if (m[3]) byName.set(m[3], m[0]);
}
console.log(`ordered section: ${seq.length} lines (${byPid.size} $def, ${byName.size} main.define)`);

const emitted: string[] = [];
const used = new Set<string>();
for (const v of live.order) {
  let line: string | undefined;
  if (v.pid && byPid.has(v.pid)) line = byPid.get(v.pid);
  else if (NEW.includes(v.pid)) {
    const c = live.cells[v.pid]!;
    line = `  $def("${v.pid}", ${c.name === null ? "null" : JSON.stringify(c.name)}, ${JSON.stringify(c.inputs)}, ${v.pid});`;
  } else if (v.name && byName.has(v.name)) line = byName.get(v.name);
  if (!line || used.has(line)) continue;
  used.add(line);
  emitted.push(line);
}
const dropped = seq.filter((l) => !used.has(l));
if (dropped.length) {
  console.error(`REFUSING: ${dropped.length} existing line(s) would be dropped:`);
  for (const l of dropped.slice(0, 20)) console.error("  " + l.trim().slice(0, 110));
  process.exit(1);
}
console.log(`emitting ${emitted.length} lines (was ${seq.length}, +${emitted.length - seq.length})`);

const first = body.indexOf(seq[0]);
const last = body.indexOf(seq[seq.length - 1]) + seq[seq.length - 1].length;
const newBody = body.slice(0, first) + emitted.join("\n") + body.slice(last);
src = src.slice(0, src.indexOf(anchor)) + newBody;

writeFileSync(JS, src);
console.log(`wrote ${JS}`);
