// Trace the ROOT throw site of an exception on new.observablehq.com using CDP
// pause-on-all-exceptions. Prints call frames + the source of the throwing cell.
import { chromium } from "playwright";

const url = process.argv[2] ?? "https://new.observablehq.com/@tomlarkworthy/editor-5";
const needle = process.argv[3] ?? "Cannot create property 'value'";
const waitMs = Number(process.argv[4] ?? 30000);

const browser = await chromium.launch({ headless: !process.env.HEADED });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();

const hits: any[] = [];
const sources = new Map<string, string>();

async function attach(frameLike: any, label: string) {
  const cdp = await ctx.newCDPSession(frameLike);
  const scripts = new Map<string, string>(); // scriptId -> url
  cdp.on("Debugger.scriptParsed" as any, (e: any) => scripts.set(e.scriptId, e.url));
  cdp.on("Debugger.paused" as any, async (e: any) => {
    try {
      const desc: string = e.data?.description ?? e.data?.value ?? "";
      if (typeof desc === "string" && desc.includes(needle) && hits.length < 8) {
        const frames = e.callFrames.slice(0, 12).map((f: any) => ({
          fn: f.functionName || "(anon)",
          url: scripts.get(f.location.scriptId) ?? "?",
          scriptId: f.location.scriptId,
          line: f.location.lineNumber,
          col: f.location.columnNumber,
        }));
        hits.push({ label, desc, frames });
        for (const f of frames.slice(0, 4)) {
          if (!sources.has(f.scriptId)) {
            try {
              const r: any = await cdp.send("Debugger.getScriptSource" as any, {
                scriptId: f.scriptId,
              });
              sources.set(f.scriptId, r.scriptSource);
            } catch {}
          }
        }
      }
    } finally {
      cdp.send("Debugger.resume" as any).catch(() => {});
    }
  });
  await cdp.send("Debugger.enable" as any);
  await cdp.send("Debugger.setPauseOnExceptions" as any, { state: "all" });
  return cdp;
}

await attach(page, "page");

await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(waitMs);

console.log("=== HITS:", hits.length);
for (const h of hits.slice(0, 4)) {
  console.log("\n### ", h.desc, " in ", h.label);
  for (const f of h.frames) {
    console.log(`  ${f.fn} @ ${f.url}:${f.line}:${f.col}`);
  }
  const top = h.frames[0];
  const src = sources.get(top.scriptId);
  if (src) {
    const lines = src.split("\n");
    const from = Math.max(0, top.line - 6);
    console.log("  --- source", top.url);
    for (let i = from; i < Math.min(lines.length, top.line + 6); i++) {
      console.log(`  ${i === top.line ? ">>" : "  "} ${i}: ${lines[i].slice(0, 400)}`);
    }
  }
  // also print the 2nd/3rd non-bundle frame source
  for (const f of h.frames.slice(1, 5)) {
    if (f.url.includes("assets/index-")) continue;
    const s = sources.get(f.scriptId);
    if (!s) continue;
    const lines = s.split("\n");
    console.log(`  --- caller source ${f.url}:${f.line}`);
    for (let i = Math.max(0, f.line - 4); i < Math.min(lines.length, f.line + 4); i++) {
      console.log(`  ${i === f.line ? ">>" : "  "} ${i}: ${lines[i].slice(0, 400)}`);
    }
  }
}

await browser.close();
