// The before/after differential for a merge: every named module on a page is exported with a chosen
// exporter's exportModuleJS and written to a directory, or compared with one. A module a merge is meant to
// change or remove is named with --expect-differ / --expect-missing; any other difference fails.
//
// run: bun tools/merge-forks/export-golden.ts <notebook.html> --exporter <id> (--write <dir> | --check <dir>)
//        [--expect-differ a,b] [--expect-missing a,b] [--expect-added a,b] [--dump <dir>] [--hash <fragment>]
//   --dump writes the current exports too, so a difference can be read with diff
import { chromium } from "playwright";
import { resolve } from "node:path";
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const list = (flag: string) => (opt(flag) ?? "").split(",").filter(Boolean);
const notebook = resolve(args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"))!);
const exporter = opt("--exporter")!;
const writeDir = opt("--write"), checkDir = opt("--check");
if (!exporter || !(writeDir || checkDir)) throw new Error("usage: export-golden.ts <notebook.html> --exporter <id> (--write <dir> | --check <dir>)");
const hash = (opt("--hash") ?? "").replace(/^#?/, "#");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
await page.goto(`file://${notebook}${hash === "#" ? "" : hash}`, { waitUntil: "load", timeout: 60000 });
await page.waitForFunction(() => (window as any).__ojs_runtime?.mains?.size, undefined, { timeout: 60000 });
await page.waitForTimeout(8000);

const result = await page.evaluate(async (exporter) => {
  const rt = (window as any).__ojs_runtime;
  const module = rt.mains.get(exporter) ?? [...rt._variables].find((v: any) => v._name === `module ${exporter}` && v._value)?._value;
  if (!module) return { error: `${exporter} is not a main and no module variable for it has resolved` };
  const [exportModuleJS, buildModuleNames] = await Promise.all([module.value("exportModuleJS"), module.value("buildModuleNames")]);
  const names = buildModuleNames(rt);
  const sources: Record<string, string> = {};
  for (const [, { name }] of names) {
    if (["builtin", "main", "unknown"].includes(name) || name in sources) continue;
    sources[name] = await exportModuleJS(name, { runtime: rt, moduleNamesFn: () => names }).then((r: any) => r.source, (e: any) => `ERROR ${e?.stack ?? e}`);
  }
  return { sources };
}, exporter);
await browser.close();
if ((result as any).error) { console.error((result as any).error); process.exit(2); }

const sources = (result as any).sources as Record<string, string>;
const file = (dir: string, name: string) => `${dir}/${name.replace(/\//g, "__")}.js`;
const errors = Object.entries(sources).filter(([, s]) => s.startsWith("ERROR ")).map(([n, s]) => `${n}: ${s.slice(6, 200)}`);

if (writeDir) {
  mkdirSync(writeDir, { recursive: true });
  for (const [name, source] of Object.entries(sources)) writeFileSync(file(writeDir, name), source);
  console.log(`wrote ${Object.keys(sources).length} module exports through ${exporter} to ${writeDir}`);
  if (errors.length) { console.log(`export errors:\n  ${errors.join("\n  ")}`); process.exit(1); }
  process.exit(0);
}

if (opt("--dump")) {
  mkdirSync(opt("--dump")!, { recursive: true });
  for (const [name, source] of Object.entries(sources)) writeFileSync(file(opt("--dump")!, name), source);
}
const golden = readdirSync(checkDir!).map((f) => f.replace(/\.js$/, "").replace(/__/g, "/"));
const differ = Object.keys(sources).filter((n) => golden.includes(n) && readFileSync(file(checkDir!, n), "utf8") !== sources[n]);
const missing = golden.filter((n) => !(n in sources));
const added = Object.keys(sources).filter((n) => !existsSync(file(checkDir!, n)));
const same = Object.keys(sources).length - differ.length - added.length;
const unexpected = (got: string[], want: string[]) => got.filter((n) => !want.includes(n));
const absent = (got: string[], want: string[]) => want.filter((n) => !got.includes(n));
console.log(`${same} identical, differ ${JSON.stringify(differ)}, missing ${JSON.stringify(missing)}, added ${JSON.stringify(added)}`);
const problems = [
  ...unexpected(differ, list("--expect-differ")).map((n) => `unexpected difference: ${n}`),
  ...absent(differ, list("--expect-differ")).map((n) => `expected a difference, none: ${n}`),
  ...unexpected(missing, list("--expect-missing")).map((n) => `unexpectedly missing: ${n}`),
  ...absent(missing, list("--expect-missing")).map((n) => `expected missing, still present: ${n}`),
  ...unexpected(added, list("--expect-added")).map((n) => `not in golden: ${n}`),
  ...absent(added, list("--expect-added")).map((n) => `expected added, not present: ${n}`),
  ...errors.map((e) => `export error: ${e}`)
];
console.log(problems.length ? `FAIL\n  ${problems.join("\n  ")}` : "ok");
process.exit(problems.length ? 1 : 0);
