// tools/cloud-brain/digests/count.ts: the four numbers of a digest counted with no pairing, and the two steps of
// the digest writer's brief that name it. Issue digest-counts-in-a-paired-tab.
//
//   bun test ./tests/tools/digest-count.test.ts          # from the repo root, with the ./
// No browser is launched: the in-page functions are run here against a real @observablehq/runtime.
import { expect, test as plain } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { testNeeding } from "./needs.ts";
import { parseArgs, address, ready, count, exitOf } from "../../tools/cloud-brain/digests/count.ts";

const ROOT = resolve(import.meta.dir, "../..");
const RUNTIME = resolve(ROOT, "tools/node_modules/@observablehq/runtime");
const test = testNeeding("digest-count.test.ts", [RUNTIME], "link the main checkout's: ln -s <main checkout>/tools/node_modules tools/node_modules");
const { Runtime } = existsSync(RUNTIME) ? await import(RUNTIME) : ({} as any);

const M = "@digest/research-2026-10-12";
const pick = (id: string, source = "hn") => ({ id, source });

// A page with a digest as a main: three picks, two items of two sources, one paper. `more` adds cells to it.
function page(more: (mod: any) => void = () => {}, picks = [pick("a"), pick("b"), pick("2610.1", "papers")]) {
  const rt: any = new Runtime({});
  const mod = rt.module(), other = rt.module();
  mod.variable().define("picks", [], () => picks);
  mod.variable().define("items", [], () => new Promise((r) => setTimeout(() => r([{ id: "a", source: "hn" }, { id: "b", source: "lobsters" }]), 50)));
  mod.variable().define("papers", [], () => [{ id: "2610.1" }]);
  mod.variable().define("picksFound", ["picks", "items", "papers"], (p: any[], i: any[], q: any[]) => p.filter((x) => (x.source === "papers" ? q : i).some((d) => d.id === x.id)));
  mod.variable({}).define(null, ["items"], (i: any[]) => i.length + " items");
  other.variable().define("picks", [], () => { throw new Error("the other module's"); });
  more(mod);
  rt.mains = new Map([[M, mod], ["@t/other", other]]);
  (globalThis as any).window = { __ojs_runtime: rt };
  return { rt, mod };
}

test("the page is ready when the module is a main with the cell picksFound, and not before", () => {
  (globalThis as any).window = {};
  expect(ready(M)).toBe(false);
  const { rt } = page();
  expect(ready(M)).toBe(true);
  expect(ready("@t/other")).toBe(false);
  expect(ready("@t/none")).toBe(false);
});

test("the four numbers of a digest whose cells all have a value, and nothing is defined in its module", async () => {
  const { rt, mod } = page();
  const c = await count({ module: M, ms: 2000 });
  expect(c).toEqual({ variables: 5, errors: [], items: 2, sources: 2, papers: 1, picks: 3, picksFound: 3, notFound: [] });
  expect(exitOf(c)).toBe(0);
  expect([...rt._variables].filter((v: any) => v._module === mod).length).toBe(5);
});

test("a throw, a missing input and a cell with no value in time are each an error by name, with or without a name", async () => {
  page((mod) => {
    mod.variable().define("bad", [], () => { throw new Error("boom\n  at x"); });
    mod.variable().define("viewof tiers", ["nowhere"], (n: any) => n);
    mod.variable().define("hang", [], () => new Promise(() => {}));
    mod.variable({}).define(null, [], () => { throw new Error("no name"); });
  });
  const c = await count({ module: M, ms: 300 });
  // the tenth is the runtime's own variable for `nowhere`, a name that is read and not defined
  expect(c.variables).toBe(10);
  expect(c.errors).toEqual(["bad boom", "cell 9 no name", "hang PENDING", "nowhere nowhere is not defined", "viewof tiers nowhere is not defined"]);
  expect([c.items, c.picks, c.picksFound]).toEqual([2, 3, 3]);
  expect(exitOf(c)).toBe(1);
});

test("a pick that is in neither list is named, and the exit is 1 with no error", async () => {
  page(() => {}, [pick("a"), pick("zzz"), pick("b", "papers")]);
  const c = await count({ module: M, ms: 2000 });
  expect(c).toMatchObject({ errors: [], picks: 3, picksFound: 1, notFound: ["zzz", "b"] });
  expect(exitOf(c)).toBe(1);
});

