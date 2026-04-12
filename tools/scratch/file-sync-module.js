
const _title = function _title(md){return(
md`# File Sync

Two-way sync between the Observable runtime and module \`.js\` files on disk.`
)};
const _doc_overview = function _doc_overview(md){return(
md`## Overview

File Sync provides **bidirectional, live synchronization** between the Observable runtime and a directory of \`.js\` module files on disk. This enables agents (Claude Code, etc.) and external editors to modify notebook code using standard file-editing tools while seeing changes reflected in the browser in real time.

**What gets synced:**
- Each module in the runtime becomes a \`.js\` file containing its cell definitions
- File attachments are synced as binary files alongside their module (e.g. images, gzipped JS, CSV)
- Changes flow both ways: edit on disk and the runtime updates within 1 second; edit in the browser and the disk file updates within 200ms
- File attachment changes on disk are detected and hot-swapped into the runtime\\'s \`FileAttachment\` map

**What does NOT get synced:**
- The \`bootloader\` and \`builtin\` modules (infrastructure, not user code)
- Import bridges and implicit variables (managed by the runtime, not by module source)`
)};
const _doc_files = function _doc_files(md){return(
md`## File Structure

\`\`\`
sync-dir/
\u251c\u2500\u2500 tomlarkworthy.lopecode.dev/    # notebook identified by domain
\u2502   \u251c\u2500\u2500 bootconf.json               # notebook boot configuration
\u2502   \u251c\u2500\u2500 @tomlarkworthy/
\u2502   \u2502   \u251c\u2500\u2500 my-notebook.js          # module source (cells + define function)
\u2502   \u2502   \u251c\u2500\u2500 my-notebook/             # file attachments (if any)
\u2502   \u2502   \u2502   \u251c\u2500\u2500 image.png
\u2502   \u2502   \u2502   \u2514\u2500\u2500 data.csv
\u2502   \u2502   \u251c\u2500\u2500 runtime-sdk.js
\u2502   \u2502   \u2514\u2500\u2500 editor-5.js
\u2502   \u2514\u2500\u2500 @observablehq/
\u2502       \u2514\u2500\u2500 ...
\u2514\u2500\u2500 other-notebook.lopecode.dev/    # another notebook, isolated
    \u251c\u2500\u2500 bootconf.json
    \u2514\u2500\u2500 ...
\`\`\`

Each notebook gets its own subdirectory named by \`location.hostname\` (the domain the notebook is served from). Modules and file attachments live inside, preventing cross-notebook contamination. Each \`.js\` file is a standard ES module with an \`export default function define(runtime, observer)\` entry point. Cells are named functions with persistent ID hashes (pids) that survive renames and reordering.`
)};
const _notebookId = function _notebookId(){return(
location.hostname || location.pathname.split("/").pop().replace(/\.html$/, "")
)};
const _directory = function _directory(htl, hashParam)
{
  const label = hashParam ? "Pick directory for: " + hashParam : "Pick sync directory";
  const container = htl.html`<div><button style="padding: 8px 16px; font-size: 14px; cursor: pointer;">${label}</button></div>`;
  const btn = container.querySelector("button");
  container.value = null;
  btn.onclick = async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      container.value = handle;
      btn.textContent = "\u25CF Syncing: " + handle.name;
      btn.style.background = "#d4edda";
      // Write &filesync=<name> into the URL hash if not already present
      if (!hashParam) {
        const param = "filesync=" + encodeURIComponent(handle.name);
        const h = location.hash;
        history.replaceState(null, "", h ? h + "&" + param : "#" + param);
      }
      container.dispatchEvent(new window.Event("input", { bubbles: true }));
    } catch (e) {
      if (e.name !== "AbortError") throw e;
    }
  };
  return container;
};
const _1qhn011 = (G, v) => G.input(v);
const _disassemble = function _disassemble(directory, notebookId, syncableModules, exportModuleJS, writeFile, htl)
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

  const prefix = notebookId + "/";

  btn.onclick = async () => {
    if (!directory) return;
    btn.disabled = true;
    btn.textContent = "Disassembling...";
    let ok = 0, fail = 0;

    for (const moduleId of syncableModules) {
      try {
        log("Exporting " + moduleId + "...");
        const result = await exportModuleJS(moduleId);
        const source = result.source;
        const fileAttachments = result.fileAttachments;
        const path = prefix + moduleId + ".js";
        await writeFile(directory, path, source);
        log("  wrote " + path + " (" + source.length + " bytes)");

        if (fileAttachments && fileAttachments.size) {
          for (const [name, entry] of fileAttachments) {
            try {
              const resp = await fetch(entry.url);
              const bytes = await resp.arrayBuffer();
              await writeFile(directory, prefix + moduleId + "/" + name, new Uint8Array(bytes));
              log("  attachment: " + moduleId + "/" + name + " (" + bytes.byteLength + " bytes)");
            } catch (e) {
              log("  attachment FAILED: " + name + " - " + e.message);
            }
          }
        }

        ok++;
      } catch (e) {
        log("  FAILED: " + moduleId + " - " + e.message);
        fail++;
      }
    }

    try {
      const bootconf = document.querySelector('script[id="bootconf.json"]');
      if (bootconf) {
        await writeFile(directory, prefix + "bootconf.json", bootconf.textContent.trim());
        log("wrote " + prefix + "bootconf.json");
      }
    } catch (e) {
      log("bootconf.json FAILED: " + e.message);
    }

    log("\nDone: " + ok + " modules exported, " + fail + " failed");
    btn.textContent = "Disassembled " + ok + " modules";
    btn.disabled = false;
  };

  container.value = undefined;
  return container;
};
const _yggqvy = (G, v) => G.input(v);
const _1rp7dcr = function _hashParam(){return(
(() => {
  const m = location.hash.match(/[#&]filesync=([^&]*)/);
  return m ? decodeURIComponent(m[1]) : null;
})()
)};
const _rllftu = function _writeFile(){return(
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
const _kfxaik = function _readFile(){return(
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
const _1wmv5ml = function _SKIP_MODULES() {return (new Set([
    'bootloader',
    'builtin'
]));};
const _zfhapq = function _syncableModules(currentModules, SKIP_MODULES){return(
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
const _4zqocm = function _probeDefine(){return(
function probeDefine(defineFn) {
  const cells = [];
  const makeVar = (observed) => ({
    define(...args) {
      // Observable define(name?, inputs?, defn) — name may be null (explicit anonymous)
      const name = (typeof args[0] === 'string' || args[0] === null) ? args.shift() : null;
      const inputs = Array.isArray(args[0]) ? args.shift() : [];
      const defn = args[0];
      const cell = { name, inputs, definition: defn, observed };
      cells.push(cell);
      return { set pid(v) { cell.pid = v; } }; // capture pid for anonymous cells
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
      const name = (typeof args[0] === 'string' || args[0] === null) ? args.shift() : null;
      const inputs = Array.isArray(args[0]) ? args.shift() : [];
      const defn = args[0];
      const cell = { name, inputs, definition: defn, observed: false };
      cells.push(cell);
      return { set pid(v) { cell.pid = v; } };
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
const _notebookToFiles = function _notebookToFiles(directory, notebookId, onCodeChange, currentModules, exportModuleJS, writeFile, invalidation)
{
  if (!directory) return "Waiting for directory...";

  // Compute syncable modules inline — avoid depending on syncableModules/SKIP_MODULES reactively,
  // which would restart this cell (cancelling pending writes) every time SKIP_MODULES changes.
  const SKIP = new Set(["bootloader", "builtin"]);
  const syncableSet = new Set();
  for (const [mod, info] of currentModules) {
    if (SKIP.has(info.name)) continue;
    if (!info.name.includes("/") && !info.name.startsWith("d/")) continue;
    syncableSet.add(info.name);
  }
  const syncableCount = syncableSet.size;

  const pendingTimers = new Map();

  // Build reverse lookup: module object → module name
  const moduleToName = new Map();
  for (const [mod, info] of currentModules) {
    moduleToName.set(info.module, info.name);
  }

  const prefix = notebookId + "/";

  const writeModule = async (moduleId) => {
    try {
      const result = await exportModuleJS(moduleId);
      await writeFile(directory, prefix + moduleId + ".js", result.source);
      console.log("[file-sync] wrote " + prefix + moduleId + ".js (" + result.source.length + " bytes)");

      // Also write file attachments
      if (result.fileAttachments && result.fileAttachments.size) {
        for (const [name, entry] of result.fileAttachments) {
          try {
            const resp = await fetch(entry.url);
            const bytes = await resp.arrayBuffer();
            await writeFile(directory, prefix + moduleId + "/" + name, new Uint8Array(bytes));
          } catch (e) {
            console.error("[file-sync] attachment write failed: " + moduleId + "/" + name, e);
          }
        }
      }
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

  return "Watching " + syncableCount + " modules for changes...";
};
const _fileSyncLastSeen = function _fileSyncLastSeen(directory){
  void directory;
  return new window.Map();
};
const _filesToNotebook = function _filesToNotebook(directory, notebookId, currentModules, fileSyncLastSeen, readFile, probeDefine, exportModuleJS, tag, getFileAttachmentsMap, runtime_, invalidation)
{
  if (!directory) return "Waiting for directory...";

  // Compute syncable modules inline — avoid depending on syncableModules/SKIP_MODULES reactively,
  // which would restart this cell every time SKIP_MODULES changes.
  const SKIP = new Set(["bootloader", "builtin"]);
  const syncableModules = [];
  for (const [mod, info] of currentModules) {
    if (SKIP.has(info.name)) continue;
    if (!info.name.includes("/") && !info.name.startsWith("d/")) continue;
    syncableModules.push(info.name);
  }
  const syncableSet = new Set(syncableModules);

  // Use stable lastSeen map that survives restarts — only resets when directory changes
  const lastSeen = fileSyncLastSeen;
  const POLL_MS = 1000;
  const prefix = notebookId + "/";

  // Build lookup: module name → module object (the Observable Module instance)
  const nameToModule = new window.Map();
  // Build lookup: module name → Map of pid key → variable
  const nameToVars = new window.Map();
  for (const [mod, info] of currentModules) {
    if (!syncableSet.has(info.name)) continue;
    nameToModule.set(info.name, info.module);
    const vars = new window.Map();
    for (const v of runtime_._variables) {
      if (v._module !== info.module) continue;
      if (v._name) vars.set(v._name, v);
      if (v.pid) vars.set("__pid__" + v.pid, v);
    }
    nameToVars.set(info.name, vars);
  }

  let pollTimer;
  // Track pids seen from .js files — only delete pids we've previously seen
  const knownFilePids = new window.Map();
  // Track modules found on disk — for detecting additions and removals
  let knownDiskModules = null; // null = first scan (no deletions)

  // FileAttachment helpers
  const getModuleFA = (mod) => {
    for (const v of runtime_._variables) {
      if (v._module === mod && v._name === "FileAttachment" && v._value) return v._value;
    }
    return null;
  };
  const getSubDir = async (dirHandle, path) => {
    let current = dirHandle;
    for (const part of path.split("/").filter(Boolean)) {
      current = await current.getDirectoryHandle(part);
    }
    return current;
  };

  const applyModule = (moduleId, defineFn) => {
    const mod = nameToModule.get(moduleId);
    if (!mod) return;
    const existingVars = nameToVars.get(moduleId) || new window.Map();

    const cells = probeDefine(defineFn);
    let redefinedSelf = false;
    const seenPids = new Set();

    for (const cell of cells) {
      if (cell.type === 'import') continue;
      if (!cell.pid) continue;

      seenPids.add(cell.pid);
      const existing = existingVars.get("__pid__" + cell.pid);

      if (!existing) {
        // CREATE new cell — always unobserved; lopepage visualizer will pick it up
        const taggedDefn = cell.definition ? tag(cell.definition, { source: "file-sync" }) : cell.definition;
        var v = mod.variable();
        v.define(cell.name, cell.inputs, taggedDefn);
        v.pid = cell.pid;
        existingVars.set("__pid__" + cell.pid, v);
        if (cell.name) existingVars.set(cell.name, v);
        console.log("[file-sync] created cell", cell.pid, cell.name || "(anonymous)");
        continue;
      }

      // UPDATE existing cell — skip if definition and inputs are unchanged
      if (existing._definition) {
        const existingInputNames = existing._inputs.map(function(v) { return typeof v === 'string' ? v : v._name; });
        const inputsMatch = JSON.stringify(existingInputNames) === JSON.stringify(cell.inputs);
        const defnMatch = existing._definition.toString() === (cell.definition ? cell.definition.toString() : "");
        if (inputsMatch && defnMatch) continue;
      }

      const taggedDefn = cell.definition ? tag(cell.definition, { source: "file-sync" }) : cell.definition;
      existing.define(cell.name, cell.inputs, taggedDefn).pid = cell.pid;

      if (moduleId === "@tomlarkworthy/file-sync" && cell.name === "filesToNotebook") {
        redefinedSelf = true;
      }
    }

    // DELETE: only remove pids that were in a PREVIOUS probeDefine but are now absent.
    // This ensures we never touch variables we didn't create (implicits, import bridges, etc.)
    const prevKnown = knownFilePids.get(moduleId);
    if (prevKnown) {
      for (const pid of prevKnown) {
        if (seenPids.has(pid)) continue;
        const v = existingVars.get("__pid__" + pid);
        if (!v) continue;
        console.log("[file-sync] deleting cell", pid, v._name || "(anonymous)");
        v.delete();
        existingVars.delete("__pid__" + pid);
        if (v._name) existingVars.delete(v._name);
      }
    }
    knownFilePids.set(moduleId, seenPids);

    if (redefinedSelf) {
      clearInterval(pollTimer);
      console.log("[file-sync] filesToNotebook redefined — stopping old poll timer");
    }
  };

  const pollModule = async (moduleId) => {
    // --- Module source (.js) ---
    try {
      let file;
      try {
        file = await readFile(directory, prefix + moduleId + ".js");
      } catch (e) {
        // .js file doesn't exist on disk — skip source sync
        file = null;
      }

      if (file) {
        const prev = lastSeen.get(moduleId);
        const changed = !prev || file.lastModified !== prev.lastModified;
        if (changed) {
          lastSeen.set(moduleId, { lastModified: file.lastModified });

          const diskText = await file.text();
          let needsApply = true;
          try {
            const runtimeResult = await exportModuleJS(moduleId);
            if (runtimeResult.source === diskText) needsApply = false;
          } catch (e) {}

          if (needsApply) {
            const blob = new window.Blob([diskText], { type: "text/javascript" });
            const url = window.URL.createObjectURL(blob);
            try {
              const mod = await importShim(url, 'file://@tomlarkworthy/file-sync');
              if (typeof mod.default === "function") {
                applyModule(moduleId, mod.default);
                console.log("[file-sync] applied " + moduleId + " from disk");
              }
            } finally {
              window.URL.revokeObjectURL(url);
            }
          }
        }
      }
    } catch (e) {
      console.error("[file-sync] poll error for " + moduleId + ":", e);
    }

    // --- File attachments ---
    try {
      const attachDir = await getSubDir(directory, prefix + moduleId);
      const mod = nameToModule.get(moduleId);
      const FA = mod ? getModuleFA(mod) : null;
      const faMap = FA ? getFileAttachmentsMap(FA) : null;

      for await (const [name, handle] of attachDir) {
        if (handle.kind !== "file") continue;
        const file = await handle.getFile();
        const attKey = "__att__" + moduleId + "/" + name;
        const prevA = lastSeen.get(attKey);
        if (prevA && file.lastModified === prevA.lastModified) continue;
        lastSeen.set(attKey, { lastModified: file.lastModified });

        // Read file and create blob URL
        const bytes = new Uint8Array(await file.arrayBuffer());
        const blob = new window.Blob([bytes], { type: file.type || "application/octet-stream" });
        const blobUrl = window.URL.createObjectURL(blob);

        // Update runtime FileAttachment map
        if (faMap) {
          faMap.set(name, { url: blobUrl, mimeType: file.type || "application/octet-stream" });
          console.log("[file-sync] updated attachment " + moduleId + "/" + name);
        }

        // Update DOM script tag so re-exports pick up the change
        const scriptId = moduleId + "/" + encodeURIComponent(name);
        const script = document.getElementById(scriptId);
        if (script) {
          const b64 = btoa(String.fromCharCode.apply(null, bytes));
          script.textContent = b64;
          script.setAttribute("data-encoding", "base64");
          script.setAttribute("data-mime", file.type || "application/octet-stream");
        }
      }
    } catch (e) {
      if (e.name !== "NotFoundError") {
        console.error("[file-sync] attachment scan error for " + moduleId + ":", e);
      }
    }
  };

  // Scan the notebook directory for all .js module files
  const scanDiskModules = async () => {
    const diskModules = new Set();
    try {
      const notebookDir = await getSubDir(directory, prefix.slice(0, -1));
      for await (const [orgName, orgHandle] of notebookDir) {
        if (orgHandle.kind !== "directory") continue;
        if (orgName.startsWith("@")) {
          // Scoped modules: @org/name
          for await (const [fname, fhandle] of orgHandle) {
            if (fhandle.kind === "file" && fname.endsWith(".js")) {
              diskModules.add(orgName + "/" + fname.slice(0, -3));
            }
          }
        } else if (orgName === "d") {
          // Observable hash modules: d/hash@version
          for await (const [fname, fhandle] of orgHandle) {
            if (fhandle.kind === "file" && fname.endsWith(".js")) {
              diskModules.add("d/" + fname.slice(0, -3));
            }
          }
        }
      }
    } catch (e) {
      // Directory doesn't exist yet — no modules on disk
    }
    return diskModules;
  };

  const poll = async () => {
    // Poll existing syncable modules
    for (const moduleId of syncableModules) {
      await pollModule(moduleId);
    }

    // Scan disk for new/removed modules
    const diskModules = await scanDiskModules();

    // ADD: new modules on disk not in the runtime
    const newOnDisk = [...diskModules].filter(m => !syncableSet.has(m) && !nameToModule.has(m));
    if (newOnDisk.length) console.log("[file-sync] new modules on disk:", newOnDisk);
    for (const moduleId of diskModules) {
      if (syncableSet.has(moduleId)) continue; // already known
      if (nameToModule.has(moduleId)) continue; // already added by a previous scan

      try {
        const file = await readFile(directory, prefix + moduleId + ".js");
        const diskText = await file.text();
        const blob = new window.Blob([diskText], { type: "text/javascript" });
        const url = window.URL.createObjectURL(blob);
        try {
          const imported = await importShim(url, 'file://@tomlarkworthy/file-sync');
          if (typeof imported.default === "function") {
            // Create a new runtime module — unobserved (lopepage visualizer discovers it)
            const newMod = runtime_.module(imported.default, () => null);
            runtime_.mains.set(moduleId, newMod);
            nameToModule.set(moduleId, newMod);
            syncableModules.push(moduleId);
            syncableSet.add(moduleId);

            // Index its variables for future pid tracking
            const vars = new window.Map();
            for (const v of runtime_._variables) {
              if (v._module !== newMod) continue;
              if (v._name) vars.set(v._name, v);
              if (v.pid) vars.set("__pid__" + v.pid, v);
            }
            nameToVars.set(moduleId, vars);

            console.log("[file-sync] added new module from disk: " + moduleId);
          }
        } finally {
          window.URL.revokeObjectURL(url);
        }
      } catch (e) {
        console.error("[file-sync] failed to add module " + moduleId + ":", e);
      }
    }

    // REMOVE: modules previously on disk but now gone
    if (knownDiskModules) {
      for (const moduleId of knownDiskModules) {
        if (diskModules.has(moduleId)) continue;
        if (!nameToModule.has(moduleId)) continue;

        const mod = nameToModule.get(moduleId);
        // Delete all variables in this module
        for (const v of [...runtime_._variables]) {
          if (v._module === mod) {
            v.delete();
          }
        }
        runtime_.mains.delete(moduleId);
        nameToModule.delete(moduleId);
        nameToVars.delete(moduleId);
        knownFilePids.delete(moduleId);
        const idx = syncableModules.indexOf(moduleId);
        if (idx !== -1) syncableModules.splice(idx, 1);
        syncableSet.delete(moduleId);
        console.log("[file-sync] removed module: " + moduleId);
      }
    }
    knownDiskModules = diskModules;
  };

  pollTimer = setInterval(poll, POLL_MS);
  poll();

  invalidation.then(() => clearInterval(pollTimer));

  return "Polling " + syncableModules.length + " modules every " + POLL_MS + "ms...";
};
const _syncStatus = function _syncStatus(directory, syncableModules, notebookToFiles, filesToNotebook, htl){return(
htl.html`<div style="font-family:monospace; font-size:12px; padding:8px 12px; background:#f8f8f8; border:1px solid #ddd; border-radius:4px; line-height:1.8;">
  <div><strong>Directory:</strong> ${directory ? directory.name : "\u2014 (not set)"}</div>
  <div><strong>Modules:</strong> ${syncableModules.length} syncable</div>
  <div><strong>Notebook\u2192Files:</strong> ${notebookToFiles}</div>
  <div><strong>Files\u2192Notebook:</strong> ${filesToNotebook}</div>
</div>`
)};
const _doc_technical = function _doc_technical(md){return(
md`## How It Works

### Disassemble (one-shot export)
Iterates all syncable modules via \`moduleMap\`, calls \`exportModuleJS(moduleId)\` from exporter-3 to serialize each module to a \`.js\` file, and writes file attachments as decoded binary files.

### Runtime \u2192 Files (live)
Subscribes to \`onCodeChange\` from runtime-sdk. When a cell definition changes:
1. Checks \`__provenance.source\` on the definition \u2014 skips if \`"file-sync"\` (echo suppression)
2. Identifies the module via a reverse lookup (\`variable._module\` \u2192 module name)
3. Debounces 200ms per module, then calls \`exportModuleJS\` and writes the \`.js\` file and any file attachments

### Files \u2192 Runtime (live)
Polls the sync directory every 1 second:
1. **Fast path**: compares \`file.lastModified\` against \`fileSyncLastSeen\` map \u2014 skips unchanged files
2. **Delta check**: reads file text and compares against \`exportModuleJS\` output \u2014 skips if identical
3. **Apply**: dynamic-imports the \`.js\` file via blob URL, runs \`probeDefine\` to extract cells, then:
   - **Update**: matches cells to runtime variables by persistent ID (pid), redefines if changed
   - **Create**: new pids get \`mod.variable().define()\` \u2014 lopepage visualizer auto-discovers them
   - **Delete**: pids previously seen but now absent get \`variable.delete()\`
4. Tags all applied definitions with \`{source: "file-sync"}\` via \`tag()\` for echo suppression
5. **Attachments**: independently scans each module\\'s attachment subdirectory for changed files, creates new blob URLs, updates the runtime \`FileAttachment\` map via \`getFileAttachmentsMap\` (imported from \`@tomlarkworthy/fileattachments\`), and patches the DOM \`<script>\` tags so notebook re-exports persist the changes

### File Attachments
Each module can have a subdirectory of the same name containing binary file attachments (images, gzipped JS libraries, data files). These are synced bidirectionally:
- **Runtime\\u2192Files**: when \`writeModule\` fires, \`exportModuleJS\` returns a \`fileAttachments\` map; each entry is fetched and written to disk
- **Files\\u2192Runtime**: the poller scans the attachment subdirectory for each module, detects changed files via \`lastModified\`, reads them into blob URLs, and hot-swaps entries in the module\\'s \`FileAttachment\` resolver map

### Module Add/Remove
After polling existing modules, the poller scans the notebook directory for all \`.js\` files. New modules (not in the runtime) are loaded via \`runtime.module(defineFn, () => null)\` and registered in \`runtime.mains\`. Removed modules (previously on disk but now deleted) have all their variables deleted and are unregistered from \`runtime.mains\`. The first scan only records — no deletions — matching the \`knownFilePids\` safety pattern.

### Echo Suppression
Prevents feedback loops between the two sync directions. When file-sync applies a change from disk, it tags the definition with \`__provenance: {source: "file-sync"}\`. The runtime\u2192files listener checks this tag and skips changes it caused.

### Persistent IDs (pids)
Each cell has a content-hash-based pid (e.g. \`_4ie7s1\`) that survives renames and reordering. All matching is pid-first. Cells without pids (import bridges, builtins) are never managed by file-sync.

### Restart Tolerance
\`fileSyncLastSeen\` is a separate cell that only depends on \`directory\`. When \`filesToNotebook\` restarts due to reactive dependency changes, the lastSeen map persists, preventing the poller from re-applying stale disk content.`
)};
const _doc_todo = function _doc_todo(md){return(
md`## TODO

- **Notebook re-export handling**: detect when the notebook HTML is re-exported and reconcile
- **Import cell validation**: verify import bridges survive round-trip correctly
- **Conflict resolution**: when both disk and runtime edit the same cell simultaneously, detect and surface the conflict instead of last-write-wins`
)};
const _bzxfni = (G, v) => G.input(v);

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_title", null, ["md"], _title);
  $def("_directory", "viewof directory", ["htl","hashParam"], _directory);
  $def("_1qhn011", "directory", ["Generators","viewof directory"], _1qhn011);
  $def("_disassemble", "viewof disassemble", ["directory","notebookId","syncableModules","exportModuleJS","writeFile","htl"], _disassemble);
  $def("_yggqvy", "disassemble", ["Generators","viewof disassemble"], _yggqvy);
  $def("_syncStatus", "syncStatus", ["directory","syncableModules","notebookToFiles","filesToNotebook","htl"], _syncStatus);
  $def("_doc_overview", null, ["md"], _doc_overview);
  $def("_doc_files", null, ["md"], _doc_files);
  $def("_notebookId", "notebookId", [], _notebookId);
  $def("_1rp7dcr", "hashParam", [], _1rp7dcr);
  $def("_rllftu", "writeFile", [], _rllftu);
  $def("_kfxaik", "readFile", [], _kfxaik);
  $def("_1wmv5ml", "SKIP_MODULES", [], _1wmv5ml);
  $def("_zfhapq", "syncableModules", ["currentModules","SKIP_MODULES"], _zfhapq);
  $def("_4zqocm", "probeDefine", [], _4zqocm);
  $def("_notebookToFiles", "notebookToFiles", ["directory","notebookId","onCodeChange","currentModules","exportModuleJS","writeFile","invalidation"], _notebookToFiles);
  $def("_fileSyncLastSeen", "fileSyncLastSeen", ["directory"], _fileSyncLastSeen);
  $def("_filesToNotebook", "filesToNotebook", ["directory","notebookId","currentModules","fileSyncLastSeen","readFile","probeDefine","exportModuleJS","tag","getFileAttachmentsMap","runtime","invalidation"], _filesToNotebook);
  $def("_doc_technical", null, ["md"], _doc_technical);
  $def("_doc_todo", null, ["md"], _doc_todo);
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));  
  main.define("viewof currentModules", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("viewof currentModules", _));  
  $def("_bzxfni", "currentModules", ["Generators","viewof currentModules"], _bzxfni);  
  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));  
  main.define("exportModuleJS", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("exportModuleJS", _));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("onCodeChange", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("onCodeChange", _));
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("module @tomlarkworthy/local-change-history", async () => runtime.module((await import("/@tomlarkworthy/local-change-history.js?v=4")).default));
  main.define("tag", ["module @tomlarkworthy/local-change-history", "@variable"], (_, v) => v.import("tag", _));
  main.define("module @tomlarkworthy/fileattachments", async () => runtime.module((await import("/@tomlarkworthy/fileattachments.js?v=4")).default));
  main.define("getFileAttachmentsMap", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("getFileAttachmentsMap", _));
  return main;
}