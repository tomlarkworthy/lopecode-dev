// Runs as the FIRST module script, before cli.js's import graph executes.
// Builds globalThis.process so the node:process shim can re-export it.
//
// Two modes:
//  - one-shot (`-p`): stdout/stderr buffer to __cliOut + console/DOM; stdin is EOF.
//  - INTERACTIVE (globalThis.__INTERACTIVE): stdout/stderr/stdin are TTY streams
//    bridged to an xterm.js in the PARENT window (a PTY bridge). isTTY=true so
//    cli.js takes the Ink/REPL path instead of the print path.
import { EventEmitter } from "./events.mjs";

const listeners = new EventEmitter();
listeners.setMaxListeners(0);

const INTERACTIVE = !!globalThis.__INTERACTIVE;
const decoder = new TextDecoder();

// cli.js calls the GLOBAL crypto.randomUUID as well as node:crypto's. On an opaque
// origin (a blob: fork of the notebook) that method does not exist — the context is not
// secure — and the session dies at startup before printing anything.
if (globalThis.crypto && typeof globalThis.crypto.randomUUID !== "function") {
  try {
    globalThis.crypto.randomUUID = () => {
      const b = new Uint8Array(16);
      globalThis.crypto.getRandomValues(b);
      b[6] = (b[6] & 0x0f) | 0x40;
      b[8] = (b[8] & 0x3f) | 0x80;
      const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
      return h.slice(0, 4).join("") + "-" + h.slice(4, 6).join("") + "-" + h.slice(6, 8).join("")
        + "-" + h.slice(8, 10).join("") + "-" + h.slice(10).join("");
    };
  } catch {}
}

function termSize() {
  const s = globalThis.__termSize || {};
  return { cols: s.cols || 80, rows: s.rows || 24 };
}

// Output sink: in interactive mode, write ANSI straight to the parent's xterm.
function ptyWrite(s) {
  try {
    if (typeof globalThis.__ptyWrite === "function") { globalThis.__ptyWrite(s); return; }
    const p = window.parent;
    if (p && typeof p.__ptyWrite === "function") p.__ptyWrite(s);
  } catch {}
}

// ---- stdout / stderr ----
class TTYWritable extends EventEmitter {
  constructor(label) {
    super();
    this.setMaxListeners(0);
    this.label = label;
    this.writable = true;
    this.isTTY = INTERACTIVE;
    this.fd = label === "stderr" ? 2 : 1;
  }
  get columns() { return termSize().cols; }
  get rows() { return termSize().rows; }
  getWindowSize() { const { cols, rows } = termSize(); return [cols, rows]; }
  getColorDepth() { return INTERACTIVE ? 24 : 1; }
  hasColors() { return INTERACTIVE; }
  write(chunk, enc, cb) {
    const s = typeof chunk === "string" ? chunk : decoder.decode(chunk);
    (globalThis.__cliOut || (globalThis.__cliOut = { stdout: [], stderr: [] }))[this.label].push(s);
    if (INTERACTIVE) {
      ptyWrite(s);
    } else {
      (this.label === "stderr" ? console.warn : console.log)("[" + this.label + "] " + s.replace(/\n$/, ""));
      try { const el = document.getElementById("log"); if (el) { const line = document.createElement("div"); line.textContent = (this.label === "stderr" ? "stderr| " : "stdout| ") + s.replace(/\n$/, ""); if (this.label === "stderr") line.style.color = "#a00"; el.appendChild(line); } } catch {}
    }
    if (typeof enc === "function") enc();
    else if (typeof cb === "function") cb();
    return true;
  }
  end() {}
  cork() {} uncork() {} setDefaultEncoding() { return this; }
  clearLine(dir, cb) { if (INTERACTIVE) this.write(dir < 0 ? "\x1b[1K" : dir > 0 ? "\x1b[0K" : "\x1b[2K"); const c = typeof dir === "function" ? dir : cb; if (c) c(); return true; }
  cursorTo(x, y, cb) { if (INTERACTIVE) this.write("\x1b[" + ((typeof y === "number" ? y : 0) + 1) + ";" + ((x || 0) + 1) + "H"); const c = typeof y === "function" ? y : cb; if (c) c(); return true; }
  moveCursor(dx, dy, cb) { if (INTERACTIVE) { if (dx) this.write("\x1b[" + Math.abs(dx) + (dx > 0 ? "C" : "D")); if (dy) this.write("\x1b[" + Math.abs(dy) + (dy > 0 ? "B" : "A")); } const c = typeof dy === "function" ? dy : cb; if (c) c(); return true; }
  clearScreenDown(cb) { if (INTERACTIVE) this.write("\x1b[0J"); if (cb) cb(); return true; }
}

