// Prints enough of a notebook's live DOM to write a gesture against it. Throwaway reconnaissance.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto("file://" + process.argv[2], { waitUntil: "load" });
await page.waitForTimeout(18000);
console.log(JSON.stringify(await page.evaluate(() => {
  const path = (el) => { const p = []; for (let e = el; e && e !== document.body && p.length < 6; e = e.parentElement)
    p.unshift(e.tagName + (e.className && typeof e.className === "string" ? "." + e.className.split(/\s+/).slice(0,2).join(".") : "")); return p.join(" > "); };
  return {
    svgs: [...document.querySelectorAll("svg")].map((s, i) => ({
      i, w: Math.round(s.getBoundingClientRect().width), h: Math.round(s.getBoundingClientRect().height),
      inner: s.innerHTML.length, path: path(s) })).filter(s => s.w > 20),
    ranges: [...document.querySelectorAll('input[type=range]')].filter(r => r.offsetParent).slice(0, 14).map((r, i) => ({
      i, min: r.min, max: r.max, value: r.value,
      label: (r.closest("label") || r.parentElement)?.textContent?.trim().slice(0, 30), path: path(r) })),
    textareas: [...document.querySelectorAll("textarea")].map((t, i) => ({
      i, visible: !!t.offsetParent, ph: t.placeholder?.slice(0, 40), path: path(t) })),
    formsWithValue: [...document.querySelectorAll("form")].slice(0, 20).map((f, i) => ({
      i, valueKeys: f.value && typeof f.value === "object" ? Object.keys(f.value).slice(0, 12) : typeof f.value,
      path: path(f) }))
  };
}), null, 1));
await browser.close();
