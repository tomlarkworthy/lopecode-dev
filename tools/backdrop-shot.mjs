import {chromium} from "playwright";
const url = "file:///Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-backdrops))";
const b = await chromium.launch();
const p = await b.newPage({viewportSize:{width:1400,height:1000}});
await p.goto(url);
await p.waitForSelector("svg", {timeout:30000});
await p.waitForTimeout(3500);
// the preview is the widest svg on the page
const box = await p.evaluate(() => {
  const svgs = [...document.querySelectorAll("svg")].map(s => [s, s.getBoundingClientRect()]);
  svgs.sort((a,b) => b[0].getElementsByTagName("*").length - a[0].getElementsByTagName("*").length);
  const [el, r] = svgs[0];
  el.scrollIntoView({block:"center"});
  return {w: r.width|0, h: r.height|0, n: el.getElementsByTagName("*").length};
});
await p.waitForTimeout(600);
const svg = p.locator("svg").first();
const all = await p.$$("svg");
let best=null, bn=0;
for (const s of all) { const n = await s.evaluate(e => e.getElementsByTagName("*").length); if (n>bn) { bn=n; best=s; } }
await best.screenshot({path:"tools/screenshots/backdrop-preview.png"});
console.log(JSON.stringify(box));
await b.close();
