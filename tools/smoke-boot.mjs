import { chromium } from 'playwright';
const base='http://localhost:8792/';
const files=process.argv.slice(2);
const b=await chromium.launch({headless:true});
for(const rel of files){
  const ctx=await b.newContext(); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e.message).slice(0,80)));
  try{
    await p.goto(base+rel,{waitUntil:'load',timeout:40000});
    await p.waitForTimeout(7000);
    const st=await p.evaluate(()=>({bodyLen:(document.body.innerText||'').trim().length,
      lp:!!document.querySelector('#lopepage-2, #lopepage, .observablehq'),
      painted:[...document.querySelectorAll('.observablehq')].filter(n=>n.childElementCount||(n.textContent||'').trim()).length}));
    console.log((st.bodyLen>0&&st.painted>0?'OK  ':'BAD '), rel.split('/').pop(), JSON.stringify(st), errs.length?('ERR '+errs[0]):'');
  }catch(e){console.log('BAD ',rel.split('/').pop(),String(e).slice(0,60));}
  await ctx.close();
}
await b.close();
