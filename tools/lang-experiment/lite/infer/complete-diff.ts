// bun lite/infer/complete-diff.ts: completionsAt of lite/complete.ts (the cells) against lite/infer/frozen/complete.ts
// (the TypeScript Checker) at every identifier end and after every "." of the examples and the fixtures; exit 1 on a difference
import { Glob } from "bun";
import { parse, kids, type Node } from "../parse.ts";
import { completionsAt as live } from "../complete.ts";
import { completionsAt as frozen } from "./frozen/complete.ts";
import { splitCells } from "../toolchain/ss-toolchain.ts";
const ROOT = new URL("../..", import.meta.url).pathname;
const files = [...new Glob("lite/notebook/examples/*.ts*").scanSync(ROOT), ...new Glob("fixtures/*/*/cells.ts*").scanSync(ROOT)].sort();
let cases = 0, same = 0, diff = 0, empty = 0;
const shown: string[] = [];
for (const f of files) {
  const tsx = f.endsWith("x");
  const cells = splitCells(await Bun.file(ROOT + f).text(), tsx);
  for (let at = 0; at < cells.length; at++) {
    const t = cells[at];
    const ends = new Set<number>();
    const walk = (n: Node) => {
      if (n.type === "Identifier") { ends.add(n.end); ends.add(n.start + 1); }
      if (n.type === "MemberExpression" && !n.computed) ends.add(n.property.start);
      kids(n).forEach(walk);
    };
    try { walk(parse(t, { jsx: tsx }).program); } catch {}
    for (const off of ends) {
      cases++;
      const a = JSON.stringify(frozen(cells, at, off, tsx)), b = JSON.stringify(live(cells, at, off, tsx));
      if (a === b) { same++; if (JSON.parse(a).options.length === 0) empty++; } else { diff++; if (shown.length < 5) shown.push(`${f} cell ${at} @${off}\n  frozen ${a.slice(0, 300)}\n  live   ${b.slice(0, 300)}`); }
    }
  }
}
console.log(shown.join("\n"));
console.log(`${files.length} files, ${cases} positions: SAME ${same} (${empty} with no options) DIFFERENT ${diff}`);
if (diff) process.exit(1);
