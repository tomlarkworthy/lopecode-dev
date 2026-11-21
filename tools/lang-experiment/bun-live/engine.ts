// The live notebook: booted once; on `check`, the source files that differ from the last applied state are turned into
// variable definitions (fast: one cell's text compiled by the notebook's own compileCell or the build's Observable
// compiler; slow: a full build to a scratch file, its module blocks diffed) and defined on the running variables.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { blockContent, blockSpans } from "../../lib/notebook-blocks.ts";
import { compiler, splitSeed } from "../../spec-notebook.ts";
import { boot, OWN, type Booted } from "./boot.ts";
import { liteOf, SCRATCH } from "./root.ts";

const CORE = "@tomlarkworthy/soundscript";
const CHECKER = "@tomlarkworthy/soundscript-checker";
const SKIP_DIRS = new Set(["node_modules", ".scratch", ".oracle-scratch", ".oracle-scratch-spec", "shots", "archive", "build", ".jsx-build", "frozen", "probes", "repro"]);
const SRC_EXT = new Set([".ts", ".tsx", ".ojs", ".js"]);
// the members of `soundscript` that ss_context, ss_moduleCells, ss_check and compileCell call
const COMPILE_PATH = ["checkCells", "contextFromCheck", "compileCell", "decompileVariable", "keyOfVariable", "declaredNameAt", "isDuplicateKey", "langOf", "inputsIn", "cellStates", "joinCells", "STATE_VALUE", "RUNTIME_CELLS", "INPUTS"];

export type TestState = { module: string; name: string; state: "passed" | "failed" | "skipped" | "pending"; detail?: string };
export type Line = { kind: string; text: string; bad?: boolean };
type Rec = { name: string | null; inputs: string[]; fn: any; def: string; pid?: string; observed: boolean };
type SsFile = { kind: "ss"; module: string; split: "section" | "plain"; keys: string[]; texts: string[] };
type OjsFile = { kind: "ojs"; module: string; blocks: string[]; mapped: Set<number> };
type Snap = { content: string; map?: SsFile | OjsFile };

const keyOfRec = (r: { name: string | null; pid?: string }) => (typeof r.name === "string" ? r.name : `pid:${r.pid}`);
const sameRec = (a: { inputs: string[]; def: string }, b: { inputs: string[]; def: string }) => a.def === b.def && JSON.stringify(a.inputs) === JSON.stringify(b.inputs);

export class Live {
  b!: Booted;
  rt: any;
  root: string;
  lite: string;
  notebook: string;
  poll: number;
  timeout: number;
  filter: string | null;
  baseline = new Map<string, Map<string, Rec>>();
  snaps = new Map<string, Snap>();
  tracked = new Map<any, { ver: number; p: any; settled: boolean; state: TestState }>();
  lastBuild: string | null = null;
  restartNeeded = new Set<string>();
  toolFiles = new Set<string>();
  buildInputs = new Set<string>();
  bootMs = 0;
  compile!: (s: string) => { _name: string | null; _inputs: string[]; _definition: string }[];
  disposeCompiler: () => void = () => {};
  tc: any; toolchain: any; parser: any; moduleJs: any;
  busy: Promise<unknown> = Promise.resolve();
  phases: string[] = [];
  phaseAt = 0;
  mark(what: string) { const t = performance.now(); this.phases.push(`${what} ${(t - this.phaseAt).toFixed(0)}`); this.phaseAt = t; }

  constructor(o: { root: string; notebook: string; poll?: number; timeout?: number; filter?: string | null }) {
    this.root = o.root; this.lite = liteOf(o.root); this.notebook = o.notebook;
    this.poll = o.poll ?? 100; this.timeout = o.timeout ?? 30000; this.filter = o.filter ?? null;
  }

  async start() {
    // the root's own copies, so a --root tree is split and checked by its own sources
    this.tc = await import(join(this.lite, "soundscript/ts-cells.ts"));
    this.toolchain = await import(join(this.lite, "toolchain/ss-toolchain.ts"));
    this.parser = await import(join(this.lite, "parse.ts"));
    this.moduleJs = await import(join(this.lite, "toolchain/module-js.ts"));
    // the files whose functions live.ts calls to split cells (ssCellTexts, splitCells, declaredName, syntaxStub, parse)
    this.toolFiles = new Set([...this.closure([join(this.lite, "parse.ts")]), ...["soundscript/ts-cells.ts", "toolchain/ss-toolchain.ts", "toolchain/module-js.ts"].map((f) => join(this.lite, f))]);
    this.b = await boot(this.notebook, this.poll);
    this.rt = this.b.rt;
    this.bootMs = this.b.bootMs;
    // the build's Observable compiler (a second notebook, headless); booted after this one: booted before, it breaks a require in test_polyglot_listing
    if (process.env.LIVE_NO_COMPILER) this.compile = () => { throw new Error("no compiler"); };
    else { const c = await compiler(); this.compile = c.compile; this.disposeCompiler = c.dispose; }
    await this.baselineFrom(readFileSync(this.notebook, "utf8"));
    this.observeTests();
    await this.settle();
    await this.index();
  }

