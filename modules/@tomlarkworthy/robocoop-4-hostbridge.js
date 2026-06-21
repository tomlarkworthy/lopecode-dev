// @tomlarkworthy/robocoop-4-hostbridge — OPTIONAL host self-editing tools.
//
// Registers two tools into the live registry so the agent can read and edit the RUNNING notebook's
// own modules (projected into /notebook/<moduleId>.js):
//   host_sync  — project the live runtime's modules into the project fs (run before reading/editing).
//   host_apply — apply edits made to /notebook/<id>.js back into the live runtime.
// The bridge takes the agent's workspace fs (rc4_workspace, from -engine) and the live runtime
// (from @tomlarkworthy/runtime-sdk) by injection — no window/globalThis. A notebook that wants
// robocoop-4 WITHOUT self-editing simply omits this module.
//
// createHostBridge is browser-only (it pokes the live Observable runtime) — node CI skips it; only
// its pure parseModuleFile is unit-testable off-runtime. Imports defineTool from -core.

const _doc_createHostBridge = function _doc_createHostBridge(md){return(
md`### \`createHostBridge({fs, getRuntime})\`  *(browser-only)*
Bidirectional bridge between the LIVE host notebook and the agent's fs. **observe** \`syncHost()\`:
project each module's cells to \`/notebook/<id>.js\` as readable, pid-tagged source. **manipulate**
\`applyModule(id, text)\`: parse an edited file and create/update variables in the live runtime
(adapted from justbash-filesync jbApply). Structural both ways; rebuilds fns via \`eval\`. The runtime
is injected via \`getRuntime\` (from runtime-sdk here), so it is exercised only in the browser, not node CI.`
)};
const _createHostBridge = function _createHostBridge(){
  const VENDOR = /golden-layout|codemirror|acorn|escodegen|jszip|lightning-fs|isomorphic-git|jest-expect|inspector|observable-runtime|observablehq-lezer|spectral-layout|module-map/;
  const CELL = '// ⟦cell⟧ ';

  function defaultGetRuntime() {
    const reg = globalThis.__ojs_runtime;
    if (reg && reg.mains) for (const m of reg.mains.values()) if (m && m._runtime && m._runtime._variables) return m._runtime;
    return null;
  }

  const inputName = (i) => (typeof i === 'string' ? i : i && i._name) || '';
  const isStructural = (name, inputs) => !name || name.startsWith('module ') || name === '@variable' || (inputs || []).includes('@variable');

  return function createHostBridge({ fs, getRuntime = defaultGetRuntime, prefix = '/notebook/' } = {}) {
    if (!fs || typeof fs.writeFile !== 'function') throw new Error('createHostBridge requires a fs with writeFile');

    const rt = () => {
      const r = getRuntime();
      if (!r || !r._variables) throw new Error('createHostBridge: host runtime not found (window.__ojs_runtime)');
      return r;
    };
    const findVal = (n) => { for (const v of rt()._variables) if (v._name === n && v._value !== undefined) return v._value; return null; };
    const currentModules = () => findVal('currentModules');

    function moduleByName() {
      const map = new Map();
      const cur = currentModules();
      if (cur) for (const [, info] of cur) if (info && info.module && info.name && !map.has(info.name)) map.set(info.name, info.module);
      return map;
    }
    const isSkippable = (id) => !id || id === 'builtin' || id === 'bootloader' || id.startsWith('d/') || VENDOR.test(id);

    function varsOf(moduleObj) {
      const out = [];
      for (const v of rt()._variables) if (v._module === moduleObj) out.push(v);
      return out;
    }

    function serializeModule(id, moduleObj) {
      const vars = varsOf(moduleObj);
      const out = [`// ${id} — ${vars.length} variable(s), projected live from the host runtime. Edit a cell body below; pid= ties it to the live variable.\n`];
      for (const v of vars) {
        const name = v._name || '';
        let def;
        try { def = v._definition ? v._definition.toString() : ''; } catch { def = '/* (definition unavailable) */'; }
        const ro = isStructural(name, (v._inputs || []).map(inputName)) ? ' readonly=1' : '';
        out.push(`${CELL}pid=${v.pid || ''} name=${name} inputs=${(v._inputs || []).map(inputName).join(',')}${ro}\n${def}\n`);
      }
      return out.join('\n');
    }

    const snapshot = new Map();

    async function syncHost({ include } = {}) {
      const mods = moduleByName();
      const written = [], failed = [];
      for (const [id, moduleObj] of mods) {
        if (include ? !include.includes(id) : isSkippable(id)) continue;
        try { const src = serializeModule(id, moduleObj); await fs.writeFile(prefix + id + '.js', src); snapshot.set(id, src); written.push({ id, bytes: src.length }); }
        catch (e) { failed.push(id + ': ' + (e && e.message || e)); }
      }
      return { written, failed };
    }

    const readText = async (path) => { const t = await fs.readFile(path); return typeof t === 'string' ? t : new TextDecoder().decode(t); };

    async function applyChanged() {
      const applied = [], errors = [];
      for (const [id, prev] of snapshot) {
        let text;
        try { text = await readText(prefix + id + '.js'); } catch { continue; }
        if (text === prev) continue;
        const r = applyModule(id, text);
        if (r.applied && r.changes) applied.push({ id, changes: r.changes, plan: r.plan });
        if (r.plan && r.plan.errors.length) errors.push(...r.plan.errors.map(e => id + ': ' + e));
        snapshot.set(id, serializeModule(id, moduleByName().get(id)));
      }
      return { applied, errors };
    }

    function parseModuleFile(text) {
      const cells = [];
      const chunks = text.split(CELL).slice(1);
      for (const chunk of chunks) {
        const nl = chunk.indexOf('\n');
        const header = chunk.slice(0, nl);
        const body = chunk.slice(nl + 1).replace(/\s+$/, '');
        const get = (k) => { const m = header.match(new RegExp(k + '=([^\\s]*)')); return m ? m[1] : ''; };
        const name = get('name');
        const inputs = get('inputs') ? get('inputs').split(',').filter(Boolean) : [];
        cells.push({ pid: get('pid'), name, inputs, src: body.trim(), readonly: /readonly=1/.test(header) });
      }
      return cells;
    }

    function applyModule(id, text, { dryRun = false } = {}) {
      const moduleObj = moduleByName().get(id);
      if (!moduleObj) return { applied: false, reason: 'module not loaded: ' + id };
      const byPid = new Map(), byName = new Map();
      for (const v of varsOf(moduleObj)) { if (v.pid) byPid.set(v.pid, v); if (v._name) byName.set(v._name, v); }

      const cells = parseModuleFile(text);
      const plan = { created: [], updated: [], skipped: [], errors: [] };
      const ops = [];
      const seenPids = new Set();

      for (const cell of cells) {
        if (cell.readonly || isStructural(cell.name, cell.inputs)) { plan.skipped.push(cell.name || cell.pid); continue; }
        let fn;
        try { fn = (0, eval)('(' + cell.src + ')'); if (typeof fn !== 'function') throw new Error('not a function'); }
        catch (e) { plan.errors.push((cell.name || cell.pid) + ': ' + (e && e.message || e)); continue; }

        const existing = cell.pid && byPid.get(cell.pid);
        if (existing) {
          seenPids.add(cell.pid);
          const sameInputs = JSON.stringify((existing._inputs || []).map(inputName)) === JSON.stringify(cell.inputs);
          const sameDef = existing._definition && existing._definition.toString() === cell.src;
          if (sameInputs && sameDef) continue;
          plan.updated.push(cell.name || cell.pid);
          ops.push(() => { existing.define(cell.name || null, cell.inputs, fn); existing.pid = cell.pid; });
        } else {
          plan.created.push(cell.name || '(anon)');
          ops.push(() => { const v = moduleObj.variable(); v.define(cell.name || null, cell.inputs, fn); if (cell.pid) v.pid = cell.pid; });
        }
      }
      for (const [pid, v] of byPid) {
        if (seenPids.has(pid)) continue;
        if (isStructural(v._name, (v._inputs || []).map(inputName))) continue;
        if (!cells.length) continue;
        plan.skipped.push('(kept ' + (v._name || pid) + ' — deletion disabled in v1)');
      }

      if (dryRun) return { applied: false, dryRun: true, id, plan };
      for (const op of ops) { try { op(); } catch (e) { plan.errors.push('apply: ' + (e && e.message || e)); } }
      return { applied: true, id, changes: plan.created.length + plan.updated.length, plan };
    }

    async function applyFromFs(id, opts) {
      const text = await fs.readFile(prefix + id + '.js');
      return applyModule(id, typeof text === 'string' ? text : new TextDecoder().decode(text), opts);
    }

    return { syncHost, applyChanged, applyModule, applyFromFs, parseModuleFile, currentModules, listModuleIds: () => [...moduleByName().keys()] };
  };
};

