// bun m2-sites.ts out/m2-<mode>.json: conversion sites per shipped cell, by kind, removable, and the not-removable list
import { readFileSync } from "node:fs";
const cells = JSON.parse(readFileSync(process.argv[2]!, "utf8")).filter((x: any) => x.cell);
const hist = new Map<number, number>(), kinds = new Map<string, number>();
let n = 0, rem = 0, fresh = 0; const keep: string[] = [];
for (const c of cells) {
  hist.set(c.sites.length, (hist.get(c.sites.length) ?? 0) + 1);
  for (const s of c.sites) { n++; kinds.set(s.kind, (kinds.get(s.kind) ?? 0) + 1); if (s.removable) rem++; if (s.fresh) fresh++; if (!s.removable) keep.push(`${c.unit} ${c.cell} L${s.lineInCell} ${s.kind} ${s.names.join(",") || "-"} : ${s.text.replace(/\s+/g, " ").slice(0, 70)}`); }
}
console.log(`cells ${cells.length}, sites ${n}, removable ${rem} (fresh literal/new ${fresh}), needed ${n - rem}`);
console.log(`sites per cell: ${[...hist].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join(" ")}`);
console.log(`by kind: ${[...kinds].map(([k, v]) => `${k} ${v}`).join(", ")}`);
for (const k of keep) console.log(`  NEEDED ${k}`);