// ---- stdin ----
// Node stdin as a TTY. Bridged to parent xterm keystrokes via globalThis.__ptyIn.
// Delivery mode is decided per-flush by which listeners are attached, mirroring
// Node's flowing/paused duality: Ink attaches a 'readable' listener and pulls
// with read(); some startup paths use 'data'/resume().
class TTYReadable extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(0);
    this.readable = true;
    this.isTTY = INTERACTIVE;
    this.isRaw = false;
    this._buf = "";
    this._encoding = "utf8";
    this._resumed = false;
  }
  setRawMode(m) { this.isRaw = !!m; this.emit("rawmode", this.isRaw); return this; }
  setEncoding(e) { this._encoding = e; return this; }
  ref() { return this; }
  unref() { return this; }
  resume() { this._resumed = true; queueMicrotask(() => this._deliver()); return this; }
  pause() { this._resumed = false; return this; }
  read() { if (!this._buf) return null; const c = this._buf; this._buf = ""; return c; }
  on(event, fn) { super.on(event, fn); if (event === "data" || event === "readable") queueMicrotask(() => this._deliver()); return this; }
  addListener(event, fn) { return this.on(event, fn); }
  once(event, fn) { super.once(event, fn); if (event === "data" || event === "readable") queueMicrotask(() => this._deliver()); return this; }
  _push(data) { if (data == null || data === "") return; this._buf += (typeof data === "string" ? data : decoder.decode(data)); queueMicrotask(() => this._deliver()); }
  _deliver() {
    if (!this._buf) return;
    if (this.listenerCount("readable") > 0) { this.emit("readable"); return; }
    if (this.listenerCount("data") > 0 || this._resumed) { const c = this._buf; this._buf = ""; this.emit("data", c); return; }
    // otherwise keep buffered until a consumer appears
  }
  destroy() { this.emit("close"); return this; }
  pipe(dest) { this.on("data", (c) => dest.write && dest.write(c)); return dest; }
  [Symbol.asyncIterator]() {
    const self = this; const queue = []; let done = false; let resolveNext = null;
    self.on("data", (c) => { if (resolveNext) { resolveNext({ value: c, done: false }); resolveNext = null; } else queue.push(c); });
    self.on("end", () => { done = true; if (resolveNext) { resolveNext({ value: undefined, done: true }); resolveNext = null; } });
    return { next() { if (queue.length) return Promise.resolve({ value: queue.shift(), done: false }); if (done) return Promise.resolve({ value: undefined, done: true }); return new Promise((r) => (resolveNext = r)); } };
  }
}

const startHr = performance.now();
const env = {
  ANTHROPIC_API_KEY: "sk-ant-mock-key-for-browser-native-poc",
  ANTHROPIC_BASE_URL: location.origin, // mock server serves /v1/messages
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
  DISABLE_TELEMETRY: "1",
  DISABLE_ERROR_REPORTING: "1",
  DISABLE_AUTOUPDATER: "1",
  CLAUDE_CODE_DISABLE_TERMINAL_TITLE: "1",
  HOME: "/home/user",
  USER: "user",
  LOGNAME: "user",
  SHELL: "/bin/bash",
  PATH: "/usr/bin:/bin",
  LANG: "en_US.UTF-8",
  TERM: INTERACTIVE ? "xterm-256color" : "dumb",
  PWD: "/home/user/project",
  NODE_ENV: "production",
  CI: INTERACTIVE ? "" : "1",
  TMPDIR: "/tmp",
  ...(INTERACTIVE ? { FORCE_COLOR: "1", COLUMNS: String(termSize().cols), LINES: String(termSize().rows), COLORTERM: "truecolor" } : {}),
  ...(globalThis.__ENV_OVERRIDES || {}),
};

