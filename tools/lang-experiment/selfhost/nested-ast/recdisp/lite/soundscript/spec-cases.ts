// The reject cases of the specification module, read from spec.ojs (the cells spec_rejects_<n>), for the node
// tools that count a rule's reject case: fixtures.ts (the registry) and verify.ts (the reference check).
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// outside: the cells in other languages the case's module has (section 11)
export type SpecReject = { statement: string; rule: string; source: string; shell?: string; outside?: { name: string; view?: boolean }[] };

// every spec_rejects_<n> cell, one per section, in page order
export function specRejects(): SpecReject[] {
  const ojs = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "spec.ojs"), "utf8");
  const cells = ojs.split(/^\/\/ %%$/m).map((b) => b.trim()).filter((b) => /^spec_rejects_\d+ = /.test(b));
  if (!cells.length) throw new Error("spec.ojs has no spec_rejects_<n> cell");
  // each cell is one array of object literals; it is evaluated as JavaScript
  return cells.flatMap((cell) => new Function(`return (${cell.slice(cell.indexOf("=") + 1)});`)());
}
