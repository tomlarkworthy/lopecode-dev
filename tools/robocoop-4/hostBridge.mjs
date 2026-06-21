// Browser-only: bidirectional bridge between the LIVE host notebook and the agent's fs.
//   observe  — syncHost(): project each module's cells to /notebook/<id>.js as readable, pid-tagged source.
//   manipulate — applyModule(id, text): parse an edited file and create/update/delete variables in the
//                live runtime (adapted from @tomlarkworthy/justbash-filesync jbApply).
// STRUCTURAL both ways: reads v._name/_inputs/_definition.toString(), rebuilds fns via eval. No exporter-3
// exportModuleJS / escodegen / dep-graph serialization (those hang/saturate the thread over the channel).

const VENDOR = /golden-layout|codemirror|acorn|escodegen|jszip|lightning-fs|isomorphic-git|jest-expect|inspector|observable-runtime|observablehq-lezer|spectral-layout|module-map/;
const CELL = '// ⟦cell⟧ '; // unambiguous header marker

function defaultGetRuntime() {
  const reg = globalThis.__ojs_runtime;
  if (reg && reg.mains) for (const m of reg.mains.values()) if (m && m._runtime && m._runtime._variables) return m._runtime;
  return null;
}

const inputName = (i) => (typeof i === 'string' ? i : i && i._name) || '';
// import-binding / module-proxy cells: never agent-editable, never re-defined on apply.
const isStructural = (name, inputs) => !name || name.startsWith('module ') || name === '@variable' || (inputs || []).includes('@variable');

export function createHostBridge({ fs, getRuntime = defaultGetRuntime, prefix = '/notebook/' } = {}) {
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

  // snapshot of what we last wrote per id — lets applyChanged() push only edited modules back.
  const snapshot = new Map();

  // ---- observe -------------------------------------------------------------
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

  // Push agent edits back: for every synced module whose file differs from the snapshot, applyModule it.
  async function applyChanged() {
    const applied = [], errors = [];
    for (const [id, prev] of snapshot) {
      let text;
      try { text = await readText(prefix + id + '.js'); } catch { continue; }
      if (text === prev) continue;
      const r = applyModule(id, text);
      if (r.applied && r.changes) applied.push({ id, changes: r.changes, plan: r.plan });
      if (r.plan && r.plan.errors.length) errors.push(...r.plan.errors.map(e => id + ': ' + e));
      snapshot.set(id, serializeModule(id, moduleByName().get(id))); // re-snapshot from live runtime post-apply
    }
    return { applied, errors };
  }

  // ---- parse ---------------------------------------------------------------
  // Returns [{pid, name, inputs[], src, readonly}]. Blocks are delimited by CELL headers.
  function parseModuleFile(text) {
    const cells = [];
    const chunks = text.split(CELL).slice(1); // drop preamble
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

  // ---- manipulate: apply edited file to the live runtime -------------------
  // Adapted from justbash-filesync jbApply, keyed by pid. dryRun reports without mutating.
  function applyModule(id, text, { dryRun = false } = {}) {
    const moduleObj = moduleByName().get(id);
    if (!moduleObj) return { applied: false, reason: 'module not loaded: ' + id };
    const runtime = rt();
    const byPid = new Map(), byName = new Map();
    for (const v of varsOf(moduleObj)) { if (v.pid) byPid.set(v.pid, v); if (v._name) byName.set(v._name, v); }

    const cells = parseModuleFile(text);
    const plan = { created: [], updated: [], skipped: [], errors: [] };
    const ops = []; // deferred mutations so dryRun is side-effect-free
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
        if (sameInputs && sameDef) continue; // unchanged
        plan.updated.push(cell.name || cell.pid);
        ops.push(() => { existing.define(cell.name || null, cell.inputs, fn); existing.pid = cell.pid; });
      } else {
        plan.created.push(cell.name || '(anon)');
        ops.push(() => { const v = moduleObj.variable(); v.define(cell.name || null, cell.inputs, fn); if (cell.pid) v.pid = cell.pid; });
      }
    }
    // deletions: pids that existed but are gone from the file (only among editable cells)
    for (const [pid, v] of byPid) {
      if (seenPids.has(pid)) continue;
      if (isStructural(v._name, (v._inputs || []).map(inputName))) continue;
      // only delete if the file actually covered this module's editable cells (avoid nuking on partial files)
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
}
