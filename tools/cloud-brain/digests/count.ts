#!/usr/bin/env bun
// count.ts TARGET [--module NAME] [--timeout SECONDS] [--boot SECONDS]
//
// Opens a digest in a local headless Chrome and counts its four numbers: the module's variables, those with an
// error, the items loaded, and the picks found among the items and papers. It is the count of a digest writer
// (agents/digest.md, steps 6 and 8) with no pairing: the page is given no pairing token and no pairing pane, so
// no channel server hears of it and no session is sent its updates. Record: records/digest-counts-in-a-paired-tab.md.
//
//   bun tools/cloud-brain/digests/count.ts tools/cloud-brain/digests/research-2026-10-12.html
//   bun tools/cloud-brain/digests/count.ts https://cb4.endpointservices.workers.dev/library/research-2026-10-12
//
// TARGET     a built file, opened by its file: address, or an http(s) address, opened as it is. The browser is
//            new for the run, so the address is read with no session. A TARGET with `cc=` in it is refused.
// --module   the digest's module. Without it, @digest/research-<day>, from `research-<day>` in TARGET.
// --timeout  how long one variable may take, 60 s by default. One that has no value by then is an error, PENDING.
// --boot     how long the page may take to define the module, 120 s by default.
//
// A variable is one the runtime holds for the module: those its cells define (`viewof x` and `x` are two) and one
// for each name a cell reads that no cell defines (`md`, `Inputs`, `Plot`: 6 of the 53 of research-2026-10-12).
// The digests of 9, 11 and 12 October were counted so. A named variable is imported into a module of the tool's
// own and observed there, so it is computed whether or not the page shows it. A cell with no name cannot be
// imported: the promise the page holds for it is read, which is its value when the page observes the cell and
// resolved when it does not.
//
// stdout: one line of JSON, { target, module, variables, errors: ["name message"], items, sources, papers, picks,
// picksFound, notFound: [pick ids], pageErrors, browser, ms }. `pageErrors` is the page's first uncaught errors.
// Exit 0: no variable has an error and every pick was found. Exit 1: a variable has an error, a pick was not
// found, or one of items, papers, picks and picksFound is not a list. Exit 64: the arguments. Exit 70: the tool
// could not run (no file, no Chrome, the module was not defined in time).
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromeFor } from "../../lib/playwright-chrome.js";

export const usage = "count.ts TARGET [--module NAME] [--timeout SECONDS] [--boot SECONDS]";

