#!/usr/bin/env bun
/**
 * lope-reader.ts - Read lopecode notebook structure without running it
 *
 * Usage:
 *   bun tools/lope-reader.ts <notebook.html>              # JSON spec (default)
 *   bun tools/lope-reader.ts <notebook.html> --get-module <name>  # Module source
 *   bun tools/lope-reader.ts --manifest [directory]        # Manifest of all notebooks
 *
 * The default output is a JSON notebook spec: title, bootconf, modules, files.
 */

import { readFileSync, statSync, existsSync } from "fs";
import { resolve, basename, relative } from "path";
import { createHash } from "crypto";
import * as cheerio from "cheerio";

interface ModuleInfo {
  id: string;
  content: string;
}

interface FileInfo {
  name: string;
  module?: string;
}

interface ParseResult {
  title: string;
  bootconf: Record<string, unknown> | null;
  modules: Map<string, ModuleInfo>;
  files: FileInfo[];
}

interface NotebookSpec {
  notebook: string;
  title: string;
  bootconf: Record<string, unknown> | null;
  files: string[];
  modules: Record<string, { hash: string; files?: string[] }>;
}

interface Options {
  notebook: string | null;
  getModule: string | null;
  manifest: boolean;
  manifestDir: string | null;
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    notebook: null,
    getModule: null,
    manifest: false,
    manifestDir: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--get-module" && args[i + 1]) {
      options.getModule = args[++i];
    } else if (arg === "--manifest") {
      options.manifest = true;
      if (args[i + 1] && !args[i + 1].startsWith("--")) {
        options.manifestDir = args[++i];
      }
    } else if (arg === "--help" || arg === "-h") {
      showHelp();
      process.exit(0);
    } else if (!arg.startsWith("--") && !options.notebook) {
      options.notebook = arg;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
lope-reader.ts - Read lopecode notebook structure without running it

Usage:
  bun tools/lope-reader.ts <notebook.html>                  # JSON spec (default)
  bun tools/lope-reader.ts <notebook.html> --get-module <name>  # Module source
  bun tools/lope-reader.ts --manifest [directory]            # Manifest of all notebooks

Default output is a JSON notebook spec describing what's assembled into the file:
title, bootconf, modules (with their file attachments), and global files.
  `);
}

function parseNotebook(html: string): ParseResult {
  const $ = cheerio.load(html);
  const modules = new Map<string, ModuleInfo>();
  const files: FileInfo[] = [];

  // Extract title
  const title = $("title").text().trim();

  // Extract bootconf (use last to skip exporter templates)
  let bootconf: Record<string, unknown> | null = null;
  const bootconfEl = $('script[id="bootconf.json"]').last();
  if (bootconfEl.length) {
    try {
      bootconf = JSON.parse(bootconfEl.text().trim());
    } catch {}
  }

  $("script[id]").each((_, el) => {
    const $el = $(el);
    const id = $el.attr("id")!;
    const content = $el.text().trim();
    const dataMime = $el.attr("data-mime");
    const dataEncoding = $el.attr("data-encoding");

    if (!content) return;

    const type = $el.attr("type");
    const isJsModule =
      dataMime === "application/javascript" || type === "lope-module";
    const isFileAttachment =
      type === "lope-file" || (dataEncoding === "base64" && !isJsModule);

    if (isJsModule) {
      modules.set(id, { id, content });
    } else if (isFileAttachment) {
      const moduleName = $el.attr("module");
      const fileName = $el.attr("file");
      // Parse module from id pattern: @author/module/filename
      const idModule = id.match(/^(@[^/]+\/[^/]+)\//)?.[1];
      files.push({
        name: fileName || id,
        module: moduleName || idModule,
      });
    } else if (id.startsWith("@") && !dataMime) {
      modules.set(id, { id, content });
    } else if (id.startsWith("file://")) {
      files.push({ name: id.replace("file://", "") });
    }
  });

  return { title, bootconf, modules, files };
}

function buildSpec(notebookName: string, parsed: ParseResult): NotebookSpec {
  const { title, bootconf, modules, files } = parsed;

  // Global files (no module)
  const globalFiles = files.filter((f) => !f.module).map((f) => f.name);

  // Build modules object
  const modulesObj: Record<string, { hash: string; files?: string[] }> = {};
  for (const [id, mod] of modules) {
    const hash = createHash("md5").update(mod.content).digest("hex");
    const moduleFiles = files
      .filter((f) => f.module === id)
      .map((f) => {
        // Strip module prefix from name
        const prefix = id + "/";
        return f.name.startsWith(prefix) ? f.name.slice(prefix.length) : f.name;
      });
    modulesObj[id] = moduleFiles.length > 0 ? { hash, files: moduleFiles } : { hash };
  }

  return {
    notebook: notebookName,
    title,
    bootconf,
    files: globalFiles.length > 0 ? globalFiles : [],
    modules: modulesObj,
  };
}

async function generateManifest(directory: string | null): Promise<string> {
  const dir = resolve(directory || ".");
  const glob = new Bun.Glob("**/*.html");
  const htmlFiles = Array.from(glob.scanSync({ cwd: dir, absolute: true }));

  const specs: NotebookSpec[] = [];

  for (const htmlFile of htmlFiles) {
    try {
      const html = readFileSync(htmlFile, "utf-8");
      const parsed = parseNotebook(html);
      if (parsed.modules.size === 0) continue;
      specs.push(buildSpec(basename(htmlFile, ".html"), parsed));
    } catch {
      continue;
    }
  }

  return JSON.stringify(specs, null, 2);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.manifest) {
    const output = await generateManifest(options.manifestDir);
    console.log(output);
    return;
  }

  if (!options.notebook) {
    console.error("Usage: bun tools/lope-reader.ts <notebook.html> [options]");
    console.error("Run with --help for more information");
    process.exit(1);
  }

  const notebookPath = resolve(options.notebook);
  if (!existsSync(notebookPath)) {
    console.error(`Error: Notebook not found: ${notebookPath}`);
    process.exit(1);
  }

  const html = readFileSync(notebookPath, "utf-8");
  const parsed = parseNotebook(html);

  if (options.getModule) {
    let module = parsed.modules.get(options.getModule);
    if (!module) {
      for (const [id, mod] of parsed.modules) {
        if (id.includes(options.getModule)) {
          module = mod;
          break;
        }
      }
    }

    if (!module) {
      console.error(`Module not found: ${options.getModule}`);
      console.error(
        `Available modules: ${[...parsed.modules.keys()].join(", ")}`
      );
      process.exit(1);
    }

    console.log(module.content);
  } else {
    const spec = buildSpec(basename(notebookPath, ".html"), parsed);
    console.log(JSON.stringify(spec, null, 2));
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
