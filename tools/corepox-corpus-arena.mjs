// Can the arena actually match two designs out of the corpus? Drives the lab's
// arena through its QA seam: pick two corpus ids, fight, read the verdict.
//
// It also sweeps: a corpus of 2191 saved designs is not 2191 loadable ships, and
// a picker that offers one that throws is a picker with a hole in it. --sweep N
// counts how many of the top N by matches played will construct.
//
//   node tools/corepox-corpus-arena.mjs [--sweep N]
import { chromium } from "playwright";

const i = process.argv.indexOf("--sweep");
const SWEEP = i > 0 ? Number(process.argv[i + 1]) : 0;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
const errs = [];
p.on("pageerror", e => errs.push(e.message));
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html" +
  "#view=R100(S100(@tomlarkworthy/corepox-lab))");
await p.waitForTimeout(9000);

const qa = await p.evaluateHandle(() => {
  const m = window.__ojs_runtime.mains.get("@tomlarkworthy/corepox-lab");
  for (const [k, v] of m._scope) if (k === "viewof arena") return v._value.qa;
});
if (!(await qa.evaluate(q => !!q))) { console.error("no arena qa seam"); process.exit(1); }

const idx = await qa.evaluate(q => q.corpusIndex().slice(0, 2).map(r => ({id: r.id, name: r.name, m: r.matches})));
console.log("top two by matches played:");
for (const r of idx) console.log(`  ${r.id.slice(0, 8)}  ${r.name}  ${r.m} matches`);

const res = await p.evaluate(async ([q, ids]) => {
  q.setup({srcA: "corpus", srcB: "corpus", a: ids[0], b: ids[1], gap: 6});
  q.start();
  await new Promise(r => setTimeout(r, 12000));
  const s = q.state(), w = q.world();
  return {...s, parts: w ? w.ships.map(x => `${x.live.length}/${x.comps.length}`) : null};
}, [qa, idx.map(r => r.id)]);
console.log(`\nmatch: ${res.state}  t=${res.t.toFixed(1)}s  parts ${res.parts?.join(" vs ")}`);
const arenaEl = await p.$("datalist[id^=cp-corpus]");
const shoot = async (path) => {
  const root = await p.evaluateHandle(() => document.querySelector("datalist[id^=cp-corpus]").parentElement);
  await root.asElement().scrollIntoViewIfNeeded();
  await root.asElement().screenshot({ path });
};
await shoot("tools/screenshots/cp-corpus-arena.png");

if (SWEEP) {
  const r = await p.evaluate(async ([q, n]) => {
    const rows = q.corpusIndex().slice(0, n);
    let ok = 0; const bad = [];
    for (const row of rows) {
      q.setup({srcA: "corpus", srcB: "corpus", a: row.id, b: row.id, gap: 6});
      const w = q.world();
      if (w) ok++; else bad.push(row.id.slice(0, 8) + " " + row.name);
    }
    return {ok, n: rows.length, bad: bad.slice(0, 8)};
  }, [qa, SWEEP]);
  console.log(`\nloadable: ${r.ok}/${r.n} of the most-played designs`);
  if (r.bad.length) console.log("  failed:", r.bad.join(", "));
}
// A blocked design must say WHICH component it needs, before anything throws.
const blocked = await p.evaluate(async ([q]) => {
  const row = q.corpusIndex().find(r => r.blocked.length);
  if (!row) return null;
  q.setup({srcA: "corpus", srcB: "corpus", a: row.id, b: row.id, gap: 6});
  const out = document.querySelector('g,div');
  return {id: row.id.slice(0, 8), needs: row.blocked,
          world: !!q.world(), said: q.message?.() ?? null};
}, [qa]);
if (blocked) {
  console.log(`\nblocked design ${blocked.id} needs ${blocked.needs.join("+")}; ` +
              `world built: ${blocked.world} (must be false)`);
  if (blocked.world) { console.log("FAIL: a blocked design constructed anyway"); process.exit(1); }
}
await shoot("tools/screenshots/cp-corpus-arena-blocked.png");
console.log("pageerrors:", errs.slice(0, 3));
await b.close();