const _hostTools = function _hostTools(html, registerTool, defineTool, createHostBridge, rc4_workspace, runtime){
  let bridge = null;
  const getBridge = () => {
    if (bridge) return bridge;
    bridge = createHostBridge({ fs: rc4_workspace.fs, getRuntime: () => runtime });
    return bridge;
  };

  registerTool(defineTool({
    id: "host_sync",
    description: "Project the LIVE notebook's own modules into the project filesystem at " +
      "/notebook/<moduleId>.js (readable, pid-tagged source). Run this before reading or editing host modules.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    execute: async () => {
      const r = await getBridge().syncHost();
      return { output: "synced " + r.written.length + " module(s)" + (r.failed.length ? "; failed: " + r.failed.join(", ") : "") };
    }
  }));

  registerTool(defineTool({
    id: "host_apply",
    description: "Apply edits you made to /notebook/<moduleId>.js back into the LIVE running notebook " +
      "(create/update cells). Run after editing a host module file with bash.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    execute: async () => {
      const r = await getBridge().applyChanged();
      const errs = r.errors && r.errors.length ? "; errors: " + r.errors.join(" | ") : "";
      return { output: "applied to " + r.applied.length + " module(s)" + errs };
    }
  }));

  return html`<div style="font:12px ui-monospace,Menlo,monospace;color:#7ee787">● host self-edit tools registered: host_sync, host_apply</div>`;
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/robocoop-4-tools", async () =>
    runtime.module((await import("/@tomlarkworthy/robocoop-4-tools.js?v=4")).default));
  main.define("registerTool", ["module @tomlarkworthy/robocoop-4-tools", "@variable"], (_, v) => v.import("registerTool", _));

  main.define("module @tomlarkworthy/robocoop-4-core", async () =>
    runtime.module((await import("/@tomlarkworthy/robocoop-4-core.js?v=4")).default));
  main.define("defineTool", ["module @tomlarkworthy/robocoop-4-core", "@variable"], (_, v) => v.import("defineTool", _));

  // The agent's workspace fs comes from -engine (no window.justbash); the live runtime from runtime-sdk.
  main.define("module @tomlarkworthy/robocoop-4-engine", async () =>
    runtime.module((await import("/@tomlarkworthy/robocoop-4-engine.js?v=4")).default));
  main.define("rc4_workspace", ["module @tomlarkworthy/robocoop-4-engine", "@variable"], (_, v) => v.import("rc4_workspace", _));
  main.define("module @tomlarkworthy/runtime-sdk", async () =>
    runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));

  $def("rc4h_doc_createHostBridge", null, ["md"], _doc_createHostBridge);
  $def("rc4h_createHostBridge", "createHostBridge", [], _createHostBridge);
  $def("rc4h_tools", null, ["html", "registerTool", "defineTool", "createHostBridge", "rc4_workspace", "runtime"], _hostTools);
  return main;
}
