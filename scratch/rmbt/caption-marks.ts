// The captions the first sweep missed: they live in htl.html`` template calls,
// not md`` bodies, so a prose-only scan does not see them. Found by reading the
// RENDERED page text instead (probe-annotations-3.ts, markWhere).
import { readFileSync, writeFileSync } from "node:fs";

const p = "modules/@tomlarkworthy/coded-landmark-tracking.js";
let s = readFileSync(p, "utf8");

const PAIRS: [string, string][] = [
  ["marks decoded", "barcodes decoded"],
  ["of the mark to the scan row, measured on the mark", "of the barcode to the scan row, measured on the barcode"],
  // longer than it looks on purpose: "lock at least one mark" also matches a
  // code comment, which is not reader-visible and stays
  ["scanned rows lock at least one mark", "scanned rows lock at least one barcode"],
  ["at small mark scales", "at small barcode scales"],
  ["a mark narrower than this has its rings inside one pixel", "a barcode narrower than this has its rings inside one pixel"],
  ["the widest gap INSIDE one mark is the dark disc", "the widest gap INSIDE one barcode is the dark disc"],
  ["so a wider gap separates marks rather than rings", "so a wider gap separates barcodes rather than rings"],
  ["one mark presents at most", "one barcode presents at most"],
  ["is more than one mark, so split", "is more than one barcode, so split"],
  ["an over-cap run cannot be one mark", "an over-cap run cannot be one barcode"],
  ["Right: the largest mark, one blue line per scanned row", "Right: the largest barcode, one blue line per scanned row"]
];

for (const [from, to] of PAIRS) {
  const n = s.split(from).length - 1;
  if (n !== 1) throw new Error(`${n} matches for: ${from.slice(0, 60)}`);
  s = s.replace(from, to);
}
writeFileSync(p, s);
console.log(`${PAIRS.length} caption replacements`);
