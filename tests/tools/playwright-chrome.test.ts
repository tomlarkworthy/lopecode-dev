// tools/lib/playwright-chrome.js: the Chromium a tool of tools/ launches when the build its Playwright names is
// not in the cache. Issue playwright-headed-chromium-1200; record tools/cloud-brain/records/playwright-headed-chromium-1200.md.
//
//   bun test ./tests/tools/playwright-chrome.test.ts
import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const { chromeFor, chromeOptions, INSTALL } = await import(join(root, "tools/lib/playwright-chrome.js"));

// A cache as Playwright lays it out: 1169 is chrome-mac/Chromium.app, 1234 is chrome-mac-arm64/Google Chrome for Testing.app.
function cacheOf() {
  const cache = realpathSync(mkdtempSync(join(tmpdir(), "playwright-chrome-")));
  const put = (dir: string, parts: string[], complete = true) => {
    mkdirSync(join(cache, dir, ...parts.slice(0, -1)), { recursive: true });
    writeFileSync(join(cache, dir, ...parts), "");
    if (complete) writeFileSync(join(cache, dir, "INSTALLATION_COMPLETE"), "");
    return join(cache, dir, ...parts);
  };
  const own = (n: number) => join(cache, `chromium-${n}`, "chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing");
  return { cache, put, own };
}
const mac = (app: string) => [app + ".app", "Contents", "MacOS", app];

test("headed: the build Playwright names, then the newest complete chromium-N", () => {
  const { cache, put, own } = cacheOf();
  expect(() => chromeFor(own(1200), {}, { headless: false })).toThrow(`no complete chromium in ${cache} (Playwright names build 1200); run: ${INSTALL}`);
  put("chromium_headless_shell-1300", ["chrome-headless-shell-mac-arm64", "chrome-headless-shell"]); // a shell is not a headed build
  expect(() => chromeFor(own(1200), {}, { headless: false })).toThrow("no complete chromium in");
  const b1169 = put("chromium-1169", ["chrome-mac", ...mac("Chromium")]);
  const b1234 = put("chromium-1234", ["chrome-mac-arm64", ...mac("Google Chrome for Testing")]);
  put("chromium-1250", ["chrome-mac-arm64", ...mac("Google Chrome for Testing")], false); // a download that did not finish
  expect(chromeFor(own(1200), {}, { headless: false })).toBe(b1234);
  expect(chromeFor(own(1169), {}, { headless: false })).toBe(b1169);
  expect(chromeFor(own(1200), { CHROME: "/somewhere/chrome" }, { headless: false })).toBe("/somewhere/chrome");
  expect(() => chromeFor("/usr/bin/chrome", {}, { headless: false })).toThrow("no Playwright cache in /usr/bin/chrome");
});

// A machine where Playwright never downloaded a browser has no cache directory at all (review, event 1044).
test("a cache directory that does not exist reads as no builds: the install line, not ENOENT", () => {
  const { cache } = cacheOf();
  const own = join(cache, "absent", "chromium-1200", "chrome-mac-arm64", "x");
  for (const headless of [true, false]) {
    expect(() => chromeFor(own, {}, { headless })).toThrow(`in ${join(cache, "absent")} (Playwright names build 1200); run: ${INSTALL}`);
    expect(() => chromeOptions({ executablePath: () => own }, { headless, env: {}, log: () => {} })).toThrow(INSTALL);
  }
});

// Where an agent that writes a new Playwright script reads of the helper (review, event 1044, finding 2).
test("the Cloud Brain guide gives the import", () => {
  const doc = readFileSync(join(root, "knowledge/changing-and-deploying-a-cloud-brain-worker.md"), "utf8");
  expect(doc).toContain('import { chromeOptions } from "./lib/playwright-chrome.js";');
  expect(doc).toContain("...chromeOptions(chromium, { headless })");
  expect(doc).toContain(INSTALL);
});

test("headed: the Linux and Windows layouts", () => {
  const { put, own } = cacheOf();
  const linux = put("chromium-1234", ["chrome-linux", "chrome"]);
  expect(chromeFor(own(1200), {}, { headless: false })).toBe(linux);
  const win = put("chromium-1240", ["chrome-win", "chrome.exe"]);
  expect(chromeFor(own(1200), {}, { headless: false })).toBe(win);
});

test("headless: the shell of both layouts, and never a headed build", () => {
  const { cache, put, own } = cacheOf();
  put("chromium-1234", ["chrome-mac-arm64", ...mac("Google Chrome for Testing")]);
  expect(() => chromeFor(own(1200))).toThrow("no complete chromium_headless_shell in " + cache);
  put("chromium_headless_shell-1200", ["chrome-headless-shell-mac-arm64", "ABOUT"], false); // what the cache held on 2026-10-11
  const old = put("chromium_headless_shell-1169", ["chrome-mac", "headless_shell"]);
  expect(chromeFor(own(1200))).toBe(old);
  const b1234 = put("chromium_headless_shell-1234", ["chrome-headless-shell-mac-arm64", "chrome-headless-shell"]);
  expect(chromeFor(own(1200))).toBe(b1234);
});

test("chromeOptions: {} when Playwright's own build is there, else executablePath and one line that names both builds", () => {
  const { put, own } = cacheOf();
  const b1234 = put("chromium-1234", ["chrome-mac-arm64", ...mac("Google Chrome for Testing")]);
  const lines: string[] = [];
  const log = (l: string) => lines.push(l);
  const pw = (n: number) => ({ executablePath: () => own(n) });
  expect(chromeOptions(pw(1234), { headless: false, env: {}, log })).toEqual({});
  expect(lines).toEqual([]);
  expect(chromeOptions(pw(1200), { headless: false, env: {}, log })).toEqual({ executablePath: b1234 });
  expect(lines).toEqual([`playwright: build 1200 of chromium is not installed; using build 1234 ("${INSTALL}" installs 1200)`]);
  expect(chromeOptions(pw(1200), { headless: false, env: { CHROME: "/c" }, log })).toEqual({ executablePath: "/c" });
  expect(() => chromeOptions(pw(1200), { headless: true, env: {}, log })).toThrow(INSTALL);
  expect(lines.length).toBe(1);
});

// The launchers the guides name. One that launches without the helper fails on a machine whose cache lacks the
// build of tools/node_modules, as all of them did on 2026-10-11.
const launchers = ["test-annotate.js", "lope-browser-runner.ts", "lope-jumpgate.js", "lope-bulk-jumpgate.js", "headless-pairing-host.ts", "lope-load-profiler.ts", "lope-push-ws.js", "cloud-brain/verify-run.ts"];
test("each named launcher takes its Chromium from the helper at every launch", () => {
  for (const name of launchers) {
    const text = readFileSync(join(root, "tools", name), "utf8");
    expect(text).toContain("lib/playwright-chrome.js");
    const launches = text.split(/chromium\.launch(?:PersistentContext)?\(/).slice(1);
    expect(launches.length).toBeGreaterThan(0);
    for (const after of launches) expect([name, /chromeOptions\(chromium|chromeFor\(chromium\.executablePath\(\)/.test(after.slice(0, 400))]).toEqual([name, true]);
  }
});
