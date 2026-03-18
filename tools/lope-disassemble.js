#!/usr/bin/env node
/**
 * lope-disassemble.js - Extract modules from a lopecode notebook HTML to disk
 *
 * Usage:
 *   node lope-disassemble.js <notebook.html> [output-dir]
 *
 * Extracts all embedded modules, file attachments, and dependencies into
 * a directory structure that can be loaded by lope-node-runner.js
 *
 * Output structure:
 *   <output-dir>/
 *     manifest.json         # metadata about extracted content
 *     bootconf.json         # boot configuration
 *     modules/
 *       @org/name.js        # JS modules (text or decompressed)
 *     files/
 *       @org/name/file.ext  # file attachments (decoded)
 *     deps/
 *       runtime.js           # @observablehq/runtime (decompressed)
 *       inspector.js         # @observablehq/inspector (decompressed)
 */

import fs from "fs";
import path from "path";
import { gunzipSync } from "zlib";
import * as cheerio from "cheerio";

function usage() {
  console.error(
    "Usage: node lope-disassemble.js <notebook.html> [output-dir]"
  );
  process.exit(1);
}

function b64ToBytes(b64) {
  return Buffer.from(b64, "base64");
}

function decodeContent(text, encoding) {
  const enc = (encoding || "text").toLowerCase();
  if (enc === "text") {
    return Buffer.from(text, "utf-8");
  }
  if (enc === "base64") {
    return b64ToBytes(text);
  }
  if (enc === "base64+gzip") {
    return gunzipSync(b64ToBytes(text));
  }
  throw new Error(`Unknown encoding: ${enc}`);
}

