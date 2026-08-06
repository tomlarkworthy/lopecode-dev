// moduleTitle picks the lowest-_id variable that is not a `module ` var, so an
// import bridge created before the headline cell becomes the candidate and the
// pane loses its title. Check the titles the way lopepage sees them.
import { chromium } from 'playwright';
import { resolve } from 'path';

const b = await chromium.launch({ headless: true });
const p = await b.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
await p.goto('file://' + resolve(process.argv[2]), { waitUntil: 'domcontentloaded', timeout: 180000 });
await p.waitForTimeout(Number(process.argv[3] || 35000));

const out = await p.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const fn = [...rt._variables].find((v) => v._name === 'moduleTitle' && typeof v._value === 'function')?._value;
  const titles = {};
  if (fn) {
    for (const k of [...rt.mains.keys()]) {
      const m = rt.mains.get(k);
      try {
        titles[k] = await Promise.race([fn(m), new Promise((r) => setTimeout(() => r('<probe timeout>'), 5000))]);
      } catch (e) { titles[k] = 'threw: ' + String(e).slice(0, 80); }
      titles[k] = String(titles[k]);
    }
  }
  let errored = 0;
  for (const v of rt._variables) if (v._error) errored++;
  // the variable moduleTitle would pick: lowest _id, _type 1, not a `module ` var
  const clt = rt.mains.get('@tomlarkworthy/coded-landmark-tracking');
  const cands = [...rt._variables].filter((v) => v._module === clt && v._definition && v._type === 1 &&
    !(typeof v._name === 'string' && v._name.startsWith('module ')));
  const winner = cands.reduce((a, b) => ((a._id ?? Infinity) <= (b._id ?? Infinity) ? a : b), cands[0]);
  return { mainsSize: rt.mains.size, moduleTitleFound: !!fn, erroredVariables: errored, titles,
           titleCandidate: winner?._name ?? '(anon)',
           candidateRendersH1: !!(winner?._value?.tagName === 'H1' || winner?._value?.querySelector?.('h1')) };
});

console.log(JSON.stringify(out, null, 1));
console.log('page errors:', errs.length ? errs.slice(0, 4) : 'none');
await b.close();
