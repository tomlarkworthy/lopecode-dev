#!/usr/bin/env node
/**
 * Build the @tomlarkworthy/zig lopebook by replacing the notes module
 * in the notes lopebook template with a zig compilation module.
 *
 * The Zig compiler WASM, standard library, and worker JS are embedded
 * as gzipped file attachments for fully offline operation.
 */

import { readFileSync, writeFileSync } from 'fs';

const TEMPLATE = 'lopebooks/notebooks/@tomlarkworthy_notes.html';
const OUTPUT = 'lopebooks/notebooks/@tomlarkworthy_compile-zig.html';

// File attachments to embed (gzipped, base64-encoded)
const ATTACHMENTS = {
  'zig-compiler.wasm.gz': { path: '/tmp/zig-compiler.wasm.gz', mime: 'application/gzip' },
  'zig-stdlib.tar.gz':    { path: '/tmp/zig-stdlib.tar.gz',    mime: 'application/gzip' },
  'zig-worker.js.gz':     { path: '/tmp/zig-worker.js.gz',     mime: 'application/gzip' },
  'zig-runner.js.gz':     { path: '/tmp/zig-runner.js.gz',     mime: 'application/gzip' },
};

// Build base64-encoded attachment script tags
function buildAttachmentScripts() {
  let scripts = '';
  for (const [name, info] of Object.entries(ATTACHMENTS)) {
    const data = readFileSync(info.path);
    const b64 = data.toString('base64');
    scripts += `<script id="@tomlarkworthy/compile-zig/${name}" \n  type="text/plain"\n  data-encoding="base64"\n  data-mime="${info.mime}"\n>\n${b64}\n</script>\n`;
  }
  return scripts;
}

