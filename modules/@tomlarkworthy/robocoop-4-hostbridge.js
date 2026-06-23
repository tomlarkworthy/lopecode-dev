// @tomlarkworthy/robocoop-4-hostbridge — OPTIONAL host integration: realtime self-editing + live value
// inspection. Both reach into the running notebook and are registered through the SAME plugin registry
// (@tomlarkworthy/robocoop-4-tools registerTool), so a notebook gets them by mounting this module and can
// add its own tools the same way. A notebook that wants robocoop-4 WITHOUT host powers omits this module.
//
//  - SELF-EDIT: mounts justbash-filesync's jbFileSync engine over the agent workspace (rc4_workspace).
//    Live modules project to /notebook/<id>.js; any edit or new module file the agent writes applies to
//    the live runtime within ~1s (exporter-3 exportModuleJS + file-sync probeDefine + jbApply).
//  - INSPECT: registers `inspect_value` and `list_values` tools that read a cell's LIVE computed value
//    (summarized via @tomlarkworthy/summarizejs) or its runtime error — the source files only show code,
//    these show what cells actually evaluate to. Patterned on the channel server's get_variable.
//  - CONTENT: registers `read_content`, which reaches the raw microkernel content blocks (bootloader,
//    bootconf.json, the bundled standard library, file-attachment bytes) that are NOT projected as module
//    files — decompressing gzip — so the agent can understand and decode every part of its own HTML file.
//
// Browser-only (drives the live runtime); node CI skips it.

const _doc_hostbridge = function _doc_hostbridge(md){return(
md`### robocoop-4 host integration
Realtime self-edit (reuses \`@tomlarkworthy/justbash-filesync\` \`jbFileSync\`) + live value inspection
(\`inspect_value\` / \`list_values\`, via \`@tomlarkworthy/summarizejs\`) + raw content inspection
(\`read_content\` — read/enumerate/decode the microkernel \`<script>\` blocks). All capabilities are registered
as tools through \`@tomlarkworthy/robocoop-4-tools\` \`registerTool\` — the notebook's pluggable tool seam.`
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

  return [inspect_value, list_values];
};

// Build the content-inspection tool: read/enumerate the RAW microkernel content blocks. A lopecode notebook
// is a single HTML file whose every piece — the bootloader, bootconf.json, the bundled standard library, each
// module, and each file attachment — is a `<script type="text/plain" id data-mime data-encoding>` block,
// resolved at runtime by `window.lopecode.contentSync`. Module files are already projected into the bash fs
// under /notebook/, but the bootloader, config, library bundles and attachment BYTES are not — this tool
// reaches them, decompressing gzip so an attachment can actually be decoded. Browser-only (reads the DOM).
const _contentTools = function _contentTools(defineTool, truncate){
  const b64ToBytes = (b64) => {
    const bin = atob(String(b64).replace(/\s+/g, ''));
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  };
  const gunzip = async (bytes) => {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  };
  const blocks = () => Array.from(document.querySelectorAll('script[type="text/plain"][id]'));
  const classify = (id) => {
    if (id === 'bootconf.json') return 'config';
    if (/^https?:\/\//.test(id) || /\.css$/.test(id)) return 'style';
    if (/^@[^/]+\/[^/]+\/.+/.test(id)) return 'file-attachment';   // @user/mod/path.ext
    if (/^@[^/]+\/[^/]+$/.test(id)) return 'module';               // @user/mod
    return 'library';                                              // runtime, inspector, shims, stdlib bundles…
  };
  // Resolve one block to decoded bytes (gunzipping gzip) + its metadata.
  const resolve = async (el) => {
    const mime = el.getAttribute('data-mime') || '(none)';
    const enc = (el.getAttribute('data-encoding') || 'text').toLowerCase();
    const raw = el.textContent || '';
    let bytes, note = enc;
    if (enc === 'text') { bytes = new TextEncoder().encode(raw); }
    else {
      bytes = b64ToBytes(raw);
      const gz = enc.includes('gzip') || mime === 'application/gzip' || (bytes[0] === 0x1f && bytes[1] === 0x8b);
      if (gz) { try { bytes = await gunzip(bytes); note = enc + ' → gunzipped'; } catch (e) { note = enc + ' (gunzip failed: ' + ((e && e.message) || e) + ')'; } }
    }
    return { mime, enc: note, bytes };
  };
  const looksText = (mime) => /^(text\/|application\/(javascript|json|.*\+json|xml))/.test(mime) || /css|javascript|json|html|xml|plain/.test(mime);

  const read_content = defineTool({
    id: 'read_content',
    description:
      'Inspect the RAW content blocks of this lopecode notebook — the microkernel layer beneath the module ' +
      'files. With NO id, enumerates every `<script type="text/plain">` block grouped by kind (config, module, ' +
      'file-attachment, library, style) so you can see exactly what this single HTML file is built from. With ' +
      'an `id`, returns that block decoded to text (gzip is decompressed automatically) plus its mime, encoding ' +
      'and decompressed byte size — use it to read bootconf.json, the bootloader, the bundled standard library, ' +
      'or to DECODE a file attachment (e.g. a gzipped library bundle). Module sources are easier to read with ' +
      'bash under /notebook/; use this for everything that is NOT a module file.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'A content block id, e.g. "bootconf.json", "@tomlarkworthy/bootloader", or "@user/mod/file.gz". Omit to list all blocks.' },
      },
      additionalProperties: false,
    },
    execute: async ({ id } = {}) => {
      if (!id) {
        const groups = {};
        for (const el of blocks()) { const k = classify(el.id); (groups[k] ||= []).push(el.id); }
        const order = ['config', 'module', 'file-attachment', 'library', 'style'];
        const out = [];
        for (const k of order) {
          const ids = (groups[k] || []).sort();
          if (!ids.length) continue;
          out.push('# ' + k + ' (' + ids.length + ')');
          for (const x of ids) out.push('  ' + x);
        }
        const total = blocks().length;
        return { title: 'content blocks (' + total + ')', output: out.join('\n'), metadata: { total } };
      }
      const el = document.getElementById(id);
      if (!el || el.getAttribute('type') !== 'text/plain') return { title: 'read_content', output: 'No content block with id ' + JSON.stringify(id) + '. Run read_content with no id to list them.' };
      const { mime, enc, bytes } = await resolve(el);
      const head = 'id: ' + id + '\nmime: ' + mime + '\nencoding: ' + enc + '\ndecoded bytes: ' + bytes.length + '\n---\n';
      if (looksText(mime) || mime === 'application/gzip') {
        const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        return { title: 'read_content ' + id, output: head + truncate(text, 4000), metadata: { bytes: bytes.length, mime } };
      }
      return { title: 'read_content ' + id, output: head + '(binary ' + mime + ', ' + bytes.length + ' bytes — not shown as text)', metadata: { bytes: bytes.length, mime } };
    },
  });

  return [read_content];
};

