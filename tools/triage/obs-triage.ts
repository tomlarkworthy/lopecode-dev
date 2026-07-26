// Triage: for each module whose canonical is a minority version, ask ObservableHQ
// (the publish source of truth) which corpus version it agrees with.
import { deriveIndex, loadCanonical } from "../lope-sync.ts";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dir, "../..");

function contentOf(rel: string, moduleId: string): string | null {
  const html = readFileSync(resolve(ROOT, rel), "utf8");
  const re = /<script\s+id="([^"]+)"([^>]*)>([\s\S]*?)<\/script>/g;
  for (const m of html.matchAll(re)) {
    if (m[1] !== moduleId) continue;
    if (!/data-mime="application\/javascript"/.test(m[2])) continue;
    return m[3].replace(/^\n/, "").replace(/\n$/, "");
  }
  return null;
}

function norm(s: string): string {
  s = s.split(/export default function define|^function define\(/m)[0];
  s = s.replace(/^const _[A-Za-z0-9_$]+ = function /gm, "function ");
  s = s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  s = s.replace(/^(\)?)\};$/gm, "$1}");
  return s.split("\n").map((l) => l.replace(/\s+$/, "")).filter((l) => l.length).join("\n");
}

const mods = process.argv.slice(2);
const idx = deriveIndex();
const canon = loadCanonical();

for (const mod of mods) {
  const refs = idx.get(mod) || [];
  const counts = new Map<string, number>();
  for (const r of refs) counts.set(r.sha, (counts.get(r.sha) || 0) + 1);
  const majority = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

  const name = mod.replace("@tomlarkworthy/", "");
  let obs: string | null = null;
  try {
    const res = await fetch(`https://api.observablehq.com/@tomlarkworthy/${name}.js?v=4`);
    if (res.ok) obs = await res.text();
  } catch {}

  if (!obs) { console.log(`${mod}\n  NOT PUBLISHED on observablehq (no external truth)\n`); continue; }
  const nObs = norm(obs);

  const lines: string[] = [];
  for (const repo of ["lopecode", "lopebooks"]) {
    const rel = (canon as any)[mod]?.[repo];
    if (!rel) continue;
    const c = contentOf(rel, mod);
    if (!c) { lines.push(`  ${repo}: canonical block MISSING`); continue; }
    const sha = refs.find((r) => r.rel === rel)?.sha ?? "?";
    lines.push(`  ${repo} canonical ${sha}  ${norm(c) === nObs ? "== OBSERVABLE" : "!= observable"}`);
  }
  // majority
  const majRef = refs.find((r) => r.sha === majority[0])!;
  const mc = contentOf(majRef.rel, mod);
  lines.push(`  majority  ${majority[0]} ×${majority[1]}  ${mc && norm(mc) === nObs ? "== OBSERVABLE" : "!= observable"}   e.g. ${majRef.rel}`);
  console.log(`${mod}\n${lines.join("\n")}\n`);
}
