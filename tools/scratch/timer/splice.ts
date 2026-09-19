// Replace one compiled cell in the working copy with a file's contents.
// bun tools/scratch/timer/splice.ts _t10 tools/scratch/timer/liquid4.js
import { readFileSync, writeFileSync } from "node:fs";
const [cell, src] = process.argv.slice(2);
const path = "modules/@tomlarkworthy/liquid-timer.js";
const text = readFileSync(path, "utf8");
const start = text.indexOf(`\nconst ${cell} = `);
if (start < 0) throw new Error(`no cell ${cell}`);
const rest = text.slice(start + 1);
const m = rest.slice(1).match(/\n(?:const _|\$def\()/);
const end = start + 1 + 1 + (m ? m.index! : rest.length - 1);
const body = readFileSync(src, "utf8").replace(/\s+$/, "");
writeFileSync(path, text.slice(0, start + 1) + body + text.slice(end));
console.log(`spliced ${cell}: ${end - start - 1} -> ${body.length} chars`);
