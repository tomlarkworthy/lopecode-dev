import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const { T, I } = JSON.parse(readFileSync('tools/.observable-cookies.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
await ctx.addCookies([
  { name: 'T', value: T, domain: '.observablehq.com', path: '/', httpOnly: true, secure: true },
  { name: 'I', value: I, domain: '.observablehq.com', path: '/', httpOnly: true, secure: true },
]);
const page = await ctx.newPage();
await page.goto('https://observablehq.com/@tomlarkworthy/themes', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(12000);

// 1. Top frame: is there a CodeMirror editor here, and what colors?
const top = await page.evaluate(() => {
  const out = { href: location.href };
  const cm = document.querySelector('.cm-content, .CodeMirror-code, .cm-editor');
  out.hasCodeMirror = !!cm;
  if (cm) out.cmColor = getComputedStyle(cm).color;
  const cs = getComputedStyle(document.documentElement);
  out.var_syntax_normal = cs.getPropertyValue('--syntax_normal').trim();
  out.var_theme_foreground = cs.getPropertyValue('--theme-foreground').trim();
  out.adoptedCount = document.adoptedStyleSheets?.length ?? 0;
  // inspector outputs in the top frame?
  out.topInspectors = document.querySelectorAll('.observablehq--inspect').length;
  return out;
});
console.log('=== TOP (observablehq.com) ===');
console.log(JSON.stringify(top, null, 2));

for (const frame of page.frames()) {
  if (!frame.url().includes('observableusercontent.com')) continue;
  let p;
  try {
    p = await frame.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const cm = document.querySelector('.cm-content, .CodeMirror-code, .cm-editor');
      return {
        href: location.href,
        adoptedCount: document.adoptedStyleSheets?.length ?? 0,
        var_syntax_normal: cs.getPropertyValue('--syntax_normal').trim(),
        inspectors: document.querySelectorAll('.observablehq--inspect').length,
        hasCodeMirror: !!cm,
        cmColor: cm ? getComputedStyle(cm).color : null,
      };
    });
  } catch (e) { p = { error: String(e) }; }
  console.log('=== FRAME', frame.url().slice(0,70), '===');
  console.log(JSON.stringify(p, null, 2));
}
await browser.close();
