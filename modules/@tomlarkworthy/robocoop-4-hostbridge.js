// @tomlarkworthy/robocoop-4-hostbridge — OPTIONAL host integration: realtime self-editing + live value
// inspection. Both reach into the running notebook and are registered through the SAME plugin registry
// (@tomlarkworthy/robocoop-4-tools registerTool), so a notebook gets them by mounting this module and can
// add its own tools the same way. A notebook that wants robocoop-4 WITHOUT host powers omits this module.
//
//  - SELF-EDIT: mounts justbash-filesync's jbFileSync engine over the agent workspace (rc4_workspace).
//    Live modules project to /notebook/<id>.js; any edit or new module file the agent writes applies to
//    the live runtime within ~1s (exporter-3 exportModuleJS + file-sync probeDefine + jbApply).
//  - INSPECT: registers `inspect_value` / `list_values` (read a cell's LIVE value or error, via summarizejs)
//    and `eval_js` (run native JS scoped to a module — its FileAttachment/cells in scope, plus page globals).
//    The source files only show code; these show what cells evaluate to and let the agent compose transforms.
//  - CONTENT MIRROR: writes the raw microkernel content blocks that are NOT editable modules into the fs under
//    /content/<id> (gzip left compressed). Static blocks (config, bootloader, libraries) are a one-shot DOM
//    pass; file ATTACHMENTS are mirrored REACTIVELY off `all_module_files` (@tomlarkworthy/fileattachments) —
//    their backing maps are live, so adding/removing an attachment at runtime updates /content. The file's
//    presence shows the ingredient exists; the agent decodes it in userspace (eval_js + DecompressionStream).
//
// Browser-only (drives the live runtime); node CI skips it.

const _doc_hostbridge = function _doc_hostbridge(md){return(
md`### robocoop-4 host integration
Realtime self-edit (reuses \`@tomlarkworthy/justbash-filesync\` \`jbFileSync\`) + value inspection
(\`inspect_value\` / \`list_values\`, via \`@tomlarkworthy/summarizejs\`) + module-scoped JS (\`eval_js\`). The raw
microkernel content blocks (config, bootloader, libraries, file-attachment bytes) are mirrored into the fs at
\`/content/<id>\`. Tools register through \`@tomlarkworthy/robocoop-4-tools\` \`registerTool\` — the pluggable seam.`
)};

