/**
 * Exporter 3: Raw Variable Serializer
 *
 * Key differences from exporter-2:
 * - No cellMap dependency — operates directly on runtime variables
 * - No special viewof/mutable handling — serializes all variables uniformly
 * - No moduleMap dependency — builds module names from runtime.mains + "module X" vars
 *
 * This file contains the core functions for exporter-3. Each exported function
 * corresponds to a cell that would go in the Observable notebook.
 */

// ============================================================
// Module Name Resolution (replaces moduleMap)
// ============================================================

/**
 * Build a Map<Module, {name}> from the runtime without moduleMap.
 *
 * Sources:
 *  1. runtime.mains — top-level modules set by the bootloader
 *  2. "module X" variables — their _name encodes the module name,
 *     their _value (when resolved) is the target Module object
 *  3. Builtin module — identified by being the runtime's builtin source
 */
function buildModuleNames(runtime, { cache = [] } = {}) {
  const names = new Map(); // Module → { name, module }

  // Seed from cache (e.g., task.mains entries)
  for (const [module, info] of cache) {
    names.set(module, info);
  }

  // 1. From runtime.mains (name → module)
  if (runtime.mains) {
    for (const [name, module] of runtime.mains) {
      if (!names.has(module)) {
        names.set(module, { name, module });
      }
    }
  }

  // 2. From "module X" variables — their _value is the loaded Module
  for (const v of runtime._variables) {
    if (
      typeof v._name === "string" &&
      v._name.startsWith("module ") &&
      v._value &&
      !names.has(v._value)
    ) {
      const name = v._name.slice(7);
      names.set(v._value, { name, module: v._value });
    }
  }

  // 3. Tag builtin module
  const builtinModule = runtime._builtin;
  if (builtinModule && !names.has(builtinModule)) {
    names.set(builtinModule, { name: "builtin", module: builtinModule });
  }

  // 4. Tag any remaining modules as unknown
  for (const v of runtime._variables) {
    if (!names.has(v._module)) {
      names.set(v._module, { name: "main", module: v._module });
    }
  }

  return names;
}

// ============================================================
// Variable Classification
// ============================================================

function isModuleVar(v) {
  return typeof v._name === "string" && v._name.startsWith("module ");
}

function isDynamicVar(v) {
  return typeof v._name === "string" && v._name.startsWith("dynamic ");
}

function isLiveImport(v) {
  return (
    !v._name &&
    v._definition
      ?.toString()
      .includes("observablehq" + "--inspect " + "observablehq--import")
  );
}

/**
 * Detect import-bridged variables — variables whose value comes from
 * another module via the import mechanism.
 */
function isImportBridged(v) {
  // Case 1: observed import — single input from a different module
  if (
    v._inputs.length === 1 &&
    v._inputs[0]._module !== v._module &&
    !v._inputs[0]._name?.startsWith?.("@") // not a builtin
  ) {
    return true;
  }
  // Case 2: unobserved import — two inputs, second is @variable
  if (v._inputs.length === 2 && v._inputs[1]?._name === "@variable") {
    return true;
  }
  return false;
}

/**
 * For an import-bridged variable, find the source module.
 * Returns the Module object that provides the imported value.
 */
async function getImportSource(v) {
  // Case 1: direct cross-module link
  if (v._inputs.length === 1 && v._inputs[0]._module !== v._module) {
    return v._inputs[0]._module;
  }
  // Case 2: @variable pattern — first input is the "module X" variable
  if (v._inputs.length === 2 && v._inputs[1]?._name === "@variable") {
    return v._inputs[0]._value || null;
  }
  return null;
}

/**
 * For an import-bridged variable, find its remote (imported) name.
 * This may differ from the local name if aliased.
 */
