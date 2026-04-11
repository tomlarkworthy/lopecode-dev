
const _title = function _title(md){return(
md`# File Sync

Two-way sync between this notebook and module \`.js\` files on disk.`
)};

const _writeFile = function _writeFile(){return(
async (dirHandle, path, content) => {
  const parts = path.split("/");
  let current = dirHandle;
  for (const dir of parts.slice(0, -1)) {
    current = await current.getDirectoryHandle(dir, { create: true });
  }
  const fileHandle = await current.getFileHandle(parts[parts.length - 1], { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}
)};

const _SKIP_MODULES = function _SKIP_MODULES(){return(
new Set(["bootloader", "builtin", "@tomlarkworthy/file-sync"])
)};

const _currentModules = async function _currentModules(moduleMap)
{
  return await moduleMap();
};

const _syncableModules = function _syncableModules(currentModules, SKIP_MODULES){return(
(() => {
  const result = [];
  for (const [mod, info] of currentModules) {
    if (SKIP_MODULES.has(info.name)) continue;
    if (!info.name.includes("/") && !info.name.startsWith("d/")) continue;
    result.push(info.name);
  }
  return result;
})()
)};

const _directory = function _directory(htl)
{
  const container = htl.html`<div><button style="padding: 8px 16px; font-size: 14px; cursor: pointer;">Pick sync directory</button></div>`;
  const btn = container.querySelector("button");
  container.value = null;
  btn.onclick = async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      container.value = handle;
      btn.textContent = "Syncing to: " + handle.name;
      container.dispatchEvent(new window.Event("input", { bubbles: true }));
    } catch (e) {
      if (e.name !== "AbortError") throw e;
    }
  };
  return container;
};

const _disassemble = function _disassemble(directory, syncableModules, exportModuleJS, writeFile, htl)
{
  const container = htl.html`<div>
    <button style="padding: 8px 16px; font-size: 14px; cursor: pointer;" disabled>Disassemble to disk</button>
    <pre style="font-size: 12px; max-height: 300px; overflow-y: auto; margin-top: 8px;"></pre>
  </div>`;
  const btn = container.querySelector("button");
  const status = container.querySelector("pre");
  if (directory) btn.disabled = false;

  const log = (msg) => {
    status.textContent += msg + "\n";
    status.scrollTop = status.scrollHeight;
  };

  btn.onclick = async () => {
    if (!directory) return;
    btn.disabled = true;
    btn.textContent = "Disassembling...";
    const syncState = {};
    let ok = 0, fail = 0;

    for (const moduleId of syncableModules) {
      try {
        log("Exporting " + moduleId + "...");
        const result = await exportModuleJS(moduleId);
        const source = result.source;
        const fileAttachments = result.fileAttachments;
        const path = moduleId + ".js";
        await writeFile(directory, path, source);
        log("  wrote " + path + " (" + source.length + " bytes)");

        if (fileAttachments && fileAttachments.size) {
          for (const [name, entry] of fileAttachments) {
            try {
              const resp = await fetch(entry.url);
              const bytes = await resp.arrayBuffer();
              await writeFile(directory, moduleId + "/" + name, new Uint8Array(bytes));
              log("  attachment: " + moduleId + "/" + name + " (" + bytes.byteLength + " bytes)");
            } catch (e) {
              log("  attachment FAILED: " + name + " - " + e.message);
            }
          }
        }

        syncState[moduleId] = { hash: null, lastModified: Date.now() };
        ok++;
      } catch (e) {
        log("  FAILED: " + moduleId + " - " + e.message);
        fail++;
      }
    }

    try {
      const bootconf = document.querySelector('script[id="bootconf.json"]');
      if (bootconf) {
        await writeFile(directory, "bootconf.json", bootconf.textContent.trim());
        log("wrote bootconf.json");
      }
    } catch (e) {
      log("bootconf.json FAILED: " + e.message);
    }

    await writeFile(directory, ".file-sync.json", JSON.stringify(syncState, null, 2));
    log("wrote .file-sync.json");

    log("\nDone: " + ok + " modules exported, " + fail + " failed");
    btn.textContent = "Disassembled " + ok + " modules";
    btn.disabled = false;
  };

  container.value = undefined;
  return container;
};

