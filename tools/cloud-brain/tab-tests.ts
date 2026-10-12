#!/usr/bin/env bun
// tab-tests.ts NOTEBOOK MODULE [--emit CELL=FILE]… [--timeout SECONDS] [--boot SECONDS] [--whole]
//
// Opens a built notebook in a local headless Chrome, runs every test_ cell of MODULE there, and writes what a
// service cell emits to a file. It is the browser run of a writer of the issue loop (implementer.md, steps 8
// and 9) with no pairing: the page is given no pairing token and no pairing pane, so no channel server hears
// of it and no session is sent its updates. Record: records/writers-qa-tabs-wake-the-orchestrator.md.
//
//   bun tools/cloud-brain/tab-tests.ts $W/tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-static
//   bun tools/cloud-brain/tab-tests.ts FILE @tomlarkworthy/brain-issues --emit issues_service=<root>/tools/cloud-brain/.emitted/<id>-brain-x-issues.json
//
// NOTEBOOK   a file, opened by its file: address.
// MODULE     a module of the notebook's boot list, by its whole name.
// --emit     after the tests, `(await module.value(CELL)).emit()` as JSON, written to FILE as it is. FILE is not
//            written when a test failed (a record of a failing build is not left where apply reads) or the emit throws.
// --timeout  how long one test may take, 90 s by default.
// --boot     how long the page may take to define the module, 120 s by default.
// --whole    print every text whole. Without it a failed test's message is cut at 400 characters, a page error at 160
//            and the first line of why a cell did not emit at 300, and a text that was cut ends
//            "… (cut: 400 of 1421 characters; --whole prints all)" (cut.ts). It takes no value.
//
// The tests are read as the paired snippet read them: each test_ cell is imported into a module of the tool's
// own and observed there, so the value is that of the page's first run, made while the other test cells compute,
// and nothing is defined in the module under test. A test has one verdict, that of its first run: the page
// computes a cell again each time one of its inputs has a new value, and a later throw or a later value is not
// read (before 2026-10-11 each later throw was one more line of `failed`, and one less in `passed`).
//
// stdout: one line of JSON, { notebook, module, tests, passed, failed: ["name message"] (one a test), emitted: [{ cell, file,
// hash, bytes }], notEmitted: ["cell message"], errors, browser, ms }. `errors` is the page's first uncaught errors.
// Exit 0: every test passed and every --emit was written. Exit 1: a test failed or timed out, and nothing was emitted. Exit 2: the tests
// passed and an emit was not written. Exit 64: the arguments. Exit 70: the tool could not run (no file, no
// Chrome, the module was not defined in time or has no test_ cell).
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromeFor } from "../lib/playwright-chrome.js";
import { cut } from "./cut.ts";

export const usage = "tab-tests.ts NOTEBOOK MODULE [--emit CELL=FILE]… [--timeout SECONDS] [--boot SECONDS] [--whole]";

export function parseArgs(argv: string[]) {
  const out = { notebook: "", module: "", emit: [] as { cell: string; file: string }[], timeout: 90, boot: 120, whole: false };
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], eq = a.indexOf("=");
    const flag = a.startsWith("--") ? (eq > 0 ? a.slice(2, eq) : a.slice(2)) : null;
    const value = () => (eq > 0 ? a.slice(eq + 1) : argv[++i]);
    if (flag === "whole") {
      if (eq > 0) throw new Error("--whole takes no value");
      out.whole = true;
    } else if (flag === "timeout" || flag === "boot") {
      const n = Number(value());
      if (!Number.isInteger(n) || n < 1) throw new Error(`--${flag} takes a whole number above 0`);
      out[flag] = n;
    } else if (flag === "emit") {
      const v = String(value() ?? ""), at = v.indexOf("=");
      const cell = v.slice(0, at), file = v.slice(at + 1);
      if (at < 1 || !file || !/^[A-Za-z_$][\w$]*$/.test(cell)) throw new Error("--emit takes CELL=FILE");
      out.emit.push({ cell, file });
    } else if (flag) throw new Error(`unknown option --${flag}`);
    else rest.push(a);
  }
  if (rest.length !== 2) throw new Error(rest.length < 2 ? "a notebook and a module are named" : `one module a call: ${rest.slice(1).join(", ")}`);
  [out.notebook, out.module] = rest;
  if (!/^@[\w-]+\/[\w.-]+$/.test(out.module)) throw new Error(`${out.module} is not a module's whole name (@owner/name)`);
  return out;
}

