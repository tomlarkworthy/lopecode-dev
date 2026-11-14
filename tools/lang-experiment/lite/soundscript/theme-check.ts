// Light and dark renders of soundscript.html, offline: the "air" theme's three stylesheets are served
// from theme-air/ (see its README.txt), the theme is switched through @tomlarkworthy/themes' own
// selector, and text contrast is measured against the colour actually behind it.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "../../../../node_modules/playwright/index.mjs";

const AIR = join(import.meta.dir, "theme-air");
const BASE = "https://raw.githubusercontent.com/observablehq/notebook-kit/6c2ec69e1ac30dd329789524a849578b2df17945/src/styles/";

// call before goto; everything not file/blob/data is aborted, except the air stylesheets, served locally
export async function offlineWithAir(page: Page) {
  await page.route("**/*", (r) => {
    const url = r.request().url();
    if (/^(file|blob|data):/.test(url)) return r.continue();
    const f = url.startsWith(BASE) ? join(AIR, url.slice(BASE.length)) : null;
    if (f && existsSync(f)) return r.fulfill({ status: 200, contentType: "text/css", body: readFileSync(f, "utf8") });
    return r.abort();
  });
}

export async function setTheme(page: Page, name: string) {
  const before = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  const ok = await page.evaluate((name) => {
    const rt = (window as any).__ojs_runtime;
    const view = [...rt._variables].find((x: any) => x._name === "viewof theme_assets" && x._value?.tagName)?._value;
    const themes = [...rt._variables].find((x: any) => x._name === "themes" && x._value instanceof Map)?._value;
    if (!view || !themes?.get(name)) return false;
    view.value = themes.get(name);
    view.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }, name);
  if (!ok) throw new Error(`no theme ${name}`);
  await page.waitForFunction((bg) => getComputedStyle(document.documentElement).backgroundColor !== bg, before, { timeout: 20000 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

// the lowest contrast ratio among visible elements of each kind, with the colours that gave it
export function contrasts(page: Page) {
  return page.evaluate(() => {
    const parse = (c: string): number[] | null => {
      let m = /^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(c);
      if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
      m = /^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.]+))?\)/.exec(c);
      if (m) return [+m[1] * 255, +m[2] * 255, +m[3] * 255, m[4] === undefined ? 1 : +m[4]];
      return null;
    };
    const over = (top: number[], under: number[]) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
    const lum = (c: number[]) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const ratio = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const backdrop = (el: Element): number[] => {
      const layers: number[][] = [];
      for (let e: Element | null = el; e; e = e.parentElement) {
        // an SVG label sits on its node's rect
        if (e instanceof SVGTextElement) { const r = e.parentElement?.querySelector("rect"); const f = r && parse(getComputedStyle(r).fill); if (f) layers.push(f); }
        const b = parse(getComputedStyle(e).backgroundColor);
        if (b && b[3] > 0) layers.push(b);
        if (b && b[3] === 1) break;
      }
      let base = [255, 255, 255, 1];
      for (const l of layers.reverse()) base = over(l, base);
      return base;
    };
    const kinds: Record<string, string> = {
      "body text": ".lp2-pane .observablehq p",
      "card code": ".lite-card .lite-code",
      "code keyword": ".lite-code .tok-keyword",
      "code string": ".lite-code .tok-string",
      "code number": ".lite-code .tok-number",
      "code comment": ".lite-code .tok-comment",
      "code definition": ".lite-code .tok-definition",
      "code type": ".lite-code .tok-typeName",
      "card type": ".lite-card-type",
      "card value": ".lite-card-value",
      "badge ok": ".lite-badge-ok",
      "badge rejected": ".lite-badge-rejected",
      "rule name": ".lite-err b",
      "graph label": ".lite-graph text",
      "graph caption": ".lite-graph figcaption",
      "readout": ".lite-readout",
      "game status": ".lite-game output",
      "game button": ".lite-game button",
    };
    const out: Record<string, { min: number; fg: string; bg: string; n: number }> = {};
    for (const [k, sel] of Object.entries(kinds)) {
      for (const el of document.querySelectorAll(sel)) {
        const r = (el as HTMLElement).getBoundingClientRect?.();
        if (!r || r.width === 0 || !(el.textContent ?? "").trim()) continue;
        const cs = getComputedStyle(el);
        const fg0 = parse(el instanceof SVGElement ? cs.fill : cs.color);
        if (!fg0) continue;
        const bg = backdrop(el), fg = over(fg0, bg), q = ratio(fg, bg);
        const cur = out[k];
        if (!cur || q < cur.min) out[k] = { min: Math.round(q * 100) / 100, fg: fg.slice(0, 3).map(Math.round).join(","), bg: bg.slice(0, 3).map(Math.round).join(","), n: (cur?.n ?? 0) + 1 };
        else cur.n++;
      }
    }
    return out;
  });
}
