import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8791/@tomlarkworthy_lopecode-live-2026.html';
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext(); const page = await ctx.newPage();
const errs=[]; page.on('pageerror',e=>errs.push(String(e.message).slice(0,120)));
await page.goto(URL, { waitUntil:'load', timeout:60000 });
await page.waitForTimeout(9000);   // let it fully boot
const res = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  if (!rt) return { err:'no runtime' };
  const getVal = name => { for (const v of rt._variables) if (v._name===name && v._value!==undefined) return v._value; return undefined; };
  const exportToHTML = getVal('exportToHTML');
  if (typeof exportToHTML !== 'function') return { err:'exportToHTML not available', mounted: !!document.querySelector('#lopepage-2') };
  let html;
  try {
    const resp = await exportToHTML({ mains: new Map(rt.mains), runtime: rt, options: { hash: '' } });
    html = resp?.source ?? resp;
  } catch(e){ return { err:'export threw: '+String(e).slice(0,120) }; }
  if (typeof html !== 'string') return { err:'no source string' };
  const count = re => (html.match(re)||[]).length;
  return {
    mounted: !!document.querySelector('#lopepage-2'),
    htmlLen: html.length,
    dup_1worupj: count(/_1worupj = x => x/g),
    any_xtox_decl: count(/const \w+ = x => x;/g),
    // does the saved HTML itself boot-parse? quick check: no obviously-duplicate const in a block
  };
});
console.log('RESULT', JSON.stringify(res));
if (errs.length) console.log('pageerrors:', errs.slice(0,3).join(' | '));
await b.close();
