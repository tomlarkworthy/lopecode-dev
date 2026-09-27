// Can a file:// page create a webstrate (no-cors multipart POST), frame it, and read its DOM back by postMessage?
import { chromium } from "playwright";
const probeDir = process.argv[2]!;
const b = await chromium.launch();
const c = await b.newContext({ ignoreHTTPSErrors: true });
const p = await c.newPage();
p.on("console", (m) => console.log("[console]", m.text().slice(0, 200)));
await p.goto(`file://${probeDir}/host.html`);
const zip = [...(await Bun.file(`${probeDir}/p.zip`).bytes())];
const id = "lopecode-probe2-" + Date.now();
const out = await p.evaluate(async ({ zip, id }) => {
  const form = new FormData();
  form.append("file", new File([new Uint8Array(zip)], "codestrate.zip", { type: "application/zip" }));
  const r = await fetch(`https://demo.webstrates.net/new?id=${id}`, { method: "POST", mode: "no-cors", body: form });
  const url = `https://demo.webstrates.net/${id}/`;
  const iframe = document.createElement("iframe");
  iframe.src = url;
  document.body.append(iframe);
  const t0 = performance.now();
  const html = await new Promise((resolve) => {
    const on = (e: MessageEvent) => { if (e.data?.type === "lopecode-serialized") { clearInterval(iv); resolve(e.data.html); } };
    window.addEventListener("message", on);
    const iv = setInterval(() => iframe.contentWindow?.postMessage({ type: "lopecode-serialize" }, "*"), 300);
    setTimeout(() => { clearInterval(iv); resolve(null); }, 20000);
  });
  return { type: r.type, ms: Math.round(performance.now() - t0), html };
}, { zip, id });
console.log(JSON.stringify({ type: out.type, ms: out.ms, len: out.html?.length }));
console.log(out.html?.slice(0, 1500));
await b.close();
