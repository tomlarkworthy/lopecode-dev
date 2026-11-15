// The reject cases of the specification module, read from spec.ojs (the cell spec_rejects), for the node
// tools that count a rule's reject case: fixtures.ts (the registry) and verify.ts (the reference check).
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export type SpecReject = { statement: string; rule: string; source: string; shell?: string };

export function specRejects(): SpecReject[] {
  const ojs = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "spec.ojs"), "utf8");
  const cell = ojs.split(/^\/\/ %%$/m).map((b) => b.trim()).find((b) => b.startsWith("spec_rejects = "));
  if (!cell) throw new Error("spec.ojs has no spec_rejects cell");
  // the cell is one array of object literals; it is evaluated as JavaScript
  return new Function(`return (${cell.slice("spec_rejects = ".length)});`)();
}
