#!/usr/bin/env bun
/**
 * spec-notebook.ts — build a spec notebook from a seed of Observable cells.
 *
 *   bun tools/spec-notebook.ts --seed tools/scratch/spec/foo.ojs --slug foo --title "Foo" \
 *       [--out plan/specs/foo.html] [--base lopecode/notebooks/quick_start.html] [--force]
 *   bun tools/spec-notebook.ts --url plan/specs/foo.html --token LOPE-8787-ABCD
 *
 * The seed is Observable source, one cell per chunk, chunks separated by a line `// %%`.
 * It is compiled by the toolchain notebook's own `compile` cell, loaded headless, and the
 * resulting module replaces blank-notebook in a copy of quick_start.html. No browser is used.
 * The seed's cells are what a `spec` entry in blank-notebook's `templates` would hold.
 *
 * The robocoop-5 blocks are then replaced from the lopebooks canonical (quick_start's copy
 * predates `pairedEndpoint`, 2026-10-04) and bootconf's mains and hash are set for a spec.
 * Once built, the HTML is the source of truth; the seed is not read again.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadNotebook } from "./lope-runtime.js";
import { blockSpans, blockContent, findSpan, rawBlock } from "./lib/notebook-blocks.ts";

const ROOT = resolve(import.meta.dir, "..");
const RC5_CANONICAL = "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html";
const PAIRING = "@tomlarkworthy/claude-code-pairing";
const AGENT = "@tomlarkworthy/robocoop-5";
const HOST = "@tomlarkworthy/blank-notebook";
const TOOLCHAIN_CANDIDATES = [
  "lopecode/notebooks/@tomlarkworthy_observablejs-toolchain.html",
  "lopebooks/notebooks/@tomlarkworthy_observablejs-toolchain.html",
];
// Modules taken from the robocoop-5 notebook instead of quick_start, which is behind it
// (2026-10-04: no switchboard, and older annotate / editor-5 / pairing / change-history, so an
// annotation there has no "Ask robocoop" kind). Delete this list once quick_start is resynced.
const OVERLAY = [
  /^@tomlarkworthy\/robocoop-5[^/]*$/, /^@tomlarkworthy\/switchboard$/, /^@tomlarkworthy\/annotate$/,
  /^@tomlarkworthy\/editor-5$/, /^@tomlarkworthy\/claude-code-pairing$/, /^@tomlarkworthy\/local-change-history$/,
];
const SWITCHBOARD = "@tomlarkworthy/switchboard";
// quick_start mains a spec does not boot. Their blocks stay in the file until the first save.
const DROP_MAINS = ["@tomlarkworthy/at-login", "@tomlarkworthy/at-write", "@tomlarkworthy/grid-container", "@tomlarkworthy/debugger-2"];

type Compile = (src: string) => { _name: string | null; _inputs: string[]; _definition: string }[];

function args() {
  const a = process.argv.slice(2), o: Record<string, string | boolean> = {};
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith("--")) throw new Error(`unexpected argument ${a[i]}`);
    const k = a[i].slice(2);
    o[k] = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
  }
  return o;
}

export const moduleOf = (slug: string) => `@spec/${slug}`;
export const layoutOf = (name: string) => `#view=C100(S70(${name},${PAIRING}),S30(${AGENT}))`;

export function splitSeed(text: string): string[] {
  return text.split(/^\/\/ %%.*$/m).map((s) => s.trim()).filter(Boolean);
}

function moduleNameIn(file: string): string {
  const conf = JSON.parse(blockContent(readFileSync(file, "utf8"), "bootconf.json")!);
  const name = (conf.mains as string[]).find((m) => m.startsWith("@spec/"));
  if (!name) throw new Error(`${file}: no @spec/* module in bootconf mains`);
  return name;
}

export function urlFor(file: string, token?: string): string {
  const abs = resolve(file);
  return `file://${encodeURI(abs)}${layoutOf(moduleNameIn(abs))}${token ? `&cc=${token}` : ""}`;
}

function replaceBlock(html: string, id: string, content: string, newId = id): string {
  const span = findSpan(html, id)!;
  const raw = html.slice(span.start, span.end);
  const open = raw.slice(0, raw.indexOf(">") + 1).replace(`id="${id}"`, `id="${newId}"`);
  return html.slice(0, span.start) + open + content + "</script>" + html.slice(span.end);
}

// Returns the ids replaced and the ids copied in because a replaced block imports them.
function refreshAgent(html: string, canonical: string): { html: string; replaced: string[]; added: string[] } {
  const have = new Set(blockSpans(html).map((s) => s.id));
  const canon = new Set(blockSpans(canonical).map((s) => s.id));
  const replaced: string[] = [], added: string[] = [];
  const insert = (dep: string) => {
    const files = [...canon].filter((i) => i.startsWith(dep + "/"));
    const at = findSpan(html, "bootconf.json")!.start;
    html = html.slice(0, at) + [...files, dep].map((i) => rawBlock(canonical, i)!).join("\n") + "\n" + html.slice(at);
    [...files, dep].forEach((i) => have.add(i));
    added.push(dep);
  };
  for (const id of [...canon].filter((i) => OVERLAY.some((re) => re.test(i)))) {
    if (!have.has(id)) { insert(id); continue; }
    const next = blockContent(canonical, id)!;
    if (next === blockContent(html, id)) continue;
    html = replaceBlock(html, id, next);
    replaced.push(id);
  }
  // A newer block may import a module the base does not carry; copy it, attachments first.
  const queue = [...replaced, ...added];
  while (queue.length) {
    const body = blockContent(html, queue.pop()!)!;
    for (const m of body.matchAll(/import\("\/(@[^"?]+)\.js/g)) {
      const dep = m[1];
      if (have.has(dep) || !canon.has(dep)) continue;
      insert(dep);
      queue.push(dep);
    }
  }
  return { html, replaced, added };
}

// The toolchain notebook runs headless (lope-runtime), so the seed is compiled by the real
// `compile` cell rather than a copy of it.
async function compiler(): Promise<{ compile: Compile; dispose: () => void }> {
  const path = TOOLCHAIN_CANDIDATES.map((p) => resolve(ROOT, p)).find((p) => existsSync(p));
  if (!path) throw new Error("no @tomlarkworthy_observablejs-toolchain.html in lopecode/ or lopebooks/");
  const log = console.log;
  console.log = () => {};
  try {
    const exec = await loadNotebook(path, { settleTimeout: 15000 });
    const r = await exec.waitForVariable("compile");
    if (typeof r.value !== "function") throw new Error("toolchain compile did not resolve to a function");
    return { compile: r.value, dispose: () => exec.dispose() };
  } finally {
    console.log = log;
  }
}

export function moduleSource(cells: string[], compile: Compile): string {
  const consts: string[] = [], defs: string[] = [], imports: string[] = [], failures: string[] = [];
  cells.forEach((src, i) => {
    let specs: ReturnType<Compile>;
    try {
      specs = compile(src);
    } catch (e: any) {
      failures.push(`cell ${i}: ${e.message} :: ${src.slice(0, 80)}`);
      return;
    }
    if (!specs.length) failures.push(`cell ${i}: compiles to nothing :: ${src.slice(0, 80)}`);
    specs.forEach((s, j) => {
      // compile() does not throw on a syntax error; it returns a cell that throws one at runtime,
      // marked with _sourceExpression (observed 2026-10-04: `b = { const x = ; }` built a notebook).
      const stub = /throw Object\.assign\(new SyntaxError\((".*?")\), \{_sourceExpression:/.exec(String(s._definition));
      if (stub) failures.push(`cell ${i}: ${JSON.parse(stub[1])} :: ${src.slice(0, 80)}`);
      const name = JSON.stringify(s._name ?? null), inputs = JSON.stringify(s._inputs ?? []);
      const isImport = typeof s._name === "string" && (s._name.startsWith("module ") || (s._inputs ?? []).includes("@variable"));
      if (isImport) {
        imports.push(`  main.define(${name}, ${inputs}, ${s._definition});`);
        return;
      }
      const pid = `_spec_${i}_${j}`;
      consts.push(`const ${pid} = ${s._definition};`);
      defs.push(`  $def("${pid}", ${name}, ${inputs}, ${pid});`);
    });
  });
  if (failures.length) throw new Error("seed does not compile:\n  " + failures.join("\n  "));
  const text = [
    ...consts,
    "",
    "export default function define(runtime, observer) {",
    "  const main = runtime.module();",
    "  const $def = (pid, name, deps, fn) => {",
    "    main.variable(observer(name)).define(name, deps, fn).pid = pid;",
    "  };",
    ...defs,
    ...imports,
    "  return main;",
    "}",
    "",
  ].join("\n");
  if (/<\/script/i.test(text)) throw new Error("a cell contains a literal closing script tag; it would end the module block");
  return text;
}

async function build(o: Record<string, string | boolean>) {
  const slug = String(o.slug || "");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error("--slug must be kebab-case");
  const title = String(o.title || slug);
  const out = resolve(String(o.out || `plan/specs/${slug}.html`));
  const base = resolve(ROOT, String(o.base || "lopecode/notebooks/quick_start.html"));
  if (existsSync(out) && !o.force)
    throw new Error(`${out} exists. It is the source of truth and may hold edits and annotations; pass --force to overwrite.`);
  const name = moduleOf(slug);
  const seed = readFileSync(resolve(String(o.seed)), "utf8").replaceAll("__SPEC_MODULE__", name);
  const cells = ["md`# " + title.replace(/[`\\$]/g, (c) => "\\" + c) + "`", ...splitSeed(seed)];

  const { compile, dispose } = await compiler();
  let source: string;
  try {
    source = moduleSource(cells, compile);
  } finally {
    dispose();
  }

  // The spec module takes blank-notebook's block and its place in mains.
  let html = readFileSync(base, "utf8");
  const before = blockSpans(html).map((s) => s.id);
  if (!findSpan(html, HOST)) throw new Error(`${base}: no ${HOST} block to replace`);
  html = replaceBlock(html, HOST, "\n" + source, name);

  const fresh = refreshAgent(html, readFileSync(resolve(ROOT, RC5_CANONICAL), "utf8"));
  const conf = JSON.parse(blockContent(fresh.html, "bootconf.json")!);
  const now0 = new Set(blockSpans(fresh.html).map((s) => s.id));
  conf.mains = (conf.mains as string[]).filter((m) => !DROP_MAINS.includes(m)).map((m) => (m === HOST ? name : m));
  if (now0.has(SWITCHBOARD) && !conf.mains.includes(SWITCHBOARD)) conf.mains.splice(conf.mains.indexOf(AGENT) + 1, 0, SWITCHBOARD);
  conf.hash = layoutOf(name);
  let next = replaceBlock(fresh.html, "bootconf.json", "\n" + JSON.stringify(conf, null, 2) + "\n");
  next = next.replace(/<title>[^<]*<\/title>/, `<title>${title.replace(/[<&]/g, "")}</title>`);

  // No block that was top-level in the base may stop being top-level after the splices.
  const now = new Set(blockSpans(next).map((s) => s.id));
  const lost = before.filter((id) => id !== HOST && !now.has(id));
  if (lost.length) throw new Error(`splice swallowed ${lost.join(", ")}; nothing written`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, next);
  console.log(JSON.stringify({
    out, module: name, cells: cells.length, bytes: next.length, mains: conf.mains,
    agentBlocksReplaced: fresh.replaced, agentBlocksAdded: fresh.added,
    pairedEndpoint: /pairedEndpoint/.test(next),
  }, null, 2));
  console.log(urlFor(out, typeof o.token === "string" ? o.token : undefined));
}

// Booting the toolchain headless leaves rejections from imports it cannot resolve; lope-reader does the same.
process.on("unhandledRejection", () => {});

if (import.meta.main) {
  const o = args();
  try {
    if (o.url) console.log(urlFor(String(o.url), typeof o.token === "string" ? o.token : undefined));
    else if (o.seed) await build(o);
    else {
      console.error("usage: --seed <file.ojs> --slug <slug> --title <title> [--out f] [--force] | --url <file> [--token T]");
      process.exit(2);
    }
    process.exit(0);
  } catch (e: any) {
    console.error(String(e.message || e));
    process.exit(1);
  }
}
