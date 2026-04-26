#!/usr/bin/env bun
/**
 * lope-reader.ts - Read lopecode notebook structure without running it
 *
 *
 * Usage:
 *   bun tools/lope-reader.ts <notebook.html>                       # JSON spec (default)
 *   bun tools/lope-reader.ts <notebook.html> --get-module <name>   # Module source
 *   bun tools/lope-reader.ts <notebook.html> --compute-imports     # Spec + per-module dependsOn/dependedBy
 *   bun tools/lope-reader.ts --manifest [directory]                # Manifest of all notebooks
 *
 * The default output is a JSON notebook spec: title, bootconf, modules, files.
 * --compute-imports adds `dependsOn` (modules this one imports) and `dependedBy`
 * (reverse edge, scoped to modules in this notebook — same convention as
 * @tomlarkworthy/module-map) to each module entry. It boots
 * @tomlarkworthy/observablejs-toolchain via lope-runtime and calls its
 * `extractModuleInfo` on each `main.define("module …", loader)` body.
 */

import { readFileSync, statSync, existsSync } from "fs";
import { resolve, basename, relative } from "path";
import { createHash } from "crypto";
import * as cheerio from "cheerio";
import { loadNotebook } from "./lope-runtime.js";

// Loading observablejs-toolchain in lope-runtime triggers transitive notebook-import
// fetches that the headless runtime can't resolve; those rejections are unrelated to
// extractModuleInfo (which has no such deps) so we suppress them.
process.on("unhandledRejection", () => {});

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

interface ExtractInfo {
  namespace?: string;
  notebook?: string;
  version?: string;
  id?: string;
}
type ExtractFn = (loaderBody: string) => ExtractInfo | undefined;

interface ModuleSpec {
  hash: string;
  files?: string[];
  dependsOn?: string[];
  dependedBy?: string[];
}

interface NotebookSpec {
  notebook: string;
  title: string;
  bootconf: Record<string, unknown> | null;
  files: string[];
  modules: Record<string, ModuleSpec>;
}

interface Options {
  notebook: string | null;
  getModule: string | null;
  manifest: boolean;
  manifestDir: string | null;
  computeImports: boolean;
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    notebook: null,
    getModule: null,
    manifest: false,
    manifestDir: null,
    computeImports: false,
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
    } else if (arg === "--compute-imports") {
      options.computeImports = true;
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
  bun tools/lope-reader.ts <notebook.html>                       # JSON spec (default)
  bun tools/lope-reader.ts <notebook.html> --get-module <name>   # Module source
  bun tools/lope-reader.ts <notebook.html> --compute-imports     # Spec + per-module dependsOn/dependedBy
  bun tools/lope-reader.ts --manifest [directory]                # Manifest of all notebooks

Default output is a JSON notebook spec describing what's assembled into the file:
title, bootconf, modules (with their file attachments), and global files.

--compute-imports adds \`dependsOn\` and \`dependedBy\` fields to each module
(matching @tomlarkworthy/module-map's vocabulary). It boots
@tomlarkworthy/observablejs-toolchain (~3s one-time) and calls its
\`extractModuleInfo\` on each \`main.define("module …", loader)\` body.
  `);
}

const TOOLCHAIN_CANDIDATES = [
  "lopecode/notebooks/@tomlarkworthy_observablejs-toolchain.html",
  "lopebooks/notebooks/@tomlarkworthy_observablejs-toolchain.html",
];

async function loadExtractModuleInfo(): Promise<{ extract: ExtractFn; dispose: () => void }> {
  const path = TOOLCHAIN_CANDIDATES.find((p) => existsSync(p));
  if (!path) {
    throw new Error(
      `--compute-imports requires @tomlarkworthy/observablejs-toolchain.html in one of: ${TOOLCHAIN_CANDIDATES.join(", ")}`
    );
  }
  const exec = await loadNotebook(path, { settleTimeout: 15000 });
  const result = await exec.waitForVariable("extractModuleInfo");
  if (typeof result.value !== "function") {
    exec.dispose();
    throw new Error("extractModuleInfo did not resolve to a function");
  }
  return { extract: result.value as ExtractFn, dispose: () => exec.dispose() };
}

