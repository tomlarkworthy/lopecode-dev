// Removes blocks from a notebook, refusing while any remaining module still imports one of them.
// Importers are found with acorn (a "module <id>" string literal in a module block), not by text search.
// A removed module's attachments (<id>/...) must be listed too, or the removal is refused.
//
// run: bun tools/merge-forks/rm-blocks.ts <notebook.html> <id>... [--out <html>]
import { readFileSync } from "node:fs";
import * as acorn from "acorn";
import { blocks, blockContent, findSpan, guardedWrite } from "../lib/notebook-blocks.ts";

const args = process.argv.slice(2);
const outAt = args.indexOf("--out");
const out = outAt >= 0 ? args[outAt + 1] : args[0];
const [notebook, ...ids] = args.filter((_, i) => outAt < 0 || (i !== outAt && i !== outAt + 1));
const prev = readFileSync(notebook, "utf8");
const all = blocks(prev);
const removing = new Set(ids);
for (const id of ids) if (!all.some((b) => b.id === id)) throw new Error(`${notebook} has no block ${id}`);

const moduleLiterals = (src: string): Set<string> => {
  const found = new Set<string>();
  const walk = (n: any) => {
    if (!n || typeof n.type !== "string") return;
    if (n.type === "Literal" && typeof n.value === "string" && n.value.startsWith("module ")) found.add(n.value.slice(7));
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === "string") walk(v); }
  };
  walk(acorn.parse(src, { ecmaVersion: "latest", sourceType: "module" }));
  return found;
};

const problems: string[] = [];
for (const b of all) {
  if (removing.has(b.id) || !/data-mime="application\/javascript"/.test(b.attrs) || /data-encoding/.test(b.attrs)) continue;
  let imports: Set<string>;
  try { imports = moduleLiterals(b.content); } catch { continue; }
  for (const id of ids) if (imports.has(id)) problems.push(`${b.id} imports ${id}`);
}
for (const b of all) {
  const owner = ids.find((id) => b.id.startsWith(id + "/"));
  if (owner && !removing.has(b.id)) problems.push(`${b.id} belongs to ${owner} but is not listed`);
}
const mains = JSON.parse(blockContent(prev, "bootconf.json")!).mains as string[];
for (const id of ids) if (mains.includes(id)) problems.push(`${id} is in bootconf mains`);
if (problems.length) throw new Error(`refusing:\n  ${problems.join("\n  ")}`);

let html = prev;
for (const id of ids) {
  const span = findSpan(html, id)!;
  html = html.slice(0, span.start).replace(/\n$/, "") + html.slice(span.end);
}
guardedWrite(out, prev, html, "", "rm-blocks", ids);
console.log(`removed ${ids.join(", ")} (${prev.length - html.length} bytes)\nwrote ${out}`);
