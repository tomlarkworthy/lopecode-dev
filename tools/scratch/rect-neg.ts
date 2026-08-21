import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1280, height: 900}});
p.on("console", (m) => {
  if (m.type() !== "error") return;
  console.log("ERR", m.text(), "|", JSON.stringify(m.location()));
});
await p.addInitScript(() => {
  const bad = (n: string, v: any) => (n === "height" || n === "width") && Number(v) < 0;
  const oset = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (n: string, v: any) {
    if (bad(n, v) && this.namespaceURI === "http://www.w3.org/2000/svg")
      { const out: string[] = [];
        for (let e: any = this; e && e !== document.documentElement; e = e.parentElement)
          out.push(e.localName + (e.id ? "#" + e.id : "") + (e.className && typeof e.className === "string" ? "." + e.className.split(" ")[0] : ""));
        console.error("NEGSET", Math.round(performance.now()), this.tagName, n, String(v), "|", out.slice(0, 12).join(" < "), "|", (new Error()).stack); }
    return oset.call(this, n, v);
  };
  const desc = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML")!;
  Object.defineProperty(Element.prototype, "innerHTML", {...desc, set(v: any) {
    if (typeof v === "string" && /(height|width)="-/.test(v))
      console.error("NEGHTML", v.slice(0, 200), (new Error()).stack);
    return desc.set!.call(this, v);
  }});
});
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
for (let i = 0; i < 8 && await p.locator(".cpx-cutscene").count(); i++) {
  await p.click(".cpx-cutscene"); await p.waitForTimeout(90);
}
await p.waitForTimeout(75000);
console.log("-- idled 75s with no interaction at all");
await b.close();