// The address of a run: the module in the one pane. No pairing pane and no cc=, which is what pairs a tab.
export const address = (notebook: string, module: string, r: number | string = Date.now()) =>
  `${pathToFileURL(resolve(notebook)).href}#view=C100(S100(${module}))&r=${r}`;

// In the page: true when the module is a main and has a test_ cell. A module's cells are defined in one turn.
export const ready = (module: string) => {
  const rt = (window as any).__ojs_runtime, mod = rt && rt.mains && rt.mains.get(module);
  if (!mod) return false;
  for (const v of rt._variables) if (v._module === mod && /^test_/.test(v._name || "")) return true;
  return false;
};

// In the page: every test_ cell of the module, observed from a module of its own. [names, bad].
// A message over 400 characters is cut as cut.ts cuts one, which is not in scope in the page: the expression is written out here.
export const runTests = async ({ module, ms, whole = false }: { module: string; ms: number; whole?: boolean }) => {
  const cut = (text: string, n: number) => (whole || text.length <= n ? text : `${text.slice(0, n)}… (cut: ${n} of ${text.length} characters; --whole prints all)`);
  const rt = (window as any).__ojs_runtime, mod = rt.mains.get(module);
  const names: string[] = [...rt._variables].filter((v: any) => v._module === mod && v._name && v._name.startsWith("test_")).map((v: any) => v._name);
  const side = rt.module(), bad: string[] = [];
  await Promise.all(names.map((n) => new Promise<void>((res) => {
    // The observer hears every later run of the cell too: the first verdict is the one kept.
    let done = false;
    const verdict = (message?: string) => { if (done) return; done = true; clearTimeout(t); if (message != null) bad.push(n + " " + message); res(); };
    const t = setTimeout(() => verdict("TIMEOUT"), ms);
    side.variable().import(n, "s_" + n, mod);
    side.variable({ fulfilled: () => verdict(), rejected: (e: any) => verdict(cut(String((e && e.message) || e), 400)) }).define(null, ["s_" + n], (x: any) => x);
  })));
  return [names, bad] as [string[], string[]];
};

// In the page: what a service cell emits, as the text that is written to the file.
export const emitCell = async ({ module, cell }: { module: string; cell: string }) => {
  const mod = (window as any).__ojs_runtime.mains.get(module);
  return JSON.stringify(await (await mod.value(cell)).emit());
};

// The line of a run and its exit, from what the page gave.
export function report(names: string[], bad: string[], emitted: { cell: string; file: string; hash: string | null; bytes: number }[], notEmitted: string[]) {
  const failed = [...bad].sort();
  return { tests: names.length, passed: names.length - failed.length, failed, emitted, notEmitted, exit: failed.length ? 1 : notEmitted.length ? 2 : 0 };
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e: any) { console.error(`${e.message}\n${usage}`); process.exit(64); }
  const { notebook, module, emit, timeout, boot, whole } = args;
  if (!existsSync(notebook)) throw new Error(`no file ${notebook}`);
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true, executablePath: chromeFor(chromium.executablePath(), process.env, { headless: true }) });
  const t0 = Date.now(), errors: string[] = [];
  try {
    const page = await (await browser.newContext()).newPage();
    page.on("pageerror", (e) => errors.push(cut(String(e), 160, whole)));
    await page.goto(address(notebook, module), { waitUntil: "load" });
    try { await page.waitForFunction(ready, module, { timeout: boot * 1000 }); }
    catch { throw new Error(`${module} was not defined with a test_ cell in ${boot} s; it is named as in the notebook's boot list`); }
    const [names, bad] = await page.evaluate(runTests, { module, ms: timeout * 1000, whole });
    const emitted = [], notEmitted: string[] = [];
    for (const { cell, file } of emit) {
      if (bad.length) { notEmitted.push(cell + " a test failed"); continue; }
      try {
        const text = await page.evaluate(emitCell, { module, cell });
        writeFileSync(file, text);
        emitted.push({ cell, file: resolve(file), hash: JSON.parse(text)?.hash ?? null, bytes: Buffer.byteLength(text) });
      } catch (e: any) { notEmitted.push(cell + " " + cut(String((e && e.message) || e).split("\n")[0], 300, whole)); }
    }
    const { exit, ...line } = report(names, bad, emitted, notEmitted);
    console.log(JSON.stringify({ notebook: resolve(notebook), module, ...line, errors: errors.slice(0, 3), browser: browser.version(), ms: Date.now() - t0 }));
    return exit;
  } finally {
    await browser.close();
  }
}

// An error of the tool itself is never 1 or 2, which are verdicts.
if (import.meta.main) process.exit(await main().catch((e) => { console.error("tab-tests: " + String((e && e.message) || e).split("\n")[0]); return 70; }));
