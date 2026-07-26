// Triage a "minority smell": lope-sync can see that a canonical holds a version
// few notebooks share, but content hashes carry no ordering, so it cannot say
// whether that means AHEAD (just refreshed) or BEHIND (never refreshed). Ask the
// publish source instead.
//
// Compares, per cell and immune to cell reordering, each of
//   lopecode canonical / lopebooks canonical / the corpus majority
// against ObservableHQ, normalising away the lopecode embedding artifacts so
// that id mangling and formatting do not read as real change.
//
//   bun tools/triage/cellwise.ts @tomlarkworthy/themes ...
//   bun tools/triage/cellwise.ts --all-minority
import { deriveIndex, loadCanonical, upstreamFor } from "../lope-sync.ts";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dir, "../..");

function contentOf(rel: string, moduleId: string): string | null {
  const html = readFileSync(resolve(ROOT, rel), "utf8");
  for (const m of html.matchAll(/<script\s+id="([^"]+)"([^>]*)>([\s\S]*?)<\/script>/g))
    if (m[1] === moduleId && /data-mime="application\/javascript"/.test(m[2]))
      return m[3].replace(/^\n/, "").replace(/\n$/, "");
  return null;
}

function norm(s: string): string {
  s = s.split(/export default function define|^function define\(/m)[0];
  // lopecode wraps each cell as `const _id = <fn>`; Observable emits a bare decl
  s = s.replace(/^const _[A-Za-z0-9_$]+ = (async )?function /gm, "$1function ");
  // materialised viewof/mutable helper cells that Observable does not emit
  s = s.replace(/^const _[A-Za-z0-9_$]+ = \(G, _\) => G\.input\(_\);$\n?/gm, "");
  s = s.replace(/^const _[A-Za-z0-9_$]+ = \(M, _\) => new M\(_\);$\n?/gm, "");
  s = s.replace(/^const _[A-Za-z0-9_$]+ = _ => _\.generator;$\n?/gm, "");
  // embedding artifacts: split close-tags, \uXXXX for non-ASCII
  s = s.replace(/<\/scr\\ipt>/g, "</script>");
  s = s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  s = s.replace(/^(\)?)\};$/gm, "$1}");
  return s;
}

/** Split into cells keyed by declared function name. Anonymous `_NN` doc cells are
 *  renumbered by the compiler, so they are not keyed. */
function cells(src: string) {
  const named = new Map<string, string>();
  let cur: string[] = [], name: string | null = null;
  const flush = () => {
    if (cur.length && name && !/^_\d+$/.test(name)) named.set(name, cur.join("\n").trim());
    cur = []; name = null;
  };
  for (const l of norm(src).split("\n")) {
    const m = l.match(/^(?:async )?function (\w+)\(/);
    if (m) { flush(); name = m[1]; }
    cur.push(l);
  }
  flush();
  return named;
}

const idx = deriveIndex();
const canon = loadCanonical();

let mods = process.argv.slice(2);
if (mods[0] === "--all-minority") {
  mods = Object.keys(canon).filter((m) => {
    const refs = idx.get(m) ?? [];
    const counts = new Map<string, number>();
    for (const r of refs) counts.set(r.sha, (counts.get(r.sha) || 0) + 1);
    if (counts.size < 2) return false;
    const top = Math.max(...counts.values());
    return Object.entries(canon[m]).some(([k, rel]) => {
      if (k === "upstream" || typeof rel !== "string") return false;
      const sha = refs.find((r) => r.rel === rel)?.sha;
      return sha !== undefined && (counts.get(sha) ?? 0) < top;
    });
  }).sort();
}

for (const mod of mods) {
  const refs = idx.get(mod) ?? [];
  const counts = new Map<string, number>();
  for (const r of refs) counts.set(r.sha, (counts.get(r.sha) || 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  const up = upstreamFor(mod);
  if (up.kind === "none") {
    console.log(`\n### ${mod}\n  NO UPSTREAM (declared) — the notebook is the origin; nothing to compare against.`);
    continue;
  }
  const res = await fetch(`https://api.observablehq.com/${up.slug}.js?v=4`);
  if (!res.ok) {
    console.log(`\n### ${mod}\n  observable ${res.status} — not published under ${up.slug}. Consider "upstream": null.`);
    continue;
  }
  const obs = cells(await res.text());

  const variants: [string, string][] = [];
  for (const repo of ["lopecode", "lopebooks"]) {
    const rel = (canon as any)[mod]?.[repo];
    if (typeof rel === "string") variants.push([`${repo} canonical`, rel]);
  }
  // the biggest version that is NOT a canonical — what the consumers actually run
  const canonShas = new Set(variants.map(([, rel]) => refs.find((r) => r.rel === rel)?.sha));
  const maj = ranked.find(([sha]) => !canonShas.has(sha)) ?? ranked[0];
  variants.push([`majority ×${maj[1]}`, refs.find((r) => r.sha === maj[0])!.rel]);

  console.log(`\n### ${mod}   (observable: ${obs.size} named cells)`);
  const score: Record<string, number> = {};
  for (const [label, rel] of variants) {
    const v = cells(contentOf(rel, mod)!);
    const absent = [...obs.keys()].filter((k) => !v.has(k));
    const extra = [...v.keys()].filter((k) => !obs.has(k));
    const differ = [...obs.keys()].filter((k) => v.has(k) && v.get(k) !== obs.get(k));
    score[label] = absent.length + extra.length + differ.length;
    console.log(
      `  ${label.padEnd(20)} ${score[label] === 0 ? "== OBSERVABLE" : `absent ${absent.length}  extra ${extra.length}  differ ${differ.length}`}`
    );
    if (absent.length) console.log(`      absent: ${absent.slice(0, 8).join(", ")}`);
    if (extra.length) console.log(`      extra : ${extra.slice(0, 8).join(", ")}`);
    if (differ.length) console.log(`      differ: ${differ.slice(0, 8).join(", ")}`);
  }
  const canonScores = variants.filter((v) => v[0].endsWith("canonical")).map((v) => score[v[0]]);
  const majScore = score[variants[variants.length - 1][0]];
  const best = Math.min(...canonScores);
  // Distance to Observable does NOT give direction. A canonical that differs while
  // the majority matches is just as likely to hold unpublished local work as to
  // have missed a refresh — observed both ways here: at-write's canonical carries
  // cover-image/bsky/standard.site features Observable has never seen, and
  // blank-notebook's carries three local welcome cells. Never call that "behind"
  // without reading the cells.
  console.log("  => " + (
    best === 0 ? "CANONICAL CURRENT — smell is 'ahead of consumers', no action"
    : majScore === 0 ? "CANONICAL DIVERGES from upstream while the majority matches it — READ THE CELLS: local-only work (ahead) or a missed refresh (behind)?"
    : best < majScore ? `both differ from Observable; canonical is closer (${best} vs ${majScore})`
    : best > majScore ? `both differ; MAJORITY is closer (${majScore} vs ${best}) — canonical may be behind, read the cells`
    : `both differ from Observable equally (${best}) — a shared local divergence, not a skew`
  ));
}
