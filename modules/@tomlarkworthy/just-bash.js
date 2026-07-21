const _e1yf8c = function _anonymous(md) {return (md`# @tomlarkworthy/just-bash

Engine module. Loads [just-bash](https://justbash.dev) (vercel-labs \`just-bash@3.0.1\`) into the Observable runtime and re-exports its public classes.

One job: make a sandboxed bash interpreter with an in-memory virtual filesystem available to other modules. just-bash parses and interprets bash (it does **not** \`eval\`), ships ~80 coreutils-style commands (\`grep sed awk jq cut sort find ls cat …\`), and never touches the host — perfect for letting an agent manipulate notebook content safely.`);};
const _1d8rbf6 = async function _justBashModule(FileAttachment) {
    const att = FileAttachment('just-bash.browser.js.gz');
    const buf = await new Response((await att.stream()).pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: 'text/javascript' }));
    return await import(url);
};
const _1rdwfbv = function _Bash(justBashModule) {return (justBashModule.Bash);};
const _x5yeg4 = function _InMemoryFs(justBashModule) {return (justBashModule.InMemoryFs);};
const _jruc25 = function _MountableFs(justBashModule) {return (justBashModule.MountableFs);};
const _5fi28r = function _defineCommand(justBashModule) {return (justBashModule.defineCommand);};
const _6oywdk = function _getCommandNames(justBashModule) {return (justBashModule.getCommandNames);};
const _vwnrey = function _anonymous(md) {
    return md`## Implementation

\`\`\`js
justBashModule = {
  const att = FileAttachment("just-bash.browser.js.gz");
  const buf = await new Response((await att.stream()).pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
  return import(URL.createObjectURL(new Blob([buf], {type: "text/javascript"})));
}
\`\`\`

just-bash ships an ESM browser build that needs no Node APIs. The bundle is vendored as a gzipped \`FileAttachment\` embedded in this notebook (the \`@tomlarkworthy/acorn-8-11-3\` pattern): we gunzip it with \`DecompressionStream\` and import the resulting blob URL. No CDN, no network — the notebook runs fully offline as a single file. The package's \`/browser\` export drops \`OverlayFs\`/\`ReadWriteFs\` (those need \`node:fs\`) and keeps \`InMemoryFs\` — exactly the sandbox we want.

The named re-exports below (\`Bash\`, \`InMemoryFs\`, \`MountableFs\`, \`defineCommand\`, \`getCommandNames\`) let consumers write \`import {Bash, InMemoryFs} from "@tomlarkworthy/just-bash"\` instead of reaching into the namespace.`;
};
const _nbqhi1 = async function _engineSmoke(InMemoryFs,Bash,getCommandNames) {
    const fs = new InMemoryFs({ '/hello.txt': 'world\n' });
    const sh = new Bash({
        fs,
        cwd: '/'
    });
    const r = await sh.exec('echo hi | tr a-z A-Z; cat hello.txt');
    return {
        stdout: r.stdout,
        exitCode: r.exitCode,
        commandCount: getCommandNames().length
    };
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  const fileAttachments = new Map(["just-bash.browser.js.gz"].map((name) => {
    const module_name = "@tomlarkworthy/just-bash";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}];
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  $def("_e1yf8c", null, ["md"], _e1yf8c);  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("importShim", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("importShim", _));  
  $def("_1d8rbf6", "justBashModule", ["FileAttachment"], _1d8rbf6);  
  $def("_1rdwfbv", "Bash", ["justBashModule"], _1rdwfbv);  
  $def("_x5yeg4", "InMemoryFs", ["justBashModule"], _x5yeg4);  
  $def("_jruc25", "MountableFs", ["justBashModule"], _jruc25);  
  $def("_5fi28r", "defineCommand", ["justBashModule"], _5fi28r);  
  $def("_6oywdk", "getCommandNames", ["justBashModule"], _6oywdk);  
  $def("_vwnrey", null, ["md"], _vwnrey);  
  $def("_nbqhi1", "engineSmoke", ["InMemoryFs","Bash","getCommandNames"], _nbqhi1);
  return main;
}