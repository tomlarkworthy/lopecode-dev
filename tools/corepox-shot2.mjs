import {chromium} from "playwright";
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}});
await p.goto("file://"+process.cwd()+"/scratch/corepox-ships.html");
for (const id of ["every-component-alone","rotation-convention","ships"])
  await p.locator("#"+id).screenshot({path:`tools/screenshots/cp-${id}.png`});
await b.close();
