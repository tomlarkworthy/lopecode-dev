// The built shell (tools/cloud-brain/.emitted/shell.html) served in place of a Brain's own at its address, in a
// local browser with no session. Everything else the page asks for goes to the Brain. Nothing is deployed.
//   bun tools/scratch/cloud-brain-experiments/verify-page/shell-check.ts [base] [worker] [module]
import { chromium } from "../../../node_modules/playwright";
import { resolve } from "path";
import { blocks } from "../../../lib/notebook-blocks.ts";
const base = process.argv[2] || "https://cb4.endpointservices.workers.dev";
const worker = process.argv[3] || "brain-x-issues", module = process.argv[4] || "@tomlarkworthy/brain-issues";
const shell = await Bun.file(resolve(import.meta.dir, "../../../cloud-brain/.emitted/shell.html")).text();
// The modules the deployer serves, with the ones named in BUILT taken from the built notebook in their place.
const built = blocks(await Bun.file(resolve(import.meta.dir, "../../../../lopebooks/notebooks/@tomlarkworthy_cloud-brain.html")).text());
const BUILT = (process.env.BUILT ?? "@tomlarkworthy/cloud-brain").split(",").filter(Boolean);
const CHROME = process.env.CHROME || `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const state = () => {
  const rt = (window as any).__ojs_runtime;
  const brain = [...document.querySelectorAll("script[data-brain]")].map((s) => s.id).filter((id) => id.split("/").length === 2);
  const names = new Map([...rt.mains].map(([k, v]: any) => [v, k])), ran: Record<string, number> = {};
  for (const v of rt._variables) if (/^test_/.test(v._name || "") && v._version > 0 && v._value !== undefined) { const n = names.get(v._module) || "(not a main)"; ran[n] = (ran[n] || 0) + 1; }
  const all = [...rt.mains.keys()].filter((k: any) => /\/(brain-|cloud-brain$|cloudflare-iac$)/.test(k) && !["@tomlarkworthy/brain-shell", "@tomlarkworthy/brain-secrets"].includes(k));
  return { mains: brain.filter((id) => rt.mains.has(id)), mainsWithNoBlockOfAJoin: all.filter((k: any) => !brain.includes(k)), source: brain.filter((id) => !rt.mains.has(id)), testsRan: ran, heapMB: Math.round((performance as any).memory.usedJSHeapSize / 1e6) };
};
const open = async (hash: string) => {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  await page.route(base + "/", (route) => (route.request().resourceType() === "document" ? route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: shell }) : route.continue()));
  await page.route("**/xrpc/com.lopecode.brain.infra.getModules", async (route) => {
    const r = await route.fetch(), j = await r.json();
    for (const m of j.modules) if (BUILT.includes(m.module)) m.text = built.find((b) => b.id === m.module)!.content.replace(/^\n/, "");
    await route.fulfill({ response: r, json: j });
  });
  // The page makes its copy of a module the same as the Worker's (loadService), so the Worker's answer is stood in for too.
  await page.route("**/xrpc/com.lopecode.brain.getSource?*", async (route) => {
    const r = await route.fetch(), j = await r.json().catch(() => null);
    if (j && BUILT.includes(j.module)) j.text = built.find((b) => b.id === j.module)!.content.replace(/^\n/, "");
    await route.fulfill({ response: r, json: j });
  });
  const t0 = Date.now();
  await page.goto(base + "/" + hash, { waitUntil: "load" });
  return { page, errors, t0 };
};
// 1. The deployer's run: one module in view, and the verdict.
{
  const { page, errors, t0 } = await open(`#view=C100(S100(${module},@tomlarkworthy/brain-shell))&verify=${worker}`);
  const verdict = await page.waitForFunction(() => (window as any).__brainVerdict, null, { timeout: 150000 }).then((h) => h.jsonValue(), (e) => ({ none: String(e).slice(0, 200) }));
  console.log(JSON.stringify({ run: "verify", ms: Date.now() - t0, verdict, ...(await page.evaluate(state)), errors }, null, 1));
  await page.close();
}
// 2. The page as a visitor opens it, then a module opened by its link.
{
  const { page, errors, t0 } = await open("");
  await page.waitForFunction(() => { const rt = (window as any).__ojs_runtime; return rt && rt.mains && rt.mains.has("@tomlarkworthy/cloud-brain"); }, null, { timeout: 90000 }).catch((e) => errors.push(String(e).slice(0, 200)));
  await page.waitForTimeout(8000);
  console.log(JSON.stringify({ run: "open", ms: Date.now() - t0, hash: await page.evaluate(() => location.hash), ...(await page.evaluate(state)), errors }, null, 1));
  await page.evaluate(() => { history.pushState(null, "", location.hash.replace("@tomlarkworthy/cloud-brain,", "@tomlarkworthy/cloud-brain,@tomlarkworthy/brain-logs,")); dispatchEvent(new HashChangeEvent("hashchange")); });
  await page.waitForFunction(() => (window as any).__ojs_runtime.mains.has("@tomlarkworthy/brain-logs"), null, { timeout: 30000 }).catch((e) => errors.push(String(e).slice(0, 200)));
  await page.waitForTimeout(3000);
  console.log(JSON.stringify({ run: "after a link", hash: await page.evaluate(() => location.hash), ...(await page.evaluate(state)), errors }, null, 1));
  await page.close();
}
await browser.close();