function ensureDir(filepath) {
  const dir = path.dirname(filepath);
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filepath, content) {
  ensureDir(filepath);
  fs.writeFileSync(filepath, content);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) usage();

  const notebookPath = path.resolve(args[0]);
  if (!fs.existsSync(notebookPath)) {
    console.error(`Not found: ${notebookPath}`);
    process.exit(1);
  }

  const defaultDir = path.basename(notebookPath, ".html") + ".d";
  const outputDir = path.resolve(args[1] || defaultDir);

  console.error(`Disassembling: ${notebookPath}`);
  console.error(`Output: ${outputDir}`);

  const html = fs.readFileSync(notebookPath, "utf-8");
  const $ = cheerio.load(html);

  const manifest = {
    source: path.basename(notebookPath),
    extracted: new Date().toISOString(),
    modules: [],
    files: [],
    deps: [],
    bootconf: null,
  };

  // Detect format: exporter-2 uses <script type="text/plain" data-mime="...">
  // while legacy uses <script type="lope-module"> and <script type="lope-file">
  const hasLegacyModules = $('script[type="lope-module"]').length > 0;
  const hasNewModules = $('script[type="text/plain"][data-mime="application/javascript"]').length > 0;

  if (hasNewModules) {
    console.error(`  format: exporter-2`);

    // Extract modules: <script id="@org/name" type="text/plain" data-mime="application/javascript">
    $('script[type="text/plain"][data-mime="application/javascript"]').each((_, el) => {
      const $el = $(el);
      const id = $el.attr("id");
      const text = $el.text().trim();
      if (!id || !text) return;

      const outPath = path.join(outputDir, "modules", id + ".js");
      writeFile(outPath, Buffer.from(text, "utf-8"));
      manifest.modules.push({ id, file: `modules/${id}.js`, encoding: "text" });
      console.error(`  module: ${id}`);
    });

    // Extract file attachments: <script id="@org/module/filename" type="text/plain" data-encoding="base64">
    $('script[type="text/plain"][data-encoding="base64"]').each((_, el) => {
      const $el = $(el);
      const id = $el.attr("id");
      const mime = $el.attr("data-mime") || "application/octet-stream";
      const text = $el.text().trim();
      if (!id || !text) return;

      // id format: @org/module/filename — split into module + fileName
      const lastSlash = id.lastIndexOf("/");
      const secondSlash = id.indexOf("/", id.indexOf("/") + 1);
      let moduleName, fileName;
      if (secondSlash > 0 && secondSlash < lastSlash) {
        // e.g. @tomlarkworthy/module/file.ext
        moduleName = id.substring(0, lastSlash);
        fileName = id.substring(lastSlash + 1);
      } else if (secondSlash > 0) {
        moduleName = id.substring(0, secondSlash);
        fileName = id.substring(secondSlash + 1);
      } else {
        moduleName = null;
        fileName = id;
      }

      const outName = moduleName ? `${moduleName}/${fileName}` : id;
      const outPath = path.join(outputDir, "files", outName);

      const raw = b64ToBytes(text);
      writeFile(outPath, raw);
      manifest.files.push({
        id,
        module: moduleName,
        fileName,
        file: `files/${outName}`,
        mime,
      });
      console.error(`  file: ${outName}`);
    });
  } else if (hasLegacyModules) {
    console.error(`  format: legacy (lope-module/lope-file)`);

    // Extract lope-module scripts (Observable notebook modules, plain text JS)
    $('script[type="lope-module"]').each((_, el) => {
      const $el = $(el);
      const id = $el.attr("id");
      const text = $el.text().trim();
      if (!id || !text) return;

      const outPath = path.join(outputDir, "modules", id + ".js");
      writeFile(outPath, Buffer.from(text, "utf-8"));
      manifest.modules.push({ id, file: `modules/${id}.js`, encoding: "text" });
      console.error(`  module: ${id}`);
    });

    // Extract lope-file scripts (file attachments, typically base64+gzip encoded)
    $('script[type="lope-file"]').each((_, el) => {
      const $el = $(el);
      const id = $el.attr("id");
      const moduleName = $el.attr("module");
      const fileName = $el.attr("file");
      const mime = $el.attr("mime") || "application/octet-stream";
      const text = $el.text().trim();
      if (!text) return;

      // Determine output path: use module/file structure if available
      const outName = moduleName && fileName
        ? `${moduleName}/${fileName}`
        : id || `unknown_${manifest.files.length}`;
      const outPath = path.join(outputDir, "files", outName);

      // lope-file content is base64-encoded (possibly gzipped based on .gz extension)
      const raw = b64ToBytes(text);
      writeFile(outPath, raw);
      manifest.files.push({
        id: id || outName,
        module: moduleName,
        fileName,
        file: `files/${outName}`,
        mime,
      });
      console.error(`  file: ${outName}`);
    });
  } else {
    console.error(`  warning: no modules found in either format`);
  }

  // Extract bootloader (first inline script without type)
  $("script:not([type]):not([id])").each((_, el) => {
    const text = $(el).text().trim();
    if (!text || text.length < 100) return;
    const outPath = path.join(outputDir, "bootloader.js");
    writeFile(outPath, Buffer.from(text, "utf-8"));
    console.error(`  bootloader.js`);
  });

  // Look for bootconf.json
  $('script[id="bootconf.json"]').each((_, el) => {
    const text = $(el).text().trim();
    if (!text) return;
    const outPath = path.join(outputDir, "bootconf.json");
    writeFile(outPath, text);
    manifest.bootconf = JSON.parse(text);
    console.error(`  bootconf.json`);
  });

  // Extract runtime from lope-file if present (runtime.js.gz)
  const runtimeFile = manifest.files.find(f => f.fileName === "runtime.js.gz");
  if (runtimeFile) {
    const gzPath = path.join(outputDir, runtimeFile.file);
    const gzData = fs.readFileSync(gzPath);
    const runtimeJs = gunzipSync(gzData);
    const outPath = path.join(outputDir, "deps", "runtime.js");
    writeFile(outPath, runtimeJs);
    manifest.deps.push({ id: "runtime", file: "deps/runtime.js", source: runtimeFile.file });
    console.error(`  dep: runtime.js (from ${runtimeFile.fileName})`);
  }

  // Write manifest
  writeFile(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.error(
    `\nDone: ${manifest.modules.length} modules, ${manifest.files.length} files, ${manifest.deps.length} deps`
  );
}

main();