test("a list that is not a list is null, and the exit is 1", async () => {
  page((mod) => mod.variable().define("extra", [], () => 1), "seventeen" as any);
  const c = await count({ module: M, ms: 300 });
  expect(c.picks).toBe(null);
  expect(c.notFound).toEqual([]);
  expect(exitOf(c)).toBe(1);
});

plain("the exit: 0 only with no error, four lists and every pick found", () => {
  const ok = { errors: [], items: 0, papers: 0, picks: 0, picksFound: 0 };
  expect(exitOf(ok)).toBe(0);
  expect(exitOf({ ...ok, picks: 2, picksFound: 2 })).toBe(0);
  expect(exitOf({ ...ok, picks: 2, picksFound: 1 })).toBe(1);
  expect(exitOf({ ...ok, errors: ["x PENDING"] })).toBe(1);
  expect(exitOf({ ...ok, papers: null })).toBe(1);
});

plain("the address is the file's or the one given, with no hash, pairing pane or token added", () => {
  expect(address("/tmp/research-2026-10-12.html")).toBe("file:///tmp/research-2026-10-12.html");
  expect(address("https://cb4.endpointservices.workers.dev/library/research-2026-10-12")).toBe("https://cb4.endpointservices.workers.dev/library/research-2026-10-12");
});

plain("the arguments: one target, the module from research-<day> in it or from --module, and no cc=", () => {
  expect(parseArgs(["digests/research-2026-10-12.html"])).toEqual({ target: "digests/research-2026-10-12.html", module: M, timeout: 60, boot: 120 });
  expect(parseArgs(["https://x.dev/library/research-2026-10-11", "--timeout", "5", "--boot=7"])).toEqual({ target: "https://x.dev/library/research-2026-10-11", module: "@digest/research-2026-10-11", timeout: 5, boot: 7 });
  expect(parseArgs(["nb.html", "--module", "@t/w"]).module).toBe("@t/w");
  for (const bad of [[], ["a-research-2026-10-12.html", "b.html"], ["nb.html"], ["nb.html", "--module", "research"], ["research-2026-10-12.html", "--timeout", "0"], ["research-2026-10-12.html", "--cc", "LOPE"],
    ["research-2026-10-12.html#cc=LOPE-1-AAAA"], ["https://x.dev/library/research-2026-10-12#view=S100(@digest/research-2026-10-12)&cc=LOPE-1-AAAA"]])
    expect(() => parseArgs(bad)).toThrow();
});

plain("with a wrong argument the tool exits 64 and launches nothing; with no such file, 70", async () => {
  const tool = resolve(ROOT, "tools/cloud-brain/digests/count.ts");
  const run = async (...a: string[]) => { const p = Bun.spawn(["bun", tool, ...a], { stdout: "pipe", stderr: "pipe" }); return [await p.exited, await new Response(p.stdout).text(), await new Response(p.stderr).text()]; };
  const [code, out, err] = await run("research-2026-10-12.html#cc=LOPE-1-AAAA");
  expect([code, out]).toEqual([64, ""]);
  expect(err).toContain("count.ts TARGET");
  const [code2, out2, err2] = await run("/nonexistent/research-2026-10-12.html");
  expect([code2, out2]).toEqual([70, ""]);
  expect(err2).toContain("no file /nonexistent/research-2026-10-12.html");
});

// The brief: steps 6 and 8 count with the tool, and neither opens a tab.
const brief = readFileSync(resolve(ROOT, ".claude/skills/brain-maintenance/agents/digest.md"), "utf8");
const step = (starts: string) => {
  const lines = brief.split("\n"), at = lines.findIndex((l) => l.startsWith(starts));
  const rest = lines.slice(at + 1), end = rest.findIndex((l) => /^\d+\. \*\*|^## /.test(l));
  return at < 0 ? "" : [lines[at], ...rest.slice(0, end < 0 ? rest.length : end)].join("\n");
};

plain("step 6 of the digest brief counts the built file with the tool, and step 8 the library address", () => {
  const six = step("6. **Build and check."), eight = step("8. **Publish, count");
  expect(six).toContain("bun tools/cloud-brain/digests/count.ts tools/cloud-brain/digests/research-<day>.html");
  expect(eight).toContain("bun <root>/tools/cloud-brain/digests/count.ts https://cb4.endpointservices.workers.dev/library/research-<day>");
  for (const s of [six, eight]) {
    expect(s).not.toMatch(/QA\s+tab/);
    expect(s).not.toContain("chromium_args");
  }
  expect(brief).toMatch(/Do not open a paired tab/);
});
