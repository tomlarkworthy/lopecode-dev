// Boot a notebook with a fake pairing token in the URL, click exporter-3's download anchor, and
// report the download's filename, <title>, og:title and bootconf hash.
import { chromium } from "playwright";
const nb = process.argv[2]!, out = process.argv[3]!;
const b = await chromium.launch();
const c = await b.newContext({ acceptDownloads: true });
const p = await c.newPage();
const errs: string[] = [];
p.on("pageerror", (e) => { errs.push(String(e).slice(0, 160)); console.log("[pageerror]", String(e).slice(0, 300)); });
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("[" + m.type() + "]", m.text().slice(0, 300)); });
await p.goto(`file://${nb}#view=S100(@tomlarkworthy/codestrates)&cc=LOPE-1-TEST`);
await p.waitForFunction(() => [...((window as any).__ojs_runtime?._variables ?? [])].some((v: any) => v._name === "exportAnchor"), null, { timeout: 60000 });
const [dl] = await Promise.all([
  p.waitForEvent("download", { timeout: 60000 }),
  p.evaluate(async () => {
    const rt = (window as any).__ojs_runtime;
    const v = [...rt._variables].find((v: any) => v._name === "exportAnchor" && String(v._definition).includes("createElement('a')"));
    const exportAnchor = await v._module.value("exportAnchor");
    const a = exportAnchor("download");
    document.body.append(a);
    a.click();
  }),
]);
await dl.saveAs(out);
const html = await Bun.file(out).text();
console.log(JSON.stringify({
  documentTitle: await p.title(),
  filename: dl.suggestedFilename(),
  title: /<title>([^<]*)<\/title>/.exec(html)?.[1],
  ogTitle: /property="og:title" content="([^"]*)"/.exec(html)?.[1],
  hash: /"hash":\s*"([^"]*)"/.exec(html)?.[1],
  ccAnywhereInBootconf: /"hash":\s*"[^"]*cc=/.test(html),
  pageErrors: errs.length,
}, null, 1));
await b.close();
