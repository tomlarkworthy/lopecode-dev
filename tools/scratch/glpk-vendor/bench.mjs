import { chromium } from "playwright";
import fs from "fs";
import http from "http";
import path from "path";

const S = process.argv[2];
// serve the two libs over http so dynamic import() works with a real origin
const server = http.createServer((req, res) => {
  const f = path.join(S, decodeURIComponent(req.url.split("?")[0]).replace(/^\//, ""));
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": "text/javascript" });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("[pageerror]", e.message));
await page.goto(`http://127.0.0.1:${port}/blank`.replace("/blank", "/"), { waitUntil: "domcontentloaded" }).catch(() => {});
await page.setContent("<!doctype html><title>bench</title>", { waitUntil: "domcontentloaded" });
await page.goto(`http://127.0.0.1:${port}/glpk-5.0.0.esm.js`).catch(() => {});
// need a real page on the origin; serve an html
fs.writeFileSync(path.join(S, "bench.html"), "<!doctype html><title>bench</title>");
await page.goto(`http://127.0.0.1:${port}/bench.html`);

const out = await page.evaluate(async ({ port }) => {
  const median = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };

  function tinyLP(glpk) {
    return {
      name: "tiny", objective: { direction: glpk.GLP_MAX, name: "obj",
        vars: [{ name: "x1", coef: 0.6 }, { name: "x2", coef: 0.5 }] },
      subjectTo: [
        { name: "c1", vars: [{ name: "x1", coef: 1 }, { name: "x2", coef: 2 }], bnds: { type: glpk.GLP_UP, ub: 1, lb: 0 } },
        { name: "c2", vars: [{ name: "x1", coef: 3 }, { name: "x2", coef: 1 }], bnds: { type: glpk.GLP_UP, ub: 2, lb: 0 } }
      ]
    };
  }
  // deterministic pseudo-random so both libs see the identical problem
  function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function bigMIP(glpk, nVars, nCons, seed) {
    const rnd = mulberry32(seed);
    const names = Array.from({ length: nVars }, (_, i) => `x${i}`);
    return {
      name: "mip",
      objective: { direction: glpk.GLP_MAX, name: "obj", vars: names.map((n) => ({ name: n, coef: Math.round(rnd() * 100) / 10 })) },
      subjectTo: Array.from({ length: nCons }, (_, c) => ({
        name: `c${c}`,
        vars: names.filter(() => rnd() < 0.35).map((n) => ({ name: n, coef: Math.round(rnd() * 90) / 10 + 1 })),
        bnds: { type: glpk.GLP_UP, ub: 40 + Math.round(rnd() * 60), lb: 0 }
      })).filter((c) => c.vars.length > 0),
      binaries: names
    };
  }
  function bigLP(glpk, nVars, nCons, seed) {
    const m = bigMIP(glpk, nVars, nCons, seed); delete m.binaries;
    m.bounds = Array.from({ length: nVars }, (_, i) => ({ name: `x${i}`, type: glpk.GLP_DB, ub: 10, lb: 0 }));
    return m;
  }

  async function bench(url, label) {
    const t0 = performance.now();
    const GLPK = (await import(url)).default;
    const tImport = performance.now() - t0;
    const t1 = performance.now();
    const glpk = await GLPK();
    const tInit = performance.now() - t1;

    const opts = { msglev: glpk.GLP_MSG_OFF };
    const res = { label, version: glpk.version, importMs: +tImport.toFixed(1), initMs: +tInit.toFixed(1) };

    const runs = async (model, n) => {
      const ts = [];
      for (let i = 0; i < n; i++) { const s = performance.now(); await glpk.solve(model, opts); ts.push(performance.now() - s); }
      return { median: +median(ts).toFixed(2), min: +Math.min(...ts).toFixed(2), total: +ts.reduce((a, b) => a + b).toFixed(1), n };
    };

    res.tiny = await runs(tinyLP(glpk), 200);
    res.mip_60x30 = await runs(bigMIP(glpk, 60, 30, 7), 30);
    res.mip_200x120 = await runs(bigMIP(glpk, 200, 120, 11), 10);
    res.lp_500x300 = await runs(bigLP(glpk, 500, 300, 13), 10);
    if (glpk.terminate) glpk.terminate();
    return res;
  }

  const five = await bench(`http://127.0.0.1:${port}/glpk-5.0.0.esm.js`, "5.0.0");
  const four = await bench(`http://127.0.0.1:${port}/glpk-4.0.2.esm.js`, "4.0.2");
  return { four, five };
}, { port });

console.log(JSON.stringify(out, null, 2));
await browser.close();
server.close();