const _readFile = function _readFile(){return(
async (dirHandle, path) => {
  const parts = path.split("/");
  let current = dirHandle;
  for (const dir of parts.slice(0, -1)) {
    current = await current.getDirectoryHandle(dir);
  }
  const fileHandle = await current.getFileHandle(parts[parts.length - 1]);
  const file = await fileHandle.getFile();
  return file;
}
)};

const _probeDefine = function _probeDefine(){return(
function probeDefine(defineFn) {
  const cells = [];
  const makeVar = (observed) => ({
    define(...args) {
      const name = typeof args[0] === 'string' ? args.shift() : null;
      const inputs = Array.isArray(args[0]) ? args.shift() : [];
      const defn = args[0];
      cells.push({ name, inputs, definition: defn, observed });
      return { set pid(v) {} };
    },
    import(remote, alias, from) {
      cells.push({ type: 'import', remote, alias, from });
      return this;
    }
  });
  const fakeModule = {
    variable(observer) { return makeVar(!!observer); },
    // main.define(...) calls bypass variable() — handle them too
    define(...args) {
      const name = typeof args[0] === 'string' ? args.shift() : null;
      const inputs = Array.isArray(args[0]) ? args.shift() : [];
      const defn = args[0];
      cells.push({ name, inputs, definition: defn, observed: false });
      return { set pid(v) {} };
    }
  };
  const fakeRuntime = {
    module() { return fakeModule; },
    fileAttachments(fn) { return fn; }
  };
  defineFn(fakeRuntime, (name) => name ? {} : null);
  return cells;
}
)};

const _filesToNotebook = function _filesToNotebook(directory, currentModules, syncableModules, readFile, probeDefine, exportModuleJS, tag, SKIP_MODULES, invalidation)
{
  if (!directory) return "Waiting for directory...";

  const syncableSet = new Set(syncableModules);
  const lastSeen = new window.Map(); // moduleId → { lastModified }
  const POLL_MS = 1000;

  // Build lookup: module name → module object (the Observable Module instance)
  const nameToModule = new window.Map();
  // Build lookup: module name → Map of variable name → variable
  const nameToVars = new window.Map();
  for (const [mod, info] of currentModules) {
    if (!syncableSet.has(info.name)) continue;
    nameToModule.set(info.name, info.module);
    const vars = new window.Map();
    const rt = info.module._runtime;
    for (const v of rt._variables) {
      if (v._module === info.module && v._name) {
        vars.set(v._name, v);
      }
    }
    nameToVars.set(info.name, vars);
  }

  const applyModule = (moduleId, defineFn) => {
    const mod = nameToModule.get(moduleId);
    if (!mod) return;
    const existingVars = nameToVars.get(moduleId) || new window.Map();

    const cells = probeDefine(defineFn);

    for (const cell of cells) {
      if (cell.type === 'import') continue;
      if (!cell.name) continue;
      if (cell.name.startsWith("module ")) continue;

      const existing = existingVars.get(cell.name);
      const taggedDefn = cell.definition ? tag(cell.definition, { source: "file-sync" }) : cell.definition;

      if (existing) {
        existing.define(cell.name, cell.inputs, taggedDefn);
      } else {
        const v = mod.variable().define(cell.name, cell.inputs, taggedDefn);
        existingVars.set(cell.name, v);
      }
    }
  };

  const poll = async () => {
    for (const moduleId of syncableModules) {
      try {
        let file;
        try {
          file = await readFile(directory, moduleId + ".js");
        } catch (e) {
          continue;
        }

        const prev = lastSeen.get(moduleId);
        if (prev && file.lastModified === prev.lastModified) continue; // fast path
        lastSeen.set(moduleId, { lastModified: file.lastModified });

        // Compare file content against live runtime export
        const diskText = await file.text();
        try {
          const runtimeResult = await exportModuleJS(moduleId);
          if (runtimeResult.source === diskText) continue; // no delta
        } catch (e) {
          // export failed — still try to apply
        }

        // Parse and apply the changed module
        const blob = new window.Blob([diskText], { type: "text/javascript" });
        const url = window.URL.createObjectURL(blob);
        try {
          const mod = await import(url);
          if (typeof mod.default === "function") {
            applyModule(moduleId, mod.default);
            console.log("[file-sync] applied " + moduleId + " from disk");
          }
        } finally {
          window.URL.revokeObjectURL(url);
        }
      } catch (e) {
        console.error("[file-sync] poll error for " + moduleId + ":", e);
      }
    }
  };

  const timer = setInterval(poll, POLL_MS);
  poll();

  invalidation.then(() => clearInterval(timer));

  return "Polling " + syncableModules.length + " modules every " + POLL_MS + "ms...";
};

