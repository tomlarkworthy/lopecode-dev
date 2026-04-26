#!/usr/bin/env node
// Inject tinyemu assets as base64 script tags into the linux-emu notebook.
// Safe to re-run: strips previously injected tags before inserting.

const fs = require('fs');
const path = require('path');

const NOTEBOOK = path.resolve(__dirname, '../../lopebooks/notebooks/@tomlarkworthy_linux-emu.html');
const ASSET_DIR = path.resolve(__dirname, '../../lopebooks/notebooks/tinyemu-assets');

const ASSETS = [
  { name: 'riscvemu64-wasm.wasm', mime: 'application/wasm' },
  { name: 'riscvemu64-wasm.js',   mime: 'text/javascript' },
  { name: 'root-riscv64.cfg',     mime: 'application/json' },
  { name: 'bbl64.bin',            mime: 'application/octet-stream' },
  { name: 'kernel-riscv64.bin',   mime: 'application/octet-stream' },
  { name: 'root-riscv64.bin',     mime: 'application/octet-stream' },
];

const MODULE_NAME = '@tomlarkworthy/linux-sbc';
const MARKER_BEGIN = '<!-- BEGIN tinyemu attachments (injected) -->';
const MARKER_END = '<!-- END tinyemu attachments (injected) -->';

function buildScriptTag(assetName, mime, base64) {
  return `<script id="${MODULE_NAME}/${assetName}"\n  type="text/plain"\n  data-encoding="base64"\n  data-mime="${mime}"\n>\n${base64}\n</script>`;
}

function main() {
  let html = fs.readFileSync(NOTEBOOK, 'utf8');

  // Strip previous injection if present.
  const prev = new RegExp(`\\n?${MARKER_BEGIN}[\\s\\S]*?${MARKER_END}\\n?`, 'g');
  html = html.replace(prev, '\n');

  // Build injection block.
  const tags = ASSETS.map(({ name, mime }) => {
    const buf = fs.readFileSync(path.join(ASSET_DIR, name));
    const b64 = buf.toString('base64');
    console.error(`[inject] ${name}: ${buf.length} bytes → ${b64.length} base64 chars`);
    return buildScriptTag(name, mime, b64);
  }).join('\n');

  const injection = `${MARKER_BEGIN}\n${tags}\n${MARKER_END}\n`;

  // Insert before `<script id="@tomlarkworthy/linux-sbc"`.
  const targetTag = `<script id="${MODULE_NAME}" `;
  const idx = html.indexOf(targetTag);
  if (idx === -1) throw new Error('linux-sbc module script tag not found');
  html = html.slice(0, idx) + injection + html.slice(idx);

  // Update the fileAttachments Map — change `new Map([].map(` into
  // `new Map([...names].map(` inside the linux-sbc module.
  // Find the unique line after linux-sbc script where module_name is "@tomlarkworthy/linux-sbc".
  const fileAttRegex = /const fileAttachments = new Map\(\[[^\]]*\]\.map\(\(name\) => \{\s*const module_name = "@tomlarkworthy\/linux-sbc";/;
  if (!fileAttRegex.test(html)) throw new Error('linux-sbc fileAttachments Map initializer not found');
  const namesLiteral = JSON.stringify(ASSETS.map(a => a.name));
  html = html.replace(fileAttRegex,
    `const fileAttachments = new Map(${namesLiteral}.map((name) => {\n    const module_name = "@tomlarkworthy/linux-sbc";`);

  fs.writeFileSync(NOTEBOOK, html);
  const stat = fs.statSync(NOTEBOOK);
  console.error(`[inject] wrote ${NOTEBOOK} (${stat.size} bytes)`);
}

main();