async function findImportedName(v) {
  // Live notebook: alias hidden in closure
  if (v._inputs.length === 1 && v._inputs[0]._name === "@variable") {
    let capture;
    await v._definition({ import: (...args) => (capture = args) });
    return capture[0];
  }
  // Observed: remote name is the input variable's name
  if (v._inputs.length === 1) {
    return v._inputs[0]._name;
  }
  // Unobserved: parse from definition string
  const regex = /v\.import\("([^"]+)",\s*"([^"]+)"/;
  const match = v._definition.toString().match(regex);
  if (match) return match[1];
  return v._name;
}

// ============================================================
// Persistent ID (same as runtime-sdk)
// ============================================================

function contentHash(s) {
  s = String(s);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return "_" + (h >>> 0).toString(36);
}

function pid(v) {
  if (!v.pid) {
    v.pid = contentHash(v._name + v._definition.toString());
  }
  return v.pid;
}

// ============================================================
// Variable → Source Code Serialization
// ============================================================

/**
 * Generate the const definition for a variable's function.
 * Import-bridged and module variables don't need consts —
 * their definitions are reconstructed in the define block.
 */
function variableToDefinition(v) {
  if (isModuleVar(v)) return "";
  if (isImportBridged(v)) return "";
  if (isLiveImport(v)) return "";
  if (isDynamicVar(v)) return "";

  return `const ${pid(v)} = ${v._definition.toString()};\n`;
}

/**
 * Generate the define() call(s) for a single variable.
 *
 * - Module vars → main.define("module X", async () => runtime.module(...))
 * - Import-bridged vars → main.define("name", ["module X", "@variable"], ...)
 * - Everything else → $def(pid, name, deps, pid)
 *
 * This handles viewof, mutable, initial, and simple variables uniformly —
 * the runtime already has correct definitions for all of them.
 */
async function variableToDefine(v, { moduleNames, normalize } = {}) {
  if (isLiveImport(v)) return [];
  if (isDynamicVar(v)) return [];

  if (isModuleVar(v)) {
    // Module loader variable: emit runtime.module() import
    // The module name is embedded in the variable name: "module @tomlarkworthy/foo"
    const moduleName = v._name.slice(7);
    return [
      `  main.define("${v._name}", async () => runtime.module((await import("/${moduleName}.js?v=4")).default));`,
    ];
  }

  if (isImportBridged(v)) {
    // Import binding: find source module variable name
    const importedName = await findImportedName(v);

    // Find the "module X" variable name to reference
    let moduleVarName = null;

    if (v._inputs.length === 2 && v._inputs[1]?._name === "@variable") {
      // Case 2: first input IS the module variable
      moduleVarName = v._inputs[0]._name;
    } else if (v._inputs.length === 1 && v._inputs[0]._module !== v._module) {
      // Case 1: observed import — need to find the "module X" variable
      // that corresponds to the source module
      const sourceModule = v._inputs[0]._module;
      const sourceInfo = moduleNames?.get(sourceModule);
      if (sourceInfo) {
        moduleVarName = `module ${sourceInfo.name}`;
      }
    }

    if (!moduleVarName) {
      // Fallback: try to figure out from definition string
      console.warn(
        `Cannot determine module for import-bridged variable: ${v._name}`
      );
      return [];
    }

    return [
      `  main.define("${v._name}", ["${moduleVarName}", "@variable"], (_, v) => v.import(${
        importedName && importedName !== v._name
          ? `"${importedName}", `
          : ""
      }"${v._name}", _));`,
    ];
  }

  // Regular variable (simple, viewof *, mutable *, initial *, anonymous)
  const deps = JSON.stringify(v._inputs.map((i) => i._name));
  const name_literal = v._name ? `"${v._name}"` : "null";
  return [`  $def("${pid(v)}", ${name_literal}, ${deps}, ${pid(v)});`];
}

// ============================================================
// Module Source Generator
// ============================================================

function generateDefinitions(variables) {
  return variables.map((v) => variableToDefinition(v)).join("");
}

async function generateDefine(
  spec,
  variables,
  fileAttachments,
  { moduleNames } = {}
) {
  const fileAttachmentExpression = fileAttachments?.size
    ? `  const fileAttachments = new Map(${JSON.stringify([
        ...fileAttachments.keys(),
      ])}.map((name) => {
    const module_name = "${spec.name}";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));\n`
    : "";

  const defines = (
    await Promise.all(
      variables.map((v) => variableToDefine(v, { moduleNames }))
    )
  )
    .flat()
    .join("  \n");

  return `export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
${fileAttachmentExpression}${defines}
  return main;
}`;
}

async function generateModuleSource(
  spec,
  variables,
  fileAttachments,
  { moduleNames } = {}
) {
  return `\n${generateDefinitions(variables)}\n${await generateDefine(
    spec,
    variables,
    fileAttachments,
    { moduleNames }
  )}`;
}

// ============================================================
// Module Specs Builder (replaces module_specs cell)
// ============================================================

/**
 * Build the module specs for export — the main pipeline function.
 *
 * @param {object} params
 * @param {Runtime} params.runtime - The Observable runtime
 * @param {Map} params.mains - Map of name → module for main modules
 * @param {Function} params.getFileAttachments - Function to extract file attachments
 * @param {object} [params.options] - Export options
 * @returns {Map<string, object>} Module name → spec
 */
async function buildModuleSpecs({
  runtime,
  mains,
  getFileAttachments,
  options = {},
}) {
  // 1. Build module names
  const moduleNames = buildModuleNames(runtime, {
    cache: [...mains.entries()].map(([name, module]) => [
      module,
      { name, module },
    ]),
  });

  // 2. Group variables by module
  const byModule = new Map();
  for (const v of runtime._variables) {
    if (v._type !== 1) continue; // Only user-defined variables
    if (isDynamicVar(v)) continue;
    let arr = byModule.get(v._module);
    if (!arr) byModule.set(v._module, (arr = []));
    arr.push(v);
  }

  // 3. Determine included/excluded modules
  const excludedNames = new Set(["builtin", "main", "TBD", "error"]);

  // 4. Build specs for each included module
  const specs = new Map();
  for (const [module, variables] of byModule) {
    const info = moduleNames.get(module);
    if (!info) continue;
    if (excludedNames.has(info.name)) continue;

    const fileAttachments = getFileAttachments?.(module) || new Map();

    // Detect imports from "module X" variables
    const imports = variables
      .filter((v) => isModuleVar(v))
      .map((v) => v._name.slice(7))
      .filter((m) => !excludedNames.has(m));

    const source = await generateModuleSource(info, variables, fileAttachments, {
      moduleNames,
    });

    specs.set(info.name, {
      url: info.name,
      imports,
      fileAttachments,
      source,
      variables,
      module,
    });
  }

  return specs;
}

// ============================================================
// Exports
// ============================================================

export {
  buildModuleNames,
  buildModuleSpecs,
  generateModuleSource,
  generateDefinitions,
  generateDefine,
  variableToDefinition,
  variableToDefine,
  isModuleVar,
  isDynamicVar,
  isLiveImport,
  isImportBridged,
  getImportSource,
  findImportedName,
  contentHash,
  pid,
};
