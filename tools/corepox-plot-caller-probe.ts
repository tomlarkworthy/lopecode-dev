// Which booted module makes the Plot call that emits
// `<rect> attribute height: A negative value is not valid. ("-3")`?
// No corepox module mentions Plot, so hook Plot.plot in every module that has one
// and attribute each negative-height rect to the call it happened inside.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1280, height: 900}});
await p.addInitScript(() => {
  const orig = Element.prototype.setAttribute;
  (window as any).__bad = 0;
  Element.prototype.setAttribute = function (n: string, v: any) {
    if (n === "height" && String(v)[0] === "-" && (this as Element).tagName === "rect")
      (window as any).__bad++;
    return orig.call(this, n, v);
  };
});
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
await p.evaluate(() => {
  const rt = (window as any).__ojs_runtime;
  (window as any).__by = {};
  for (const [name, m] of rt.mains)
    for (const [k, v] of (m as any)._scope) {
      if (k !== "Plot") continue;
      Promise.resolve((v as any)._promise).then((P: any) => {
        if (!P || P.__hooked) return; P.__hooked = true;
        const orig = P.plot;
        P.plot = function (opts: any) {
          const before = (window as any).__bad;
          const r = orig.apply(this, arguments as any);
          const by = (window as any).__by;
          by[name] ??= {calls: 0, bad: 0, height: opts?.height, y: opts?.y?.type};
          by[name].calls++; by[name].bad += (window as any).__bad - before;
          return r;
        };
      });
    }
});
await p.waitForTimeout(70000);
const by = await p.evaluate(() => (window as any).__by);
const total = await p.evaluate(() => (window as any).__bad);
console.log(`negative-height rects in the run: ${total}`);
for (const [k, v] of Object.entries<any>(by))
  console.log(`  ${k.padEnd(38)} ${String(v.calls).padStart(4)} plot(s), ` +
              `${String(v.bad).padStart(4)} bad rect(s), height=${v.height} y.type=${v.y}`);
await b.close();
