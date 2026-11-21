// Import closure (by ImportDeclaration / export-from, value and type imports) of the checker, completion,
// toolchain and linker entry files. Run: bun selfhost/checker-survey/closure.ts
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { parse, type Node } from "../../lite/parse.ts";
const ROOT = resolve(import.meta.dir, "../..");
const ENTRIES = ["lite/infer/frozen/core.ts", "lite/infer/frozen/complete.ts", "lite/toolchain/ss-toolchain.ts", "lite/link.ts"];
const seen = new Map<string, string[]>();
const go = (f: string) => {
  if (seen.has(f)) return;
  const src = readFileSync(join(ROOT, f), "utf8");
  const deps: string[] = [];
  seen.set(f, deps);
  for (const s of parse(src).program.body as Node[]) {
    if ((s.type === "ImportDeclaration" || ((s.type === "ExportNamedDeclaration" || s.type === "ExportAllDeclaration") && s.source)) && String(s.source.value).startsWith(".")) {
      const p = relative(ROOT, resolve(dirname(join(ROOT, f)), s.source.value));
      deps.push(p + (s.importKind === "type" ? " (type)" : ""));
      if (existsSync(join(ROOT, p))) go(p);
    }
  }
};
ENTRIES.forEach(go);
for (const [f, d] of seen) console.log(f, "->", d.join(", "));
