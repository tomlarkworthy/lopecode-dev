import { readFileSync } from "node:fs";
const src = readFileSync(new URL("../package/cli.js", import.meta.url), "utf8");
// Match: import{...}from"m"  and  import D,{...}from"m"  and  import*as N from"m"
const re = /import(?:[^,{"*]*,)?\{([^}]*)\}from"(?:node:)?([a-z0-9/_]+)"/g;
const ns = /import\*as [A-Za-z0-9_$]+ from"(?:node:)?([a-z0-9/_]+)"/g;
const map = {};
let m;
while ((m = re.exec(src))) {
  const mod = m[2];
  const names = m[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
  (map[mod] ||= new Set());
  names.forEach((n) => map[mod].add(n));
}
const nsMods = new Set();
while ((m = ns.exec(src))) nsMods.add(m[1]);
console.log("=== named imports per module ===");
for (const k of Object.keys(map).sort()) console.log(k + ": " + [...map[k]].sort().join(" "));
console.log("\n=== namespace-imported modules ===\n" + [...nsMods].sort().join(" "));
