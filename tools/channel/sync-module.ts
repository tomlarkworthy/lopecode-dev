#!/usr/bin/env bun
/**
 * Syncs a module between files. Works with .js module files and .html notebook files.
 *
 * Usage:
 *   bun tools/channel/sync-module.ts --module @author/name --source src --target dest.html
 *   bun tools/channel/sync-module.ts --module @author/name --source src --target dest.html --watch
 *
 * Source can be:
 *   - A .js file containing the module's define() function
 *   - A .html notebook file containing a <script id="@author/name"> block
 *
 * If source is a .js file that doesn't exist, extracts the module from target first,
 * creating the .js file as a starting point for editing.
 *
 * Target must be an .html notebook file.
 *
 * This:
 * 1. Reads module content from source (.js file or .html <script> block)
 * 2. If the module <script> already exists in target, replaces its content (upsert)
 * 3. If not, inserts it before the bootloader marker
 * 4. Ensures the module is in bootconf.json mains
 * 5. Updates the hash URL to include the module in the layout
 */

import { readFileSync, writeFileSync, existsSync, watch } from "fs";
import { resolve, extname } from "path";

function parseArgs() {
  const args = process.argv.slice(2);
  let moduleName = "";
  let sourcePath = "";
  let targetPath = "";
  let watchMode = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--module":
        moduleName = args[++i];
        break;
      case "--source":
        sourcePath = args[++i];
        break;
      case "--target":
        targetPath = args[++i];
        break;
      case "--watch":
        watchMode = true;
        break;
    }
  }

  if (!moduleName || !sourcePath || !targetPath) {
    console.error(
      "Usage: bun tools/channel/sync-module.ts --module <@author/name> --source <file> --target <notebook.html> [--watch]"
    );
    process.exit(1);
  }

  return {
    moduleName,
    sourcePath: resolve(sourcePath),
    targetPath: resolve(targetPath),
    watchMode,
  };
}

function extractModuleFromHtml(html: string, moduleId: string): string | null {
  const escaped = moduleId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<script\\s+id="${escaped}"[^>]*>[\\s\\S]*?</script>`
  );
  const m = html.match(pattern);
  return m ? m[0] : null;
}

function extractModuleContent(html: string, moduleId: string): string | null {
  const escaped = moduleId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<script\\s+id="${escaped}"[^>]*>([\\s\\S]*?)</script>`
  );
  const m = html.match(pattern);
  return m ? m[1].replace(/^\n/, "").replace(/\n$/, "") : null;
}

function extractAttachmentBlocks(html: string, moduleId: string): { id: string; block: string }[] {
  const escaped = moduleId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<script\\s+id="(${escaped}/[^"]+)"[^>]*>[\\s\\S]*?</script>`, "g");
  const out: { id: string; block: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push({ id: m[1], block: m[0] });
  return out;
}

function readModuleSource(
  sourcePath: string,
  moduleId: string
): { content: string; isJs: boolean } {
  const ext = extname(sourcePath).toLowerCase();

  if (ext === ".js" || ext === ".ts") {
    return { content: readFileSync(sourcePath, "utf8"), isJs: true };
  } else if (ext === ".html") {
    const html = readFileSync(sourcePath, "utf8");
    const content = extractModuleContent(html, moduleId);
    if (!content) {
      console.error(
        `Module ${moduleId} not found in ${sourcePath}`
      );
      process.exit(1);
    }
    return { content, isJs: false };
  } else {
    console.error(`Unsupported source file type: ${ext}`);
    process.exit(1);
  }
}

function upsertBlock(html: string, blockId: string, block: string): { html: string; action: "updated" | "inserted" } {
  const escaped = blockId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<script\\s+id="${escaped}"[^>]*>[\\s\\S]*?</script>`);
  const existing = html.match(re);
  if (existing) {
    const idx = html.indexOf(existing[0]);
    return { html: html.slice(0, idx) + block + html.slice(idx + existing[0].length), action: "updated" };
  }
  const marker = "<!-- Bootloader -->";
  const idx = html.lastIndexOf(marker);
  if (idx === -1) throw new Error("Could not find '<!-- Bootloader -->' marker in HTML");
  return { html: html.slice(0, idx) + block + "\n\n" + html.slice(idx), action: "inserted" };
}

function inject(
  sourcePath: string,
  targetPath: string,
  moduleId: string
): void {
  let html = readFileSync(targetPath, "utf8");
  const { content, isJs } = readModuleSource(sourcePath, moduleId);

  // Module script block
  const moduleBlock = `<script id="${moduleId}"\n  type="text/plain"\n  data-mime="application/javascript"\n>\n${content}\n</script>`;
  const modR = upsertBlock(html, moduleId, moduleBlock);
  html = modR.html;
  console.log(`${modR.action === "updated" ? "Updated existing" : "Inserted new"} ${moduleId} module`);

  // File-attachment script blocks (only when source is an HTML notebook)
  if (!isJs && extname(sourcePath).toLowerCase() === ".html") {
    const srcHtml = readFileSync(sourcePath, "utf8");
    const attachments = extractAttachmentBlocks(srcHtml, moduleId);
    for (const att of attachments) {
      const r = upsertBlock(html, att.id, att.block);
      html = r.html;
      console.log(`  ${r.action === "updated" ? "updated" : "inserted"} attachment ${att.id}`);
    }
    if (attachments.length === 0) console.log(`  (no file attachments for ${moduleId})`);
  }

  writeFileSync(targetPath, html);
  const size = (html.length / 1024 / 1024).toFixed(2);
  console.log(`Wrote ${targetPath} (${size} MB)`);
}

function extractToJs(targetPath: string, moduleId: string, jsPath: string): void {
  const html = readFileSync(targetPath, "utf8");
  const content = extractModuleContent(html, moduleId);
  if (!content) {
    console.error(`Module ${moduleId} not found in ${targetPath} — cannot extract`);
    process.exit(1);
  }
  writeFileSync(jsPath, content);
  console.log(`Extracted ${moduleId} from ${targetPath} → ${jsPath}`);
}

// CLI
const { moduleName, sourcePath, targetPath, watchMode } = parseArgs();

// If source is .js and doesn't exist, extract from target first
const sourceExt = extname(sourcePath).toLowerCase();
if ((sourceExt === ".js" || sourceExt === ".ts") && !existsSync(sourcePath)) {
  console.log(`Source ${sourcePath} not found — extracting from target`);
  extractToJs(targetPath, moduleName, sourcePath);
}

// Initial injection
inject(sourcePath, targetPath, moduleName);

if (watchMode) {
  console.log(`Watching ${sourcePath} for changes...`);
  let debounce: ReturnType<typeof setTimeout> | null = null;
  watch(sourcePath, () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      console.log(
        `\n${new Date().toLocaleTimeString()} — source changed, re-injecting...`
      );
      try {
        inject(sourcePath, targetPath, moduleName);
      } catch (e: any) {
        console.error("Injection failed:", e.message);
      }
    }, 200);
  });
}
