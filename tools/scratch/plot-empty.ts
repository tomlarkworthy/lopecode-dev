import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1280, height: 900}});
p.on("console", m => { if (m.type() === "error") console.log("ERR", m.text()); });
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
console.log(await p.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const m = rt.mains.get("@tomlarkworthy/corepox-game");
  const Plot = await m.value("Plot");
  const hist: any[] = [];
  const out: string[] = ["history.length = " + hist.length];
  for (const data of [hist, [{pid: "a", t: 1, op: "x"}]]) {
    const el = Plot.plot({marginLeft: 200, width: 640,
      y: {type: "point", reverse: true, tickFormat: (f: any) => new Date(f)},
      marks: [Plot.dot(data, {x: (h: any) => h.pid, y: "t", symbol: "op"})]});
    const r = el.querySelector("rect");
    out.push(`n=${data.length} svg h=${el.getAttribute("height")} firstRect h=${r && r.getAttribute("height")}`);
  }
  return out.join("\n");
}));
await b.close();
