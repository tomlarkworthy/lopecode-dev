import { readFileSync, writeFileSync } from "node:fs";
const P = "modules/@tomlarkworthy/coded-landmark-tracking.js";
let s = readFileSync(P, "utf8");
const sub = (from: string, to: string) => {
  const n = s.split(from).length - 1;
  if (n !== 1) throw new Error(`${n} matches for ${from.slice(0, 60)}`);
  s = s.replace(from, to);
};
sub("const _1visgate = function _whenVisible(IntersectionObserver,localStorage) {",
`const _1visgate = function _whenVisible(IntersectionObserver) {
  // Resolved here rather than taken as a cell input. On an opaque origin --
  // which is what a blob: fork of this file gets -- READING window.localStorage
  // throws a SecurityError instead of returning null, and an input that throws
  // becomes the cell's value, so every cell gated on whenVisible inherited it:
  // 13 error boxes reading "hexTaster = RuntimeError: Failed to read the
  // 'localStorage' property", reported 2026-08-13 after a fork. The height
  // memory is an optimisation, so losing it is the correct degradation.
  const localStorage = (() => { try { return window.localStorage; } catch (_) { return null; } })();`);
sub(`  const stored = (c) => { try { return +localStorage.getItem(key(c)) || 0; } catch (_) { return 0; } };`,
    `  const stored = (c) => { try { return +localStorage.getItem(key(c)) || 0; } catch (_) { return 0; } };  // null localStorage lands here too`);
sub(`$def("_1visgate", "whenVisible", ["IntersectionObserver","localStorage"], _1visgate);`,
    `$def("_1visgate", "whenVisible", ["IntersectionObserver"], _1visgate);`);
const defs = s.split("\n").filter((l) => l.trim().startsWith("$def(")).length;
if (defs !== 178) throw new Error(`$def count ${defs}`);
if (!s.includes(`main.builtin("FileAttachment"`)) throw new Error("FileAttachment builtin lost");
writeFileSync(P, s);
console.log("localStorage dependency removed");
