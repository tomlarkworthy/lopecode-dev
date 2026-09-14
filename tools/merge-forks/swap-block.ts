// Replaces one block in a notebook with the same block from a donor. The block must already exist in the target.
// run: bun tools/merge-forks/swap-block.ts <target.html> <donor.html> <block id> <out.html>
import { readFileSync, writeFileSync } from "node:fs";
import { findSpan, rawBlock } from "../lib/notebook-blocks.ts";
const [target, donor, id, out] = process.argv.slice(2);
const html = readFileSync(target, "utf8"), block = rawBlock(readFileSync(donor, "utf8"), id)!, s = findSpan(html, id)!;
writeFileSync(out, html.slice(0, s.start) + block + html.slice(s.end));
console.log(`wrote ${out}`);
