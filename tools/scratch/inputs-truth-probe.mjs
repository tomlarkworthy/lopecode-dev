import { chromium } from "playwright";
const nb = "file:///Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/@tomlarkworthy_inputs-reference.html";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto(nb, { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(12000);
const info = await page.evaluate(() => {
  const forms = [...document.querySelectorAll("form")];
  const r = forms.find(f => f.querySelector("input[type=range]"));
  const fm = forms.find(f => f.querySelectorAll("form").length >= 2);
  const box = (el) => { const b = el.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map(Math.round); };
  const desc = (el) => ({ box: box(el), font: getComputedStyle(el).fontSize, family: getComputedStyle(el).fontFamily.slice(0, 40),
     children: [...el.querySelectorAll("label,input,output,div")].slice(0, 8).map(c => ({ tag: c.tagName, type: c.getAttribute("type"), cls: c.className.slice(0,40), box: box(c) })) });
  return { range: r ? desc(r) : null, form: fm ? desc(fm) : null, bodyBg: getComputedStyle(document.body).backgroundColor, rangeBg: r ? getComputedStyle(r).backgroundColor : null };
});
console.log(JSON.stringify(info, null, 1));
const r = page.locator("form:has(input[type=range])").first();
if (await r.count()) { await r.scrollIntoViewIfNeeded(); await r.screenshot({ path: "ds-bundle/_screenshots/truth-range.png" }); }
const fm = page.locator("form:has(form):has(form)").first();
if (await fm.count()) { await fm.scrollIntoViewIfNeeded(); await fm.screenshot({ path: "ds-bundle/_screenshots/truth-form.png" }); }
await browser.close();
