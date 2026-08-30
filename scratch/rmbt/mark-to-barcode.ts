// "mark" -> "barcode" in reader-visible text only, plus the two spelling
// mistakes the redraft introduced. Every pair must apply exactly once; code
// identifiers (pose.marks, T.marks, manRowGroups, fitManPose) are untouched.
//
//   bun scratch/rmbt/mark-to-barcode.ts modules/@tomlarkworthy/coded-landmark-tracking.js
import { readFileSync, writeFileSync } from "node:fs";

const path = process.argv[2];
let src = readFileSync(path, "utf8");

const PAIRS: [string, string][] = [
  // mistakes
  ["The ActionScript compiler is included", "The AssemblyScript compiler is included"],
  ["a slower, more accuracte offline procedure", "a slower, more accurate offline procedure"],
  // annotation a2zelg5mln
  [`{ key: "lattice", title: "The ring lattice", parent: "relabel" }`,
   `{ key: "lattice", title: "The Ring Lattice Refinement", parent: "relabel" }`],
  // mark -> barcode, reader-visible only
  ["frames that read 5+ marks and still fail", "frames that read 5+ barcodes and still fail"],
  ["<b>${T.ids.length} marks</b>", "<b>${T.ids.length} barcodes</b>"],
  ["${T.diameterMm}mm marks, ${T.pitchMm}mm pitch", "${T.diameterMm}mm barcodes, ${T.pitchMm}mm pitch"],
  ["Tightest clearance between marks that can share a", "Tightest clearance between barcodes that can share a"],
  ["rotated reads <b>7/7/7</b> marks against", "rotated reads <b>7/7/7</b> barcodes against"],
  ["Working distance: a mark needs roughly 4 pixels per tooth", "Working distance: a barcode needs roughly 4 pixels per tooth"],
  ["whole cluster in frame with each mark above", "whole cluster in frame with each barcode above"],
  ["labelled with the correct mark centers", "labelled with the correct barcode centers"],
  ["hard cases where some of the marks were correct", "hard cases where some of the barcodes were correct"],
  [`"id decoded somewhere the target has no mark"`, `"id decoded somewhere the target has no barcode"`],
  [`"median distance from label, over every mark placed"`, `"median distance from label, over every barcode placed"`],
  ["The mark is designed so it is easy to recognize", "The barcode is designed so it is easy to recognize"],
  ["the row misses the mark at this pose", "the row misses the barcode at this pose"],
  ["The split rule is the widest gap: inside one mark the widest gap is the dark disc, at most\n      0.21 of the mark's own span, so anything wider separates marks rather than rings.",
   "The split rule is the widest gap: inside one barcode the widest gap is the dark disc, at most\n      0.21 of the barcode's own span, so anything wider separates barcodes rather than rings."],
  ["which sometimes cuts a real mark in", "which sometimes cuts a real barcode in"],
  ["A wrong split loses a mark; a wrong merge", "A wrong split loses a barcode; a wrong merge"],
  ["<b style=\"color:${GRN}\">${res.fused.length}</b> marks and", "<b style=\"color:${GRN}\">${res.fused.length}</b> barcodes and"],
  ["<b>${pts.length}</b> crossings on one mark, from 12 directions", "<b>${pts.length}</b> crossings on one barcode, from 12 directions"],
  ["px on ${r.plane.used.length} marks$", "px on ${r.plane.used.length} barcodes$"],
  ["no trusted plane: too few marks agree on one", "no trusted plane: too few barcodes agree on one"],
  ["ring = the mark's rim projected through the plane", "ring = the barcode's rim projected through the plane"],
  ["A cluster becomes a mark on three independent things", "A cluster becomes a barcode on three independent things"],
  // anchored on the cell, not on the annotation quote that also holds this text
  ["md`A row scan measures a mark's x and extrapolates", "md`A row scan measures a barcode's x and extrapolates"],
  ["Summed absolute y error over the 37 marks", "Summed absolute y error over the 37 barcodes"],
  // section titles
  [`{ key: "mark", title: "The barcode mark" }`, `{ key: "mark", title: "The barcode" }`],
  [`{ key: "pose", title: "From marks to a pose", parent: "detect" }`,
   `{ key: "pose", title: "From barcodes to a pose", parent: "detect" }`],
  [`{ key: "constrains", title: "What one mark constrains", parent: "relabel" }`,
   `{ key: "constrains", title: "What one barcode constrains", parent: "relabel" }`]
];

for (const [from, to] of PAIRS) {
  const n = src.split(from).length - 1;
  if (n !== 1) throw new Error(`${n} matches for: ${from.slice(0, 70)}`);
  src = src.replace(from, to);
}

// annotation a2ais7vd8x: the module reference is an aside, not a link off-site
const LINK = "[@tomlarkworthy/assembly-script](https://observablehq.com/@tomlarkworthy/assembly-script)";
if (src.split(LINK).length - 1 !== 1) throw new Error("assembly-script link not found once");
src = src.replace(
  LINK + ", which owns \\`asc\\`, \\`assemblyscript\\`, \\`long\\` and \\`binaryen\\`.",
  "\\`@tomlarkworthy/assembly-script\\`, which owns \\`asc\\`, \\`assemblyscript\\`, \\`long\\` and \\`binaryen\\`." +
  "\n\n<aside style=\"font:11px/1.5 ui-monospace,monospace;color:var(--theme-foreground-muted,#888);border-left:2px solid currentColor;padding-left:10px;margin:8px 0\">" +
  "It is a module inside this file, so nothing is fetched to compile. Its Observable original is observablehq.com/@tomlarkworthy/assembly-script." +
  "</aside>"
);

const defs = src.match(/\n  \$def\(/g)?.length ?? 0;
if (!src.includes("\nexport default function define(")) throw new Error("define() lost");
writeFileSync(path, src);
console.log(`${PAIRS.length + 1} replacements, ${defs} $def lines`);