export function parseArgs(argv: string[]) {
  const out = { target: "", module: "", timeout: 60, boot: 120 };
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], eq = a.indexOf("=");
    const flag = a.startsWith("--") ? (eq > 0 ? a.slice(2, eq) : a.slice(2)) : null;
    const value = () => (eq > 0 ? a.slice(eq + 1) : argv[++i]);
    if (flag === "timeout" || flag === "boot") {
      const n = Number(value());
      if (!Number.isInteger(n) || n < 1) throw new Error(`--${flag} takes a whole number above 0`);
      out[flag] = n;
    } else if (flag === "module") out.module = String(value() ?? "");
    else if (flag) throw new Error(`unknown option --${flag}`);
    else rest.push(a);
  }
  if (rest.length !== 1) throw new Error(rest.length ? `one target a call: ${rest.join(", ")}` : "a built file or an address is named");
  out.target = rest[0];
  if (/[#&?]cc=/.test(out.target)) throw new Error("a target with cc= pairs the tab; name it without");
  if (!out.module) {
    const day = /research-(\d{4}-\d{2}-\d{2})/.exec(out.target);
    if (!day) throw new Error("no research-<day> in the target; name the module with --module");
    out.module = `@digest/research-${day[1]}`;
  }
  if (!/^@[\w-]+\/[\w.-]+$/.test(out.module)) throw new Error(`${out.module} is not a module's whole name (@owner/name)`);
  return out;
}

// The address of a run: an http(s) target as it is, a file by its file: address. No hash is added, so the page
// opens in its own layout, as a reader's does.
export const address = (target: string) => (/^https?:\/\//.test(target) ? target : pathToFileURL(resolve(target)).href);

// In the page: true when the module is a main and has the cell picksFound. A module's cells are defined in one turn.
export const ready = (module: string) => {
  const rt = (window as any).__ojs_runtime, mod = rt && rt.mains && rt.mains.get(module);
  if (!mod) return false;
  for (const v of rt._variables) if (v._module === mod && v._name === "picksFound") return true;
  return false;
};

// In the page: the module's variables with each one's verdict, and the four lists' sizes.
export const count = async ({ module, ms }: { module: string; ms: number }) => {
  const rt = (window as any).__ojs_runtime, mod = rt.mains.get(module);
  const vars: any[] = [...rt._variables].filter((v: any) => v._module === mod);
  const side = rt.module(), errors: string[] = [];
  const text = (e: any) => String((e && e.message) || e).split("\n")[0].slice(0, 200);
  const late = <T>(p: Promise<T>) => new Promise<T>((res, rej) => { const t = setTimeout(() => rej(new Error("PENDING")), ms); p.then((x) => { clearTimeout(t); res(x); }, (e) => { clearTimeout(t); rej(e); }); });
  // A cell just defined has the promise it was made with until the runtime's next pass gives it its own.
  if (typeof rt._compute === "function") await rt._compute();
  await Promise.all(vars.map((v, i) => late(v._name
    ? new Promise<void>((res, rej) => {
        // The observer hears every later run of the cell too: the first verdict is the one kept.
        side.variable().import(v._name, "s_" + i, mod);
        side.variable({ fulfilled: () => res(), rejected: rej }).define(null, ["s_" + i], (x: any) => x);
      })
    : Promise.resolve(v._promise).then(() => {})
  ).catch((e) => { errors.push((v._name || "cell " + i) + " " + text(e)); })));
  const list = async (name: string) => { try { const x = await late(mod.value(name)); return Array.isArray(x) ? x : null; } catch { return null; } };
  const [items, papers, picks, found] = [await list("items"), await list("papers"), await list("picks"), await list("picksFound")];
  return {
    variables: vars.length, errors: errors.sort(),
    items: items && items.length, sources: items && new Set(items.map((d: any) => d && d.source)).size, papers: papers && papers.length,
    picks: picks && picks.length, picksFound: found && found.length,
    notFound: picks && found ? picks.filter((p: any) => !found.includes(p)).map((p: any) => String(p && p.id)) : [],
  };
};

// The exit of a run, from what the page gave.
export const exitOf = (c: { errors: string[]; items: number | null; papers: number | null; picks: number | null; picksFound: number | null }) =>
  c.errors.length || [c.items, c.papers, c.picks, c.picksFound].includes(null) || c.picksFound !== c.picks ? 1 : 0;

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e: any) { console.error(`${e.message}\n${usage}`); process.exit(64); }
  const { target, module, timeout, boot } = args;
  const url = address(target);
  if (url.startsWith("file:") && !existsSync(target)) throw new Error(`no file ${target}`);
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true, executablePath: chromeFor(chromium.executablePath(), process.env, { headless: true }) });
  const t0 = Date.now(), pageErrors: string[] = [];
  try {
    const page = await (await browser.newContext()).newPage();
    page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 160)));
    await page.goto(url, { waitUntil: "load" });
    try { await page.waitForFunction(ready, module, { timeout: boot * 1000 }); }
    catch { throw new Error(`${module} was not defined with a cell picksFound in ${boot} s; it is named as in the notebook's boot list`); }
    const counted = await page.evaluate(count, { module, ms: timeout * 1000 });
    console.log(JSON.stringify({ target: url, module, ...counted, pageErrors: pageErrors.slice(0, 3), browser: browser.version(), ms: Date.now() - t0 }));
    return exitOf(counted);
  } finally {
    await browser.close();
  }
}

// An error of the tool itself is never 1, which is a verdict.
if (import.meta.main) process.exit(await main().catch((e) => { console.error("count: " + String((e && e.message) || e).split("\n")[0]); return 70; }));
