import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('https://observablehq.com/@tomlarkworthy/themes', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(10000);
for (const frame of page.frames()) {
  if (!frame.url().includes('observableusercontent.com')) continue;
  const r = await frame.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const out = {
      def_syntax_normal_underscore: cs.getPropertyValue('--syntax_normal').trim(),
      def_syntax_normal_hyphen: cs.getPropertyValue('--syntax-normal').trim(),
      theme_foreground: cs.getPropertyValue('--theme-foreground').trim(),
    };
    // Find every rule that *consumes* a syntax-normal-ish var, and the cited group rule
    const consumers = [];
    for (const sheet of [...document.adoptedStyleSheets, ...document.styleSheets]) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      for (const rule of rules) {
        const t = rule.cssText || '';
        if (/var\(--syntax[-_]normal/.test(t)) {
          consumers.push(rule.selectorText + ' { color: ' + (rule.style?.color||'') + ' }');
        }
      }
    }
    out.consumers = consumers;
    // computed color of the actual elements in the cited group
    const sample = sel => { const e = document.querySelector(sel); return e ? getComputedStyle(e).color : null; };
    out.colors = {
      'observablehq--gray': sample('.observablehq--gray'),
      'observablehq--function': sample('.observablehq--function'),
      'observablehq--keyword': sample('.observablehq--keyword'),
      'observablehq--field': sample('.observablehq--field'),
      'observablehq--inspect': sample('.observablehq--inspect'),
    };
    return out;
  });
  console.log(JSON.stringify(r, null, 2));
}
await browser.close();
