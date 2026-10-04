import { readFileSync, writeFileSync } from "fs";
import { blocks, findSpan } from "../../lib/notebook-blocks.ts";
const ID = "@tomlarkworthy/pyodide";
for (const path of process.argv.slice(2)) {
  const html = readFileSync(path, "utf8");
  const before = blocks(html);
  if (before.some((b) => b.id !== ID && b.content.includes("/pyodide.js"))) throw new Error(path + ": pyodide is imported");
  const span = findSpan(html, ID);
  if (!span) { console.log(path, "no pyodide block"); continue; }
  let end = span.end; if (html[end] === "\n") end++;
  const next = html.slice(0, span.start) + html.slice(end);
  const after = blocks(next).map((b) => b.id);
  const want = before.map((b) => b.id).filter((i) => i !== ID);
  if (JSON.stringify(after) !== JSON.stringify(want)) throw new Error(path + ": block list changed unexpectedly");
  writeFileSync(path, next);
  console.log(path, "removed", html.length - next.length, "bytes;", after.length, "blocks left");
}
