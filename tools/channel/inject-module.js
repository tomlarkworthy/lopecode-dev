#!/usr/bin/env node
/**
 * Injects the @tomlarkworthy/claude-channels module into a lopecode notebook HTML.
 *
 * Usage: node tools/channel/inject-module.js <input.html> <output.html>
 *
 * This:
 * 1. Reads the source notebook HTML
 * 2. Inserts the claude-channels module as a <script> block before the bootloader
 * 3. Adds "@tomlarkworthy/claude-channels" to bootconf.json mains
 * 4. Updates the hash URL to include the channel module in the layout
 * 5. Writes the result to output.html
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const [,, inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  console.error("Usage: node tools/channel/inject-module.js <input.html> <output.html>");
  process.exit(1);
}

const html = readFileSync(resolve(inputPath), "utf8");
const moduleSource = readFileSync(resolve(import.meta.dirname, "claude-channels-module.js"), "utf8");

// 1. Find the bootconf.json script and insert our module before it
const bootconfMarker = '<!-- Bootloader -->';
const bootconfIdx = html.lastIndexOf(bootconfMarker);
if (bootconfIdx === -1) {
  console.error("Could not find '<!-- Bootloader -->' marker in HTML");
  process.exit(1);
}

const moduleScript = `
<script id="@tomlarkworthy/claude-channels"
  type="text/plain"
  data-mime="application/javascript"
>
${moduleSource}
</script>

`;

let result = html.slice(0, bootconfIdx) + moduleScript + html.slice(bootconfIdx);

// 2. Find the actual bootconf.json script block
//    Look for the specific pattern: <script id="bootconf.json" with type="text/plain" and data-mime="application/json"
//    Use lastIndexOf to skip templates embedded in exporter modules
const bootconfPattern = 'id="bootconf.json" \n        type="text/plain"\n        data-mime="application/json"';
let bootconfScriptStart = result.lastIndexOf(bootconfPattern);
if (bootconfScriptStart === -1) {
  // Try alternative formatting
  bootconfScriptStart = result.lastIndexOf('id="bootconf.json"');
  // Verify it's followed by data-mime="application/json"
  const next200 = result.substring(bootconfScriptStart, bootconfScriptStart + 200);
  if (!next200.includes('application/json')) {
    console.error("Could not find bootconf.json with application/json mime type");
    process.exit(1);
  }
}
if (bootconfScriptStart === -1) {
  console.error("Could not find bootconf.json script block");
  process.exit(1);
}
const bootconfContentStart = result.indexOf('>', bootconfScriptStart) + 1;
const bootconfContentEnd = result.indexOf('</script>', bootconfContentStart);
let bootconfContent = result.slice(bootconfContentStart, bootconfContentEnd);

// Parse the JSON-like content
try {
  const bootconf = JSON.parse(bootconfContent);

  // Add claude-channels to mains
  if (!bootconf.mains.includes("@tomlarkworthy/claude-channels")) {
    bootconf.mains.push("@tomlarkworthy/claude-channels");
  }

  // Update hash to include claude-channels in layout
  // Lopepage only supports flat R(S,S,...) — no nesting
  // Extract existing module references and add ours as a new panel
  const currentHash = bootconf.hash || "";
  if (!currentHash.includes("claude-channels")) {
    // Parse existing modules from hash like R100(S70(@mod1),S30(@mod2))
    const moduleRefs = [];
    const modulePattern = /S(\d+)\(([^)]+)\)/g;
    let m;
    while ((m = modulePattern.exec(currentHash)) !== null) {
      moduleRefs.push({ weight: parseInt(m[1]), module: m[2] });
    }

    if (moduleRefs.length > 0) {
      // Scale existing weights to 75% and add claude-channels at 25%
      const totalWeight = moduleRefs.reduce((sum, r) => sum + r.weight, 0);
      const scaled = moduleRefs.map(r => ({
        weight: Math.round((r.weight / totalWeight) * 75),
        module: r.module,
      }));
      scaled.push({ weight: 25, module: "@tomlarkworthy/claude-channels" });
      const parts = scaled.map(r => `S${r.weight}(${r.module})`).join(",");
      bootconf.hash = `#view=R100(${parts})`;
    } else {
      // Simple fallback
      bootconf.hash = "#view=R100(S75(@tomlarkworthy/debugger),S25(@tomlarkworthy/claude-channels))";
    }
  }

  const newBootconfContent = "\n" + JSON.stringify(bootconf, null, 2) + "\n";
  result = result.slice(0, bootconfContentStart) + newBootconfContent + result.slice(bootconfContentEnd);
} catch (e) {
  console.error("Failed to parse bootconf.json:", e.message);
  console.error("Content:", bootconfContent.slice(0, 200));
  process.exit(1);
}

// 4. Update the title
const titleRegex = /<title>[^<]*<\/title>/;
const titleMatch = result.match(titleRegex);
if (titleMatch) {
  const currentTitle = titleMatch[0].replace(/<\/?title>/g, "");
  if (!currentTitle.includes("claude-channel")) {
    result = result.replace(titleRegex, `<title>${currentTitle} + claude-channel</title>`);
  }
}

writeFileSync(resolve(outputPath), result);
const inputSize = (html.length / 1024 / 1024).toFixed(2);
const outputSize = (result.length / 1024 / 1024).toFixed(2);
console.log(`Injected @tomlarkworthy/claude-channels into ${outputPath}`);
console.log(`Input: ${inputSize} MB → Output: ${outputSize} MB`);
