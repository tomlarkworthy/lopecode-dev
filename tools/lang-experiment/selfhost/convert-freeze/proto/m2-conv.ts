// M2 run-time: a copy of tree/ (treeconv/) whose shipped SoundScript sections carry the ss_f conversions the checker
// finds in them (switches from the environment, as m2-static.ts); the converted checker is then run on the attack sets.
// Sites are mapped from the checked text to each file by the cell texts, which are substrings of the files.
import { PROTO, type Site } from "./tree/lite/proto-flags.ts";
import { checkSources } from "./tree/lite/core.ts";
import { SS_SOURCES, sectionSource, ssCellTexts } from "./tree/lite/soundscript/ts-cells.ts";
import { rewrite } from "./convert.ts";
import { readFileSync, writeFileSync } from "node:fs";
const LITE = new URL("./tree/lite/", import.meta.url).pathname, OUT = new URL("./treeconv/lite/", import.meta.url).pathname;
const units = new Map<string, string>();
for (const f of SS_SOURCES) { const u = sectionSource(f).unit; if (!units.has(u)) units.set(u, f); }
const perFile = new Map<string, Site[]>();
let total = 0, mapped = 0;
for (const [, file] of units) {
  const { src, ownFrom, shell } = sectionSource(file);
  PROTO.sites = []; PROTO.nonRet.clear();
  const r: any = checkSources({ cells: src, tsx: true, shell } as any);
  const sites = PROTO.sites; PROTO.sites = null;
  const okSpans = r.cells.filter((c: any) => c.status === "ok").map((c: any) => r.facts.get(c.name)?.span).filter(Boolean);
  // own files in join order, each cell text's offset in the joined text and in its file
  const group = SS_SOURCES.filter((f) => sectionSource(f).unit === sectionSource(file).unit);
  let at = ownFrom;
  for (const f of group) {
    const text = readFileSync(LITE + f, "utf8"); let cur = 0;
    for (const t of ssCellTexts(f)) {
      const fo = text.indexOf(t, cur); cur = fo + t.length;
      for (const s of sites) if (s.start >= at && s.end <= at + t.length && okSpans.some((sp: any) => s.start >= sp[0] && s.end <= sp[1])) {
        total++;
        if (fo >= 0) { mapped++; { const st = s.start - at + fo; (perFile.get(f) ?? perFile.set(f, []).get(f)!).push({ ...s, start: st, end: s.end - at + fo, label: `${f}:${text.slice(0, st).split("\n").length} ${s.kind} ${text.slice(st, s.end - at + fo).slice(0, 40).replace(/\s+/g, " ")}` } as any); } }
      }
      at += t.length + 2;
    }
  }
}
let unplaced = 0;
for (const [f, ss] of perFile) {
  const seen = new Set<string>(), uniq = ss.filter((s) => { const k = `${s.kind}:${s.start}:${s.end}`; if (seen.has(k)) return false; seen.add(k); return true; });
  const r = rewrite(readFileSync(LITE + f, "utf8"), uniq, false);
  unplaced += r.unplaced.length;
  for (const u of r.unplaced) console.log(`unplaced ${f} ${u.site.kind} ${u.why}`);
  writeFileSync(OUT + f, r.out);
  console.log(`${f}: ${uniq.length} sites`);
}
console.log(`-- sites ${total}, mapped ${mapped}, unplaced ${unplaced}, files ${perFile.size}`);
process.exit(0);
