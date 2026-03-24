#!/usr/bin/env node
// Builds the gallery lopebook by copying blank.html and injecting the gallery module.
// The gallery module source is read from tools/scratch/gallery-module.js

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

const blank = readFileSync(
  join(rootDir, "lopebooks/notebooks/@tomlarkworthy_blank-notebook.html"),
  "utf-8"
);

const moduleSource = readFileSync(
  join(__dirname, "scratch/gallery-module.js"),
  "utf-8"
);

const moduleScript = `<script id="@tomlarkworthy/gallery"
  type="text/plain"
  data-mime="application/javascript"
>
${moduleSource}
</script>`;

// 1. Replace the main module with gallery module
let result = blank.replace(
  /<script id="d\/ab5f35ca1f4066ba"[\s\S]*?<\/script>/,
  moduleScript
);

// 2. Update bootconf (the actual one near end of file, not the exporter template)
result = result.replace(
  /"mains": \["@tomlarkworthy\/lopepage","d\/ab5f35ca1f4066ba"\]/,
  '"mains": ["@tomlarkworthy/lopepage","@tomlarkworthy/gallery"]'
);
// Replace hash in the actual bootconf (last occurrence)
const hashTarget = '"hash": "#view=R100(S70(d/ab5f35ca1f4066ba),S30(@tomlarkworthy/module-selection))"';
const hashReplace = '"hash": "#view=S100(@tomlarkworthy/gallery)"';
const lastHashIdx = result.lastIndexOf(hashTarget);
if (lastHashIdx >= 0) {
  result = result.slice(0, lastHashIdx) + hashReplace + result.slice(lastHashIdx + hashTarget.length);
}

const outPath = join(rootDir, "lopebooks/notebooks/@tomlarkworthy_gallery.html");
writeFileSync(outPath, result);
console.log("Wrote gallery lopebook to", outPath);
console.log("Size:", (result.length / 1048576).toFixed(1), "MB");