const _hostMount = function _hostMount(html, jbFileSync, rc4_workspace, currentModules, runtime, createModule, invalidation, valueTools, contentTools, registerTool, unregisterTool){
  // 1. realtime self-edit
  const status = jbFileSync({
    fs: rc4_workspace.fs,
    currentModules,
    runtime,
    createModule,
    notebookId: 'notebook',
    invalidation,
  });
  // 2. live value- and content-inspection tools, registered through the plugin registry
  const tools = [...valueTools, ...contentTools];
  tools.forEach((t) => registerTool(t));
  invalidation.then(() => tools.forEach((t) => unregisterTool(t.id)));

  return html`<div style="font:12px ui-monospace,Menlo,monospace;color:#7ee787;display:flex;flex-direction:column;gap:6px">
    <div>● host integration active — self-edit + value + content inspection</div>
    <div style="color:#8b949e">tools: ${tools.map((t) => t.id).join(', ')} (edit /notebook/&lt;id&gt;.js with bash to change the notebook)</div>
    ${status}
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
  main.define("truncate", ["module @tomlarkworthy/robocoop-4-core", "@variable"], (_, v) => v.import("truncate", _));

  main.define("module @tomlarkworthy/robocoop-4-tools", async () =>
    runtime.module((await import("/@tomlarkworthy/robocoop-4-tools.js?v=4")).default));
  main.define("registerTool", ["module @tomlarkworthy/robocoop-4-tools", "@variable"], (_, v) => v.import("registerTool", _));
  main.define("unregisterTool", ["module @tomlarkworthy/robocoop-4-tools", "@variable"], (_, v) => v.import("unregisterTool", _));

  main.define("module @tomlarkworthy/summarizejs", async () =>
    runtime.module((await import("/@tomlarkworthy/summarizejs.js?v=4")).default));
  main.define("summarizeJS", ["module @tomlarkworthy/summarizejs", "@variable"], (_, v) => v.import("summarizeJS", _));

  $def("rc4h_doc_hostbridge", null, ["md"], _doc_hostbridge);
  $def("rc4h_value_tools", "valueTools", ["defineTool", "summarizeJS", "currentModules", "runtime", "observe"], _valueTools);
  $def("rc4h_content_tools", "contentTools", ["defineTool", "truncate"], _contentTools);
  $def("rc4h_mount", null, ["html", "jbFileSync", "rc4_workspace", "currentModules", "runtime", "createModule", "invalidation", "valueTools", "contentTools", "registerTool", "unregisterTool"], _hostMount);
  return main;
}
