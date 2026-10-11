// Which Chromium a tool launches when the build its Playwright names was never downloaded.
//
//   import { chromium } from "playwright";
//   import { chromeOptions } from "./lib/playwright-chrome.js";
//   const browser = await chromium.launch({ headless, ...chromeOptions(chromium, { headless }) });
//
// tools/node_modules had Playwright 1.57 on 2026-10-11, which names build 1200; the cache held 1169 and 1234
// complete and a chromium_headless_shell-1200 with no binary, so every launch from tools/ failed.
// Record: tools/cloud-brain/records/playwright-headed-chromium-1200.md.
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const INSTALL = "cd tools && npx playwright install chromium";

const SHELLS = ["chrome-headless-shell", "headless_shell", "chrome-headless-shell.exe", "headless_shell.exe"];
const CHROMES = ["chrome", "chrome.exe"];

// The executable of one build directory, or null: a directory without INSTALLATION_COMPLETE is a download
// that did not finish.
function binary(dir, headless) {
  if (!existsSync(join(dir, "INSTALLATION_COMPLETE"))) return null;
  for (const sub of readdirSync(dir).filter((d) => d.startsWith("chrome")).sort()) {
    const at = join(dir, sub);
    if (!statSync(at).isDirectory()) continue;
    const file = (headless ? SHELLS : CHROMES).map((f) => join(at, f)).find((f) => existsSync(f));
    if (file) return file;
    if (headless) continue;
    for (const app of readdirSync(at).filter((d) => d.endsWith(".app")).sort()) {
      const mac = join(at, app, "Contents", "MacOS", app.slice(0, -4));
      if (existsSync(mac)) return mac;
    }
  }
  return null;
}

// CHROME, or the build Playwright names, or the newest complete one of its cache. `own` is
// chromium.executablePath(), read for the cache directory and the build number.
export function chromeFor(own, env = {}, { headless = true } = {}) {
  if (env.CHROME) return env.CHROME;
  const at = /^(.*)[\\/]chromium(?:_headless_shell)?-(\d+)[\\/]/.exec(own);
  if (!at) throw new Error(`no Playwright cache in ${own}; set CHROME=path`);
  const [, cache, wanted] = at;
  const prefix = headless ? "chromium_headless_shell" : "chromium";
  const builds = (existsSync(cache) ? readdirSync(cache) : []) // no directory: Playwright never downloaded a browser here
    .map((d) => (d.startsWith(prefix + "-") && /^\d+$/.test(d.slice(prefix.length + 1)) ? d.slice(prefix.length + 1) : null))
    .filter((n) => n !== null)
    .sort((a, b) => Number(b) - Number(a));
  for (const n of [wanted, ...builds]) {
    const file = binary(join(cache, prefix + "-" + n), headless);
    if (file) return file;
  }
  throw new Error(`no complete ${prefix} in ${cache} (Playwright names build ${wanted}); run: ${INSTALL}, or set CHROME=path`);
}

// Launch options to spread after a tool's own. {} when Playwright's own build is there, so nothing changes on
// a machine that has it. Otherwise { executablePath } and one line on stderr that names the build used.
export function chromeOptions(chromium, { headless = true, env = process.env, log = console.error } = {}) {
  if (env.CHROME) return { executablePath: env.CHROME };
  const own = chromium.executablePath();
  const executablePath = chromeFor(own, env, { headless });
  const build = (path) => /[\\/]chromium(?:_headless_shell)?-(\d+)[\\/]/.exec(path)?.[1];
  const wanted = build(own), used = build(executablePath);
  if (used === wanted) return {};
  log(`playwright: build ${wanted} of ${headless ? "chromium_headless_shell" : "chromium"} is not installed; using build ${used} ("${INSTALL}" installs ${wanted})`);
  return { executablePath };
}
