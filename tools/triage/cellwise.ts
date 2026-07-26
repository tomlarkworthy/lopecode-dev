// Per-cell comparison against ObservableHQ, immune to cell reordering.
import { loadCanonical } from "../lope-sync.ts";
import { readFileSync } from "fs";
import { resolve } from "path";
const ROOT = resolve(import.meta.dir, "../..");
function contentOf(rel: string, moduleId: string) {
  const html = readFileSync(resolve(ROOT, rel), "utf8");
  for (const m of html.matchAll(/<script\s+id="([^"]+)"([^>]*)>([\s\S]*?)<\/script>/g))
    if (m[1] === moduleId && /data-mime="application\/javascript"/.test(m[2]))
      return m[3].replace(/^\n/, "").replace(/\n$/, "");
  return null;
}
function norm(s: string) {
  s = s.split(/export default function define|^function define\(/m)[0];
  s = s.replace(/^const _[A-Za-z0-9_$]+ = (async )?function /gm, "$1function ");
  s = s.replace(/^const _[A-Za-z0-9_$]+ = \(G, _\) => G\.input\(_\);$\n?/gm, "");
  s = s.replace(/<\/scr\\ipt>/g, "</script>");
  s = s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  s = s.replace(/^(\)?)\};$/gm, "$1}");
  return s;
}
// split into cells keyed by declared function name; anonymous doc cells (_NN) are
// renumbered by the compiler, so they are grouped by body instead.
function cells(src: string) {
  const named = new Map<string, string>(); const anon: string[] = [];
  const lines = norm(src).split("\n");
  let cur: string[] = [], name: string | null = null;
  const flush = () => {
    if (!cur.length) return;
    const body = cur.join("\n").trim();
    if (name && !/^_\d+$/.test(name)) named.set(name, body); else anon.push(body);
    cur = []; name = null;
  };
  for (const l of lines) {
    const m = l.match(/^(?:async )?function (\w+)\(/);
    if (m) { flush(); name = m[1]; }
    cur.push(l);
  }
  flush();
  return { named, anon };
}
const canon = loadCanonical();
for (const mod of process.argv.slice(2)) {
  const name = mod.replace("@tomlarkworthy/", "");
  const res = await fetch(`https://api.observablehq.com/@tomlarkworthy/${name}.js?v=4`);
  const obs = cells(await res.text());
  console.log(`\n### ${mod}  — observable has ${obs.named.size} named cells, ${obs.anon.length} anonymous`);
  for (const repo of ["lopecode", "lopebooks"]) {
    const rel = (canon as any)[mod]?.[repo]; if (!rel) continue;
    const v = cells(contentOf(rel, mod)!);
    const missing = [...obs.named.keys()].filter((k) => !v.named.has(k));
    const extra = [...v.named.keys()].filter((k) => !obs.named.has(k));
    const differ = [...obs.named.keys()].filter((k) => v.named.has(k) && v.named.get(k) !== obs.named.get(k));
    console.log(`  ${repo}: ${v.named.size} named cells | absent ${missing.length} | extra ${extra.length} | body differs ${differ.length}`);
    if (missing.length) console.log(`     absent from ${repo}: ${missing.join(", ")}`);
    if (extra.length) console.log(`     only in ${repo}   : ${extra.join(", ")}`);
    if (differ.length) console.log(`     body differs     : ${differ.join(", ")}`);
  }
}