// The Zig module cells
const ZIG_MODULE_CELLS = `
const _1 = function _1(md){return(
md\`# Zig Notebook

Compile and run [Zig](https://ziglang.org/) code in your browser using WebAssembly.

The Zig compiler and standard library are embedded in this notebook (~4MB compressed). No network required after loading.

Uses the [Zig 0.14.0](https://ziglang.org/) self-hosted WebAssembly backend from [zigtools/playground](https://github.com/zigtools/playground).

**Ctrl/Cmd+Enter** to compile and run.
\`
)};
const _2 = function _2(exporter){return(
exporter()
)};
const _zig_source = function _zig_source(Inputs){return(
Inputs.textarea({
  label: "Zig Source",
  rows: 20,
  value: \`const std = @import("std");

pub fn main() void {
    std.debug.print("Hello, {s}!\\\\n", .{"World"});
}
\`,
  monospace: true,
  submit: false
})
)};
const _compile_button = function _compile_button(Inputs){return(
Inputs.button("Compile & Run")
)};
const _unzip = function _unzip(Response,DecompressionStream){return(
async (attachment) =>
  new Uint8Array(await (await new Response(
    (await attachment.stream()).pipeThrough(new DecompressionStream("gzip"))
  )).arrayBuffer())
)};
const _unzip_text = function _unzip_text(Response,DecompressionStream){return(
async (attachment) =>
  await new Response(
    (await attachment.stream()).pipeThrough(new DecompressionStream("gzip"))
  ).text()
)};
const _zig_assets = function _zig_assets(unzip,unzip_text,FileAttachment){return(
{
  _cache: null,
  async load() {
    if (this._cache) return this._cache;
    const [wasmBytes, stdlibGz, workerCode, runnerCode] = await Promise.all([
      unzip(FileAttachment("zig-compiler.wasm.gz")),
      FileAttachment("zig-stdlib.tar.gz").arrayBuffer(),
      unzip_text(FileAttachment("zig-worker.js.gz")),
      unzip_text(FileAttachment("zig-runner.js.gz")),
    ]);
    // Patch the compiler worker to receive data via postMessage instead of
    // fetching from URLs (which doesn't work from file:// origins).
    // Strategy: override fetch() to serve from memory, add init handler
    // to onmessage, replace URL patterns with sentinel strings.
    const fetchOverride = \`
      let __zigWasm = null, __zigStdlib = null;
      const __origFetch = self.fetch ? self.fetch.bind(self) : null;
      self.fetch = function(input, ...args) {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        if (url === '__ZIG_WASM__') {
          return Promise.resolve(new Response(__zigWasm, {
            status: 200, headers: { 'Content-Type': 'application/wasm' }
          }));
        }
        if (url === '__ZIG_STDLIB__') {
          return Promise.resolve(new Response(__zigStdlib, {
            status: 200, headers: { 'Content-Type': 'application/gzip' }
          }));
        }
        if (__origFetch) return __origFetch(input, ...args);
        return Promise.reject(new Error('fetch not available'));
      };
    \`;
    const patchedWorker = fetchOverride + workerCode
      .replace(
        'new URL("/assets/zig.tar-DsLdz4tk.gz",self.location.href)',
        '"__ZIG_STDLIB__"'
      )
      .replace(
        'new URL("/assets/zig-yHkVAafI.wasm",self.location.href)',
        '"__ZIG_WASM__"'
      )
      .replace(
        'onmessage=h=>{h.data.run&&le(h.data.run)}',
        'onmessage=h=>{if(h.data.__initData){__zigWasm=h.data.__initData.wasm;__zigStdlib=h.data.__initData.stdlib;return}h.data.run&&le(h.data.run)}'
      );
    this._cache = { patchedWorker, runnerCode, wasmBytes, stdlibGz: new Uint8Array(stdlibGz) };
    return this._cache;
  }
}
)};
const _create_worker_from_code = function _create_worker_from_code(){return(
function createWorkerFromCode(code) {
  const blob = new Blob([code], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  URL.revokeObjectURL(url);
  return worker;
}
)};
const _compile_zig = function _compile_zig(zig_assets,create_worker_from_code){return(
function compileZig(source) {
  return new Promise(async (resolve, reject) => {
    const assets = await zig_assets.load();
    const worker = create_worker_from_code(assets.patchedWorker);
    let hasResult = false;
    let stderr = '';
    const timeout = setTimeout(() => {
      if (!hasResult) {
        hasResult = true;
        worker.terminate();
        reject(new Error('Compilation timed out (60s)'));
      }
    }, 60000);

    worker.onmessage = (e) => {
      if (e.data.stderr) stderr += e.data.stderr;
      if (e.data.compiled) {
        hasResult = true;
        clearTimeout(timeout);
        worker.terminate();
        resolve({ compiled: e.data.compiled, stderr });
      }
    };
    worker.onerror = (e) => {
      if (!hasResult) {
        hasResult = true;
        clearTimeout(timeout);
        worker.terminate();
        reject(new Error('Worker error: ' + e.message));
      }
    };
    // Send init data (wasm + stdlib) first, then the compile command
    worker.postMessage({
      __initData: {
        wasm: assets.wasmBytes.buffer,
        stdlib: assets.stdlibGz.buffer
      }
    });
    worker.postMessage({ run: source });

    // Detect compilation failure (no compiled output, stderr settles)
    let lastLen = 0;
    const check = setInterval(() => {
      if (hasResult) { clearInterval(check); return; }
      if (stderr.length > 0 && stderr.length === lastLen) {
        hasResult = true;
        clearTimeout(timeout);
        clearInterval(check);
        worker.terminate();
        resolve({ compiled: null, stderr });
      }
      lastLen = stderr.length;
    }, 2000);
  });
}
)};
const _run_wasm = function _run_wasm(zig_assets,create_worker_from_code){return(
function runWasm(wasmBytes) {
  return new Promise(async (resolve) => {
    const assets = await zig_assets.load();
    const worker = create_worker_from_code(assets.runnerCode);
    let output = '';
    const timeout = setTimeout(() => {
      worker.terminate();
      resolve({ output: output + '\\n[Execution timed out after 30s]', exitCode: -1 });
    }, 30000);

    worker.onmessage = (e) => {
      if (e.data.stderr) output += e.data.stderr;
      if (e.data.done) {
        clearTimeout(timeout);
        worker.terminate();
        resolve({ output, exitCode: 0 });
      }
    };
    worker.onerror = (e) => {
      clearTimeout(timeout);
      worker.terminate();
      resolve({ output: output + '\\nRunner error: ' + e.message, exitCode: 1 });
    };
    worker.postMessage({ run: wasmBytes });
  });
}
)};
const _compilation_result = function _compilation_result(compile_button,compile_zig,$0)
{
  compile_button;
  return compile_zig($0.value);
}
;
const _execution_result = function _execution_result(compilation_result,run_wasm)
{
  if (!compilation_result.compiled) return { output: '', exitCode: -1, skipped: true };
  return run_wasm(compilation_result.compiled);
}
;
const _output_display = function _output_display(compilation_result,execution_result,htl)
{
  const compileErrors = compilation_result.stderr || '';
  const runOutput = execution_result.output || '';
  const skipped = execution_result.skipped;

  if (!compilation_result.compiled && compileErrors) {
    return htl.html\`<div style="font-family: monospace; white-space: pre-wrap;">
<div style="color: #e94560; font-weight: bold;">Compilation Error:</div>
<pre style="color: #e94560; background: #1a1a2e; padding: 12px; border-radius: 4px; overflow: auto; max-height: 400px;">\${compileErrors}</pre>
</div>\`;
  }

  if (skipped) {
    return htl.html\`<div style="color: #888; font-family: monospace;">No output yet. Click "Compile & Run".</div>\`;
  }

  return htl.html\`<div style="font-family: monospace; white-space: pre-wrap;">
<div style="color: #4caf50; font-weight: bold;">Output:</div>
<pre style="background: #1a1a2e; color: #e0e0e0; padding: 12px; border-radius: 4px; overflow: auto; max-height: 400px;">\${runOutput}</pre>
\${compileErrors ? htl.html\`<details><summary style="color: #f5a623; cursor: pointer;">Compiler stderr</summary><pre style="color: #f5a623; background: #1a1a2e; padding: 8px; border-radius: 4px;">\${compileErrors}</pre></details>\` : ''}
</div>\`;
}
;
const _examples_select = function _examples_select(Inputs){return(
Inputs.select(
  ["hello", "fibonacci", "wasm-exports"],
  { label: "Load example", value: "hello" }
)
)};
const _load_example = function _load_example(examples_select,$0,$1)
{
  const examples = {
    "hello": \`const std = @import("std");

pub fn main() void {
    std.debug.print("Hello, {s}!\\\\n", .{"World"});
}
\`,
    "fibonacci": \`const std = @import("std");

fn fibonacci(n: u64) u64 {
    if (n <= 1) return n;
    var a: u64 = 0;
    var b: u64 = 1;
    var i: u64 = 2;
    while (i <= n) : (i += 1) {
        const tmp = a + b;
        a = b;
        b = tmp;
    }
    return b;
}

pub fn main() void {
    var i: u64 = 0;
    while (i <= 20) : (i += 1) {
        std.debug.print("fib({}) = {}\\\\n", .{ i, fibonacci(i) });
    }
}
\`,
    "wasm-exports": \`const std = @import("std");

export fn add(a: i32, b: i32) i32 {
    return a + b;
}

export fn multiply(a: i32, b: i32) i32 {
    return a * b;
}

pub fn main() void {
    const x = add(3, 4);
    const y = multiply(5, 6);
    std.debug.print("add(3, 4) = {}\\\\n", .{x});
    std.debug.print("multiply(5, 6) = {}\\\\n", .{y});
    std.debug.print("add + multiply = {}\\\\n", .{x + y});
}
\`
  };
  const src = examples[examples_select];
  if (src) {
    $0.value = src;
    $0.dispatchEvent(new Event("input", {bubbles: true}));
    // Trigger compilation after source value propagates
    setTimeout(() => $1.dispatchEvent(new Event("input", {bubbles: true})), 100);
  }
}
;
`;

