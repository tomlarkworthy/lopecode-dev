// Rebuild the coded-landmark-tracking hero figure offline: real detector, real overlay.
import { readFileSync, writeFileSync } from "node:fs";

const HTML = "lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html";
const html = readFileSync(HTML, "utf8");

function block(id: string) {
  const re = new RegExp(`<script id="${id.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&")}"([^>]*)>([\\s\\S]*?)</script>`);
  const m = html.match(re);
  if (!m) return null;
  const attrs = m[1], body = m[2];
  const mime = (attrs.match(/data-mime="([^"]+)"/) || [])[1] || "application/octet-stream";
  const b64 = /data-encoding="base64"/.test(attrs);
  const bytes = b64 ? Buffer.from(body.trim(), "base64") : Buffer.from(body, "utf8");
  return { status: 200, mime, bytes: new Uint8Array(bytes) };
}

(globalThis as any).window = globalThis;
(globalThis as any).window.lopecode = {
  contentSync(path: string) {
    const b = block(decodeURIComponent(path)) || block(path);
    if (!b) return { status: 404, mime: "", bytes: new Uint8Array() };
    return b;
  },
};
(globalThis as any).performance = performance;

// The lopecode bootloader adds Runtime#fileAttachments; the bare runtime has not got it, and the
// module's define() prologue calls it before any cell runs.
const { Runtime } = await import("@observablehq/runtime");
(Runtime.prototype as any).fileAttachments = (resolve: (n: string) => any) => (name: string) => {
  const e = resolve(name);
  const bytes = () => (globalThis as any).window.lopecode.contentSync(
    "@tomlarkworthy/coded-landmark-tracking/" + encodeURIComponent(name)).bytes;
  return {
    url: async () => e?.url,
    async arrayBuffer() { const b = bytes(); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); },
    async text() { return Buffer.from(bytes()).toString("utf8"); },
    async json() { return JSON.parse(await this.text()); },
  };
};

const { importNotebookModule } = await import("./notebook-import.ts");
const m = await importNotebookModule(process.argv[2], {});
const analyzeFrameMan = await m.value("analyzeFrameMan");
const fitHexPose = await m.value("fitHexPose");
const hexOverlay = await m.value("hexOverlay");

const CASE = process.argv[3] ?? "hexcase-5ivq-04";
const meta = JSON.parse(readFileSync(`data/hexcases/${CASE}.json`, "utf8"));
const gray = new Uint8Array(readFileSync(`data/hexcases/${CASE}.gray`));
const frame = { gray, w: meta.w, h: meta.h };

const opts = { stride: meta.cfg?.stride ?? 4 };
analyzeFrameMan(frame, opts);                     // warm-up: first call also pays for JIT
const ts: number[] = [];
let res: any;
for (let i = 0; i < 5; i++) {
  const t0 = performance.now();
  res = analyzeFrameMan(frame, opts);
  ts.push(performance.now() - t0);
}
ts.sort((a, b) => a - b);
const pose = fitHexPose({ ...res, w: meta.w, h: meta.h });
console.log(JSON.stringify({
  case: CASE, ok: pose.ok, counts: pose.counts,
  offTarget: pose.offTarget?.length, medianMs: +ts[2].toFixed(1),
  recordedMs: meta.capture?.ms, recordedCounts: meta.capture?.counts,
}));
writeFileSync(process.argv[4] ?? "/dev/stdout",
  JSON.stringify({ parts: hexOverlay.parts(pose, res), w: meta.w, h: meta.h,
                   counts: pose.counts, medianMs: +ts[2].toFixed(1) }));
