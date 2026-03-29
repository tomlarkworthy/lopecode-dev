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

function inject(
  sourcePath: string,
  targetPath: string,
  moduleId: string
): void {
  let html = readFileSync(targetPath, "utf8");
  const { content, isJs } = readModuleSource(sourcePath, moduleId);

  // Build the script block
  const scriptBlock = `<script id="${moduleId}"\n  type="text/plain"\n  data-mime="application/javascript"\n>\n${content}\n</script>`;

  // Check if module already exists in target
  const escaped = moduleId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const scriptPattern = new RegExp(
    `<script\\s+id="${escaped}"[^>]*>[\\s\\S]*?</script>`
  );
  const existing = html.match(scriptPattern);

  if (existing) {
    // Replace in-place using string replacement (preserves backslashes)
    html = html.replace(existing[0], scriptBlock);
    console.log(`Updated existing ${moduleId} module`);
  } else {
    // Insert before bootloader
    const bootconfMarker = "<!-- Bootloader -->";
    const bootconfIdx = html.lastIndexOf(bootconfMarker);
    if (bootconfIdx === -1) {
      console.error("Could not find '<!-- Bootloader -->' marker in HTML");
      process.exit(1);
    }
    html = html.slice(0, bootconfIdx) + scriptBlock + "\n\n" + html.slice(bootconfIdx);
    console.log(`Inserted new ${moduleId} module`);
  }

  // Ensure module is in bootconf.json mains
  html = ensureBootconf(html, moduleId);

  writeFileSync(targetPath, html);
  const size = (html.length / 1024 / 1024).toFixed(2);
  console.log(`Wrote ${targetPath} (${size} MB)`);
}

function ensureBootconf(html: string, moduleId: string): string {
  const bootconfPattern = 'id="bootconf.json"';
  let bootconfScriptStart = html.lastIndexOf(bootconfPattern);
  if (bootconfScriptStart === -1) {
    console.warn("Could not find bootconf.json — skipping mains/hash update");
    return html;
  }

  const next200 = html.substring(
    bootconfScriptStart,
    bootconfScriptStart + 200
  );
  if (!next200.includes("application/json")) {
    console.warn(
      "Found bootconf.json but it's not application/json — skipping"
    );
    return html;
  }

  const bootconfContentStart = html.indexOf(">", bootconfScriptStart) + 1;
  const bootconfContentEnd = html.indexOf("</script>", bootconfContentStart);
  const bootconfContent = html.slice(bootconfContentStart, bootconfContentEnd);

  try {
    const bootconf = JSON.parse(bootconfContent);

    // Add to mains if missing
    if (!bootconf.mains.includes(moduleId)) {
      bootconf.mains.push(moduleId);
    }

    // Update hash to include module in layout
    const currentHash: string = bootconf.hash || "";
    if (!currentHash.includes(moduleId.split("/").pop()!)) {
      const modulePattern = /S(\d+)\(([^)]+)\)/g;
      const moduleRefs: { weight: number; module: string }[] = [];
      let m;
      while ((m = modulePattern.exec(currentHash)) !== null) {
        moduleRefs.push({ weight: parseInt(m[1]), module: m[2] });
      }

      if (moduleRefs.length > 0) {
        const totalWeight = moduleRefs.reduce((sum, r) => sum + r.weight, 0);
        const scaled = moduleRefs.map((r) => ({
          weight: Math.round((r.weight / totalWeight) * 75),
          module: r.module,
        }));
        scaled.push({ weight: 25, module: moduleId });
        const parts = scaled
          .map((r) => `S${r.weight}(${r.module})`)
          .join(",");
        bootconf.hash = `#view=R100(${parts})`;
      } else {
        bootconf.hash = `#view=R100(S75(@tomlarkworthy/debugger),S25(${moduleId}))`;
      }
    }

    const newBootconfContent =
      "\n" + JSON.stringify(bootconf, null, 2) + "\n";
    html =
      html.slice(0, bootconfContentStart) +
      newBootconfContent +
      html.slice(bootconfContentEnd);
  } catch (e: any) {
    console.warn("Failed to parse bootconf.json:", e.message);
  }

  return html;
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
