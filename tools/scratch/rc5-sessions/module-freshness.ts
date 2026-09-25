// For each module embedded in a notebook: is its block identical to the declared canonical's block,
// in (a) this checkout and (b) another checkout's working tree (e.g. the main repo with uncommitted sweeps)?
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
const [nbPath, otherRoot] = process.argv.slice(2);
const canon = JSON.parse(readFileSync("modules/canonical.json", "utf8"));
const blocks = (html: string) => {
  const out = new Map<string, string>();
  for (const m of html.matchAll(/<script id="([^"]+)"[^>]*data-mime="application\/javascript"[^>]*>([\s\S]*?)<\/script>/g))
    if (!out.has(m[1])) out.set(m[1], m[2]);
  return out;
};
const h = (s?: string) => s ? createHash("sha1").update(s).digest("hex").slice(0, 10) : "-";
const cache = new Map<string, Map<string, string>>();
const load = (p: string) => { if (!cache.has(p)) cache.set(p, existsSync(p) ? blocks(readFileSync(p, "utf8")) : new Map()); return cache.get(p)!; };
const nb = load(nbPath);
const rows: string[] = [];
for (const [id, src] of nb) {
  const decl = canon[id]; if (!decl) continue;
  for (const repo of ["lopebooks", "lopecode"]) {
    const rel = decl[repo]; if (!rel) continue;
    const here = load(resolve(rel)).get(id);
    const there = otherRoot ? load(join(otherRoot, rel)).get(id) : undefined;
    const a = here === src ? "=" : here ? "≠" : "∅";
    const b = !otherRoot ? "" : there === src ? "=" : there ? "≠" : "∅";
    if (a !== "=" || (otherRoot && b !== "=")) rows.push(`${id.padEnd(44)} ${repo.padEnd(9)} committed:${a}  main-worktree:${b}  nb ${h(src)} canon ${h(here)} main ${h(there)}`);
  }
}
console.log(rows.length ? rows.join("\n") : "all embedded modules match their canonicals");
