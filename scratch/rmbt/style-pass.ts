// Final style pass over the rendered prose (scratch/rmbt/prose-dump.txt, 2747
// words across 52 cells). Every item below was read off that dump, not guessed.
import { readFileSync, writeFileSync } from "node:fs";
const P = "modules/@tomlarkworthy/coded-landmark-tracking.js";
let s = readFileSync(P, "utf8");
const sub = (from: string, to: string, n = 1) => {
  const c = s.split(from).length - 1;
  if (c !== n) throw new Error(`${c} matches (want ${n}) for: ${from.slice(0, 70)}`);
  s = s.split(from).join(to);
};

// 1. Renumbering fallout: the Mobius notebook is Part III now that the 2012
//    post is Part I. Left as PART II it points a reader at the wrong row.
sub("(Möbius transform PART II)", "(Möbius transform, Part III)");

// 2. Spelling: the document is otherwise Oxford (-ize + labelled + centre).
//    Six US "center" spellings against five UK.
sub("the correct barcode centers", "the correct barcode centres");
sub("The correct centers were determined", "The correct centres were determined");
sub("Once on the way into the center", "Once on the way into the centre");
sub("| center position along line |", "| centre position along line |");
sub("off-center", "off-centre", 2);

// 3. Sentence case for the three headings that were Title Case among sixteen.
sub(`{ key: "multi", title: "Multiple Barcodes" }`, `{ key: "multi", title: "Multiple barcodes" }`);
sub(`{ key: "combine", title: "Combine Scanlines"`, `{ key: "combine", title: "Combine scanlines"`);
sub(`{ key: "lattice", title: "The Ring Lattice Refinement"`, `{ key: "lattice", title: "The ring lattice refinement"`);

// 4. A list whose four items ended with "." , nothing, "," and ".**".
sub(`1. **The edge threshold is chosen per frame**.
2. **Every centre is refined on its own ring lattice**
3. **The plane is fitted by exhaustive RANSAC over the 4-subsets**,
4. **The plane may flag a measurement, but not replace one.**`,
    `1. **The edge threshold is chosen per frame**.
2. **Every centre is refined on its own ring lattice**.
3. **The plane is fitted by exhaustive RANSAC over the 4-subsets**.
4. **The plane may flag a measurement, but not replace one**.`);

// 5. Sentence starting lower case.
sub("md`surviving groups have a clear involution", "md`Surviving groups have a clear involution");

// 6. "1 violations" -- the count is generated, so the plural has to be too.
sub("${sol.viol} violations, ${sol.checks} checks", "${sol.viol} violation${sol.viol === 1 ? \"\" : \"s\"}, ${sol.checks} checks");

// 7. Ellipsis with no antecedent: "dashed" is not a noun here.
sub("Solid rings carry an id, dashed located but did not decode",
    "Solid rings carry an id, dashed ones located but did not decode");

// 8. The table's own row for this notebook still said "marks".
sub(`"Printed marks that carry their own position`, `"Printed barcodes that carry their own position`);

const defs = s.split("\n").filter((l) => l.trim().startsWith("$def(")).length;
if (defs !== 178) throw new Error(`$def count ${defs}`);
if (!s.includes(`main.builtin("FileAttachment"`)) throw new Error("FileAttachment builtin lost");
writeFileSync(P, s);
console.log("style pass applied");
