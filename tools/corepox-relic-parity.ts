// The engine's RELICS table is a copy of the corpus pack's `relics` field -- the
// engine cannot read the pack, because the pack is a shipyard FileAttachment and
// the shipyard imports the engine. This is what stops the copy drifting: every
// relic is compared component by component and wire by wire.
//
//   bun tools/corepox-relic-parity.ts
import {importNotebookModule} from "./notebook-import.ts";
import {gunzipSync} from "node:zlib";
import {readFileSync} from "node:fs";

const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const RELICS: any = await eng.value("RELICS");
const TYPES: any = await eng.value("TYPES");
const ALIAS: any = await eng.value("TYPE_ALIAS");
const pack = JSON.parse(gunzipSync(readFileSync("data/corepox/corpus.json.gz")).toString());
const shipped = pack.relics ?? {};

const comp = (c: any) => [c.type, c.pos[0], c.pos[1], c.dir ?? "up", c.param ?? null, c.hp ?? null].join("|");
const wire = (k: any) => [k.from[0], k.from[1], k.to[0], k.to[1]].join("|");
const norm = (r: any) => ({
  id: r.id ?? null, name: r.name ?? null,
  components: r.components.map(comp).sort(),
  connections: (r.connections ?? []).map(wire).sort()
});

let bad = 0;
const only = (a: object, b: object) => Object.keys(a).filter(k => !(k in b));
for (const k of only(shipped, RELICS)) { console.log(`MISSING from RELICS: ${k}`); bad++; }
for (const k of only(RELICS, shipped)) { console.log(`EXTRA in RELICS (not in the pack): ${k}`); bad++; }
for (const k of Object.keys(RELICS).filter(k => k in shipped)) {
  const a = JSON.stringify(norm(RELICS[k])), b = JSON.stringify(norm(shipped[k]));
  if (a === b) { console.log(`  ok   ${k.padEnd(20)} ${RELICS[k].components.length}c ${(RELICS[k].connections ?? []).length}w`); continue; }
  bad++;
  console.log(`DRIFT ${k}\n  engine ${a}\n  pack   ${b}`);
}
// DevouringLove is named by 4 designs and defined nowhere -- assert that is still true,
// so the day a definition turns up this tool says so instead of staying silent.
const named = new Set<string>();
for (const s of pack.ships) for (const c of s[2]) named.add(pack.types[c[0]]);
const undef = [...named].map(ALIAS).filter(t => !TYPES[t] && !(t in shipped));
console.log(`\ntypes named by a design that this engine neither implements nor has a relic for: ${undef.join(", ") || "none"}`);
console.log(bad ? `FAIL: ${bad} relic(s) differ` : "PASS: RELICS matches the shipped pack");
process.exit(bad ? 1 : 0);
