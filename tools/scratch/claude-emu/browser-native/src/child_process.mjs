// node:child_process — graceful-fail stub, with one exception.
// No subprocesses in the browser. spawn() returns a ChildProcess that
// asynchronously emits ENOENT 'error' + exit(1); the sync variants return a
// failure result carrying an ENOENT error. cli.js treats these as "command
// unavailable" and OMITS the startup context (git/rg/uname/…) rather than
// throwing uncaught.
//
// The exception is `rg`: the Glob and Grep tools ARE ripgrep invocations, so an
// ENOENT there costs the agent the ability to list or search files at all. Those
// two are served in-process by ./ripgrep.mjs against the same fs.
import { register } from "./registry.mjs";
import { EventEmitter } from "./events.mjs";
import { isRipgrep, runRipgrep } from "./ripgrep.mjs";

function nullStream() {
  const s = new EventEmitter();
  s.write = () => true; s.end = () => {}; s.pipe = () => s; s.destroy = () => {};
  s.setEncoding = () => s; s.resume = () => s; s.pause = () => s; s.read = () => null;
  return s;
}

// A process that "ran": stdout/stderr arrive on the next microtask, then exit/close.
function emulate(cp, cmd, result) {
  cp.pid = 1;
  cp.exitCode = null; cp.signalCode = null; cp.killed = false;
  cp.spawnfile = cmd; cp.connected = false;
  cp.stdin = nullStream(); cp.stdout = nullStream(); cp.stderr = nullStream();
  cp.stdio = [cp.stdin, cp.stdout, cp.stderr];
  queueMicrotask(() => {
    const B = globalThis.Buffer;
    if (result.stdout) cp.stdout.emit("data", B ? B.from(result.stdout) : result.stdout);
    if (result.stderr) cp.stderr.emit("data", B ? B.from(result.stderr) : result.stderr);
    cp.stdout.emit("end"); cp.stderr.emit("end");
    cp.exitCode = result.code;
    cp.emit("exit", result.code, null);
    cp.emit("close", result.code, null);
  });
}

export class ChildProcess extends EventEmitter {
  constructor(cmd, result) {
    super();
    if (result) { emulate(this, cmd, result); return; }
    this.pid = undefined; // no pid => callers detect failure
    this.exitCode = null; this.signalCode = null; this.killed = false;
    this.spawnfile = cmd; this.connected = false;
    this.stdin = nullStream(); this.stdout = nullStream(); this.stderr = nullStream();
    this.stdio = [this.stdin, this.stdout, this.stderr];
    queueMicrotask(() => {
      const err = new Error(`spawn ${cmd} ENOENT`);
      err.code = "ENOENT"; err.errno = -2; err.syscall = `spawn ${cmd}`; err.path = cmd;
      // Emit 'error' only if a listener exists; an unhandled 'error' would throw
      // and abort the page. cli.js treats a missing optional tool as absent, so
      // we still surface the failure via exit(1)/close.
      if (this.listenerCount("error") > 0) this.emit("error", err);
      else console.warn("[child_process] " + err.message + " (no error listener; degrading to exit 1)");
      this.stdout.emit("end"); this.stderr.emit("end");
      this.exitCode = 1;
      this.emit("exit", 1, null);
      this.emit("close", 1, null);
    });
  }
  kill() { this.killed = true; return true; }
  ref() {} unref() {} disconnect() {} send() { return false; }
}

// rg is the one command with an implementation; everything else still ENOENTs.
function emulated(cmd, args, opts) {
  if (!isRipgrep(cmd, opts)) return null;
  try { return runRipgrep(args || [], (opts && opts.cwd) || "/"); }
  catch (e) { return { code: 2, stdout: "", stderr: `rg: ${e && e.message}\n` }; }
}

export function spawn(cmd, args, opts) {
  const a = Array.isArray(args) ? args : [];
  const o = Array.isArray(args) ? opts : args;
  return new ChildProcess(cmd, emulated(cmd, a, o));
}
export function fork(cmd) { return new ChildProcess(cmd); }

function failResult(cmd) {
  const err = new Error(`spawnSync ${cmd} ENOENT`);
  err.code = "ENOENT"; err.errno = -2; err.syscall = `spawnSync ${cmd}`; err.path = cmd;
  const B = globalThis.Buffer;
  return { pid: 0, status: null, signal: null, output: [null, B ? B.alloc(0) : "", B ? B.alloc(0) : ""], stdout: B ? B.alloc(0) : "", stderr: B ? B.alloc(0) : "", error: err };
}

export function spawnSync(cmd, args, opts) {
  const a = Array.isArray(args) ? args : [];
  const r = emulated(cmd, a, Array.isArray(args) ? opts : args);
  if (!r) return failResult(cmd);
  const B = globalThis.Buffer;
  const buf = (s) => (B ? B.from(s || "") : s || "");
  return { pid: 1, status: r.code, signal: null, output: [null, buf(r.stdout), buf(r.stderr)], stdout: buf(r.stdout), stderr: buf(r.stderr), error: undefined };
}

export function exec(cmd, opts, cb) {
  if (typeof opts === "function") { cb = opts; }
  const child = new ChildProcess(cmd);
  if (cb) queueMicrotask(() => { const e = new Error(`Command failed: ${cmd}`); e.code = 127; cb(e, "", ""); });
  return child;
}
export function execFile(file, args, opts, cb) {
  const c = [args, opts, cb].find((x) => typeof x === "function");
  const a = Array.isArray(args) ? args : [];
  const o = [args, opts].find((x) => x && typeof x === "object" && !Array.isArray(x));
  const r = emulated(file, a, o);
  const child = new ChildProcess(file, r);
  if (c) queueMicrotask(() => {
    if (!r) { const e = new Error(`${file} ENOENT`); e.code = "ENOENT"; c(e, "", ""); return; }
    // exit 1 is ripgrep's "no matches", not a failure the caller should throw on
    let e = null;
    if (r.code > 1) { e = new Error(`Command failed: ${file}`); e.code = r.code; }
    c(e, r.stdout, r.stderr);
  });
  return child;
}
export function execSync(cmd) { const e = new Error(`Command failed: ${cmd} (no shell in browser)`); e.code = 127; e.status = 127; e.stderr = globalThis.Buffer?.alloc(0); throw e; }
export function execFileSync(file, args, opts) {
  const r = emulated(file, Array.isArray(args) ? args : [], Array.isArray(args) ? opts : args);
  if (r) { const B = globalThis.Buffer; return B ? B.from(r.stdout || "") : r.stdout || ""; }
  const e = new Error(`spawnSync ${file} ENOENT`); e.code = "ENOENT"; e.errno = -2; throw e;
}

const mod = { ChildProcess, spawn, fork, spawnSync, exec, execFile, execSync, execFileSync };
register("child_process", mod);
export default mod;