// File attachment names for the define() function
const FILE_ATTACHMENT_NAMES = Object.keys(ATTACHMENTS);

// The define() function for the module
const ZIG_DEFINE_FUNCTION = `
function _importElement(specifier, notebook)
{
  const importElement = document.createElement("a");
  if (notebook) {
    const notebookLink = document.createElement("a");
    notebookLink.href = new URL(notebook);
    notebookLink.textContent = \`"\${specifier}"\`;
    importElement.appendChild(notebookLink);
  }
  return importElement;
}
export default function define(runtime, observer) {
  const main = runtime.module();
  const fileAttachments = new Map(${JSON.stringify(FILE_ATTACHMENT_NAMES)}.map((name) => {
    const module_name = "@tomlarkworthy/compile-zig";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  main.variable(observer()).define(["md"], _1);
  main.variable(observer()).define(["exporter"], _2);
  main.variable(observer("viewof zig_source")).define("viewof zig_source", ["Inputs"], _zig_source);
  main.variable(observer("zig_source")).define("zig_source", ["Generators", "viewof zig_source"], (G, _) => G.input(_));
  main.variable(observer("viewof compile_button")).define("viewof compile_button", ["Inputs"], _compile_button);
  main.variable(observer("compile_button")).define("compile_button", ["Generators", "viewof compile_button"], (G, _) => G.input(_));
  main.variable().define("unzip", ["Response", "DecompressionStream"], _unzip);
  main.variable().define("unzip_text", ["Response", "DecompressionStream"], _unzip_text);
  main.variable().define("zig_assets", ["unzip", "unzip_text", "FileAttachment"], _zig_assets);
  main.variable().define("create_worker_from_code", _create_worker_from_code);
  main.variable().define("compile_zig", ["zig_assets", "create_worker_from_code"], _compile_zig);
  main.variable().define("run_wasm", ["zig_assets", "create_worker_from_code"], _run_wasm);
  main.variable().define("compilation_result", ["compile_button", "compile_zig", "viewof zig_source"], _compilation_result);
  main.variable().define("execution_result", ["compilation_result", "run_wasm"], _execution_result);
  main.variable(observer()).define("output_display", ["compilation_result", "execution_result", "htl"], _output_display);
  main.variable(observer("viewof examples_select")).define("viewof examples_select", ["Inputs"], _examples_select);
  main.variable(observer("examples_select")).define("examples_select", ["Generators", "viewof examples_select"], (G, _) => G.input(_));
  main.variable().define("load_example", ["examples_select", "viewof zig_source", "viewof compile_button"], _load_example);
  main.define("module @tomlarkworthy/exporter-2", async () => runtime.module((await import("/@tomlarkworthy/exporter-2.js?v=4")).default));
  main.define("exporter", ["module @tomlarkworthy/exporter-2", "@variable"], (_, v) => v.import("exporter", _));
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));
  main.define("module @tomlarkworthy/editor-5", async () => runtime.module((await import("/@tomlarkworthy/editor-5.js?v=4")).default));
  main.define("context_menu", ["module @tomlarkworthy/editor-5", "@variable"], (_, v) => v.import("context_menu", _));
  return main;
}
`;

