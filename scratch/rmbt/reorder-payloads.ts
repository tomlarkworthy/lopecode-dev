// Move the two lazy payload groups to the tail, keeping each module AFTER its
// own file attachments. Everything the page needs to render then arrives in the
// first ~2.5MB instead of the first 14.77MB.
//
// This is a hand edit of the exported artifact. Any re-export (save-in-place,
// jumpgate) rebuilds the order from exporter-3 and undoes it.
import { readFileSync, writeFileSync } from "node:fs";

const P = process.argv[2] ?? "lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html";
const h = readFileSync(P, "utf8");

type Block = { s: number; e: number; id: string; size: number };
const blocks: Block[] = [];
for (let i = 0; ;) {
  const s = h.indexOf("<script", i); if (s < 0) break;
  const gt = h.indexOf(">", s); const e = h.indexOf("</script>", gt); if (e < 0) break;
  blocks.push({ s, e: e + 9, id: (/id="([^"]*)"/.exec(h.slice(s, gt)) || [])[1] ?? "", size: e + 9 - s });
  i = e + 9;
}

// Order within a group is preserved, so each module still follows its own files.
const GROUPS = ["@tomlarkworthy/coded-landmark-tracking-data", "@tomlarkworthy/assembly-script"];
const move = blocks.filter((b) => GROUPS.some((g) => b.id === g || b.id.startsWith(g + "/")));
if (!move.length) throw new Error("nothing matched");
for (const g of GROUPS) {
  const grp = move.filter((b) => b.id === g || b.id.startsWith(g + "/"));
  const mod = grp.findIndex((b) => b.id === g);
  if (mod !== grp.length - 1) throw new Error(`${g}: module block is not last in its group (${mod} of ${grp.length - 1})`);
}

const sentinel = blocks[blocks.findIndex((b) => b.id === "streaming_sentinel" && b.s === Math.max(...blocks.filter((x) => x.id === "streaming_sentinel").map((x) => x.s)))];
if (!sentinel) throw new Error("no trailing streaming_sentinel");
if (move.some((b) => b.s > sentinel.s)) throw new Error("a payload already sits past the sentinel");

const moving = new Set(move.map((b) => b.s));
let out = "";
let cursor = 0;
const carried: string[] = [];
for (const b of blocks) {
  if (!moving.has(b.s)) continue;
  out += h.slice(cursor, b.s);
  carried.push(h.slice(b.s, b.e));
  cursor = b.e;
  // the newline the block sat on goes with it, so the gap does not accumulate
  if (h[cursor] === "\n") cursor++;
}
out += h.slice(cursor);

// Reinsert immediately before the trailing sentinel, which must stay last: it
// flips __lopeStreaming to false, and every waiter treats that as "the block
// you are waiting for is never coming".
const anchor = out.lastIndexOf('<script id="streaming_sentinel">');
if (anchor < 0) throw new Error("sentinel lost");
out = out.slice(0, anchor) + carried.join("\n") + "\n" + out.slice(anchor);

if (out.length !== h.length - (move.length)) {
  // one newline consumed per moved block, re-added by the join -- allow the diff
  const delta = out.length - h.length;
  if (Math.abs(delta) > move.length + 2) throw new Error(`size changed by ${delta}, expected ~0`);
}
for (const b of move) if (out.split(`id="${b.id}"`).length - 1 !== h.split(`id="${b.id}"`).length - 1)
  throw new Error(`block count changed for ${b.id}`);

writeFileSync(P, out);
console.log(`moved ${move.length} blocks (${(move.reduce((a, b) => a + b.size, 0) / 1e6).toFixed(2)}MB) to the tail`);
