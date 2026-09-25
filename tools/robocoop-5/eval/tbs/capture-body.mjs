// Capture the exact chat/completions bodies the in-page engine posts (df35), for a faithful replay.
// Records every POST body to tbs/results/capture-<tag>/req-N.json and each request's wall time.
//   node tbs/capture-body.mjs [--model xiaomi/mimo-v2.6-flash] [--notebook abs] [--tag t] [--max-wait 300000]
import { join, resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { createDriver } from "../driver.mjs";
import { here } from "./tasks.mjs";
import { loadKey } from "./keyload.mjs";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const model = flag("--model", "xiaomi/mimo-v2.6-flash");
const notebook = resolve(flag("--notebook", join(here, "..", "robocoop-5-eval-bigcap-df35.html")));
const tag = flag("--tag", "flash");
const maxWait = Number(flag("--max-wait", 300000));
const outDir = join(here, "results", "capture-" + tag);
mkdirSync(outDir, { recursive: true });

const t0 = Date.now();
const reqs = [];
let done;
const finished = new Promise((r) => (done = r));
const origLaunch = chromium.launch.bind(chromium);
chromium.launch = async (o) => {
  const b = await origLaunch(o);
  const nc = b.newContext.bind(b);
  b.newContext = async (...a) => {
    const c = await nc(...a);
    c.on("request", (req) => {
      if (!/\/chat\/completions/.test(req.url()) || req.method() !== "POST") return;
      const n = reqs.length + 1;
      const body = req.postData() || "";
      writeFileSync(join(outDir, `req-${n}.json`), body);
      const rec = { n, sentMs: Date.now() - t0, bytes: body.length, endMs: null, status: null };
      reqs.push(rec);
      console.log(`req ${n} sent at ${rec.sentMs} ms, ${body.length} bytes`);
      req.__rec = rec;
    });
    const fin = (ok) => (req) => {
      const rec = req.__rec; if (!rec) return;
      rec.endMs = Date.now() - t0; rec.status = ok ? "finished" : "failed: " + (req.failure()?.errorText ?? "");
      console.log(`req ${rec.n} ${rec.status} at ${rec.endMs} ms (${rec.endMs - rec.sentMs} ms)`);
      if (rec.n >= 2) done();
    };
    c.on("requestfinished", fin(true));
    c.on("requestfailed", fin(false));
    return c;
  };
  return b;
};

const driver = await createDriver({ notebookPath: notebook, apiKey: loadKey(), model, timeoutMs: maxWait + 60000 });
const run = driver.runQuestion({
  id: "cap", question: "Call read_file on /src (or glob /src/**) and eval_js `1+1`, then reply with one sentence naming what you found. Do not write any files.",
}).catch((e) => ({ error: String(e) }));
const timer = setTimeout(() => { console.log("max-wait reached"); done(); }, maxWait);
await Promise.race([finished, run]);
clearTimeout(timer);
writeFileSync(join(outDir, "timing.json"), JSON.stringify(reqs, null, 1));
console.log(JSON.stringify(reqs));
await driver.close().catch(() => {});
process.exit(0);
