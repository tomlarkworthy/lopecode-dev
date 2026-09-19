// bun tools/scratch/timer/drop-block.ts <notebook.html> <block id>: remove one top-level block
import { findSpan } from "../../lib/notebook-blocks.ts";
const [file, id] = process.argv.slice(2);
const html = await Bun.file(file).text();
const span = findSpan(html, id);
if (!span) { console.error(`no block ${id}`); process.exit(1); }
let end = span.end;
while (html[end] === "\n") end++;
await Bun.write(file, html.slice(0, span.start) + html.slice(end));
console.log(`removed ${id}: ${end - span.start} bytes`);
