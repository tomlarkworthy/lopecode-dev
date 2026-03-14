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

  $("script[id]").each((_, el) => {
    const $el = $(el);
    const id = $el.attr("id");
    const text = $el.text().trim();
    const mime = $el.attr("data-mime");
    const encoding = $el.attr("data-encoding");

    if (!text) return;

    // bootconf.json
    if (id === "bootconf.json") {
      const outPath = path.join(outputDir, "bootconf.json");
      writeFile(outPath, text);
      manifest.bootconf = JSON.parse(text);
      console.error(`  bootconf.json`);
      return;
    }

    // Skip non-module script tags (networking_script, main, CSS URLs, etc.)
    if (id === "networking_script" || id === "main") return;
    if (id.startsWith("https://")) return; // CSS stylesheets

    // Embedded dependencies (runtime, inspector, es-module-shims)
    if (id === "es-module-shims@2.6.2") return; // not needed in Node

    const isRuntime =
      id === "@observablehq/runtime@6.0.0" ||
      id === "@observablehq/inspector@5.0.1";

    if (isRuntime) {
      const name =
        id === "@observablehq/runtime@6.0.0" ? "runtime.js" : "inspector.js";
      const content = decodeContent(text, encoding);
      const outPath = path.join(outputDir, "deps", name);
      writeFile(outPath, content);
      manifest.deps.push({ id, file: `deps/${name}` });
      console.error(`  dep: ${id} -> deps/${name}`);
      return;
    }

    // File attachments: IDs like @org/module/filename.ext
    // These are sub-resources of a module (contain a / after the module name)
    if (id.startsWith("file://")) {
      const name = id.slice(7); // strip file://
      const content = decodeContent(text, encoding);
      const outPath = path.join(outputDir, "files", name);
      writeFile(outPath, content);
      manifest.files.push({ id, file: `files/${name}`, mime, encoding });
      console.error(`  file: ${id}`);
      return;
    }

    // Module sub-files: @org/name/subfile.gz (has 3+ path segments, mime is not JS)
    if (id.startsWith("@") && mime !== "application/javascript") {
      const content = decodeContent(text, encoding);
      const outPath = path.join(outputDir, "files", id);
      writeFile(outPath, content);
      manifest.files.push({ id, file: `files/${id}`, mime, encoding });
      console.error(`  file: ${id}`);
      return;
    }

    // Regular JS modules: @org/name
    if (id.startsWith("@")) {
      const content = decodeContent(text, encoding);
      const outPath = path.join(outputDir, "modules", id + ".js");
      writeFile(outPath, content);
      manifest.modules.push({ id, file: `modules/${id}.js`, encoding });
      console.error(`  module: ${id}`);
      return;
    }

    // Anything else - dump to misc
    console.error(`  skipped: ${id} (${mime}, ${encoding})`);
  });

  // Write manifest
  writeFile(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.error(
    `\nDone: ${manifest.modules.length} modules, ${manifest.files.length} files, ${manifest.deps.length} deps`
  );
}

main();
