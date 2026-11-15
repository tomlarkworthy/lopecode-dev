// bun horde/gpu-probe.ts : which headless Chromium launch options expose a WebGPU adapter
import { chromium } from "../../../node_modules/playwright/index.mjs";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
const url = "file://" + resolve(import.meta.dir, "proto/blank.html");
const home = process.env.HOME!;
const newer = [`${home}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
  `${home}/Library/Caches/ms-playwright/chromium-1234/chrome-mac/Chromium.app/Contents/MacOS/Chromium`].find(existsSync);
const variants: [string, any][] = [
  ["bundled 136 headless, no flags", {}],
  ["bundled 136 headless, --enable-unsafe-webgpu", { args: ["--enable-unsafe-webgpu"] }],
  ["bundled 136 headful, no flags", { headless: false }],
];
if (newer) {
  variants.push(["chromium-1234 headless, no flags", { executablePath: newer }]);
  variants.push(["chromium-1234 headless, --enable-unsafe-webgpu", { executablePath: newer, args: ["--enable-unsafe-webgpu"] }]);
  variants.push(["chromium-1234 headless, unsafe-webgpu + angle metal", { executablePath: newer, args: ["--enable-unsafe-webgpu", "--use-angle=metal"] }]);
}
for (const [label, opts] of variants) {
  try {
    const b = await chromium.launch(opts);
    const p = await b.newPage();
    await p.goto(url);
    const r = await p.evaluate(async () => {
      const out: any = { ua: navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0], secure: isSecureContext, gpu: !!(navigator as any).gpu };
      try {
        const a = await (navigator as any).gpu?.requestAdapter({ powerPreference: "high-performance" });
        out.adapter = !!a;
        if (a) { out.info = a.info ? `${a.info.vendor}/${a.info.architecture}/${a.info.description}` : null; const d = await a.requestDevice(); out.device = !!d; out.f16 = a.features.has("shader-f16"); out.ts = a.features.has("timestamp-query"); }
      } catch (e) { out.err = String(e); }
      const c = document.createElement("canvas"); const gl = c.getContext("webgl2"); out.webgl2 = !!gl;
      if (gl) { const ext = gl.getExtension("WEBGL_debug_renderer_info"); out.gl = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); }
      out.hc = navigator.hardwareConcurrency; out.sab = typeof SharedArrayBuffer; out.coi = (self as any).crossOriginIsolated;
      return out;
    });
    console.log(label, "|", b.version(), "|", JSON.stringify(r));
    await b.close();
  } catch (e) { console.log(label, "launch failed", String(e).slice(0, 300)); }
}
