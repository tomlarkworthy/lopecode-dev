// Round trip: boot, create an annotation, export, write the export out, boot THAT
// and check annotate is in mains with the annotation cell present. Proves the
// saved file is usable, not just that the id string looks right.
import { chromium } from 'playwright';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

const file = resolve(process.argv[2]);
const out = resolve(process.argv[3]);
const HOST = process.argv[4] || '@tomlarkworthy/coded-landmark-tracking';
const wait = Number(process.argv[5] || 30000);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(wait);

const { html, created } = await page.evaluate(async (HOST) => {
  const rt = window.__ojs_runtime;
  const byName = (n) => { for (const v of rt._variables) if (v._name === n && typeof v._value === 'function') return v._value; return null; };
  const annotate = rt.mains.get('@tomlarkworthy/annotate');
  const store = await annotate.value('a2Store');
  const a = store.create({ module: HOST, cell: 'row_md' }, { src: 'md`round trip note`' });
  await new Promise((r) => setTimeout(r, 3000));
  const resp = await byName('exportToHTML')({ mains: new Map(rt.mains), runtime: rt, options: { hash: '' } });
  return { html: String(resp?.source ?? resp), created: { id: a.id, varName: a.varName } };
}, HOST);
writeFileSync(out, html);
await page.close();

const page2 = await browser.newPage();
const errs2 = [];
page2.on('pageerror', (e) => errs2.push(String(e).slice(0, 200)));
await page2.goto(`file://${out}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page2.waitForTimeout(wait);
const reboot = await page2.evaluate(async ({ HOST, varName }) => {
  const rt = window.__ojs_runtime;
  const annotate = rt.mains.get('@tomlarkworthy/annotate') ?? null;
  const host = rt.mains.get(HOST) ?? null;
  let recordValue = null;
  try { recordValue = host ? !!(await host.value(varName))?.anchor : null; } catch (e) { recordValue = 'threw ' + String(e).slice(0, 80); }
  let annotationsSeen = null;
  try { annotationsSeen = annotate ? (await annotate.value('annotations'))?.length ?? null : null; } catch (e) { annotationsSeen = 'threw ' + String(e).slice(0, 80); }
  return {
    annotateInMains: !!annotate,
    annotationCellPresent: !!host?._scope?.get(varName),
    annotationRecordResolves: recordValue,
    annotationsListLength: annotationsSeen,
  };
}, { HOST, varName: created.varName });

console.log(JSON.stringify({ created, exportedTo: out, reboot }, null, 2));
console.log('errors during author boot:', errs.length ? errs.slice(0, 4) : 'none');
console.log('errors during reboot     :', errs2.length ? errs2.slice(0, 4) : 'none');
await browser.close();
