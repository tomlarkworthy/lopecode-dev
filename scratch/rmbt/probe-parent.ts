import { chromium } from "playwright";
const b = await chromium.launch({ headless: true });
const page = await (await b.newContext()).newPage();
await page.goto(process.argv[2], { waitUntil: "load", timeout: 300000 });
console.log(await page.evaluate(() => {
  const el = document.getElementById("@tomlarkworthy/annotate");
  const menu = document.querySelector(".lp2-menu");
  const par = (n: any) => n ? (n.parentNode ? n.parentNode.nodeName + "#" + (n.parentNode.id || "") : "no-parent") : "missing";
  const wrapper = document.getElementById("lope-blocks");
  return {
    blockParent: par(el), menuParent: par(menu),
    wrapper: wrapper ? wrapper.parentNode.nodeName + " children=" + wrapper.children.length : "NO WRAPPER",
    bodyChildren: [...document.body.children].slice(0, 6).map((c: any) => c.nodeName + "#" + (c.id || c.className || ""))
  };
}));
await b.close();