const stdout = new TTYWritable("stdout");
const stderr = new TTYWritable("stderr");
const stdin = INTERACTIVE
  ? new TTYReadable()
  : (() => {
      const s = new EventEmitter();
      s.isTTY = false; s.readable = true;
      s.resume = () => { queueMicrotask(() => s.emit("end")); return s; };
      s.pause = () => s; s.read = () => null; s.setEncoding = () => s;
      s.pipe = (d) => { queueMicrotask(() => { s.emit("end"); d.end && d.end(); }); return d; };
      s.setRawMode = () => s; s.ref = () => s; s.unref = () => s; s.destroy = () => s;
      s[Symbol.asyncIterator] = function () { return { next() { return Promise.resolve({ value: undefined, done: true }); } }; };
      return s;
    })();

const proc = {
  env,
  argv: (globalThis.__ARGV || ["/usr/bin/node", "/cli.js", "-p", "hi"]),
  argv0: "node",
  execPath: "/usr/bin/node",
  execArgv: [],
  platform: "linux",
  arch: "x64",
  version: "v22.0.0",
  versions: { node: "22.0.0", v8: "12.0.0", modules: "127", uv: "1.0.0", openssl: "3.0.0" },
  release: { name: "node" },
  pid: 1234,
  ppid: 1,
  title: "node",
  exitCode: undefined, // Node starts undefined; cli.js treats a defined value as "shutdown requested"
  stdout,
  stderr,
  stdin,
  cwd() { return env.PWD; },
  chdir(d) { env.PWD = d; },
  nextTick(fn, ...a) { queueMicrotask(() => fn(...a)); },
  hrtime: Object.assign(
    function (prev) {
      const now = (performance.now() - startHr) * 1e6; // ns
      const s = Math.floor(now / 1e9);
      const n = Math.floor(now % 1e9);
      if (prev) { let ds = s - prev[0], dn = n - prev[1]; if (dn < 0) { ds--; dn += 1e9; } return [ds, dn]; }
      return [s, n];
    },
    { bigint() { return BigInt(Math.floor((performance.now() - startHr) * 1e6)); } }
  ),
  uptime() { return (performance.now() - startHr) / 1000; },
  memoryUsage: Object.assign(function () { return { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 }; }, { rss() { return 0; } }),
  exit(code) {
    proc.exitCode = code || 0;
    globalThis.__cliExit = proc.exitCode;
    console.log("[process.exit] code=" + proc.exitCode);
    throw new ProcessExit(proc.exitCode);
  },
  kill() { return true; },
  umask() { return 0; },
  emitWarning() {},
  getuid() { return 1000; }, geteuid() { return 1000; }, getgid() { return 1000; }, getegid() { return 1000; },
  binding() { throw new Error("process.binding is not supported"); },
  features: { inspector: false },
  config: { variables: {} },
  setSourceMapsEnabled() {},
  allowedNodeEnvironmentFlags: new Set(),
  // EventEmitter surface
  on: listeners.on.bind(listeners),
  once: listeners.once.bind(listeners),
  off: listeners.off.bind(listeners),
  addListener: listeners.addListener.bind(listeners),
  removeListener: listeners.removeListener.bind(listeners),
  removeAllListeners: listeners.removeAllListeners.bind(listeners),
  emit: listeners.emit.bind(listeners),
  listeners: listeners.listeners.bind(listeners),
  listenerCount: listeners.listenerCount.bind(listeners),
  prependListener: listeners.prependListener.bind(listeners),
  setMaxListeners: listeners.setMaxListeners.bind(listeners),
  eventNames: listeners.eventNames.bind(listeners),
};

class ProcessExit extends Error {
  constructor(code) { super("process.exit(" + code + ")"); this.name = "ProcessExit"; this.code = code; }
}
globalThis.ProcessExit = ProcessExit;

globalThis.process = proc;
globalThis.global = globalThis;

// ---- PTY bridge entry points (called from the parent window / xterm) ----
if (INTERACTIVE) {
  // Parent pushes keystrokes here.
  globalThis.__ptyIn = (data) => { try { stdin._push(data); } catch (e) { console.error("__ptyIn", e); } };
  // Parent notifies size changes; update env + emit 'resize' like SIGWINCH.
  globalThis.__ptyResize = (cols, rows) => {
    globalThis.__termSize = { cols, rows };
    env.COLUMNS = String(cols); env.LINES = String(rows);
    try { stdout.emit("resize"); stderr.emit("resize"); } catch {}
    try { proc.emit("SIGWINCH"); } catch {}
  };
}

console.log("[bootstrap] process installed, interactive=" + INTERACTIVE + " argv=" + JSON.stringify(proc.argv) + " base=" + env.ANTHROPIC_BASE_URL);
