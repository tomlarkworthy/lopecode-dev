// Module ids whose cell sources are identical to another surveyed id's (the same notebook under two names).
import { loadCorpus, vendoredReason } from "./classify.ts";
import { createHash } from "node:crypto";
const { mods } = loadCorpus();
const byHash = new Map<string, string[]>();
for (const [id, m] of mods) {
  if (vendoredReason(id, m)) continue;
  const h = createHash("sha1").update(m.raw.filter((c) => c.kind === "cell").map((c) => c.src).sort().join("\0")).digest("hex");
  byHash.set(h, [...(byHash.get(h) ?? []), id]);
}
const dups = [...byHash.values()].filter((v) => v.length > 1);
console.log(`${dups.length} groups, ${dups.reduce((a, v) => a + v.length - 1, 0)} redundant ids`);
for (const g of dups) console.log("  " + g.join("  =  "));
