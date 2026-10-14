// What a test of this directory reads from the checkout, for a checkout that lacks it.
// Issue tests-tools-fail-in-a-fresh-worktree; tools/cloud-brain/records/tests-tools-fail-in-a-fresh-worktree.md.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "bun:test";

// How a checkout that is not from worktree.sh gets what a submodule holds.
export const SUBMODULES = "git submodule update --init cloud-brain-dev lopebooks lopecode";

// `test` when every path is there. Otherwise test.skip, and one line that names the file, what it lacks and `how` to get it.
export const testNeeding = (file: string, paths: string[], how = SUBMODULES) => {
  const lacks = paths.filter((p) => !existsSync(p));
  if (!lacks.length) return test;
  console.log(`skipped: ${file}: no ${lacks.join(", ")}. tools/cloud-brain/worktree.sh makes a worktree that has it; in another checkout, ${how}`);
  return test.skip;
};

// A module of the Brain compiled from its seed in this checkout, as build.ts compiles one, in a file of the temp directory: its path.
// For a test that asks a module something: cloud-brain-dev/deploy/ is git-ignored and as old as the checkout's last
// sync.ts, and a copy from before a method fails the test of it (issue cost-events-test-reads-stale-deploy).
// A module with no seed here (since 2026-10-14 every brain-x-* service but the page: changed as patches in
// cloud-brain-dev) is read from deploy/ (`running` below), and a test of it is as new as that sync.
const ROOT = resolve(import.meta.dir, "../..");
const built = new Map<string, Promise<string>>();
// One compiler a process, and one seed at a time. A second compiler() after the first was disposed threw
// "RequireError: invalid module" between tests, and the file that asked for a second seed registered no test
// (cost-events.test.ts with rows-add-within-sql.test.ts, 2026-10-12).
let compiling: Promise<any> | null = null, last: Promise<any> = Promise.resolve();
// Where a checkout's modules are written: one directory a checkout, written over by each run, so a run leaves nothing new behind it.
export const SEEDS = join(tmpdir(), "seed-module-" + createHash("sha1").update(ROOT).digest("hex").slice(0, 12));
// `edit`: the module of a seed whose text was changed first (a cell added, cells left out), under a name of its own.
export const seedModule = (seed: string, into = SEEDS, edit?: { name: string; text: (seed: string) => string }): Promise<string> => {
  const key = `${into}\n${seed}\n${edit?.name ?? ""}`;
  if (!built.has(key)) built.set(key, (last = last.catch(() => {}).then(async () => {
    const { compiler, moduleSource, splitSeed } = await import(resolve(ROOT, "tools/spec-notebook.ts"));
    const { compile } = await (compiling ??= compiler());
    // A directory of its own for each seed. bun 1.4.0 does not find, by import(), a file written into a directory after
    // it imported another file of that directory (issue rows-add-within-sql-fails-once-in-suite).
    const name = edit?.name ?? seed.replace(/\.ojs$/, ""), dir = join(into, name), file = join(dir, name + ".js");
    const text = readFileSync(resolve(ROOT, "tools/cloud-brain", seed), "utf8");
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${file}.${process.pid}`, moduleSource(splitSeed(edit ? edit.text(text) : text), compile));
    renameSync(`${file}.${process.pid}`, file);
    return file;
  })));
  return built.get(key)!;
};

// `test` and the built module's path. With no toolchain notebook to compile with: test.skip and a line. Any other failure is thrown.
export const testNeedingSeed = async (file: string, seed: string, build = seedModule) => {
  try {
    return { test, module: await build(seed) };
  } catch (e: any) {
    if (!/^no @tomlarkworthy_observablejs-toolchain\.html/.test(e?.message ?? "")) throw e;
    console.log(`skipped: ${file}: ${seed} was not compiled: ${e.message}. tools/cloud-brain/worktree.sh makes a worktree that has it; in another checkout, ${SUBMODULES}`);
    return { test: test.skip, module: "" };
  }
};

// For a test that reads a module of this checkout's seed beside files of the checkout (`paths`): `test` and the module's
// path, or test.skip and the line of the first thing lacking. No notebook is read: until view-isolated-from-main-notebook
// the two SQL tests took their module from the built notebook under lopebooks/, which in a worktree is the main
// checkout's file through a link, written by each landing that builds.
export const testNeedingSeedAnd = async (file: string, seed: string, paths: string[], build = seedModule) => {
  const needing = testNeeding(file, paths);
  return needing === test ? testNeedingSeed(file, seed, build) : { test: needing, module: "" };
};

// ---- What cb4 runs of a module that has no seed here, as cloud-brain-dev/deploy/ has it after `bun sync.ts`.
// brain-issues.ojs was deleted on 2026-10-14, behind what ran, and the other service seeds later that day: a service
// is changed as a patch in cloud-brain-dev.
export const RUNNING_HOW = "git submodule update --init cloud-brain-dev, then bun sync.ts https://cb4.endpointservices.workers.dev there";
export const running = (name: string) => resolve(ROOT, "cloud-brain-dev/deploy/@tomlarkworthy", name + ".js");
// `test` and the module's path, or test.skip, "" and a line naming what lacks (the module or one of `paths`).
export const testNeedingRunning = (file: string, name: string, paths: string[] = []) => {
  const needing = testNeeding(file, [running(name), ...paths], RUNNING_HOW);
  return { test: needing, module: needing === test ? running(name) : "" };
};
// Its variables, split by the acorn extractor of lope-push-ws.js: `_name` (null for a cell with no name), `_inputs`, `_definition`.
export const runningCells = async (name: string): Promise<{ _name: string | null; _inputs: string[]; _definition: string }[]> => {
  const acorn = await import(resolve(ROOT, "tools/node_modules/acorn/dist/acorn.mjs"));
  const { parseVariableGroups } = await import(resolve(ROOT, "tools/lope-push-ws.js"));
  return (parseVariableGroups(readFileSync(running(name), "utf8"), acorn).groups ?? []).flat().map((v: any) => ({ ...v, _definition: String(v._definition) }));
};
// Its cells in their order, as the same extractor groups its variables: `name` is the cell's (`viewof x` for a viewof,
// null for one with no name) and `text` the bodies of its variables; `imports` its import cells as source.
export const runningGroups = async (name: string): Promise<{ groups: { name: string | null; text: string }[]; imports: string[] }> => {
  const acorn = await import(resolve(ROOT, "tools/node_modules/acorn/dist/acorn.mjs"));
  const { parseVariableGroups } = await import(resolve(ROOT, "tools/lope-push-ws.js"));
  const { groups, preformatted } = parseVariableGroups(readFileSync(running(name), "utf8"), acorn);
  return { groups: groups.map((g: any[]) => ({ name: g[0]._name, text: g.map((v) => String(v._definition)).join("\n") })), imports: preformatted };
};
// The running module with no test cell, and `edit.cell` (Observable source) compiled and added, under edit.name: its path.
// For a rig that runs one cell of its own beside the module (cloud-brain-dev/test.ts --with): what seedModule's edit did
// to the seed. The cells are found with acorn: a `$def(pid, "test_…", …)` statement of `define` is left out, the
// cell's consts go before `export default` and its `$def`s before `return main`.
export const runningModule = (name: string, edit: { name: string; cell: string }, into = SEEDS): Promise<string> => {
  const key = `${into}\n${name}.js\n${edit.name}\n${createHash("sha256").update(edit.cell).digest("hex")}`;
  if (!built.has(key)) built.set(key, (last = last.catch(() => {}).then(async () => {
    const acorn = await import(resolve(ROOT, "tools/node_modules/acorn/dist/acorn.mjs"));
    const { compiler, moduleSource } = await import(resolve(ROOT, "tools/spec-notebook.ts"));
    const { compile } = await (compiling ??= compiler());
    const parts = (text: string) => {
      const ast: any = acorn.parse(text, { ecmaVersion: "latest", sourceType: "module" });
      const exported = ast.body.find((n: any) => n.type === "ExportDefaultDeclaration"), define = exported?.declaration;
      if (define?.type !== "FunctionDeclaration") throw new Error(`${name}: no export default function define`);
      const defs = define.body.body.filter((s: any) => s.type === "ExpressionStatement" && s.expression.type === "CallExpression" && s.expression.callee.type === "Identifier" && s.expression.callee.name === "$def");
      const ret = define.body.body.find((s: any) => s.type === "ReturnStatement");
      if (!ret) throw new Error(`${name}: define returns nothing`);
      return { exported, defs, ret, consts: ast.body.filter((n: any) => n.type === "VariableDeclaration") };
    };
    const text = readFileSync(running(name), "utf8"), m = parts(text);
    const add = moduleSource([edit.cell], compile), a = parts(add);
    // An import compiles to main.define(...), which this splice does not carry: refuse it rather than drop it.
    if (/\n  main\.define\(/.test(add)) throw new Error(`${edit.name}: the added cell imports; runningModule carries $def cells only`);
    const cut = (s: any) => { const n = s.expression.arguments[1]; return n?.type === "Literal" && typeof n.value === "string" && n.value.startsWith("test_"); };
    const edits = [
      ...m.defs.filter(cut).map((s: any) => ({ at: s.start, end: s.end, put: "" })),
      { at: m.ret.start, end: m.ret.start, put: a.defs.map((s: any) => add.slice(s.start, s.end)).join("\n  ") + "\n  " },
      { at: m.exported.start, end: m.exported.start, put: a.consts.map((n: any) => add.slice(n.start, n.end)).join("\n") + "\n\n" },
    ].sort((x, y) => y.at - x.at);
    let out = text;
    for (const e of edits) out = out.slice(0, e.at) + e.put + out.slice(e.end);
    const dir = join(into, edit.name), file = join(dir, edit.name + ".js");
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${file}.${process.pid}`, out);
    renameSync(`${file}.${process.pid}`, file);
    return file;
  })));
  return built.get(key)!;
};
// `test` and the path of runningModule, or test.skip and a line: for want of the module or `paths`, or of a toolchain notebook to compile the cell with.
export const testNeedingRunningModule = async (file: string, name: string, edit: { name: string; cell: string }, paths: string[] = []) => {
  const needing = testNeeding(file, [running(name), ...paths], RUNNING_HOW);
  if (needing !== test) return { test: needing, module: "" };
  try {
    return { test, module: await runningModule(name, edit) };
  } catch (e: any) {
    if (!/^no @tomlarkworthy_observablejs-toolchain\.html/.test(e?.message ?? "")) throw e;
    console.log(`skipped: ${file}: the cell was not compiled: ${e.message}. tools/cloud-brain/worktree.sh makes a worktree that has it; in another checkout, ${SUBMODULES}`);
    return { test: test.skip, module: "" };
  }
};
