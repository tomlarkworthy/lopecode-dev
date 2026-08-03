import { chromium } from 'playwright';

const url = 'https://observablehq.com/@tomlarkworthy/themes';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(10000); // let cells run + apply_theme adopt sheets

for (const frame of page.frames()) {
  const fu = frame.url();
  if (!fu.includes('observableusercontent.com')) continue;
  let probe;
  try {
    probe = await frame.evaluate(() => {
      const root = document.documentElement;
      const cs = getComputedStyle(root);
      const out = {
        href: location.href,
        isOnObservableCom: location.href.includes('observableusercontent.com') && !location.href.includes('blob:'),
        adoptedCount: document.adoptedStyleSheets?.length ?? 0,
        var_syntax_normal: cs.getPropertyValue('--syntax_normal').trim(),
        var_theme_foreground: cs.getPropertyValue('--theme-foreground').trim(),
        var_theme_background: cs.getPropertyValue('--theme-background').trim(),
        bodyColor: getComputedStyle(document.body).color,
        bodyBg: getComputedStyle(document.body).backgroundColor,
      };
      // where is --syntax_normal defined, across ALL stylesheets (adopted + linked)?
      const defs = [];
      const collect = (sheet, origin) => {
        let rules; try { rules = sheet.cssRules; } catch { return; }
        for (const rule of rules) {
          if (rule.style && rule.style.getPropertyValue('--syntax_normal'))
            defs.push({ origin, sel: rule.selectorText, val: rule.style.getPropertyValue('--syntax_normal').trim() });
        }
      };
      (document.adoptedStyleSheets || []).forEach((s,i) => collect(s, 'adopted#'+i));
      [...document.styleSheets].forEach((s,i) => collect(s, 'doc#'+i+' '+(s.href?'link':'inline')));
      out.syntaxNormalDefs = defs;
      // sample an inspector element actually showing a value
      const el = document.querySelector('.observablehq--gray, .observablehq--field, .observablehq--undefined, .observablehq--inspect');
      if (el) { out.inspSel = el.className; out.inspColor = getComputedStyle(el).color; }
      return out;
    });
  } catch (e) { probe = { error: String(e) }; }
  console.log('=== FRAME', fu.slice(0, 80), '===');
  console.log(JSON.stringify(probe, null, 2));
}
await browser.close();