  // ---- runtime access
  mod(name: string) { return this.b.moduleNamed(name); }
  varsOf(M: any) { const out = new Map<string, any>(); for (const v of this.rt._variables) if (v._module === M && v._type === 1) out.set(typeof v._name === "string" ? v._name : `pid:${v.pid}`, v); return out; }
  coreVar(n: string) { const M = this.mod(CORE); for (const v of this.rt._variables) if (v._module === M && v._name === n) return v; throw new Error(`no ${n} in ${CORE}`); }
  async coreValue(n: string) {
    const v = this.coreVar(n);
    for (;;) { const p = v._promise; const x = await p; if (v._promise === p) return x; }
  }
  g(n: string) { return this.rt._global(n); }
  // definitions evaluated as the notebook's modules are: module code in the page's realm, through its importShim
  async realize(defs: string[]): Promise<any[]> {
    if (!defs.length) return [];
    const URL = this.g("URL"), Blob = this.g("Blob");
    const url = URL.createObjectURL(new Blob([`export default [\n${defs.map((d) => `(${d})`).join(",\n")}\n];`], { type: "text/javascript" }));
    try { return (await this.g("importShim")(url)).default; } finally { URL.revokeObjectURL(url); }
  }
  // a module block's variables, from running its define() against a recorder; the real runtime for everything else
  async record(source: string): Promise<Rec[]> {
    const URL = this.g("URL"), Blob = this.g("Blob");
    const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    let define: any;
    try { define = (await this.g("importShim")(url)).default; } finally { URL.revokeObjectURL(url); }
    const out: Rec[] = [];
    const norm = (a: any[], r: Rec) => {
      let [name, inputs, fn] = a.length === 1 ? [null, [], a[0]] : a.length === 2 ? (typeof a[0] === "string" || a[0] === null ? [a[0], [], a[1]] : [null, a[0], a[1]]) : a;
      Object.assign(r, { name, inputs: [...inputs], fn, def: String(fn) });
    };
    const variable = (observed: boolean) => {
      const r = { observed } as Rec;
      out.push(r);
      const p: any = { define: (...a: any[]) => (norm(a, r), p) };
      Object.defineProperty(p, "pid", { set: (x) => (r.pid = x), get: () => r.pid });
      return p;
    };
    const main = { variable: (o: unknown) => variable(o !== undefined), define: (...a: any[]) => variable(false).define(...a), builtin() {}, import() { throw new Error("module.import in a block is not handled"); } };
    const rt = this.rt;
    const runtime = new Proxy(rt, { get: (t, k) => (k === "module" ? (d?: any, o?: any) => (d === undefined ? main : t.module(d, o)) : typeof t[k] === "function" ? t[k].bind(t) : t[k]) });
    define(runtime, (name: string) => ({ name }));
    return out;
  }
  async baselineFrom(html: string) {
    for (const s of blockSpans(html)) {
      if (!OWN.test(s.id) || !this.mod(s.id)) continue;
      const recs = await this.record(blockContent(html, s.id)!);
      this.baseline.set(s.id, new Map(recs.map((r) => [keyOfRec(r), r])));
    }
  }

  // ---- tests: every in-scope test_* is kept reachable; its latest outcome is read from its promise
  inScope(v: any) { return typeof v._name === "string" && v._name.startsWith("test_") && v._type === 1 && OWN.test(this.b.nameOfModule(v._module)); }
  observeTests() {
    for (const v of this.rt._variables) {
      if (!this.inScope(v)) continue;
      if (typeof v._observer === "symbol") { v._observer = { pending() {}, fulfilled() {}, rejected() {} }; this.rt._dirty?.add(v); }
      this.track(v);
    }
    for (const v of [...this.tracked.keys()]) if (!this.rt._variables.has(v)) this.tracked.delete(v);
    this.rt._computeNow?.();
  }
  track(v: any) {
    const t = this.tracked.get(v);
    if (t && t.p === v._promise) return;
    const state: TestState = { module: this.b.nameOfModule(v._module), name: v._name, state: "pending" };
    const entry = { ver: v._version, p: v._promise, settled: false, state };
    this.tracked.set(v, entry);
    if (!(v._version > 0)) return;
    const p = v._promise;
    const skip = (x: unknown) => (typeof x === "string" ? /^\s*skipped\s*:/i.test(x) : !!x && typeof x === "object" && ((x as any).skipped === true || (x as any).__skip === true));
    p.then((x: unknown) => { if (v._promise === p) Object.assign(entry, { settled: true }) && Object.assign(state, skip(x) ? { state: "skipped", detail: String((x as any)?.reason ?? x) } : { state: "passed" }); },
      (e: any) => { if (v._promise === p) { entry.settled = true; Object.assign(state, { state: "failed", detail: e?.message ?? String(e) }); } });
  }
  testStates(filter = this.filter): TestState[] {
    return [...this.tracked.entries()].filter(([v]) => !filter || v._name.includes(filter)).map(([, t]) => t.state).sort((a, b) => a.module.localeCompare(b.module) || a.name.localeCompare(b.name));
  }
  // waits until every reachable test has settled and no tracked version moved over two polls; the poll also calls
  // _computeNow as lope-runtime's settle loop does at boot (bun-verify README: S7_5 and S7_7 depend on it)
  async settle(): Promise<string[]> {
    const t0 = performance.now();
    // with --filter only the matching tests are waited for; the others go on computing after the report
    const wanted = (v: any) => !this.filter || v._name.includes(this.filter);
    const sig = () => [...this.tracked.keys()].filter(wanted).map((v) => v._version).join(",") + "|" + ["soundscript", "ss_check", "ss_context"].map((n) => this.coreVar(n)._version).join(",");
    let last = "", quiet = 0;
    for (;;) {
      await new Promise((r) => setTimeout(r, this.poll));
      this.rt._computeNow?.();
      this.observeTests();
      for (const v of this.tracked.keys()) this.track(v);
      const pending = [...this.tracked.entries()].filter(([v, t]) => v._reachable && !t.settled && wanted(v)).map(([v]) => v);
      const s = sig();
      if (process.env.LIVE_DEBUG) process.stderr.write(`settle ${(performance.now() - t0).toFixed(0)} pending ${pending.map((v) => v._name).slice(0, 5).join(",")}${pending.length > 5 ? "…" + pending.length : ""}\n`);
      quiet = !pending.length && s === last ? quiet + 1 : 0;
      last = s;
      if (quiet >= 2) return [];
      if (performance.now() - t0 > this.timeout) return pending.map((v) => `${this.b.nameOfModule(v._module)}#${v._name}`);
    }
  }

