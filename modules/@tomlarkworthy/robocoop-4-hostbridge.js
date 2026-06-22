// @tomlarkworthy/robocoop-4-hostbridge — OPTIONAL realtime host self-editing.
//
// Mounts justbash-filesync's jbFileSync engine over the agent's workspace fs (rc4_workspace, from
// -engine). On mount it disassembles every live module to /notebook/<id>.js (exporter-3's exportModuleJS
// — the canonical module format) and then continuously watches those files: any edit, or a brand-new
// module file the agent writes with bash, is applied to the live runtime within ~600ms (probeDefine +
// jbApply, creating the module if new). NO host_sync/host_apply tools and NO bespoke format — the agent
// just reads/writes /notebook/<id>.js with its bash tool and the notebook rewrites itself.
//
// A notebook that wants robocoop-4 WITHOUT self-editing simply omits this module. Browser-only (drives
// the live runtime); node CI skips it.

const _doc_hostbridge = function _doc_hostbridge(md){return(
md`### robocoop-4 realtime host file-sync
Reuses \`@tomlarkworthy/justbash-filesync\`'s \`jbFileSync\` engine (itself built on exporter-3's
\`exportModuleJS\` + file-sync's \`probeDefine\` + \`jbApply\`). Live modules are projected to
\`/notebook/<id>.js\` and a watch loop applies any edited or newly-written module file back to the live
runtime — creating the module if it is not loaded yet. The agent edits files with bash; no tool calls.`
)};

const _hostMount = function _hostMount(html, jbFileSync, rc4_workspace, currentModules, runtime, createModule, invalidation){
  const status = jbFileSync({
    fs: rc4_workspace.fs,
    currentModules,
    runtime,
    createModule,
    notebookId: 'notebook',
    invalidation,
  });
  return html`<div style="font:12px ui-monospace,Menlo,monospace;color:#7ee787;display:flex;flex-direction:column;gap:6px">
    <div>● realtime host self-edit active — edit /notebook/&lt;id&gt;.js with bash; changes apply live</div>
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

  main.define("module @tomlarkworthy/module-map", async () =>
    runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));
  main.define("currentModules", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("currentModules", _));

  $def("rc4h_doc_hostbridge", null, ["md"], _doc_hostbridge);
  $def("rc4h_mount", null, ["html", "jbFileSync", "rc4_workspace", "currentModules", "runtime", "createModule", "invalidation"], _hostMount);
  return main;
}