// Each loader emitted by the exporter looks like (single line):
//   main.define("module @author/notebook", async () => runtime.module((await import("/@author/notebook.js?v=4")).default));
// Capture the loader body (between the comma and the matching close-of-main.define)
// and feed it to extractModuleInfo, which handles named, d/<id>, and lopebook short forms.
function computeDependsOnFromSource(source: string, extract: ExtractFn): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const re = /main\.define\("module [^"]+",\s*([^\n]+?)\);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const info = extract(m[1].trim()) ?? {};
    let key: string | null = null;
    if (info.namespace && info.notebook) key = `@${info.namespace}/${info.notebook}`;
    else if (info.id) key = info.version ? `d/${info.id}@${info.version}` : `d/${info.id}`;
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
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

function buildSpec(notebookName: string, parsed: ParseResult, extract?: ExtractFn): NotebookSpec {
  const { title, bootconf, modules, files } = parsed;

  // Global files (no module)
  const globalFiles = files.filter((f) => !f.module).map((f) => f.name);

  // Build modules object
  const modulesObj: Record<string, ModuleSpec> = {};
  for (const [id, mod] of modules) {
    const hash = createHash("md5").update(mod.content).digest("hex");
    const moduleFiles = files
      .filter((f) => f.module === id)
      .map((f) => {
        // Strip module prefix from name
        const prefix = id + "/";
        return f.name.startsWith(prefix) ? f.name.slice(prefix.length) : f.name;
      });
    const entry: ModuleSpec = { hash };
    if (moduleFiles.length > 0) entry.files = moduleFiles;
    if (extract) {
      const deps = computeDependsOnFromSource(mod.content, extract);
      if (deps.length > 0) entry.dependsOn = deps;
    }
    modulesObj[id] = entry;
  }

  // Reverse pass: dependedBy is the inverse of dependsOn, scoped to modules
  // that exist in this notebook (matches module-map's per-runtime view —
  // a module not in the runtime can't be a dependent).
  if (extract) {
    const incoming = new Map<string, Set<string>>();
    for (const [id, entry] of Object.entries(modulesObj)) {
      if (!entry.dependsOn) continue;
      for (const dep of entry.dependsOn) {
        if (!modulesObj[dep]) continue;
        if (!incoming.has(dep)) incoming.set(dep, new Set());
        incoming.get(dep)!.add(id);
      }
    }
    for (const [id, entry] of Object.entries(modulesObj)) {
      const dby = incoming.get(id);
      if (dby && dby.size > 0) entry.dependedBy = Array.from(dby).sort();
    }
  }

  return {
    notebook: notebookName,
    title,
    bootconf,
    files: globalFiles.length > 0 ? globalFiles : [],
    modules: modulesObj,
  };
}

async function generateManifest(directory: string | null, extract?: ExtractFn): Promise<string> {
  const dir = resolve(directory || ".");
  const glob = new Bun.Glob("**/*.html");
  const htmlFiles = Array.from(glob.scanSync({ cwd: dir, absolute: true }));

  const specs: NotebookSpec[] = [];

  for (const htmlFile of htmlFiles) {
    try {
      const html = readFileSync(htmlFile, "utf-8");
      const parsed = parseNotebook(html);
      if (parsed.modules.size === 0) continue;
      specs.push(buildSpec(basename(htmlFile, ".html"), parsed, extract));
    } catch {
      continue;
    }
  }

  return JSON.stringify(specs, null, 2);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  // Spec output paths route through stdoutWrite so they're unaffected by the
  // console muting we do below for --compute-imports (the toolchain notebook's
  // cells write to console.log via lope-runtime's vm context).
  const stdoutWrite = (s: string) => process.stdout.write(s + "\n");

  let extract: ExtractFn | undefined;
  let dispose: (() => void) | undefined;
  if (options.computeImports && !options.getModule) {
    console.log = console.info = () => {};
    console.warn = () => {};
    const r = await loadExtractModuleInfo();
    extract = r.extract;
    dispose = r.dispose;
  }

  try {
    if (options.manifest) {
      const output = await generateManifest(options.manifestDir, extract);
      stdoutWrite(output);
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

      stdoutWrite(module.content);
    } else {
      const spec = buildSpec(basename(notebookPath, ".html"), parsed, extract);
      stdoutWrite(JSON.stringify(spec, null, 2));
    }
  } finally {
    if (dispose) dispose();
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
