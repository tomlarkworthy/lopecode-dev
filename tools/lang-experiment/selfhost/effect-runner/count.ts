// Code lines of each shell by category, read from the TypeScript parse: a code line is a line holding a token
// that is not a comment. Each top-level statement (or, for a function listed in EXPAND, each statement of its body)
// is given one category by name in CLASS; a statement with no entry is an error, so none goes uncounted.
// Categories: loop (the feed loop and the state value), identity (ids, id<->object maps, brands), side (values
// carried past the step in shell variables), perform (effect performers and their host hooks), entry (functions user
// code or the host calls), other (imports, types, library functions, code that is not about effects).
// Run: bun count.ts
import ts from "typescript";

type Cat = "loop" | "identity" | "side" | "perform" | "entry" | "other";
const CATS: Cat[] = ["loop", "identity", "side", "perform", "entry", "other"];
const LITE = new URL("../../lite/", import.meta.url).pathname, HERE = import.meta.dir;
const cellsEntry = ["isEvents", "isListener", "on", "nameAction", "running", "liveEvents", "pulling", "events", "openHandle", "setListenerOrder", "listenerOrderChanged", "listen", "release", "sweep"];
const preludeEntry = ["seenValue", "commit", "reset", "idle", "state", "isStateCell", "isAction", "isRefHandle", "write", "handleOf", "madeStore", "materialize", "read", "ref", "views", "viewHandle", "action"];
const preludeOther = ["ViewEl", "actionNames", "actionNamer", "nameOf", "snapshot", "messageOf", "equals", "hash", "makeRandom", "makeClock", "makeLog"];
const of = (cat: Cat, names: string[]) => Object.fromEntries(names.map((n) => [n, cat]));
const CELLS = {
  ...of("other", ["import", "export", "generatorish", "guard", "Gen", "Handle", "Listener"]),
  ...of("identity", ["EVENTS", "LISTENER", "lastId", "idOf", "idFor", "handleObjects", "madeHandles", "handleIds"]),
  ...of("side", ["making"]), ...of("perform", ["scheduler", "placeOf"]), ...of("entry", cellsEntry),
};
const PRELUDE = {
  ...of("other", ["import", "export", ...preludeOther]),
  ...of("identity", ["STATECELL", "ACTION", "REFHANDLE", "records", "over", "viewEls", "storeHandleOf", "recordOf", "nameOfHandle"]),
  ...of("entry", ["rt", ...preludeEntry]),
};
const WORKERS = {
  ...of("other", ["import", "Job", "EXEC", "runHere", "WORKER", "Queued", "Pool", "superseded"]),
  ...of("entry", ["pagePool", "shared", "makePool", "makePool.for", "makePool.return"]),
  ...of("identity", ["makePool.workers", "makePool.jobs"]), ...of("perform", ["makePool.dead"]),
};
const FILES: { label: string; path: string; expand?: string[]; cls: Record<string, Cat> }[] = [
  { label: "events, shipped lite/browser/cells.ts", path: `${LITE}browser/cells.ts`, cls: { ...CELLS, delivery: "loop", feed: "loop", perform: "perform" } },
  { label: "events, events-shell.ts", path: `${HERE}/events-shell.ts`, cls: { ...CELLS, performers: "perform", R: "loop", feed: "loop" } },
  { label: "pool, shipped lite/browser/workers.ts", path: `${LITE}browser/workers.ts`, expand: ["makePool"], cls: { ...WORKERS, "makePool.st": "loop", "makePool.feed": "loop", "makePool.perform": "perform" } },
  { label: "pool, pool-shell.ts", path: `${HERE}/pool-shell.ts`, expand: ["makePool"], cls: { ...WORKERS, "makePool.qids": "side", "makePool.settled": "perform", "makePool.performers": "perform", "makePool.R": "loop", "makePool.feed": "loop" } },
  { label: "store, shipped prelude.runtime.ts", path: `${LITE}../prelude.runtime.ts`, cls: { ...PRELUDE, storeState: "loop", storeFeed: "loop", performStore: "perform" } },
  { label: "store, store-shell.ts", path: `${HERE}/store-shell.ts`, cls: { ...PRELUDE, performers: "perform", R: "loop", storeFeed: "loop" } },
  { label: "render, shipped lite/jsx/render.ts", path: `${LITE}jsx/render.ts`, cls: { ...of("other", ["import", "asText", "keyOf", "kidOf", "drawnOf"]), ...of("perform", ["applyProp", "applyChildren"]), ...of("entry", ["create", "patch"]) } },
  { label: "runtime, shipped lite/stdlib/runtime.ts", path: `${LITE}stdlib/runtime.ts`, cls: { ...of("other", ["import", "export", "checks", "checked", "checksRun", "check", "checkCells", "made", "ISLANDS", "joined", "joinCells", "compiler", "viewRef"]), ...of("entry", ["mount"]) } },
  { label: "runner.ts (once for all)", path: `${HERE}/runner.ts`, cls: { ...of("other", ["Tagged", "Stepped", "FxOf", "Run", "Performers", "Runner"]), runner: "loop" } },
];

