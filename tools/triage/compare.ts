// Compare a module's lopecode canonical / lopebooks canonical / corpus majority
// against ObservableHQ, after normalising away lopecode embedding artifacts.
import { deriveIndex, loadCanonical } from "../lope-sync.ts";
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
  return s.split("\n").map((l) => l.replace(/\s+$/, "")).filter((l) => l.length).join("\n");
}
// crude structural view: the set of top-level cell signatures
function cells(s: string) {
  return new Set([...s.matchAll(/^(?:async )?function (_[A-Za-z0-9_$]*|\w+)\(([^)]*)\)/gm)].map((m) => `${m[1]}(${m[2]})`));
}

const idx = deriveIndex(), canon = loadCanonical();
for (const mod of process.argv.slice(2)) {
  const refs = idx.get(mod) || [];
  const counts = new Map<string, number>();
  for (const r of refs) counts.set(r.sha, (counts.get(r.sha) || 0) + 1);
  const [majSha, majN] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const name = mod.replace("@tomlarkworthy/", "");
  const res = await fetch(`https://api.observablehq.com/@tomlarkworthy/${name}.js?v=4`);
  const obs = res.ok ? norm(await res.text()) : null;

  const variants: Record<string, string> = {};
  for (const repo of ["lopecode", "lopebooks"]) {
    const rel = (canon as any)[mod]?.[repo];
    if (rel) variants[`${repo} canonical`] = norm(contentOf(rel, mod)!);
  }
  const majRel = refs.find((r) => r.sha === majSha)!.rel;
  variants[`majority ×${majN}`] = norm(contentOf(majRel, mod)!);

  console.log(`\n### ${mod}   (observable: ${obs ? obs.split("\n").length + " lines" : "NOT PUBLISHED"})`);
  const oc = obs ? cells(obs) : null;
  for (const [k, v] of Object.entries(variants)) {
    const vc = cells(v);
    const missing = oc ? [...oc].filter((c) => !vc.has(c)) : [];
    const extra = oc ? [...vc].filter((c) => !oc.has(c)) : [];
    const same = obs ? v === obs : false;
    console.log(`  ${k.padEnd(20)} ${v.split("\n").length} lines  ${same ? "IDENTICAL to observable" : obs ? "differs" : ""}` +
      (missing.length ? `  | ${missing.length} cells absent vs obs` : "") +
      (extra.length ? `  | ${extra.length} cells not on obs` : ""));
    if (missing.length) console.log(`      absent: ${missing.slice(0, 6).join(", ")}`);
    if (extra.length) console.log(`      extra : ${extra.slice(0, 6).join(", ")}`);
  }
  const vs = Object.entries(variants);
  for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++)
    if (vs[i][1] === vs[j][1]) console.log(`  == ${vs[i][0]} and ${vs[j][0]} are semantically IDENTICAL`);
}
