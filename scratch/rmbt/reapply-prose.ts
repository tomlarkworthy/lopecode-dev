// Splice four prose cells from an edited working copy into a fresh checkout.
// Needed because the edits were made on a working copy whose base predated
// d99823d6, so the rest of that file is stale and must not be carried over.
//
//   bun scratch/rmbt/reapply-prose.ts <edited.js> <fresh.js>
import { readFileSync, writeFileSync } from "node:fs";

const [editedPath, freshPath] = process.argv.slice(2);
const edited = readFileSync(editedPath, "utf8");
let fresh = readFileSync(freshPath, "utf8");

const PIDS = ["_4liiby", "_11vsmkp", "_nb5x", "_wsmw0"];

const cellOf = (src: string, pid: string) => {
  const head = `\nconst ${pid} = `;
  const i = src.indexOf(head);
  if (i < 0) throw new Error(`${pid}: no declaration`);
  const stop = src.indexOf("\nexport default function define(");
  let j = src.indexOf("\nconst ", i + head.length);
  if (j < 0 || (stop >= 0 && j > stop)) j = stop;
  if (j < 0) throw new Error(`${pid}: no end`);
  return src.slice(i + 1, j + 1);
};

for (const pid of PIDS) {
  const from = cellOf(edited, pid);
  const to = cellOf(fresh, pid);
  if (from === to) { console.log(`${pid}  identical, nothing to do`); continue; }
  if (fresh.split(to).length !== 2) throw new Error(`${pid}: target text not unique`);
  fresh = fresh.replace(to, from);
  console.log(`${pid}  ${to.length} -> ${from.length} bytes`);
}

// The bounds are the failure mode here, so check what a bad splice would eat.
const defs = fresh.match(/\n  \$def\(/g)?.length ?? 0;
if (defs !== 180) throw new Error(`\$def count is ${defs}, expected 180`);
if (!fresh.includes('main.builtin("FileAttachment"')) throw new Error("preamble lost");
if (!fresh.includes("\nexport default function define(")) throw new Error("define() lost");
writeFileSync(freshPath, fresh);
console.log(`ok  ${defs} $def lines, preamble intact`);
