import { readFileSync } from "node:fs";
import { blockContent } from "../../lib/notebook-blocks.ts";
const html = readFileSync(new URL("../../../lopebooks/notebooks/soundscript.html", import.meta.url).pathname, "utf8");
const names = (m: string) => new Set([...blockContent(html, m)!.matchAll(/^  \$def\("[\w$]+", "([^"]+)"/gm)].map((x) => x[1]));
const R = names("@tomlarkworthy/soundscript-runtime"), C = names("@tomlarkworthy/soundscript-checker");
const used = ["cell", "rejected", "compileFor", "viewRef", "cross", "h", "state", "action", "mut", "freeze", "borrow", "snapshot", "equals", "on", "read", "mount", "Generators"];
for (const u of used) console.log(u, R.has(u) ? "runtime" : C.has(u) ? "CHECKER" : "neither");
const src = blockContent(html, "@tomlarkworthy/soundscript-checker")!;
console.log(src.match(/^const _\w+ = function _soundscript\([^)]*\)/m)?.[0]?.slice(0, 600));
