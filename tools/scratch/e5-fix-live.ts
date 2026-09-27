// Live A/B of the dataflow-templating canonName fix on the new platform.
// dataflow-templating is an IMPORTED module there, served from /api/import/, so it is
// interceptable. NO_PATCH=1 for the baseline arm — capture both in one session.
import { chromium } from "playwright";

const url = process.argv[2] ?? "https://observablehq.com/@tomlarkworthy/editor-5";
const PATCH = !process.env.NO_PATCH;

const OLD_SITE = "const t = mod.variable(observers(v._name)).define(v._name, inputs, v._definition);";
const NEW_SITE = "const t = mod.variable(observers(canonName(v._name))).define(v._name, inputs, v._definition);";
const OLD_ANCHOR = 'const sanitize = (s) => String(s).replace(/[^\\w$]/g, "_");';
const NEW_ANCHOR = OLD_ANCHOR +
  '\nconst canonName = (n) => typeof n === "string" ? n.replace(/^(viewof|mutable)\\$/, "$1 ") : n;';

const b = await chromium.launch({ headless: !process.env.HEADED, args: ["--disable-web-security"] });
const ctx = await b.newContext();
let patched = false;
if (PATCH) {
  // Both import endpoints: /api/import/ on the new site, api.observablehq.com/….js?v=4 on classic.
  await ctx.route("**dataflow-templating**", async (route) => {
    if (!/\/api\/import\/|api\.observablehq\.com/.test(route.request().url())) return route.continue();
    const res = await route.fetch();
    let src = await res.text();
    for (const [o, n] of [[OLD_ANCHOR, NEW_ANCHOR], [OLD_SITE, NEW_SITE]] as const) {
      if (!src.includes(o)) throw new Error(`patch target missing: ${o.slice(0, 60)}`);
      src = src.replace(o, () => n);            // callback form: no $1 substitution
    }
    patched = true;
    await route.fulfill({ body: src, headers: {
      "content-type": "text/javascript; charset=utf-8", "access-control-allow-origin": "*" } });
  });
}
const p = await ctx.newPage();
await p.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
// Don't gate on __ojs_runtime: it is set by runtime-sdk's `runtime` cell, which on the new
// site is lazy, so a probe that waits for it stalls ~half the time. Gate on rendered cells,
// then scroll to force the rest in.
const frame = await (async () => {
  for (let i = 0; i < 120; i++) {
    const f = p.frames().find((f) => /observableusercontent/.test(f.url()));
    if (f) { try { if (await f.evaluate(() => document.querySelectorAll(".observablehq").length > 0)) return f; } catch {} }
    await p.waitForTimeout(1000);
  }
  throw new Error("no notebook frame with rendered cells");
})();
for (let s = 0; s < 14; s++) {
  await frame.evaluate((k) => window.scrollTo(0, k * 1400), s).catch(() => {});
  await p.waitForTimeout(700);
}
await frame.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
let prev = -1;
for (let i = 0; i < 45; i++) {
  const n = await frame.evaluate(() => document.querySelectorAll(".observablehq").length + document.querySelectorAll(".cm-editor").length);
  if (n === prev) break; prev = n; await p.waitForTimeout(1000);
}
const r = await frame.evaluate(() => {
  const deep = (root: any, sel: string): number => {
    let n = root.querySelectorAll?.(sel).length ?? 0;
    for (const el of root.querySelectorAll?.("*") ?? []) if ((el as any).shadowRoot) n += deep((el as any).shadowRoot, sel);
    return n;
  };
  const rt = (window as any).__ojs_runtime;
  const pinned = rt ? [...rt._variables].find((v: any) => /cellEditor\s*\(\s*title_variable/.test(String(v._definition))) : null;
  return {
    cmEditors: deep(document, ".cm-editor"),
    cmContent: deep(document, ".cm-content"),
    errorBadges: document.querySelectorAll(".observablehq--error").length,
    cells: document.querySelectorAll(".observablehq").length,
    hasRuntime: !!rt,
    pinnedHostCm: pinned ? deep(pinned._value ?? {}, ".cm-editor") : "runtime/cell unavailable",
    pinnedHostTag: pinned?._value?.tagName ?? null,
  };
});
console.log(JSON.stringify({ arm: PATCH ? "FIXED" : "BASELINE", patchServed: patched, ...r }, null, 1));
await b.close();
