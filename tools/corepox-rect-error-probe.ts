// `<rect> attribute height: A negative value is not valid. ("-3")` shows up in
// every corepox browser gate and no corepox module mentions Plot. This finds the
// caller and then reproduces it in isolation, so the fix is not a guess.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1280, height: 900}});
await p.addInitScript(() => {
  const orig = Element.prototype.setAttribute;
  (window as any).__rectHits = [];
  Element.prototype.setAttribute = function (n: string, v: any) {
    if ((n === "height" || n === "width") && String(v)[0] === "-" &&
        (this as Element).tagName === "rect")
      (window as any).__rectHits.push({n, v: String(v), t: performance.now(),
        attached: (this as Element).isConnected, stack: new Error().stack});
    return orig.call(this, n, v);
  };
});
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
await p.waitForTimeout(60000);
const hits = await p.evaluate(() => (window as any).__rectHits);
console.log(`${hits.length} negative rect dimension(s); first at ` +
            `t=${hits[0]?.t.toFixed(0)}ms, attached=${hits[0]?.attached}`);
if (hits[0]) console.log(hits[0].stack.split("\n").slice(1, 11).join("\n"));

// Reproduce with the rewind cell's own options and an empty history.
console.log("\n--- @tomlarkworthy/local-change-history `rewind`, empty history");
console.log(await p.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const m = rt.mains.get("@tomlarkworthy/local-change-history");
  if (!m) return "module not booted";
  const get = async (n: string) => {
    for (const [k, v] of m._scope) if (k === n) return await (v as any)._promise;
    return undefined;
  };
  const Plot: any = await get("Plot"), history: any = await get("history");
  const before = (window as any).__rectHits.length;
  const opts = (h: any[], extra: any) => ({
    marginLeft: 200, width: 640, ...extra,
    y: {type: "point", reverse: true},
    marks: [Plot.ruleX(h, {x: (d: any) => d.pid})]
  });
  Plot.plot(opts(history, {}));
  const withEmpty = (window as any).__rectHits.length - before;
  Plot.plot(opts(history, {height: 200}));
  const withHeight = (window as any).__rectHits.length - before - withEmpty;
  Plot.plot(opts([{pid: "a", t: 1}, {pid: "b", t: 2}], {}));
  const withRows = (window as any).__rectHits.length - before - withEmpty - withHeight;
  return `history.length=${history.length}  ` +
         `as-shipped -> ${withEmpty} bad rect(s), ` +
         `with height:200 -> ${withHeight}, ` +
         `with 2 rows -> ${withRows}`;
}));
await b.close();
