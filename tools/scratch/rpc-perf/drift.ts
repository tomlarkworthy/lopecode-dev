import { readdirSync, readFileSync } from "node:fs";
import { stats } from "./lib.ts";
const f = process.argv[2] || readdirSync("results").filter((x) => x.startsWith("hops-")).sort().pop()!;
const out = JSON.parse(readFileSync("results/" + f, "utf8"));
for (const k of Object.keys(out)) {
  const ms = out[k].map((r: any) => r.ms), q = Math.floor(ms.length / 4);
  console.log(k.padEnd(28), "p50 by quarter", [0, 1, 2, 3].map((i) => stats(ms.slice(i * q, (i + 1) * q)).p50).join("  "));
}