const nameOf = (s: ts.Statement): string => {
  if (ts.isImportDeclaration(s)) return "import";
  if (ts.isExportDeclaration(s)) return "export";
  if (ts.isVariableStatement(s)) return (s.declarationList.declarations[0]!.name as ts.Identifier).text;
  if (ts.isFunctionDeclaration(s) || ts.isTypeAliasDeclaration(s)) return s.name!.text;
  if (ts.isForStatement(s)) return "for";
  if (ts.isReturnStatement(s)) return "return";
  throw new Error(`no name for a ${ts.SyntaxKind[s.kind]}`);
};
export function count(path: string, cls: Record<string, Cat>, expand: string[] = []) {
  const text = require("node:fs").readFileSync(path, "utf8");
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  // the lines of every token of the parse (getChildren's leaves; a template literal's parts are tokens), JSDoc skipped
  const code = new Set<number>();
  const leaves = (n: ts.Node): void => {
    if (ts.isJSDoc(n)) return;
    const kids = n.getChildren(sf);
    if (kids.length === 0 && n.kind !== ts.SyntaxKind.EndOfFileToken && n.getWidth(sf) > 0) {
      const a = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line, b = sf.getLineAndCharacterOfPosition(n.getEnd()).line;
      for (let l = a; l <= b; l++) code.add(l);
    }
    for (const k of kids) leaves(k);
  };
  leaves(sf);
  const lines = (n: ts.Node, skip: ts.Node[] = []) => {
    const a = sf.getLineAndCharacterOfPosition(n.getStart()).line, b = sf.getLineAndCharacterOfPosition(n.getEnd()).line;
    const out = new Set<number>();
    for (let l = a; l <= b; l++) if (code.has(l)) out.add(l);
    for (const s of skip) for (const l of lines(s)) out.delete(l);
    return out;
  };
  const by: Record<Cat, number> = { loop: 0, identity: 0, side: 0, perform: 0, entry: 0, other: 0 };
  const rows: [string, Cat, number][] = [];
  const add = (name: string, n: number) => {
    const c = cls[name];
    if (!c) throw new Error(`${path}: ${name} has no category`);
    by[c] += n; rows.push([name, c, n]);
  };
  for (const s of sf.statements) {
    const name = nameOf(s);
    if (expand.includes(name) && ts.isFunctionDeclaration(s)) {
      const body = s.body!.statements;
      add(name, lines(s, [...body]).size);
      for (const t of body) add(`${name}.${nameOf(t)}`, lines(t).size);
    } else add(name, lines(s).size);
  }
  return { by, total: Object.values(by).reduce((a, b) => a + b, 0), rows, code: code.size };
}
if (import.meta.main) {
  console.log(`| file | ${CATS.join(" | ")} | total | code lines in file |`);
  console.log(`|---|${CATS.map(() => "---:").join("|")}|---:|---:|`);
  for (const f of FILES) {
    const r = count(f.path, f.cls, f.expand);
    console.log(`| ${f.label} | ${CATS.map((c) => r.by[c]).join(" | ")} | ${r.total} | ${r.code} |`);
  }
  if (process.argv.includes("--rows")) for (const f of FILES) { const r = count(f.path, f.cls, f.expand); console.log(`\n${f.label}`); for (const [n, c, k] of r.rows) console.log(`  ${c.padEnd(8)} ${String(k).padStart(3)} ${n}`); }
}
