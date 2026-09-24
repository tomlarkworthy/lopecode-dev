// Regression test: the `core` plugin of @tomlarkworthy/code-facts against recorded robocoop-5 ledgers.
// module.js is GENERATED (at test start when spawning is allowed) from lopebooks/notebooks/tomlarkworthy_code-facts.html
// (lope-reader --get-module); do not edit it. Seeds follow check-core.py's reading of each fixture.
import { test, expect, beforeAll } from "bun:test";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { importNotebookModule } from "../notebook-import.ts";

const here = import.meta.dir;
const repo = resolve(here, "../..");
const modulePath = join(here, "module.js");
const BUILTINS = new Set("md html Inputs Plot d3 FileAttachment localDisk py width invalidation now Generators Mutable htl require DOM Promises visibility Files tex svg mermaid dot __ojs_runtime".split(" "));
const EXEC = ["reference", "null", "metamorphic", "library"];
// df33 let a real-anchored null anchor alone; the plugin implements df34 (R6), so these cells are expected to differ
const KNOWN_DF33_DIFF: Record<string, string[]> = { "walk-20260924ah-variable-star-vetting-turn5.json": ["lombScargle"] };

(globalThis as any).window ??= globalThis;

let facts: any, core: any;
const fakeRuntime: any = { _variables: new Set(), mains: new Map() };
const node = () => Object.assign(new EventTarget(), { textContent: "" });
const tag = () => node();

beforeAll(async () => {
  try {
    writeFileSync(modulePath, execFileSync(process.execPath, ["tools/lope-reader.ts",
      "lopebooks/notebooks/tomlarkworthy_code-facts.html", "--get-module", "@tomlarkworthy/code-facts"],
      { cwd: repo, stdio: ["ignore", "pipe", "inherit"], maxBuffer: 1 << 26 }));
  } catch (e: any) {
    // some sandboxes refuse posix_spawn inside bun test; fall back to a module.js extracted beforehand
    if (!existsSync(modulePath)) throw new Error(`cannot extract module (${e.code}); run: bun tools/lope-reader.ts lopebooks/notebooks/tomlarkworthy_code-facts.html --get-module @tomlarkworthy/code-facts > tools/code-facts/module.js`);
    console.warn(`module extraction failed (${e.code}); using existing ${modulePath}`);
  }
  const m = await importNotebookModule(modulePath, {
    overrides: {
      runtime: fakeRuntime,
      observe: () => () => {},
      onCodeChange: () => () => {},
      persistentId: (v: any) => v.pid ?? v._name,
      contentHash: (s: string) => String(s).length.toString(36),
      html: tag, md: tag,
      navHref: (x: string) => "#" + x,
      Inputs: { table: () => ({}) }, // raRender renders tables through Inputs; the fixtures never paint
      expect: null,
    },
  });
  facts = await m.value("facts");
  core = await m.value("core");
});

type Fixture = any;

