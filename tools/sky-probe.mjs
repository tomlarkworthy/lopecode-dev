import {chromium} from "playwright";
const url="file:///private/tmp/claude-502/-Users-tom-larkworthy-dev-lopecode-dev/20c96e6c-0370-42fa-ac76-48ad38d562c6/scratchpad/sky-plates.html";
const b=await chromium.launch();const p=await b.newPage();
p.on("console",m=>{if(m.type()==="error")console.log("CONSOLE",m.text())});
p.on("pageerror",e=>console.log("PAGEERROR",e.message,"\n",e.stack?.split("\n")[1]||""));
await p.goto(url);await p.waitForTimeout(1500);
for(const id of ["deep","poly","ring","field","scene"]){
  const n=await p.$eval("#"+id,s=>s.getElementsByTagName("*").length);
  const bb=await p.$eval("#"+id,s=>{const r=s.getBoundingClientRect();return [r.width|0,r.height|0]});
  console.log(id.padEnd(6),"elements",String(n).padStart(5),"box",bb.join("x"));
}
await b.close();
