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
const _valueTools = function _valueTools(defineTool, summarizeJS, currentModules, runtime, observe){
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

  return [inspect_value, list_values, eval_js];
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

const _hostSetup = function _hostSetup(jbFileSync, rc4_workspace, currentModules, runtime, createModule, invalidation, valueTools, mirrorBlocks, registerTool, unregisterTool){
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
  // value- and eval tools, registered through the plugin registry
  valueTools.forEach((t) => registerTool(t));
  invalidation.then(() => valueTools.forEach((t) => unregisterTool(t.id)));
  return status;
};

const _hostMount = function _hostMount(html, hostSetup, attachmentMirror, valueTools){
  // hostSetup (jbFileSync + tools + static mirror) is stable; attachmentMirror recomputes on attachment
  // changes — embedding both here keeps attachmentMirror reachable without re-running hostSetup.
  return html`<div style="font:12px ui-monospace,Menlo,monospace;color:#7ee787;display:flex;flex-direction:column;gap:6px">
    <div>● host integration active — self-edit + value inspection + eval</div>
    <div style="color:#8b949e">tools: ${valueTools.map((t) => t.id).join(', ')} · /notebook = editable modules, /content = raw blocks (${attachmentMirror} attachments)</div>
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

  main.define("module @tomlarkworthy/summarizejs", async () =>
    runtime.module((await import("/@tomlarkworthy/summarizejs.js?v=4")).default));
  main.define("summarizeJS", ["module @tomlarkworthy/summarizejs", "@variable"], (_, v) => v.import("summarizeJS", _));

  // Live attachment registry — recomputes when any module's FileAttachment map changes (attachments are mutable).
  main.define("module @tomlarkworthy/fileattachments", async () =>
    runtime.module((await import("/@tomlarkworthy/fileattachments.js?v=4")).default));
  main.define("all_module_files", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("all_module_files", _));

  $def("rc4h_doc_hostbridge", null, ["md"], _doc_hostbridge);
  $def("rc4h_value_tools", "valueTools", ["defineTool", "summarizeJS", "currentModules", "runtime", "observe"], _valueTools);
  $def("rc4h_mirror_blocks", "mirrorBlocks", [], _mirrorBlocks);
  $def("rc4h_attachment_mirror", "attachmentMirror", ["all_module_files", "rc4_workspace", "invalidation"], _attachmentMirror);
  $def("rc4h_setup", "hostSetup", ["jbFileSync", "rc4_workspace", "currentModules", "runtime", "createModule", "invalidation", "valueTools", "mirrorBlocks", "registerTool", "unregisterTool"], _hostSetup);
  $def("rc4h_mount", null, ["html", "hostSetup", "attachmentMirror", "valueTools"], _hostMount);
  return main;
}