function seedsFor(d: Fixture) {
  const mod = d.cells_module[0];
  const cells: Record<string, any> = d.cells_module.length > 1 ? d.cells[mod] : d.cells;
  const roots: string[] | null = d.source.seedRoots;
  const bundle = parseInt(d.source.bundle.slice(2));
  const ins = (n: string) => cells[n].inputs.filter((i: string) => !BUILTINS.has(i) && i in cells);
  const up = (n: string) => {
    const s = new Set<string>(), st = [...ins(n)];
    while (st.length) { const x = st.pop()!; if (s.has(x)) continue; s.add(x); st.push(...ins(x)); }
    return s;
  };
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const reads = (n: string) => (roots || []).some((r) =>
    new RegExp("localDisk\\.\\w+\\(\\s*[\"'`]" + esc(r.slice("/local-disk/".length))).test(cells[n].definition) || cells[n].definition.includes(r));
  const anchorOf = (e: any) => {
    if (!EXEC.includes(e.kind) || !(e.evidence in cells) || ![...up(e.evidence)].some(reads)) return "synthetic";
    if (e.kind === "null") return "real-anchored";
    const s = e.anchor && e.anchor.status;
    return s === "real-anchored" || s === "demoted" ? s : "unmeasured";
  };
  const seeds: any[] = [];
  for (const [n, c] of Object.entries(cells)) {
    seeds.push([n, "kind", c.returns_function_by_source ? "function" : c.matches_DATA_RE ? "data" : "scalar"]);
    seeds.push([n, "state", "fulfilled"]);
    for (const i of ins(n)) seeds.push([n, "dependsOn", i]);
    if (c.given) seeds.push([n, "label", "given"]);
    if (c.deliverable) seeds.push([n, "role", "deliverable"]);
  }
  const hc = new Map(d.hash_check.map((h: any) => [`${h.cell}|${h.evidence}|${h.kind}`, h]));
  for (const row of d.attest) for (const e of row.list) {
    if (e.module !== mod) continue;
    const h: any = hc.get(`${e.cell}|${e.kind === "proof" ? "(proof text)" : e.evidence}|${e.kind}`);
    if (!h) throw new Error(`no hash_check for ${e.cell}/${e.evidence}/${e.kind}`);
    if (!h.cell_fresh_by_hash || h.evidence_fresh_by_hash === false) continue;
    if (e.kind === "crossing") {
      const x = d.crossChecks.find((c: any) => c.name === e.evidence);
      if (!(x && x.independent && x.agree)) continue;
    }
    const weight = e.kind === "proof" || e.kind === "literature" ? 0.5 : 1;
    seeds.push([e.cell, "freshEvidence", { kind: e.kind, via: e.evidence, weight, anchor: anchorOf(e) }]);
  }
  return { mod, cells, seeds, anchored: !!roots && bundle >= 33 };
}

// facts() finds its module by the variable holding it; give it one whose scope is the fixture's cells
function hold(A: any, cells: Record<string, any>) {
  const scope = new Map<string, any>();
  const m: any = { _scope: scope };
  for (const [n, c] of Object.entries(cells)) scope.set(n, {
    _name: n, _type: 1, _definition: c.definition, _inputs: [], _reachable: true, _module: m, pid: c.pid,
    _value: c.returns_function_by_source ? () => {} : c.matches_DATA_RE ? {} : 1,
  });
  fakeRuntime._variables.clear();
  fakeRuntime._variables.add({ _name: "A", _value: A, _module: m, _outputs: new Set() });
}

const dir = join(here, "fixtures");
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  test(file, () => {
    const d = JSON.parse(readFileSync(join(dir, file), "utf8"));
    const { mod, cells, seeds, anchored } = seedsFor(d);
    const A = facts([{ id: "fixture", derive: () => seeds }, core({ anchored })]);
    hold(A, cells);
    A.recompute();
    const s = A.snapshot();
    const got = new Set(s.facts.filter((f: any) => f.p === "label" && f.o === "core").map((f: any) => f.s));
    // expected.core is null when the turn made no core_status call; the collected table is then the only record (as in check-core.py)
    const table: string[] = d.expected.recorded_core_table[mod].core;
    if (d.expected.core) expect([...d.expected.core].sort()).toEqual([...table].sort());
    const want = new Set<string>(d.expected.core ?? table);
    const known = new Set(KNOWN_DF33_DIFF[file] || []);
    const diff = [...new Set([...got, ...want])].filter((n) => got.has(n) !== want.has(n)).sort();
    const blocked = Object.fromEntries(diff.map((n) => [n, s.facts.filter((f: any) => f.s === n && f.p === "blocked").map((f: any) => f.o)]));
    expect({ diff, blocked }).toEqual({ diff: [...known].sort(), blocked: Object.fromEntries([...known].sort().map((n) => [n, blocked[n]])) });
    for (const n of known) expect(want.has(n) && !got.has(n)).toBe(true);
    if (known.size) console.log(file, "known df33/df34 difference:", JSON.stringify(blocked));
    expect(s.warnings).toEqual([]);
    expect(s.rounds).toBeLessThanOrEqual(20);
    expect(Object.keys(s.labels).length).toBeGreaterThan(0);
  });
}
