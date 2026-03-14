/**
 * lope-loader.js - Node.js module loader hooks for lopecode modules
 *
 * Used with: node --import ./lope-loader-register.js lope-node-runner.js
 *
 * Intercepts import specifiers like:
 *   /@org/name.js?v=4              -> modules/@org/name.js
 *   /@org/name.js?v=4&resolutions= -> modules/@org/name.js
 *   https://api.observablehq.com/@org/name.js?v=4 -> modules/@org/name.js
 */

import fs from "fs";

function getModulesDir() {
  // Read lazily from env - set by the runner before dynamic imports
  return process.env.LOPE_MODULES_DIR;
}

function resolveModulePath(moduleId) {
  const dir = getModulesDir();
  if (!dir) return null;
  const filePath = `${dir}/${moduleId}.js`;
  if (fs.existsSync(filePath)) return filePath;
  return null;
}

export function resolve(specifier, context, nextResolve) {
  const dir = getModulesDir();
  if (!dir) return nextResolve(specifier, context);

  // Pattern: /@org/name.js?v=4 or /@org/name.js?v=4&resolutions=...
  if (specifier.startsWith("/") && specifier.includes(".js")) {
    const clean = specifier.slice(1).split("?")[0];
    const moduleId = clean.replace(/\.js$/, "");
    const filePath = resolveModulePath(moduleId);
    if (filePath) {
      return {
        url: new URL(`file://${filePath}`).href,
        shortCircuit: true,
      };
    }
  }

  // Pattern: https://api.observablehq.com/@org/name.js?v=4
  if (
    specifier.startsWith("https://api.observablehq.com/") &&
    specifier.includes(".js")
  ) {
    const urlPath = new URL(specifier).pathname;
    const clean = urlPath.slice(1).split("?")[0].replace(/\.js$/, "");
    const filePath = resolveModulePath(clean);
    if (filePath) {
      return {
        url: new URL(`file://${filePath}`).href,
        shortCircuit: true,
      };
    }
    // Module not available locally - return a stub
    return {
      url: `data:text/javascript,export default function define(runtime, observer) { const main = runtime.module(); return main; }`,
      shortCircuit: true,
    };
  }

  // https: imports of non-observablehq URLs
  if (specifier.startsWith("https://") && specifier.includes(".js")) {
    // Check if it's a known dep in the deps/ directory
    const depsDir = dir.replace(/\/modules$/, "/deps");
    // Try to match by package name (e.g. @observablehq/runtime)
    if (specifier.includes("@observablehq/runtime")) {
      const runtimePath = `${depsDir}/runtime.js`;
      if (fs.existsSync(runtimePath)) {
        return {
          url: new URL(`file://${runtimePath}`).href,
          shortCircuit: true,
        };
      }
    }
    // Return stub for any other https: URLs
    return {
      url: `data:text/javascript,export default function define(runtime, observer) { const main = runtime.module(); return main; }`,
      shortCircuit: true,
    };
  }

  return nextResolve(specifier, context);
}
