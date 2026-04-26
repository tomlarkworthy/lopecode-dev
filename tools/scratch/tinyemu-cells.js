tinyemu_asset_base = new URL("tinyemu-assets/", location.href).href

tinyemu_debug_log = []

tinyemu_xhr_log = []

tinyemu_term_state = ({ out: [], append(str){ this.out.push(str); this.version = (this.version||0) + 1; }, version: 0 })

tinyemu_xhr_hook = {
  if (!window.__xhrHookInstalled) {
    window.__xhrHookInstalled = true;
    const log = tinyemu_xhr_log;
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(m, u) {
      this.__url = u;
      log.push("[open] " + m + " " + u);
      const r = origOpen.apply(this, arguments);
      this.addEventListener("load", () => {
        try {
          let head = "";
          if (this.response && this.response.byteLength !== undefined) head = "(binary " + this.response.byteLength + " bytes)";
          else if (typeof this.response === "string") head = JSON.stringify(this.response.slice(0, 80));
          log.push("[load " + this.status + "] " + this.__url + " " + head);
        } catch(e) { log.push("[load " + this.status + "] " + this.__url); }
      });
      this.addEventListener("error", () => log.push("[err] " + this.__url));
      return r;
    };
  }
  return { hooked: true };
}

tinyemu_globals_stub = {
  void tinyemu_xhr_hook;
  const term = tinyemu_term_state;
  window.term = { write: (str) => { term.append(str); }, getSize: () => [80, 25] };
  window.update_downloading = () => {};
  window.show_loading = () => {};
  window.graphic_display = () => {};
  window.net_state = null;
  return { installed: true };
}

tinyemu_glue = { void tinyemu_globals_stub; const r = await fetch(tinyemu_asset_base + "riscvemu64-wasm.js"); return await r.text(); }

tinyemu_module = {
  void tinyemu_globals_stub;
  const glue = tinyemu_glue;
  const dbg = tinyemu_debug_log;
  const wasmResp = await fetch(tinyemu_asset_base + "riscvemu64-wasm.wasm");
  const wasmBinary = new Uint8Array(await wasmResp.arrayBuffer());
  return new Promise((resolve, reject) => {
    const Module = {};
    Module.wasmBinary = wasmBinary;
    Module.print = (str) => { dbg.push("[print] " + str); tinyemu_term_state.append(str + "\n"); };
    Module.printErr = (str) => { dbg.push("[err] " + str); };
    Module.locateFile = (path) => tinyemu_asset_base + path;
    Module.onAbort = (what) => { dbg.push("[onAbort] " + what); reject(new Error("abort: " + what)); };
    Module.onRuntimeInitialized = () => { dbg.push("[runtime] initialized"); resolve(Module); };
    try {
      const fn = new Function("Module", "window", "self", "document", glue + "\n;return Module;");
      fn(Module, window, window, document);
    } catch (e) { dbg.push("[construct err] " + e.message); reject(e); }
  });
}

tinyemu_vm = {
  const Module = await tinyemu_module;
  const dbg = tinyemu_debug_log;
  const baseUrl = tinyemu_asset_base + "root-riscv64.cfg";
  dbg.push("[vm_start] calling with baseUrl=" + baseUrl);
  try {
    Module.ccall("vm_start", null,
      ["string", "number", "string", "string", "number", "number", "number", "string"],
      [baseUrl, 64, "", "", 0, 0, 0, ""]);
    dbg.push("[vm_start] returned");
  } catch (e) { dbg.push("[vm_start err] " + e.message); throw e; }
  return { started: true, at: Date.now(), Module };
}

tinyemu_term_text = (tinyemu_vm, tinyemu_term_state.version, tinyemu_term_state.out.join(""))

tinyemu_debug_text = (tinyemu_vm, tinyemu_debug_log.join("\n"))
