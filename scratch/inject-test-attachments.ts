#!/usr/bin/env bun
// Inject three test file attachments into scratch/@tomlarkworthy_lopepage.html
// to exercise the new file-attachment tab renderer:
//   @tomlarkworthy/lopepage/test.html   text/html               plain
//   @tomlarkworthy/lopepage/test.svg    image/svg+xml           plain
//   @tomlarkworthy/lopepage/test.pdf    application/pdf         base64

import { readFileSync, writeFileSync } from "node:fs";

const target = "scratch/@tomlarkworthy_lopepage.html";
const html = readFileSync(target, "utf8");

const HTML_BODY = `<!doctype html><meta charset="utf-8">
<title>Test HTML attachment</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 24px; background: #f6f7f9; color: #222; }
  h1 { margin-top: 0; }
  code { background: #e8eaee; padding: 2px 4px; border-radius: 3px; }
</style>
<h1>Hello from a file attachment</h1>
<p>This page is being rendered by lopepage's new file-attachment tab via <code>srcdoc</code>.</p>
<p>It is opaque cross-frame and gets the system PDF/HTML viewer for free.</p>
`;

const SVG_BODY = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="200" height="200" fill="url(#g)"/>
  <text x="100" y="105" text-anchor="middle" font-family="system-ui, sans-serif" font-size="24" fill="white" font-weight="600">file.svg</text>
</svg>
`;

// Minimal 1-page PDF saying "Hello PDF". Hand-crafted (xref offsets matter).
function buildTinyPdf(): Uint8Array {
  const text = "Hello PDF — rendered via blob: iframe";
  const enc = new TextEncoder();
  const parts: string[] = [];
  parts.push("%PDF-1.4\n");
  parts.push("%\xC3\xA4\xC3\xBC\xC3\xB6\xC3\x9F\n"); // binary marker bytes (UTF-8 of ä ü ö ß) keeps viewers happy
  const offsets: number[] = [];
  const enc2 = new TextEncoder();
  // We'll build cumulative byte offsets as we go.
  let buf = parts.join("");
  function append(s: string): number {
    const offset = enc2.encode(buf).length;
    buf += s;
    return offset;
  }
  const o1 = append("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  const o2 = append("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  const o3 = append(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
  );
  const contentStream = `BT /F1 18 Tf 72 720 Td (${text}) Tj ET`;
  const o4 = append(
    `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`
  );
  const o5 = append(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
  );
  const xrefOffset = enc2.encode(buf).length;
  buf += "xref\n0 6\n";
  buf += "0000000000 65535 f \n";
  for (const o of [o1, o2, o3, o4, o5]) {
    buf += String(o).padStart(10, "0") + " 00000 n \n";
  }
  buf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return enc2.encode(buf);
}

const pdfBytes = buildTinyPdf();
const pdfB64 = Buffer.from(pdfBytes).toString("base64");

const attachments: Array<{ id: string; mime: string; body: string; encoding?: "base64" }> = [
  { id: "@tomlarkworthy/lopepage/test.html", mime: "text/html", body: HTML_BODY },
  { id: "@tomlarkworthy/lopepage/test.svg", mime: "image/svg+xml", body: SVG_BODY },
  { id: "@tomlarkworthy/lopepage/test.pdf", mime: "application/pdf", body: pdfB64, encoding: "base64" },
];

function escapeText(s: string): string {
  // Avoid breaking out of <script type="text/plain"> via </script>
  return s.replace(/<\/script/gi, "<\\/script");
}

let out = html;
let injectedCount = 0;
for (const a of attachments) {
  const escId = a.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Drop any pre-existing block with this id (idempotent)
  const existing = new RegExp(`<script\\s+type="text/plain"\\s+id="${escId}"[\\s\\S]*?</script>\\s*`, "g");
  out = out.replace(existing, "");
  const encAttr = a.encoding === "base64" ? ` data-encoding="base64"` : "";
  const block = `<script type="text/plain" id="${a.id}" data-mime="${a.mime}"${encAttr}>${escapeText(a.body)}</script>\n`;
  // Insert just before </body>
  const idx = out.lastIndexOf("</body>");
  if (idx < 0) throw new Error("no </body> in target");
  out = out.slice(0, idx) + block + out.slice(idx);
  injectedCount++;
}

writeFileSync(target, out);
console.log(`Injected ${injectedCount} attachments into ${target}`);
