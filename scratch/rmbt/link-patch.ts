// External vs internal links, and the prior-works table.
//   - externalLink(label, href): new cell, arrow icon, target=_blank
//   - ref(key, label): labelled refs now carry their section number, so an
//     in-document link no longer looks like a bare external one
//   - priorWork: the series table, inserted directly after the About prose
// Cell bodies live in link-cells.js so nothing needs escaping twice.
import { readFileSync, writeFileSync } from "node:fs";

const P = "modules/@tomlarkworthy/coded-landmark-tracking.js";
let s = readFileSync(P, "utf8");

const cells = new Map<string, string>();
for (const part of readFileSync("scratch/rmbt/link-cells.js", "utf8").split(/^\/\/====CELL /m)) {
  if (!part.trim()) continue;
  const nl = part.indexOf("\n");
  cells.set(part.slice(0, nl).trim(), part.slice(nl + 1).replace(/\s*$/, "\n"));
}

const span = (name: string) => {
  const i = s.indexOf(`const ${name} = function `);
  if (i < 0) throw new Error(`cell ${name} not found`);
  const j = s.indexOf("\nconst _", i + 10);
  const k = s.indexOf("\nexport default function define(", i + 10);
  if (j < 0 || (k >= 0 && k < j)) throw new Error(`cell ${name} runs past the last cell`);
  return [i, j + 1] as const;
};

const replaceCell = (name: string) => {
  const [i, j] = span(name);
  s = s.slice(0, i) + cells.get(name)! + s.slice(j);
};

for (const name of ["_ref", "_0d8v3u6", "_wsmw0"]) replaceCell(name);

// externalLink before ref (it is the same idea, from the other direction)
{
  const [i] = span("_ref");
  s = s.slice(0, i) + cells.get("_extlink")! + s.slice(i);
}
// priorWork immediately after the About prose: source order is render order
{
  const [, j] = span("_0d8v3u6");
  s = s.slice(0, j) + cells.get("_priorwork")! + s.slice(j);
}

const sub = (from: string, to: string) => {
  const n = s.split(from).length - 1;
  if (n !== 1) throw new Error(`${n} matches for ${from}`);
  s = s.replace(from, to);
};

sub(`$def("_0d8v3u6", null, ["md","sec"], _0d8v3u6);  `,
    `$def("_0d8v3u6", null, ["md","sec","externalLink"], _0d8v3u6);  \n  $def("_priorwork", "priorWork", ["htl","externalLink"], _priorwork);  `);
sub(`$def("_wsmw0", null, ["md"], _wsmw0);`,
    `$def("_wsmw0", null, ["md","htl","externalLink"], _wsmw0);`);
sub(`$def("_ref", "ref", ["sectionIndex","htl"], _ref);  `,
    `$def("_extlink", "externalLink", ["htl"], _extlink);  \n  $def("_ref", "ref", ["sectionIndex","htl"], _ref);  `);

// The two invariants a syntax check does not cover.
const defs = s.split("\n").filter((l) => l.trim().startsWith("$def(")).length;
if (defs !== 178) throw new Error(`$def count ${defs}, expected 178`);
if (!s.includes(`main.builtin("FileAttachment"`)) throw new Error("FileAttachment builtin lost");
if (!s.includes("\nexport default function define(")) throw new Error("define() lost");

writeFileSync(P, s);
console.log(`patched: ${defs} $def lines`);
