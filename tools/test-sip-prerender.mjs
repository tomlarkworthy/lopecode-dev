import { chromium } from 'playwright';
import path from 'path';
const OUT='file://'+path.resolve('tools/prerender-out.html'); // bootconf has prerender:true
const flags=['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'];
const b=await chromium.launch({headless:true,args:flags});const p=await b.newPage();
await p.goto(OUT,{waitUntil:'load',timeout:60000});
await p.waitForSelector('#lopepage-2 .observablehq',{timeout:30000}); await p.waitForTimeout(2000);
const r=await p.evaluate(async()=>{
  const rt=window.__ojs_runtime;
  let fn=null;
  for(const m of rt._modules.values()){ if(m._scope?.has?.('exportToHTML')){ fn=m._scope.get('exportToHTML')._value; break; } }
  if(typeof fn!=='function') return {err:'exportToHTML value not fn: '+typeof fn};
  // mimic sip_save EXACTLY: mains + live runtime + options {hash}, NO prerender option
  const resp=await fn({ mains:new Map(rt.mains), runtime:rt, options:{ hash:'#view=S100(@tomlarkworthy/virtual-monorepo)' } });
  const html=resp?.source ?? resp;
  const prIdx=html.indexOf('<div id="lope-prerender"');
  const block=prIdx>-1?html.slice(prIdx, html.indexOf('lope-prerender-cleanup')):'';
  return { len:html.length, hasPrerenderBlock:prIdx>-1, hasShadow:html.includes('shadowrootmode'),
           bootconfPrerender:/"prerender":\s*true/.test(html), snapshotHasCells:(block.match(/observablehq/g)||[]).length>100 };
});
console.log('save-in-place-style export (no prerender opt, bootconf=true):\n', JSON.stringify(r,null,2));
await b.close();
console.log(r.hasPrerenderBlock && r.snapshotHasCells && r.bootconfPrerender ? '\nPASS: save-in-place inherits prerender from bootconf + bakes snapshot' : '\nFAIL');
