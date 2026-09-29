import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage(); p.on("console", m => console.log("console:", m.type(), m.text()));
await p.setContent(`<script src="https://cdn.jsdelivr.net/npm/d3@7"></script><script src="https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6"></script>`);
await p.waitForFunction(() => window.Plot);
const r = await p.evaluate(() => {
  const pts = [{q:0,h:20},{q:10,h:18},{q:20,h:12},{q:36,h:4}];
  const run = (stroke) => { const svg = Plot.plot({marks:[Plot.line(pts,{x:"q",y:"h",stroke})]});
    const paths=[...svg.querySelectorAll('g[aria-label=line] path')];
    return {stroke: String(stroke), paths: paths.length, d: paths.map(x=>(x.getAttribute('d')||'').slice(0,30)), strokeAttr: paths.map(x=>x.getAttribute('stroke')), groupExists: !!svg.querySelector("g[aria-label=line]"), groupStroke: svg.querySelector('g[aria-label=line]')?.getAttribute('stroke')}; };
  let errs=[]; const out=[];
  for (const s of ["Alder","steelblue","#1f77b4",(d)=>"Alder"]) { try { out.push(run(s)); } catch(e){ errs.push(String(e)); } }
  return {version: Plot.version, out, errs};
});
console.log(JSON.stringify(r,null,1)); await b.close();