  // ---- source files
  closure(starts: string[], keep: (f: string) => boolean = () => true) {
    const tt = { ts: new Bun.Transpiler({ loader: "ts" }), tsx: new Bun.Transpiler({ loader: "tsx" }) };
    const seen = new Set<string>();
    const go = (f: string) => {
      if (seen.has(f) || !existsSync(f) || !f.startsWith(this.root)) return;
      seen.add(f);
      // the transpiler refuses a #! line; it is blanked, keeping offsets
      const src = readFileSync(f, "utf8"), text = src.startsWith("#!") ? " ".repeat(src.indexOf("\n")) + src.slice(src.indexOf("\n")) : src;
      let imports: { path: string }[] = [];
      try { imports = tt[f.endsWith("x") ? "tsx" : "ts"].scanImports(text); } catch { return; }
      for (const i of imports) if (i.path.startsWith(".")) go(resolve(dirname(f), i.path));
    };
    starts.forEach(go);
    return new Set([...seen].filter(keep));
  }
  watched(): string[] {
    const out: string[] = [join(this.root, "tools/lang-experiment/prelude.runtime.ts")];
    const walk = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (SKIP_DIRS.has(e.name) || e.name.startsWith(".")) continue;
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (SRC_EXT.has(extname(e.name)) && !e.name.endsWith(".test.ts")) out.push(p);
      }
    };
    walk(this.lite);
    return out;
  }
  rel(f: string) { return relative(this.root, f); }
  // the files a build reads: build.ts and entry.ts with their imports, and everything under soundscript/ and the examples
  computeBuildInputs() {
    const s = this.closure([join(this.lite, "soundscript/build.ts"), this.tc.ENTRY]);
    for (const f of this.watched()) if (f.startsWith(join(this.lite, "soundscript/")) || f.startsWith(join(this.lite, "notebook/examples/"))) s.add(f);
    s.add(join(this.root, "tools/lang-experiment/prelude.runtime.ts"));
    this.buildInputs = s;
  }

  // which module each file's cells are in, found by matching its cell texts with the live cells' decompiled texts
  // contents: the files as they were read for this check (a save during the build is seen by the next check)
  async index(contents = new Map<string, string>()) {
    this.computeBuildInputs();
    let moduleCells: any;
    // with the checker failing (a runtime cell it takes rejected) the cells cannot be decompiled: the maps are kept
    try { moduleCells = await this.coreValue("ss_moduleCells"); } catch {
      for (const f of this.watched()) { const c = contents.get(f) ?? readFileSync(f, "utf8"); const s = this.snaps.get(f); if (s) s.content = c; else this.snaps.set(f, { content: c }); }
      return;
    }
    const byText = new Map<string, Set<string>>(), keyOf = new Map<string, string>();
    for (const name of this.baseline.keys()) {
      for (const c of moduleCells(this.mod(name))) {
        (byText.get(c.text) ?? byText.set(c.text, new Set()).get(c.text)!).add(name);
        keyOf.set(name + "\0" + c.text, c.key);
      }
    }
    const ojsVars = new Map<string, Map<string, any>>();
    for (const name of this.baseline.keys()) ojsVars.set(name, this.varsOf(this.mod(name)));
    this.snaps.clear();
    for (const f of this.watched()) {
      const content = contents.get(f) ?? readFileSync(f, "utf8");
      const snap: Snap = { content };
      this.snaps.set(f, snap);
      if (f.endsWith(".ojs")) { snap.map = this.mapOjs(content, ojsVars) ?? undefined; continue; }
      if (!/\.tsx?$/.test(f)) continue;
      for (const split of ["section", "plain"] as const) {
        const texts = this.splitFile(f, content, split);
        if (!texts?.length) continue;
        const mods = texts.map((t) => byText.get(t) ?? new Set<string>());
        const common = [...mods[0]].filter((m) => mods.every((s) => s.has(m)));
        if (common.length !== 1) continue;
        snap.map = { kind: "ss", module: common[0], split, texts, keys: texts.map((t) => keyOf.get(common[0] + "\0" + t)!) };
        break;
      }
    }
  }
  // the key ss_moduleCells gives a cell: its declared name, or "type X" for a type declaration
  keyOfText(t: string): string | null {
    const n = this.toolchain.declaredName(t);
    if (n) return n;
    try {
      const st = this.parser.parse(t, { jsx: true }).program.body[0];
      const d = st?.type === "ExportNamedDeclaration" ? st.declaration : st;
      return /^TS(TypeAlias|Interface)Declaration$/.test(d?.type ?? "") ? `type ${d.id.name}` : null;
    } catch { return null; }
  }
  splitFile(f: string, content: string, split: "section" | "plain"): string[] | null {
    try {
      if (split === "section") return f.startsWith(this.lite + "/") ? this.tc.ssCellTexts(relative(this.lite, f)) : null;
      return this.toolchain.splitCells(content, f.endsWith("x"));
    } catch { return null; }
  }
  // the build's other block kinds: a //ss: or //raw: line (a block of comments only) and a raw define(...) call
  plainBlock(src: string) {
    let P: any;
    try { P = this.parser.parse(src); } catch { return true; }
    const b = P.program.body;
    if (!b.length) return false;
    return !(b.length === 1 && b[0].type === "ExpressionStatement" && b[0].expression.type === "CallExpression" && b[0].expression.callee.type === "Identifier" && b[0].expression.callee.name === "define");
  }
  // a .ojs file's plain Observable blocks, each compiled as the build does, matched with one module's live definitions
  mapOjs(content: string, vars: Map<string, Map<string, any>>): OjsFile | null {
    const blocks = splitSeed(content);
    const votes = new Map<string, Set<number>>();
    blocks.forEach((src, i) => {
      if (!this.plainBlock(src)) return;
      let specs; try { specs = this.compile(src); } catch { return; }
      for (const [m, vs] of vars) {
        const ok = specs.every((s, j) => {
          const v = vs.get(typeof s._name === "string" ? s._name : `pid:_ss${i}_${j}`);
          return v && String(v._definition) === String(s._definition) && JSON.stringify(v._inputs.map((x: any) => x._name)) === JSON.stringify(s._inputs ?? []);
        });
        if (ok && specs.length) (votes.get(m) ?? votes.set(m, new Set()).get(m)!).add(i);
      }
    });
    const best = [...votes].sort((a, b) => b[1].size - a[1].size)[0];
    return best ? { kind: "ojs", module: best[0], blocks, mapped: best[1] } : null;
  }

  // ---- check: what changed, and the tier that applies it
  // all: a build of every file, whatever the snapshot says (at start, to bring a booted notebook up to the files)
  check(all = false): Promise<Line[]> { const r = this.busy.then(() => this.checkNow(all)); this.busy = r.catch(() => {}); return r; }
  async checkNow(all = false): Promise<Line[]> {
    const t0 = performance.now();
    this.phases = []; this.phaseAt = t0;
    const changed: string[] = [];
    const now = new Set(this.watched());
    const contents = new Map<string, string>();
    for (const f of now) { const c = readFileSync(f, "utf8"); if (all || this.snaps.get(f)?.content !== c) { changed.push(f); contents.set(f, c); } }
    for (const f of this.snaps.keys()) if (!now.has(f)) { changed.push(f); this.snaps.delete(f); }
    if (!changed.length) return [{ kind: "check", text: `nothing changed; ${(performance.now() - t0).toFixed(0)} ms` }];
    const newest = Math.max(...changed.filter(existsSync).map((f) => statSync(f).mtimeMs), 0);
    const out: Line[] = [];
    for (const f of all ? [] : changed) if (this.toolFiles.has(f)) { this.restartNeeded.add(this.rel(f)); out.push({ kind: "restart", text: `${this.rel(f)} is imported by live.ts itself (splitting cells); restart it to use the new copy` }); }
    const unregistered = all ? [] : changed.filter((f) => f.endsWith(".ss.ts") && existsSync(f) && !this.buildInputs.has(f) && !this.snaps.get(f)?.map);
    let fast = all ? { ok: false, plan: [], slow: [{ file: this.lite, why: "every file" }] } : await this.planFast(changed.filter((f) => !unregistered.includes(f)));
    // the fast tier compiles with the notebook's own checker; when that fails (it takes a runtime cell that is now rejected), the build does it
    if (fast.ok) try { await Promise.all(["ss_moduleCells", "ss_context", "ss_check"].map((n) => this.coreValue(n))); } catch (e: any) {
      fast = { ok: false, plan: [], slow: [{ file: this.lite, why: `the notebook's checker fails (${String(e?.message ?? e).slice(0, 120)})` }] };
    }
    this.mark("planned");
    const before = new Map([...this.tracked.keys()].map((v) => [v, v._version]));
    let tier: string, applied: Line[] = [], verdicts: Line[] = [];
    if (fast.ok) {
      tier = "fast";
      ({ applied, verdicts } = await this.applyFast(fast.plan));
    } else if (fast.slow.length) {
      tier = "slow (" + fast.slow.map((x) => this.rel(x.file) + ": " + x.why).slice(0, 3).join("; ") + (fast.slow.length > 3 ? "; ..." : "") + ")";
      const r = await this.applySlow(contents);
      applied = r.applied; verdicts = r.verdicts;
      if (r.failed) { out.push(...applied); for (const f of unregistered) out.push(...(await this.unregisteredVerdicts(f))); out.push({ kind: "check", text: `build failed, nothing applied; ${tier}; ${(performance.now() - t0).toFixed(0)} ms`, bad: true }); return out; }
    } else tier = "none";
    if (tier !== "slow") for (const [f, c] of contents) {
      const s = this.snaps.get(f);
      if (!s) { this.snaps.set(f, { content: c }); continue; }
      s.content = c;
      if (s.map?.kind === "ss") s.map.texts = this.splitFile(f, c, s.map.split) ?? s.map.texts;
      if (s.map?.kind === "ojs") s.map.blocks = splitSeed(c);
    }
    for (const f of unregistered) verdicts.push(...(await this.unregisteredVerdicts(f)));
    const timedOut = applied.length ? await this.settle() : [];
    this.mark("settled");
    out.push(...applied, ...verdicts);
    const recomputed = [...this.tracked.entries()].filter(([v]) => before.get(v) !== v._version && (!this.filter || v._name.includes(this.filter)));
    let fails = 0;
    const passed: string[] = [];
    for (const [v, t] of recomputed) {
      const s = t.state, id = `${s.module}#${s.name}`;
      if (timedOut.includes(id)) { out.push({ kind: "test", text: `TIMEOUT ${id}`, bad: true }); fails++; continue; }
      if (s.state === "failed") fails++;
      if (s.state === "passed" && recomputed.length > 12) { passed.push(s.name); continue; }
      out.push({ kind: "test", text: `${s.state === "failed" ? "FAIL" : s.state === "skipped" ? "SKIP" : s.state === "pending" ? "PENDING" : "PASS"} ${id}${s.detail ? ": " + s.detail.replace(/\s+/g, " ").slice(0, 300) : ""}`, bad: s.state === "failed" || s.state === "pending" });
    }
    if (passed.length) out.push({ kind: "test", text: `PASS ${passed.length} recomputed: ${passed.join(" ")}` });
    // many failures with one message (a checker that fails fails every test) are one line
    const fl = out.filter((l) => l.kind === "test" && l.text.startsWith("FAIL "));
    const byMsg = new Map<string, Line[]>();
    for (const l of fl) { const m = l.text.slice(l.text.indexOf(": ") + 2); (byMsg.get(m) ?? byMsg.set(m, []).get(m)!).push(l); }
    for (const [m, ls] of byMsg) if (ls.length > 5) {
      const at = out.indexOf(ls[0]);
      for (const l of ls) out.splice(out.indexOf(l), 1);
      out.splice(at, 0, { kind: "test", text: `FAIL ${ls.length} tests (${ls.slice(0, 4).map((l) => l.text.split(" ")[1].split("#")[1].replace(/:$/, "")).join(", ")}, ...): ${m}`, bad: true });
    }
    const n = (k: string) => applied.filter((l) => l.kind === k).length;
    out.push({ kind: "check", text: `${tier}; ${n("redefined")} redefined, ${n("defined")} defined, ${n("deleted")} deleted; ${recomputed.length} tests recomputed, ${fails} failing; ${(performance.now() - t0).toFixed(0)} ms (${(Date.now() - newest).toFixed(0)} ms since the last save)` });
    out.push({ kind: "phases", text: `phases (ms): ${this.phases.join(", ")}` });
    return out;
  }

  // ---- fast tier: body-only edits of mapped cells
  async planFast(files: string[]) {
    const plan: { module: string; ss: Map<string, string>; ojs: { index: number; src: string; file: string }[] }[] = [];
    const slow: { file: string; why: string }[] = [];
    const entry = (m: string) => plan.find((p) => p.module === m) ?? (plan.push({ module: m, ss: new Map(), ojs: [] }), plan[plan.length - 1]);
    for (const f of files) {
      const snap = this.snaps.get(f);
      if (!existsSync(f)) { if (snap?.map || this.buildInputs.has(f)) slow.push({ file: f, why: "deleted" }); continue; }
      const content = readFileSync(f, "utf8");
      const map = snap?.map;
      if (!map) { if (this.buildInputs.has(f)) slow.push({ file: f, why: snap ? "not a file of cells this tool maps" : "new file" }); continue; }
      if (map.kind === "ss") {
        const texts = this.splitFile(f, content, map.split);
        if (!texts) { slow.push({ file: f, why: "does not split into cells" }); continue; }
        if (texts.length !== map.texts.length) { slow.push({ file: f, why: "cells added or removed" }); continue; }
        const e = entry(map.module);
        let ok = true;
        texts.forEach((t, i) => {
          if (t === map.texts[i]) return;
          if (this.keyOfText(t) !== map.keys[i]) ok = false;
          else e.ss.set(map.keys[i], t);
        });
        if (!ok) slow.push({ file: f, why: "a cell renamed" });
      } else {
        const blocks = splitSeed(content);
        if (blocks.length !== map.blocks.length) { slow.push({ file: f, why: "blocks added or removed" }); continue; }
        const e = entry(map.module);
        blocks.forEach((src, i) => {
          if (src === map.blocks[i]) return;
          if (!map.mapped.has(i) || !this.plainBlock(src)) slow.push({ file: f, why: `block ${i} is not a plain Observable block` });
          else e.ojs.push({ index: i, src, file: f });
        });
      }
    }
    return { ok: !slow.length && plan.some((p) => p.ss.size || p.ojs.length), plan, slow };
  }

  async applyFast(plan: Awaited<ReturnType<Live["planFast"]>>["plan"]) {
    const applied: Line[] = [], verdicts: Line[] = [];
    const defs: { M: any; module: string; name: string | null; pid?: string; inputs: string[]; def: string }[] = [];
    const [moduleCells, context, ss] = await Promise.all(["ss_moduleCells", "ss_context", "soundscript"].map((n) => this.coreValue(n)));
    const edited = new Map<string, Set<string>>();
    const upstream = this.checkerUpstream();
    const before = new Map<string, Map<string, string>>();
    for (const p of plan) if (p.ss.size) before.set(p.module, await this.statesOf(p.module));
    for (const p of plan) {
      const M = this.mod(p.module), live = this.varsOf(M);
      for (const { index, src, file } of p.ojs) {
        const specs = this.compile(src);
        const stub = specs.map((s) => this.moduleJs.syntaxStub(String(s._definition))).find((x) => x !== null);
        if (stub) { verdicts.push({ kind: "verdict", text: `${this.rel(file)} block ${index} does not compile: ${stub}`, bad: true }); continue; }
        specs.forEach((s, j) => defs.push({ M, module: p.module, name: s._name ?? null, pid: `_ss${index}_${j}`, inputs: s._inputs ?? [], def: String(s._definition) }));
      }
      if (!p.ss.size) continue;
      edited.set(p.module, new Set(p.ss.keys()));
      const cells = moduleCells(M);
      const texts = cells.map((c: any) => (p.ss.has(c.key) ? p.ss.get(c.key) : c.text));
      // a cell of the checker: the checker that compiles it now is the old one, and every module is compiled again
      // below by the new one, so this round takes the old (remembered) context, without the edited cells' facts
      const ofChecker = cells.some((c: any) => p.ss.has(c.key) && upstream.has(c.variable));
      let ctx = context(ofChecker ? cells.map((c: any) => c.text) : texts, M);
      if (ofChecker) { const facts = new Map(ctx.facts); for (const k of p.ss.keys()) facts.delete(k); ctx = { ...ctx, facts }; }
      this.mark(ofChecker ? "old context" : "context");
      for (const t of ofChecker ? [...p.ss.values()] : texts) for (const x of ss.compileCell(t, true, ctx)) {
        const v = live.get(x.name);
        if (!v || String(v._definition) !== x.definition || JSON.stringify(v._inputs.map((i: any) => i._name)) !== JSON.stringify(x.inputs)) defs.push({ M, module: p.module, name: x.name, inputs: x.inputs, def: x.definition });
      }
    }
    this.mark("compiled");
    applied.push(...(await this.define(defs)));
    this.mark("defined");
    // a redefined cell the checker is made of: once the runtime has recomputed it, every module is compiled again by the new checker
    if (defs.some((d) => upstream.has(this.varsOf(d.M).get(d.name ?? `pid:${d.pid}`)))) {
      for (let round = 0; round < 3; round++) {
        await this.settle();
        this.mark("settled");
        const again = await this.recompileAll();
        this.mark("recompiled every module");
        if (!again.length) break;
        applied.push(...(await this.define(again)).map((l) => ({ ...l, text: l.text + " (by the edited checker)" })));
      }
    }
    for (const [module, keys] of edited) {
      verdicts.push(...(await this.verdicts(module, keys)));
      // the module's other cells whose state the edit changed (a type edit has no state of its own)
      const now = await this.statesOf(module), was = before.get(module)!;
      const flipped = new Set([...now.keys()].filter((k) => !keys.has(k) && was.get(k) !== now.get(k)));
      if (flipped.size) verdicts.push(...(await this.verdicts(module, flipped)).map((l) => ({ ...l, text: `${l.text} (was ${was.get(l.text.split(" ")[1])?.split(" ")[0] ?? "absent"})` })));
      if (now.size) for (const k of keys) if (!now.has(k)) verdicts.push({ kind: "verdict", text: `verdict ${k}: a declaration, no state of its own${flipped.size ? "" : "; no cell's state changed"}` });
    }
    this.mark("verdicts");
    return { applied, verdicts };
  }
  // the variables the notebook's compile path (ss_context, compileCell) is computed from
  // (through `soundscript` only the functions those cells call, not every name the object carries)
  checkerUpstream() {
    const seen = new Set<any>();
    const go = (v: any) => {
      if (!v || seen.has(v)) return;
      seen.add(v);
      for (const i of v._inputs ?? []) if (i._name === "soundscript") via(i); else go(i);
    };
    // the core's soundscript is an import of the checker module's; the import's one input is that variable
    const via = (s: any) => {
      seen.add(s);
      for (const j of s._inputs) if (j._name === "soundscript") via(j); else if (COMPILE_PATH.includes(j._name)) go(j);
    };
    for (const n of ["ss_context", "ss_moduleCells", "ss_check", "ss_outside"]) go(this.coreVar(n));
    return seen;
  }
  async recompileAll() {
    let moduleCells: any, context: any, ss: any;
    try { [moduleCells, context, ss] = await Promise.all(["ss_moduleCells", "ss_context", "soundscript"].map((n) => this.coreValue(n))); } catch { return []; }
    const defs: Parameters<Live["define"]>[0] = [];
    for (const module of this.baseline.keys()) {
      const M = this.mod(module), live = this.varsOf(M), cells = moduleCells(M);
      if (!cells.length) continue;
      const ctx = context(cells.map((c: any) => c.text), M);
      for (const c of cells) for (const x of ss.compileCell(c.text, true, ctx)) {
        const v = live.get(x.name);
        if (!v || String(v._definition) !== x.definition || JSON.stringify(v._inputs.map((i: any) => i._name)) !== JSON.stringify(x.inputs)) defs.push({ M, module, name: x.name, inputs: x.inputs, def: x.definition });
      }
    }
    return defs;
  }
  async define(defs: { M: any; module: string; name: string | null; pid?: string; inputs: string[]; def: string; fn?: any }[], deletes: { M: any; module: string; key: string }[] = []): Promise<Line[]> {
    const fns = await this.realize(defs.filter((d) => !d.fn).map((d) => d.def));
    let k = 0;
    for (const d of defs) if (!d.fn) d.fn = fns[k++];
    const out: Line[] = [];
    for (const d of defs) {
      const key = keyOfRec(d), live = this.varsOf(d.M).get(key);
      const base = this.baseline.get(d.module) ?? this.baseline.set(d.module, new Map()).get(d.module)!;
      if (live) { live.define(d.name, d.inputs, d.fn); if (d.pid) live.pid = d.pid; out.push({ kind: "redefined", text: `redefined ${d.module}#${d.name ?? key}` }); }
      else {
        const v = d.M.variable(this.b.isMain(d.M) ? { pending() {}, fulfilled() {}, rejected() {} } : undefined).define(d.name, d.inputs, d.fn);
        if (d.pid) v.pid = d.pid;
        out.push({ kind: "defined", text: `defined ${d.module}#${d.name ?? key}` });
      }
      base.set(key, { name: d.name, inputs: d.inputs, fn: d.fn, def: d.def, pid: d.pid, observed: true });
    }
    for (const d of deletes) { this.varsOf(d.M).get(d.key)?.delete(); this.baseline.get(d.module)?.delete(d.key); out.push({ kind: "deleted", text: `deleted ${d.module}#${d.key}` }); }
    // a test may read a cell by name (spec_module.value("s2_shadow"), ss_check(spec_module)), which is no edge of the
    // graph: the tests of a module whose variables changed are defined again as they are, so they run again
    const touched = new Set([...defs, ...deletes].map((d) => d.M));
    for (const v of [...this.tracked.keys()]) if (touched.has(v._module) && this.rt._variables.has(v) && !defs.some((d) => d.M === v._module && d.name === v._name)) v.define(v._name, v._inputs.map((i: any) => i._name), v._definition);
    this.rt._computeNow?.();
    return out;
  }

  // ---- slow tier: a full build of the root to a scratch file; its module blocks diffed against what is live
  async applySlow(contents: Map<string, string>): Promise<{ applied: Line[]; verdicts: Line[]; failed: boolean }> {
    const out = join(SCRATCH, `live-${process.pid}.html`);
    const p = Bun.spawnSync(["bun", join(this.lite, "soundscript/build.ts"), "--force", "--out", out], { stdout: "pipe", stderr: "pipe", cwd: this.root });
    if (p.exitCode !== 0) {
      const err = p.stderr.toString().split("\n").find((l) => /^(error|REFUSED)\b|Error:/.test(l.trim())) ?? p.stderr.toString().trim().split("\n").slice(-1)[0];
      return { applied: [{ kind: "build", text: `build FAILED: ${err?.trim().slice(0, 600)}`, bad: true }], verdicts: [], failed: true };
    }
    this.mark("build");
    const html = readFileSync(out, "utf8");
    this.lastBuild = out;
    const defs: Parameters<Live["define"]>[0] = [], deletes: Parameters<Live["define"]>[1] = [];
    const notes: Line[] = [];
    const changedSs = new Map<string, Set<string>>();
    for (const s of blockSpans(html)) {
      if (!s.id.startsWith("@") || s.id.includes("/", s.id.indexOf("/") + 1)) continue;
      const M = this.mod(s.id);
      if (!OWN.test(s.id)) continue;
      if (!M) { notes.push({ kind: "restart", text: `${s.id} is a new module; restart to load it` }); continue; }
      const recs = await this.record(blockContent(html, s.id)!);
      const base = this.baseline.get(s.id) ?? new Map();
      const now = new Map(recs.map((r) => [keyOfRec(r), r]));
      for (const [key, r] of now) {
        const b = base.get(key);
        if (b && sameRec(b, r)) continue;
        defs.push({ M, module: s.id, name: r.name, pid: r.pid, inputs: r.inputs, def: r.def, fn: r.fn });
        if (typeof r.name === "string") (changedSs.get(s.id) ?? changedSs.set(s.id, new Set()).get(s.id)!).add(r.name);
      }
      for (const key of base.keys()) if (!now.has(key)) deletes.push({ M, module: s.id, key });
      // an unnamed cell (an md heading) whose index moved keeps its variable: only its pid changes
      const live = this.varsOf(M);
      for (let i = defs.length - 1; i >= 0; i--) {
        const d = defs[i];
        if (d.M !== M || d.name !== null || base.has(keyOfRec(d))) continue;
        const j = deletes.findIndex((x) => x.M === M && x.key.startsWith("pid:") && base.get(x.key)?.def === d.def && JSON.stringify(base.get(x.key)?.inputs) === JSON.stringify(d.inputs));
        if (j < 0) continue;
        const v = live.get(deletes[j].key), r = base.get(deletes[j].key)!;
        if (v) v.pid = d.pid;
        base.delete(deletes[j].key);
        base.set(keyOfRec(d), { ...r, pid: d.pid });
        deletes.splice(j, 1);
        defs.splice(i, 1);
      }
    }
    const applied = [...notes, ...(await this.define(defs, deletes))];

    this.mark("diffed and defined");
    await this.settle();
    this.mark("settled");
    await this.index(contents);
    this.mark("indexed");
    const verdicts: Line[] = [];
    const moduleCells = await this.coreValue("ss_moduleCells");
    for (const [module, names] of changedSs) {
      const keys = new Set(moduleCells(this.mod(module)).filter((c: any) => names.has(c.variable._name)).map((c: any) => c.key as string));
      if (keys.size) verdicts.push(...(await this.verdicts(module, keys)));
    }
    return { applied, verdicts, failed: false };
  }

  // ---- verdicts: ss_check(module), the notebook's own check of a module's SoundScript cells
  async statesOf(module: string): Promise<Map<string, string>> {
    let check: any;
    try { check = await this.coreValue("ss_check"); } catch { return new Map(); }
    const r = check(this.mod(module));
    return new Map([...(this.callCore("cellStates", r.result) as Map<string, any>)].map(([k, st]) => [k, `${st.state} ${st.why.join(" | ")}`]));
  }
  async verdicts(module: string, keys: Set<string>): Promise<Line[]> {
    let check: any;
    try { check = await this.coreValue("ss_check"); } catch (e: any) { return [{ kind: "verdict", text: `no verdicts: the notebook's checker (ss_check) failed: ${String(e?.message ?? e).slice(0, 300)}`, bad: true }]; }
    const r = check(this.mod(module));
    return this.verdictLines(r.cells.map((c: any) => c.text), r.cells.map((c: any) => c.key), r.result, keys, this.fileLines(module));
  }
  // a diagnostic's line is in the joined module source (cells joined by a blank line); it is given here in the cell's file
  verdictLines(texts: string[], names: string[], result: any, keys: Set<string>, where: Map<string, { file: string; line: number }>, label = ""): Line[] {
    const start = new Map<string, number>();
    let line = 1;
    texts.forEach((t, i) => { start.set(names[i], line); line += t.split("\n").length + 1; });
    const states = this.callCore("cellStates", result) as Map<string, any>;
    const out: Line[] = [];
    result.cells.forEach((c: any) => {
      if (!keys.has(c.name)) return;
      const st = states.get(c.name);
      const at = where.get(c.name), s0 = start.get(c.name);
      const loc = (l?: number) => (at && l && s0 ? `${at.file}:${at.line + (l - s0)}` : at ? `${at.file}:${at.line}` : l ? `module line ${l}` : "");
      if (st?.state === "ok") { out.push({ kind: "verdict", text: `verdict ${label}${c.name} ok` }); return; }
      const errs = [...(c.errors ?? []).map((e: any) => `${loc(e.line)} [${e.rule}] ${e.msg}`), ...(c.unsupported ?? []).map((u: any) => `${loc(u.line)} [unsupported] ${u.msg}`)];
      if (result.unparsed?.has?.(c.name)) errs.unshift(`${loc()} [parse] ${result.unparsed.get(c.name)}`);
      if (!errs.length) errs.push(...(st?.why ?? []).map((w: string) => `${loc()} ${w}`));
      for (const e of errs) out.push({ kind: "verdict", text: `verdict ${label}${c.name} ${st?.state ?? c.status} ${e.trim()}`, bad: true });
    });
    return out;
  }
  callCore(fn: string, ...a: unknown[]) { return this.coreVar("soundscript")._value[fn](...a); }
  // each cell's first line in its file, from the parse of the files mapped to the module
  fileLines(module: string) {
    const out = new Map<string, { file: string; line: number }>();
    for (const [f, s] of this.snaps) {
      if (s.map?.kind !== "ss" || s.map.module !== module || !existsSync(f)) continue;
      for (const [k, at] of this.statementLines(f)) out.set(k, { file: this.rel(f), line: at });
    }
    return out;
  }
  statementLines(f: string) {
    const out = new Map<string, number>();
    let P: any;
    try { P = this.parser.parse(readFileSync(f, "utf8"), { jsx: f.endsWith("x") }); } catch { return out; }
    for (const st of P.program.body) {
      const d = st.type === "ExportNamedDeclaration" ? st.declaration : st;
      const name = d?.type === "FunctionDeclaration" ? d.id?.name : d?.type === "VariableDeclaration" ? d.declarations[0]?.id?.name : /^TS(TypeAlias|Interface)Declaration$/.test(d?.type ?? "") ? `type ${d.id.name}` : null;
      if (name) out.set(name, P.line(st.start));
    }
    return out;
  }
  // a file the build does not read: its cells checked by the live checker with the checker module's other SoundScript cells
  async unregisteredVerdicts(f: string): Promise<Line[]> {
    let texts: string[] | null = this.splitFile(f, readFileSync(f, "utf8"), "section");
    if (!texts) return [{ kind: "verdict", text: `${this.rel(f)}: not in the notebook; does not split into cells`, bad: true }];
    const [moduleCells, outside] = await Promise.all(["ss_moduleCells", "ss_outside"].map((n) => this.coreValue(n)));
    const M = this.mod(CHECKER);
    const own = new Set(texts.map((t) => this.keyOfText(t)).filter(Boolean));
    const others = moduleCells(M).filter((c: any) => !own.has(c.key)).map((c: any) => c.text);
    const { result } = this.callCore("checkCells", [...others, ...texts], true, outside(M).filter((o: any) => !own.has(o.name))) as any;
    const where = new Map([...this.statementLines(f)].map(([k, line]) => [k, { file: this.rel(f), line }]));
    const all = [...others, ...texts];
    const names = all.map((t) => this.keyOfText(t) ?? "");
    const keys = new Set(texts.map((t) => this.keyOfText(t)).filter(Boolean) as string[]);
    const lines = this.verdictLines(all, names, result, keys, where);
    return [{ kind: "note", text: `${this.rel(f)}: not in the notebook (ts-cells.ts does not list it); checked with ${CHECKER}'s other SoundScript cells` }, ...lines];
  }

  // ---- queries
  async verdictOf(cell: string): Promise<Line[]> {
    const moduleCells = await this.coreValue("ss_moduleCells");
    for (const module of this.baseline.keys()) {
      if (moduleCells(this.mod(module)).some((c: any) => c.key === cell)) return [{ kind: "note", text: `${cell} is in ${module}` }, ...(await this.verdicts(module, new Set([cell])))];
    }
    for (const [f, s] of this.snaps) if (f.endsWith(".ss.ts") && !s.map && this.statementLines(f).has(cell)) return (await this.unregisteredVerdicts(f)).filter((l) => l.kind === "note" || l.text.startsWith(`verdict ${cell} `));
    return [{ kind: "verdict", text: `no SoundScript cell ${cell}`, bad: true }];
  }
  status(): Line[] {
    const ts = this.testStates(null);
    const n = (s: string) => ts.filter((t) => t.state === s).length;
    const mapped = [...this.snaps.values()].filter((s) => s.map).length;
    return [
      { kind: "status", text: `notebook ${this.notebook}; root ${this.root}; boot ${(this.bootMs / 1000).toFixed(2)} s` },
      { kind: "status", text: `watching ${this.snaps.size} files; ${mapped} mapped to cells (fast tier); ${this.buildInputs.size} read by the build` },
      { kind: "status", text: `tests in scope ${ts.length}: ${n("passed")} pass, ${n("failed")} fail, ${n("pending")} pending, ${n("skipped")} skipped` },
      ...[...this.restartNeeded].map((f) => ({ kind: "restart", text: `restart needed: ${f} changed` })),
    ];
  }
  tests(filter: string | null): Line[] {
    const ts = this.testStates(filter);
    const lines: Line[] = ts.filter((t) => t.state !== "passed").map((t) => ({ kind: "test", text: `${t.state.toUpperCase()} ${t.module}#${t.name}${t.detail ? ": " + t.detail.replace(/\s+/g, " ").slice(0, 300) : ""}`, bad: t.state === "failed" || t.state === "pending" }));
    lines.push({ kind: "tests", text: `${ts.filter((t) => t.state === "passed").length} pass, ${ts.filter((t) => t.state === "failed").length} fail, ${ts.filter((t) => t.state === "pending").length} pending, ${ts.filter((t) => t.state === "skipped").length} skipped` });
    return lines;
  }
  // every test's outcome, every SoundScript cell's state and every variable's definition: what equiv.ts compares
  async dump() {
    let check: any = null;
    try { check = await this.coreValue("ss_check"); } catch (e: any) { check = null; var checkError = String(e?.message ?? e); }
    const verdicts: Record<string, string> = {}, defs: Record<string, string> = {};
    for (const module of [...this.baseline.keys()].sort()) {
      const M = this.mod(module);
      if (check) { const r = check(M); for (const [k, st] of this.callCore("cellStates", r.result) as Map<string, any>) verdicts[`${module}#${k}`] = `${st.state} ${st.why.join(" | ")}`; }
      else verdicts[module] = `ss_check failed: ${checkError!}`;
      for (const [k, v] of this.varsOf(M)) {
        if ((v._inputs ?? []).some((i: any) => i._module !== M && i._module !== this.rt._builtin)) continue;
        defs[`${module}#${k}`] = Bun.hash(JSON.stringify([v._inputs.map((i: any) => i._name), String(v._definition)])).toString(36);
      }
    }
    const tests: Record<string, string> = {};
    for (const t of this.testStates(null)) tests[`${t.module}#${t.name}`] = `${t.state}${t.detail ? ": " + t.detail : ""}`;
    return { tests, verdicts, defs };
  }
  dispose() { try { this.b?.ex.dispose(); } catch {} try { this.disposeCompiler(); } catch {} }
}