// Build the value-inspection tools bound to the live runtime. Returned as an array of tool objects.
//
// CELL vs VARIABLE: a *cell* is a source declaration identified by its pid (the `_pid` in
// `const _pid = …` / `$def("_pid","name",…)`). A cell may have NO name (anonymous md/display cells) and a
// single cell can yield SEVERAL runtime variables — `viewof x` → both `viewof x` (the element) and `x`
// (its value); `mutable y` → `initial y`, `mutable y`, `y`. So these tools address a cell by pid (always
// works, incl. anonymous) or by variable name (convenient when it has one), and force-compute by VARIABLE
// OBJECT via runtime-sdk observe (so anonymous/unobserved cells compute too — `mod.value(name)` can't).
const _valueTools = function _valueTools(defineTool, summarizeJS, currentModules, runtime, observe, rc4_watchBus){
  const resolveModule = (id) => {
    for (const [, info] of currentModules) if (info && info.name === id) return info.module;
    if (runtime.mains && runtime.mains.has(id)) return runtime.mains.get(id);
    return null;
  };
  const varsOf = (mod) => [...runtime._variables].filter((v) => v._module === mod);
  const isStructural = (v) => !v.pid && (!v._name || String(v._name).startsWith('module ') || v._name === '@variable' || String(v._name).startsWith('initial '));
  const label = (v) => (v.pid ? v.pid : '(derived)') + (v._name ? ' ' + v._name : ' (anonymous)');
  // Kick the runtime's compute scheduler (an idle runtime won't compute a freshly-reachable var on its
  // own): asking for any named cell's value via the official API schedules a compute pass.
  const nudge = (mod) => { const s = varsOf(mod).find((x) => x._name && !isStructural(x)); if (s) { try { mod.value(s._name).catch(() => {}); } catch (e) {} } };
  // Force compute + read a variable's live value (or its error). Named cells use the official module.value
  // (which schedules compute + returns a promise); anonymous cells (no name — md/display cells) are tapped
  // by object via observe and the scheduler is nudged. Bounded so a stuck/pending cell can't hang.
  const readVar = (mod, v) => new Promise((resolve) => {
    let done = false, invalidate;
    const inv = new Promise((r) => { invalidate = r; });
    const finish = (res) => { if (done) return; done = true; try { invalidate(); } catch (e) {} resolve(res); };
    if (v._error != null) return finish({ error: (v._error && v._error.message) || String(v._error) });
    if (v._value !== undefined) return finish({ value: v._value });
    if (v._name) {
      Promise.resolve().then(() => mod.value(v._name)).then((value) => finish({ value }), (error) => finish({ error: (error && error.message) || String(error) }));
    } else {
      try {
        observe(v, {
          fulfilled: (value) => finish({ value }),
          rejected: (error) => finish({ error: (error && error.message) || String(error) }),
          pending: () => {},
        }, { invalidation: inv });
        nudge(mod);
      } catch (e) { return finish({ error: 'observe failed: ' + ((e && e.message) || e) }); }
    }
    setTimeout(() => finish({ error: 'timed out after 5s' }), 5000);
  });
  const summary = (value, max) => { try { return summarizeJS(value, { max_size: max }); } catch (e) { return String(value); } };

  // Run a snippet of JS scoped to a module: a temporary variable is defined in `mod` with the names the
  // code references (the module's builtins — md/html/Inputs/Plot/d3/Generators/FileAttachment — and its
  // named cells) injected as inputs; the runtime computes it (so async/await + DecompressionStream work);
  // we read the value and delete the temp. Page globals (window, document, the kernel's lopecode resolver)
  // are reachable too — the function runs in the page realm. This is how userspace composes transforms the
  // shell can't (e.g. decode a gzipped FileAttachment) without persisting a cell.
  const AsyncFunction = (async () => {}).constructor;
  const GLOBALS = new Set(['window','document','globalThis','console','Math','JSON','Object','Array','Promise','Response','Blob','Uint8Array','TextDecoder','TextEncoder','DecompressionStream','CompressionStream','fetch','URL','atob','btoa','Date','Map','Set','RegExp','Error']);
  const esc = (n) => String(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const evalInModule = (mod, code, timeoutMs = 8000) => new Promise((resolve) => {
    const names = new Set();
    for (const v of varsOf(mod)) if (v._name && /^[A-Za-z_$][\w$]*$/.test(v._name) && !GLOBALS.has(v._name)) names.add(v._name);
    ['FileAttachment', 'md', 'html', 'Inputs', 'Plot', 'd3', 'Generators'].forEach((n) => names.add(n));
    const inputs = [...names].filter((n) => new RegExp('\\b' + esc(n) + '\\b').test(code));
    const t = code.trim();
    const isExpr = t && !/[;\n]/.test(t) && !/^\s*(return|const|let|var|throw|if|for|while|async|function|\{|await)\b/.test(t);
    let fn;
    try { fn = new AsyncFunction(...inputs, isExpr ? 'return (' + t + ');' : code); }
    catch (e) { return resolve({ error: 'syntax error: ' + ((e && e.message) || e) }); }
    let done = false, v;
    const finish = (r) => { if (done) return; done = true; try { v && v.delete(); } catch (e) {} resolve(r); };
    try {
      v = mod.variable({ fulfilled: (val) => finish({ value: val }), rejected: (err) => finish({ error: (err && err.message) || String(err) }), pending: () => {} });
      v.define(null, inputs, fn);
    } catch (e) { return finish({ error: 'define failed: ' + ((e && e.message) || e) }); }
    setTimeout(() => finish({ error: 'timed out after ' + (timeoutMs / 1000) + 's' }), timeoutMs);
  });

  const inspect_value = defineTool({
    id: 'inspect_value',
    description:
      'Inspect the LIVE computed value of a cell in the running notebook (NOT its source). Returns a readable ' +
      'summary of what the cell currently evaluates to, or its runtime error if it is failing. Identify the ' +
      'cell by `pid` (the _pid in the source, e.g. "_1noor04" — works for ANY cell, including anonymous ones) ' +
      'or by `name`. Note a `viewof x` cell has two variables: name "viewof x" (the input element) and "x" ' +
      '(its value); `mutable y` exposes "y". Read source with bash; read values with this.',
    parameters: {
      type: 'object',
      properties: {
        module: { type: 'string', description: 'Module id, e.g. "@user/stats" or "@tomlarkworthy/exporter-3".' },
        pid: { type: 'string', description: 'The cell pid (the _pid in the source). Preferred; required for anonymous cells.' },
        name: { type: 'string', description: 'A variable name (e.g. "total", "viewof knob", "x"). Use when the cell has one.' },
      },
      required: ['module'],
      additionalProperties: false,
    },
    execute: async ({ module, pid, name }) => {
      const mod = resolveModule(module);
      if (!mod) return { title: 'inspect_value', output: 'Module not found: ' + module + ' (try list_values or `ls /notebook`).' };
      if (!pid && !name) return { title: 'inspect_value', output: 'Give a pid or a name. Run list_values ' + module + ' to see the cells.' };
      const vs = varsOf(mod);
      const v = pid ? vs.find((x) => x.pid === pid) : vs.find((x) => x._name === name);
      if (!v) return { title: 'inspect_value', output: (pid ? 'No cell with pid ' + pid : 'No variable named ' + name) + ' in ' + module + '. Run list_values ' + module + '.' };
      const r = await readVar(mod, v);
      const tag = module + ':' + (name || pid);
      if (r.error) return { title: 'inspect ' + tag, output: '⚠ runtime error: ' + r.error, metadata: { error: true } };
      return { title: 'inspect ' + tag, output: summary(r.value, 4000) };
    },
  });

  const list_values = defineTool({
    id: 'list_values',
    description:
      'List EVERY cell in a module — including anonymous (unnamed) cells — with its pid, name (if any) and a ' +
      'one-line summary of its LIVE value (or runtime error). Use to survey a module, then drill in with ' +
      'inspect_value by pid.',
    parameters: {
      type: 'object',
      properties: { module: { type: 'string', description: 'Module id to survey.' } },
      required: ['module'],
      additionalProperties: false,
    },
    execute: async ({ module }) => {
      const mod = resolveModule(module);
      if (!mod) return { title: 'list_values', output: 'Module not found: ' + module };
      const vars = varsOf(mod).filter((v) => !isStructural(v));
      if (!vars.length) return { title: 'list_values ' + module, output: '(no cells)' };
      const lines = [];
      for (const v of vars.slice(0, 40)) {
        const r = await readVar(mod, v);
        const s = r.error ? '⚠ ' + r.error : summary(r.value, 120);
        lines.push(label(v) + ' = ' + String(s).replace(/\s+/g, ' ').trim().slice(0, 120));
      }
      if (vars.length > 40) lines.push('… ' + (vars.length - 40) + ' more');
      return { title: 'list_values ' + module + ' (' + vars.length + ')', output: lines.join('\n') };
    },
  });

  const eval_js = defineTool({
    id: 'eval_js',
    description:
      'Run a snippet of native JavaScript in the browser, scoped to a module. The module\'s builtins ' +
      '(md, html, Inputs, Plot, d3, Generators, and crucially FileAttachment) and its named cells are in ' +
      'scope by name; page globals (window, document, DecompressionStream, …) are available too. A bare ' +
      'expression is returned automatically; multi-statement code needs an explicit `return`; top-level await ' +
      'works. Use this for transforms the shell cannot do — above all, to DECODE a bundled file attachment: ' +
      'scope to the module that owns it and do `new Response((await FileAttachment("name.gz").stream())' +
      '.pipeThrough(new DecompressionStream("gzip"))).text()`. An attachment at /content/@user/mod/name belongs ' +
      'to module "@user/mod" with FileAttachment name "name". Also good for computing over live cell values.',
    parameters: {
      type: 'object',
      properties: {
        module: { type: 'string', description: 'Module id to scope to, e.g. "@tomlarkworthy/robocoop-4-bash". Sets which FileAttachment/cells are in scope.' },
        code: { type: 'string', description: 'JavaScript. Bare expression is auto-returned; multi-statement needs `return`; await allowed.' },
      },
      required: ['module', 'code'],
      additionalProperties: false,
    },
    execute: async ({ module, code }) => {
      const mod = resolveModule(module);
      if (!mod) return { title: 'eval_js', output: 'Module not found: ' + module + ' (try `ls /content` or `ls /notebook`).' };
      const r = await evalInModule(mod, code);
      if (r.error) return { title: 'eval_js ' + module, output: '⚠ ' + r.error, metadata: { error: true } };
      return { title: 'eval_js ' + module, output: summary(r.value, 6000) };
    },
  });

  // WATCHES: attach a persistent observer to a cell; every time it recomputes to a new value, the change is
  // pushed to rc4_watchBus, which the agent session drains each step and injects — so a watched value STREAMS
  // to the model on change, no re-inspecting. Same pid/name addressing as inspect_value. Disposed (observer
  // torn down) on unwatch via the invalidation promise.
  const oneLine = (s) => String(s).replace(/\s+/g, ' ').trim();
  const watchKey = (module, pid, name) => module + ':' + (pid || name);
  const watch_variable = defineTool({
    id: 'watch_variable',
    description:
      'Watch a cell\'s LIVE value. After this, whenever the cell recomputes to a NEW value, the change is ' +
      'streamed to you automatically on your next step — you do not call inspect_value again. Identify the cell ' +
      'by `pid` (works for any cell, incl. anonymous) or `name`. Returns the current value now; later changes ' +
      'arrive as "Watch updates". Especially useful after an edit, to see downstream reactive cells update. ' +
      'Use unwatch_variable to stop.',
    parameters: {
      type: 'object',
      properties: {
        module: { type: 'string', description: 'Module id, e.g. "@user/stats".' },
        pid: { type: 'string', description: 'The cell pid (preferred; required for anonymous cells).' },
        name: { type: 'string', description: 'A variable name (when the cell has one).' },
      },
      required: ['module'],
      additionalProperties: false,
    },
    execute: async ({ module, pid, name }) => {
      const mod = resolveModule(module);
      if (!mod) return { title: 'watch_variable', output: 'Module not found: ' + module };
      if (!pid && !name) return { title: 'watch_variable', output: 'Give a pid or a name (see list_values ' + module + ').' };
      const v = varsOf(mod).find((x) => (pid ? x.pid === pid : x._name === name));
      if (!v) return { title: 'watch_variable', output: (pid ? 'No cell with pid ' + pid : 'No variable named ' + name) + ' in ' + module + '.' };
      const id = watchKey(module, pid, name);
      const tag = module + ':' + (name || pid);
      if (rc4_watchBus.has(id)) return { title: 'watch_variable', output: 'Already watching ' + tag + '.' };
      const base = await readVar(mod, v);
      const baseText = base.error ? '⚠ ' + base.error : oneLine(summary(base.value, 400));
      let stop; const inv = new Promise((r) => { stop = r; });
      try {
        observe(v, {
          fulfilled: (val) => rc4_watchBus.record(id, oneLine(summary(val, 400))),
          rejected: (err) => rc4_watchBus.record(id, '⚠ ' + ((err && err.message) || String(err))),
          pending: () => {},
        }, { invalidation: inv });
        nudge(mod);
      } catch (e) { return { title: 'watch_variable', output: 'Could not observe ' + tag + ': ' + ((e && e.message) || e) }; }
      rc4_watchBus.register(id, tag, stop, baseText);
      return { title: 'watch ' + tag, output: 'Watching ' + tag + ' — current value: ' + baseText + '. Changes will stream to you automatically; unwatch_variable to stop.' };
    },
  });

  const unwatch_variable = defineTool({
    id: 'unwatch_variable',
    description: 'Stop watching a cell previously passed to watch_variable (same module + pid/name).',
    parameters: {
      type: 'object',
      properties: {
        module: { type: 'string', description: 'Module id.' },
        pid: { type: 'string', description: 'The cell pid used when watching.' },
        name: { type: 'string', description: 'The variable name used when watching.' },
      },
      required: ['module'],
      additionalProperties: false,
    },
    execute: async ({ module, pid, name }) => {
      const tag = module + ':' + (name || pid);
      return { title: 'unwatch_variable', output: rc4_watchBus.remove(watchKey(module, pid, name)) ? 'Stopped watching ' + tag + '.' : 'Not watching ' + tag + '.' };
    },
  });

  return [inspect_value, list_values, eval_js, watch_variable, unwatch_variable];
};

// One-shot mirror of the STATIC raw content blocks into the fs as bytes. A lopecode notebook is one HTML file
// whose every piece — the bootloader, bootconf.json, the bundled libraries, each module, each file attachment —
// is a `<script type="text/plain" id data-mime data-encoding>` block. jbFileSync projects editable MODULES to
// /notebook/<id>.js; file ATTACHMENTS are mirrored reactively (see attachmentMirror). This handles the rest —
// config, bootloader, libraries — which never change at runtime, writing each to /content/<id> as its on-disk
// bytes (base64 decoded, gzip left COMPRESSED). Browser-only (reads the DOM); run once after jbFileSync settles.
const _mirrorBlocks = function _mirrorBlocks(){
  return async function mirrorBlocks(fs) {
    const b64ToBytes = (b64) => {
      const bin = atob(String(b64).replace(/\s+/g, ''));
      const u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      return u;
    };
    const isStyle = (id) => /^https?:\/\//.test(id) || /\.css$/.test(id);
    const isAttachment = (id) => /^@?[^/]+\/[^/]+\/.+/.test(id) || /^file:/.test(id);  // attachments → reactive mirror
    const editable = new Set((typeof fs.getAllPaths === 'function' ? fs.getAllPaths() : [])
      .filter((p) => /^\/notebook\/.+\.js$/.test(p)).map((p) => p.slice('/notebook/'.length, -3)));
    let n = 0;
    for (const el of document.querySelectorAll('script[type="text/plain"][id]')) {
      const id = el.id;
      if (isStyle(id) || isAttachment(id) || editable.has(id)) continue;  // skip CSS, attachments, /notebook modules
      const enc = (el.getAttribute('data-encoding') || 'text').toLowerCase();
      const raw = el.textContent || '';
      const bytes = enc === 'text' ? new TextEncoder().encode(raw) : b64ToBytes(raw);
      try { await fs.writeFile('/content/' + id, bytes); n++; } catch (e) {}
    }
    return n;
  };
};

// REACTIVE file-attachment mirror. Depends on `all_module_files` (@tomlarkworthy/fileattachments), which
// recomputes whenever any module's FileAttachment map changes — attachments are NOT frozen at define time, the
// backing maps are live and mutable (setFileAttachment/removeFileAttachment). So this re-runs on every add/
// remove, writing each attachment's bytes to /content/<module>/<name> and pruning files for attachments that
// are gone. The bytes come from the attachment's object URL (its on-disk form — gzip stays compressed; decode
// in userspace with eval_js + DecompressionStream). Browser-only.
const _attachmentMirror = function _attachmentMirror(all_module_files, rc4_workspace, invalidation){
  const fs = rc4_workspace.fs;
  const del = ['delete', 'rm', 'remove', 'unlink'].map((m) => typeof fs[m] === 'function' && m).find(Boolean);
  let cancelled = false; invalidation.then(() => { cancelled = true; });
  const wanted = new Set();
  (async () => {
    for (const f of all_module_files) {
      const path = '/content/' + f.module + '/' + f.name;
      wanted.add(path);
      try {
        const bytes = new Uint8Array(await (await fetch(f.url)).arrayBuffer());
        if (!cancelled) await fs.writeFile(path, bytes);
      } catch (e) {}
    }
    // prune /content attachment files (≥3 path segments) no longer present
    if (del && !cancelled) {
      const existing = (typeof fs.getAllPaths === 'function' ? fs.getAllPaths() : [])
        .filter((p) => /^\/content\/[^/]+\/[^/]+\/.+/.test(p));
      for (const p of existing) if (!wanted.has(p)) { try { await fs[del](p); } catch (e) {} }
    }
  })();
  return all_module_files.length;
};

// Claude-Code-familiar file tools over the agent's virtual fs, WITH COMPILE FEEDBACK. read_file/write_file/
// edit_file mirror Claude Code's Read/Write/Edit argument shapes (file_path,offset,limit / file_path,content /
// file_path,old_string,new_string,replace_all). Replacement is LITERAL (not regex), so no sed-escaping traps.
// For a live module (/notebook/<id>.js), write_file and edit_file APPLY the result synchronously (reusing the
// same probeDefine + jbApply machinery as jbFileSync) and report whether it compiled and how many cells
// changed — the agent learns in the SAME turn instead of editing blind and waiting for the async watch loop.
// A compile error leaves the live runtime on its last-good version (nothing applied); the file keeps the draft
// so the agent can re-edit. After a successful change the module is re-projected (canonical form + pids).
// Browser-only (needs window.importShim + the live runtime).
const _editTools = function _editTools(defineTool, rc4_workspace, currentModules, runtime, createModule, exportModuleJS, probeDefine, jbApply, observe, summarizeJS, rc4_watchBus){
  const fs = rc4_workspace.fs;
  const dec = (raw) => (typeof raw === 'string' ? raw : new TextDecoder().decode(raw));
  const readText = async (p) => dec(await fs.readFile(p));
  const writeText = (p, s) => fs.writeFile(p, new TextEncoder().encode(String(s ?? '')));
  const apply = jbApply({ currentModules, runtime, probeDefine, createModule });

  // ── runtime-status probe + auto-watch (so the agent can't write blind) ───────────────────────────────
  // A module that COMPILES can still ERROR at runtime — and the error is LAZY: a cell only throws when it is
  // OBSERVED (e.g. a `Generators.interval` typo errors only when the cell renders). So after an apply we
  // force-compute the module's named cells, report any runtime errors (and a value summary) in the SAME tool
  // result, and register a persistent watch on each (reusing rc4_watchBus, deduped) so later changes/errors
  // stream into the loop automatically. Net: the agent is always shown whether what it wrote works or errors.
  const resolveModule = (id) => { for (const [, info] of currentModules) if (info && info.name === id) return info.module; return null; };
  const varsOf = (mod) => [...runtime._variables].filter((v) => v._module === mod);
  const isStructural = (v) => !v.pid && (!v._name || String(v._name).startsWith('module ') || v._name === '@variable' || String(v._name).startsWith('initial '));
  const oneLine = (s) => String(s).replace(/\s+/g, ' ').trim();
  const summ = (val) => { try { return oneLine(summarizeJS(val, { max_size: 200 })); } catch (e) { return oneLine(String(val)); } };
  const watchKey = (module, pid, name) => module + ':' + (pid || name);
  // Force compute one cell, resolve to {value} or {error}; bounded so a stuck cell can't hang the turn.
  const readVar = (mod, v) => new Promise((resolve) => {
    let done = false; const finish = (r) => { if (!done) { done = true; resolve(r); } };
    if (v._error != null) return finish({ error: (v._error && v._error.message) || String(v._error) });
    if (v._value !== undefined) return finish({ value: v._value });
    if (v._name) Promise.resolve().then(() => mod.value(v._name)).then((value) => finish({ value }), (error) => finish({ error: (error && error.message) || String(error) }));
    else { try { mod.value((varsOf(mod).find((x) => x._name && !isStructural(x)) || {})._name).catch(() => {}); } catch (e) {} }
    setTimeout(() => finish({ pending: true }), 4000);
  });
  // Force-compute + auto-watch every named cell of `id`; returns [{name, error?, value?}]. Best-effort.
  // Cells are probed CONCURRENTLY (readVar has its own per-cell timeout) so a module with several pending
  // cells settles in ~one timeout, not the sum — a write must never stall the agent on a serial wait.
  const probeAndWatch = async (id) => {
    const mod = resolveModule(id); if (!mod) return null;
    const cells = varsOf(mod).filter((v) => v._name && v.pid && !isStructural(v)).slice(0, 24);
    return Promise.all(cells.map(async (v) => {
      const base = await readVar(mod, v);
      const baseText = base.error ? '⚠ ' + base.error : summ(base.value);
      const wid = watchKey(id, v.pid, v._name);
      if (!rc4_watchBus.has(wid)) {
        let stop; const inv = new Promise((r) => { stop = r; });
        try {
          observe(v, {
            fulfilled: (val) => rc4_watchBus.record(wid, summ(val)),
            rejected: (err) => rc4_watchBus.record(wid, '⚠ ' + ((err && err.message) || String(err))),
            pending: () => {},
          }, { invalidation: inv });
          rc4_watchBus.register(wid, id + ':' + v._name, stop, baseText);
        } catch (e) {}
      }
      return { name: v._name, error: base.error, value: base.error ? undefined : baseText };
    }));
  };
  // Render the probe into a one-line status appended to the apply message.
  const probeStatus = (probe) => {
    if (!probe || !probe.length) return '';
    const errored = probe.filter((r) => r.error);
    const okCount = probe.length - errored.length;
    if (errored.length) return ' · ⚠ ' + errored.length + ' cell' + (errored.length === 1 ? '' : 's') +
      ' ERRORING at runtime — ' + errored.map((e) => e.name + ': ' + e.error).join('; ') +
      ' — FIX before task_complete (a compile-clean cell can still error when observed)';
    return ' · ✓ all ' + okCount + ' cell' + (okCount === 1 ? '' : 's') + ' compute with no runtime error (auto-watched; changes stream to you)';
  };

  // Is module `id` already live? (module-map Map is keyed Module->{name}; modules don't expose _name.)
  const moduleExists = (id) => {
    try {
      const cm = currentModules && (typeof currentModules.values === 'function' ? currentModules : currentModules.value);
      return !!(cm && typeof cm.values === 'function' && [...cm.values()].some((e) => e && e.name === id));
    } catch (e) { return false; }
  };
  // B14 — drop a newly-created VISUAL module into the live lopepage view (the shared surface) so the agent's
  // creation appears where the human is looking, not behind the module lookup. Fires the same non-destructive
  // `open=` hash intent the lookup menu uses (sync_layout_from_url merges it via treeSyncGolden → addItem;
  // existing panes, including this running agent, are preserved). Best-effort; never throws.
  const surfaceInView = (id) => {
    try {
      if (typeof location === 'undefined') return false;
      let h = (location.hash || '').replace(/^#/, '');
      const intent = 'open=' + id;
      h = /(^|&)open=/.test(h) ? h.replace(/(^|&)open=[^&]*/, '$1' + intent) : (h + (h ? '&' : '') + intent);
      if (('#' + h) === location.hash) return false;   // identical → no hashchange would fire
      location.hash = h;
      return true;
    } catch (e) { return false; }
  };

  // Apply a just-written /notebook module; returns {ok,msg} or null when the path is not a live module file.
  const applyModuleFile = async (path) => {
    const m = /^\/notebook\/(.+)\.js$/.exec(path);
    if (!m) return null;
    const id = m[1];
    const wasNew = !moduleExists(id);
    let src;
    try { src = await readText(path); } catch (e) { return { ok: false, msg: 'could not read back ' + path }; }
    if (!/export\s+default/.test(src)) return { ok: false, msg: 'written, but not an importable module (no `export default`) — not applied' };
    if (!window.importShim) return { ok: false, msg: 'written, but importShim is unavailable — not applied' };
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    try {
      const mod = await window.importShim(url, 'file://@tomlarkworthy/robocoop-4-hostbridge');
      if (typeof mod.default !== 'function') return { ok: false, msg: 'written, but no default export define() — not applied' };
      const r = apply(id, mod.default);
      if (!r.applied) return { ok: false, msg: 'written, but not applied: ' + (r.reason || 'unknown') };
      if (r.changes > 0) { try { const ex = await exportModuleJS(id); await writeText(path, ex.source); } catch (e) {} }
      const n = r.changes || 0;
      // a brand-new module with a display cell → surface it in the shared view (B14)
      const surfaced = wasNew && /\bviewof\s|\bmd`|\bhtml`/.test(src) && surfaceInView(id);
      // force-compute the cells + auto-watch them, so a lazy runtime error (compile-clean but throws on
      // observe) is reported in THIS turn and future changes stream — the agent never writes blind.
      let status = ''; try { status = probeStatus(await probeAndWatch(id)); } catch (e) {}
      return { ok: true, msg: 'applied live (' + n + ' cell' + (n === 1 ? '' : 's') + ' changed)' + (surfaced ? ' · opened in the shared view so the human can see it' : '') + status };
    } catch (e) {
      return { ok: false, msg: 'written, but FAILED TO COMPILE: ' + (e && e.message || e) + ' — live runtime unchanged; fix and re-edit' };
    } finally { URL.revokeObjectURL(url); }
  };

  const read_file = defineTool({
    id: 'read_file',
    description: 'Read a file from the virtual filesystem, returned with line numbers (cat -n style). Use ' +
      'offset/limit for large files. Mirrors Claude Code\'s Read.',
    parameters: { type: 'object', additionalProperties: false, required: ['file_path'], properties: {
      file_path: { type: 'string', description: 'Absolute path, e.g. /notebook/@user/mod.js or /content/bootconf.json.' },
      offset: { type: 'number', description: '1-based line to start from (optional).' },
      limit: { type: 'number', description: 'Maximum lines to read (optional; default 2000).' },
    } },
    execute: async ({ file_path, offset, limit }) => {
      let text;
      try { text = await readText(file_path); } catch (e) { return { output: 'ERROR: cannot read ' + file_path + ': ' + (e && e.message || e) }; }
      const lines = text.split('\n');
      const start = Math.max(0, offset ? offset - 1 : 0);
      const end = Math.min(lines.length, start + (limit || 2000));
      const body = lines.slice(start, end)
        .map((l, i) => String(start + i + 1).padStart(6) + '\t' + (l.length > 2000 ? l.slice(0, 2000) + '… [line truncated]' : l))
        .join('\n');
      return { output: body || '(empty file)' };
    },
  });

  const write_file = defineTool({
    id: 'write_file',
    description: 'Create or overwrite a file in the virtual filesystem. Mirrors Claude Code\'s Write. Writing a ' +
      'live /notebook/<id>.js module APPLIES it and reports whether it compiled.',
    parameters: { type: 'object', additionalProperties: false, required: ['file_path', 'content'], properties: {
      file_path: { type: 'string', description: 'Absolute path.' },
      content: { type: 'string', description: 'Full file contents.' },
    } },
    execute: async ({ file_path, content }) => {
      try { await writeText(file_path, content); } catch (e) { return { output: 'ERROR: cannot write ' + file_path + ': ' + (e && e.message || e) }; }
      const applied = await applyModuleFile(file_path);
      return { output: 'Wrote ' + file_path + (applied ? ' — ' + applied.msg : '') };
    },
  });

  const edit_file = defineTool({
    id: 'edit_file',
    description: 'Replace an exact, literal string in a file. Mirrors Claude Code\'s Edit: old_string must appear ' +
      'exactly once (include surrounding context) unless replace_all is true. Editing a live /notebook/<id>.js ' +
      'module APPLIES the result and reports whether it compiled, in this same turn.',
    parameters: { type: 'object', additionalProperties: false, required: ['file_path', 'old_string', 'new_string'], properties: {
      file_path: { type: 'string', description: 'Absolute path.' },
      old_string: { type: 'string', description: 'Exact text to replace (include enough context to be unique).' },
      new_string: { type: 'string', description: 'Replacement text.' },
      replace_all: { type: 'boolean', description: 'Replace every occurrence (default false).' },
    } },
    execute: async ({ file_path, old_string, new_string, replace_all }) => {
      let text;
      try { text = await readText(file_path); } catch (e) { return { output: 'ERROR: cannot read ' + file_path + ': ' + (e && e.message || e) }; }
      if (old_string === new_string) return { output: 'ERROR: old_string and new_string are identical.' };
      const parts = text.split(old_string);
      const count = parts.length - 1;
      if (count === 0) return { output: 'ERROR: old_string not found in ' + file_path + '.' };
      if (count > 1 && !replace_all) return { output: 'ERROR: old_string is not unique (' + count + ' matches). Add more surrounding context, or set replace_all:true.' };
      const updated = replace_all ? parts.join(new_string) : parts[0] + new_string + parts.slice(1).join(old_string);
      try { await writeText(file_path, updated); } catch (e) { return { output: 'ERROR: cannot write ' + file_path + ': ' + (e && e.message || e) }; }
      const applied = await applyModuleFile(file_path);
      const n = replace_all ? count : 1;
      return { output: 'Edited ' + file_path + ' (' + n + ' replacement' + (n === 1 ? '' : 's') + ')' + (applied ? ' — ' + applied.msg : '') };
    },
  });

  // view_image — load an image file (screenshot or image FileAttachment) into your OWN view. Feeds it to the
  // model via ctx.attachImage so a vision model can SEE it on the next step (tool text can't carry images).
  const IMG_MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp' };
  const view_image = defineTool({
    id: 'view_image',
    description: 'Load an IMAGE from the filesystem so you can SEE it — a screenshot or an image FileAttachment ' +
      '(images live under /content/<module>/<file>; `ls /content` to find them). Pass the image file_path; the ' +
      'image becomes visible to you on your NEXT step (describe or act on it then). Needs a vision model (the ' +
      'chooser only lists vision+tool models).',
    parameters: { type: 'object', additionalProperties: false, required: ['file_path'], properties: {
      file_path: { type: 'string', description: 'Absolute path to an image, e.g. /content/@user/mod/shot.png.' },
    } },
    execute: async ({ file_path }, ctx) => {
      const mime = IMG_MIME[(file_path.split('.').pop() || '').toLowerCase()];
      if (!mime) return { title: 'view_image', output: 'Not a recognized image type (.png/.jpg/.jpeg/.gif/.webp/.svg/.bmp): ' + file_path };
      if (!ctx || typeof ctx.attachImage !== 'function') return { title: 'view_image', output: 'Image viewing is unavailable in this context.' };
      let bytes;
      try { bytes = await fs.readFile(file_path); } catch (e) { return { title: 'view_image', output: 'Cannot read ' + file_path + ': ' + (e && e.message || e) }; }
      if (typeof bytes === 'string') bytes = new TextEncoder().encode(bytes);
      const len = bytes.byteLength ?? bytes.length ?? 0;
      let url;
      try {
        url = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsDataURL(new Blob([bytes], { type: mime })); });
      } catch (e) { return { title: 'view_image', output: 'Could not encode ' + file_path + ': ' + (e && e.message || e) }; }
      ctx.attachImage(url);
      return { title: 'view ' + file_path, output: 'Loaded ' + file_path + ' (' + Math.round(len / 1024) + ' KB, ' + mime + ') — the image is now visible to you; describe or use it on your next step.' };
    },
  });

  return [read_file, write_file, edit_file, view_image];
};

const _hostSetup = function _hostSetup(jbFileSync, rc4_workspace, currentModules, runtime, createModule, invalidation, valueTools, editTools, mirrorBlocks, registerTool, unregisterTool){
  // realtime self-edit
  const status = jbFileSync({ fs: rc4_workspace.fs, currentModules, runtime, createModule, notebookId: 'notebook', invalidation });
  // one-shot mirror of the static blocks (config/bootloader/libraries), after jbFileSync projects the modules
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let cancelled = false; invalidation.then(() => { cancelled = true; });
  (async () => {
    for (let i = 0; i < 25 && !cancelled; i++) {
      const ready = (typeof rc4_workspace.fs.getAllPaths === 'function' ? rc4_workspace.fs.getAllPaths() : []).filter((p) => /^\/notebook\/.+\.js$/.test(p)).length;
      if (ready >= 5) break;
      await sleep(200);
    }
    if (!cancelled) { try { await mirrorBlocks(rc4_workspace.fs); } catch (e) {} }
  })();
  // value/eval tools + Claude-Code-style file tools, registered through the plugin registry
  const tools = [...valueTools, ...editTools];
  tools.forEach((t) => registerTool(t));
  invalidation.then(() => tools.forEach((t) => unregisterTool(t.id)));
  return status;
};

// Live table of the agent's active watches (the human-facing view of what the agent is streaming). Polls the
// shared bus once a second; cleared on invalidation. Mirrors the claude-code-pairing watch table.
const _watchTable = function _watchTable(html, rc4_watchBus, invalidation){
  const wrap = html`<div></div>`;
  const render = () => {
    const list = rc4_watchBus.list();
    if (!list.length) { wrap.replaceChildren(html`<div style="font:11px ui-monospace,Menlo,monospace;color:#6e7681">no active watches</div>`); return; }
    wrap.replaceChildren(html`<table style="font:11px ui-monospace,Menlo,monospace;border-collapse:collapse;width:100%">
      <thead><tr><th style="text-align:left;color:#6e7681;font-weight:400">watch</th><th style="text-align:left;color:#6e7681;font-weight:400">value</th></tr></thead>
      <tbody>${list.map((w) => html`<tr><td style="padding-right:8px;color:#7ee787;white-space:nowrap">${w.label}</td><td style="color:#c9d1d9">${String(w.last ?? '').slice(0, 80)}</td></tr>`)}</tbody>
    </table>`);
  };
  render();
  const t = setInterval(render, 1000);
  invalidation.then(() => clearInterval(t));
  return wrap;
};

const _hostMount = function _hostMount(html, hostSetup, attachmentMirror, valueTools, editTools, watchTable){
  // hostSetup (jbFileSync + tools + static mirror) is stable; attachmentMirror recomputes on attachment
  // changes — embedding both here keeps attachmentMirror reachable without re-running hostSetup.
  const ids = [...valueTools, ...editTools].map((t) => t.id).join(', ');
  return html`<div style="font:12px ui-monospace,Menlo,monospace;color:#7ee787;display:flex;flex-direction:column;gap:6px">
    <div>● host integration active — self-edit + value inspection + eval + file tools + watches</div>
    <div style="color:#8b949e">tools: ${ids} · /notebook = editable modules, /content = raw blocks (${attachmentMirror} attachments)</div>
    ${watchTable}
    ${hostSetup}
  </div>`;
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  // Realtime sync engine (reuses exporter-3 + file-sync + jbApply); agent workspace fs from -engine;
  // live runtime + createModule from runtime-sdk; module registry from module-map.
  main.define("module @tomlarkworthy/justbash-filesync", async () =>
    runtime.module((await import("/@tomlarkworthy/justbash-filesync.js?v=4")).default));
  main.define("jbFileSync", ["module @tomlarkworthy/justbash-filesync", "@variable"], (_, v) => v.import("jbFileSync", _));
  main.define("jbApply", ["module @tomlarkworthy/justbash-filesync", "@variable"], (_, v) => v.import("jbApply", _));

  // Compile/apply machinery for the file tools (same primitives jbFileSync uses): probeDefine decompiles a
  // module's define() into cells, exportModuleJS re-serialises the live module (to re-project after a change).
  main.define("module @tomlarkworthy/exporter-3", async () =>
    runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));
  main.define("exportModuleJS", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("exportModuleJS", _));
  main.define("module @tomlarkworthy/file-sync", async () =>
    runtime.module((await import("/@tomlarkworthy/file-sync.js?v=4")).default));
  main.define("probeDefine", ["module @tomlarkworthy/file-sync", "@variable"], (_, v) => v.import("probeDefine", _));

  main.define("module @tomlarkworthy/robocoop-4-engine", async () =>
    runtime.module((await import("/@tomlarkworthy/robocoop-4-engine.js?v=4")).default));
  main.define("rc4_workspace", ["module @tomlarkworthy/robocoop-4-engine", "@variable"], (_, v) => v.import("rc4_workspace", _));

  main.define("module @tomlarkworthy/runtime-sdk", async () =>
    runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
  main.define("createModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("createModule", _));
  main.define("observe", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("observe", _));

  main.define("module @tomlarkworthy/module-map", async () =>
    runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));
  main.define("currentModules", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("currentModules", _));

  // Tool plumbing: defineTool from core, registerTool/unregisterTool from the plugin registry,
  // summarizeJS for value rendering.
  main.define("module @tomlarkworthy/robocoop-4-core", async () =>
    runtime.module((await import("/@tomlarkworthy/robocoop-4-core.js?v=4")).default));
  main.define("defineTool", ["module @tomlarkworthy/robocoop-4-core", "@variable"], (_, v) => v.import("defineTool", _));

  main.define("module @tomlarkworthy/robocoop-4-tools", async () =>
    runtime.module((await import("/@tomlarkworthy/robocoop-4-tools.js?v=4")).default));
  main.define("registerTool", ["module @tomlarkworthy/robocoop-4-tools", "@variable"], (_, v) => v.import("registerTool", _));
  main.define("unregisterTool", ["module @tomlarkworthy/robocoop-4-tools", "@variable"], (_, v) => v.import("unregisterTool", _));
  main.define("rc4_watchBus", ["module @tomlarkworthy/robocoop-4-tools", "@variable"], (_, v) => v.import("rc4_watchBus", _));

  main.define("module @tomlarkworthy/summarizejs", async () =>
    runtime.module((await import("/@tomlarkworthy/summarizejs.js?v=4")).default));
  main.define("summarizeJS", ["module @tomlarkworthy/summarizejs", "@variable"], (_, v) => v.import("summarizeJS", _));

  // Live attachment registry — recomputes when any module's FileAttachment map changes (attachments are mutable).
  main.define("module @tomlarkworthy/fileattachments", async () =>
    runtime.module((await import("/@tomlarkworthy/fileattachments.js?v=4")).default));
  main.define("all_module_files", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("all_module_files", _));

  $def("rc4h_doc_hostbridge", null, ["md"], _doc_hostbridge);
  $def("rc4h_value_tools", "valueTools", ["defineTool", "summarizeJS", "currentModules", "runtime", "observe", "rc4_watchBus"], _valueTools);
  $def("rc4h_edit_tools", "editTools", ["defineTool", "rc4_workspace", "currentModules", "runtime", "createModule", "exportModuleJS", "probeDefine", "jbApply", "observe", "summarizeJS", "rc4_watchBus"], _editTools);
  $def("rc4h_mirror_blocks", "mirrorBlocks", [], _mirrorBlocks);
  $def("rc4h_attachment_mirror", "attachmentMirror", ["all_module_files", "rc4_workspace", "invalidation"], _attachmentMirror);
  $def("rc4h_setup", "hostSetup", ["jbFileSync", "rc4_workspace", "currentModules", "runtime", "createModule", "invalidation", "valueTools", "editTools", "mirrorBlocks", "registerTool", "unregisterTool"], _hostSetup);
  $def("rc4h_watch_table", "watchTable", ["html", "rc4_watchBus", "invalidation"], _watchTable);
  $def("rc4h_mount", null, ["html", "hostSetup", "attachmentMirror", "valueTools", "editTools", "watchTable"], _hostMount);
  return main;
}