// Read template
let html = readFileSync(TEMPLATE, 'utf-8');

// 1. Replace title
html = html.replace(
  '<title>@tomlarkworthy/notes</title>',
  '<title>@tomlarkworthy/compile-zig</title>'
);

// 2. Remove notes.json file attachment
html = html.replace(
  /<script id="@tomlarkworthy\/notes\/notes\.json"[^>]*>[\s\S]*?<\/script>\n?/,
  ''
);

// 3. Build attachment scripts
const attachmentScripts = buildAttachmentScripts();

// 4. Replace notes module with zig module (including attachment scripts before the module)
html = html.replace(
  /<script id="@tomlarkworthy\/notes"\s+type="text\/plain"\s+data-mime="application\/javascript"\s*>[\s\S]*?export default function define[\s\S]*?<\/script>/,
  `${attachmentScripts}<script id="@tomlarkworthy/compile-zig" \n  type="text/plain"\n  data-mime="application/javascript"\n>${ZIG_MODULE_CELLS}${ZIG_DEFINE_FUNCTION}</script>`
);

// 5. Update bootconf - replace notes with compile-zig in mains and hash
html = html.replaceAll('@tomlarkworthy/notes', '@tomlarkworthy/compile-zig');

writeFileSync(OUTPUT, html);
const sizeMB = (html.length / 1024 / 1024).toFixed(1);
console.log(`Written to ${OUTPUT}`);
console.log(`Size: ${sizeMB} MB`);

// Verify attachments are present
for (const name of FILE_ATTACHMENT_NAMES) {
  const tag = `@tomlarkworthy/compile-zig/${name}`;
  if (html.includes(tag)) {
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ ${name} MISSING`);
  }
}