const _notebookToFiles = function _notebookToFiles(directory, onCodeChange, currentModules, syncableModules, exportModuleJS, writeFile, SKIP_MODULES, invalidation)
{
  if (!directory) return "Waiting for directory...";

  const syncableSet = new Set(syncableModules);
  const pendingTimers = new Map();

  // Build reverse lookup: module object → module name
  const moduleToName = new Map();
  for (const [mod, info] of currentModules) {
    moduleToName.set(info.module, info.name);
  }

  const writeModule = async (moduleId) => {
    try {
      const result = await exportModuleJS(moduleId);
      await writeFile(directory, moduleId + ".js", result.source);
      console.log("[file-sync] wrote " + moduleId + ".js (" + result.source.length + " bytes)");
    } catch (e) {
      console.error("[file-sync] write failed: " + moduleId, e);
    }
  };

  const unsub = onCodeChange(({variable, previous, t}) => {
    // Echo suppression: skip changes we caused
    const prov = variable._definition && variable._definition.__provenance;
    if (prov && prov.source === "file-sync") return;

    // Find which module this variable belongs to
    const moduleName = moduleToName.get(variable._module);
    if (!moduleName || !syncableSet.has(moduleName)) return;

    // Debounce 200ms per module
    if (pendingTimers.has(moduleName)) {
      clearTimeout(pendingTimers.get(moduleName));
    }
    pendingTimers.set(moduleName, setTimeout(() => {
      pendingTimers.delete(moduleName);
      writeModule(moduleName);
    }, 200));
  });

  invalidation.then(() => {
    unsub();
    for (const timer of pendingTimers.values()) clearTimeout(timer);
    pendingTimers.clear();
  });

  return "Watching " + syncableModules.length + " modules for changes...";
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  // Visual cells
  $def("_title", null, ["md"], _title);
  $def("_directory", "viewof directory", ["htl"], _directory);
  main.variable().define("directory", ["Generators", "viewof directory"], (G, v) => G.input(v));
  $def("_disassemble", "viewof disassemble", ["directory", "syncableModules", "exportModuleJS", "writeFile", "htl"], _disassemble);
  main.variable().define("disassemble", ["Generators", "viewof disassemble"], (G, v) => G.input(v));

  // Hidden cells
  main.variable().define("writeFile", [], _writeFile);
  main.variable().define("readFile", [], _readFile);
  main.variable().define("SKIP_MODULES", [], _SKIP_MODULES);
  main.variable().define("currentModules", ["moduleMap"], _currentModules);
  main.variable().define("syncableModules", ["currentModules", "SKIP_MODULES"], _syncableModules);
  main.variable().define("probeDefine", [], _probeDefine);

  // Live sync: notebook → files
  $def("_notebookToFiles", "notebookToFiles", ["directory", "onCodeChange", "currentModules", "syncableModules", "exportModuleJS", "writeFile", "SKIP_MODULES", "invalidation"], _notebookToFiles);

  // Live sync: files → notebook
  $def("_filesToNotebook", "filesToNotebook", ["directory", "currentModules", "syncableModules", "readFile", "probeDefine", "exportModuleJS", "tag", "SKIP_MODULES", "invalidation"], _filesToNotebook);

  // Imports
  main.define("module @tomlarkworthy/module-map", async () =>
    runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));
  main.define("moduleMap", ["module @tomlarkworthy/module-map", "@variable"],
    (_, v) => v.import("moduleMap", _));

  main.define("module @tomlarkworthy/exporter-3", async () =>
    runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));
  main.define("exportModuleJS", ["module @tomlarkworthy/exporter-3", "@variable"],
    (_, v) => v.import("exportModuleJS", _));

  main.define("module @tomlarkworthy/runtime-sdk", async () =>
    runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("onCodeChange", ["module @tomlarkworthy/runtime-sdk", "@variable"],
    (_, v) => v.import("onCodeChange", _));

  main.define("module @tomlarkworthy/local-change-history", async () =>
    runtime.module((await import("/@tomlarkworthy/local-change-history.js?v=4")).default));
  main.define("tag", ["module @tomlarkworthy/local-change-history", "@variable"],
    (_, v) => v.import("tag", _));

  return main;
}
