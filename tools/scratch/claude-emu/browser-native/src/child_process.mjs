// node:child_process — graceful-fail stub.
// No subprocesses in the browser. spawn() returns a ChildProcess that
// asynchronously emits ENOENT 'error' + exit(1); the sync variants return a
// failure result carrying an ENOENT error. cli.js treats these as "command
// unavailable" and OMITS the startup context (git/rg/uname/…) rather than
// throwing uncaught.
import { register } from "./registry.mjs";
import { EventEmitter } from "./events.mjs";

function nullStream() {
  const s = new EventEmitter();
  s.write = () => true; s.end = () => {}; s.pipe = () => s; s.destroy = () => {};
  s.setEncoding = () => s; s.resume = () => s; s.pause = () => s; s.read = () => null;
  return s;
}

export class ChildProcess extends EventEmitter {
  constructor(cmd) {
    super();
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

export function spawn(cmd) { return new ChildProcess(cmd); }
export function fork(cmd) { return new ChildProcess(cmd); }

function failResult(cmd) {
  const err = new Error(`spawnSync ${cmd} ENOENT`);
  err.code = "ENOENT"; err.errno = -2; err.syscall = `spawnSync ${cmd}`; err.path = cmd;
  const B = globalThis.Buffer;
  return { pid: 0, status: null, signal: null, output: [null, B ? B.alloc(0) : "", B ? B.alloc(0) : ""], stdout: B ? B.alloc(0) : "", stderr: B ? B.alloc(0) : "", error: err };
}

export function spawnSync(cmd) { return failResult(cmd); }

export function exec(cmd, opts, cb) {
  if (typeof opts === "function") { cb = opts; }
  const child = new ChildProcess(cmd);
  if (cb) queueMicrotask(() => { const e = new Error(`Command failed: ${cmd}`); e.code = 127; cb(e, "", ""); });
  return child;
}
export function execFile(file, args, opts, cb) {
  const c = [args, opts, cb].find((x) => typeof x === "function");
  const child = new ChildProcess(file);
  if (c) queueMicrotask(() => { const e = new Error(`${file} ENOENT`); e.code = "ENOENT"; c(e, "", ""); });
  return child;
}
export function execSync(cmd) { const e = new Error(`Command failed: ${cmd} (no shell in browser)`); e.code = 127; e.status = 127; e.stderr = globalThis.Buffer?.alloc(0); throw e; }
export function execFileSync(file) { const e = new Error(`spawnSync ${file} ENOENT`); e.code = "ENOENT"; e.errno = -2; throw e; }

const mod = { ChildProcess, spawn, fork, spawnSync, exec, execFile, execSync, execFileSync };
register("child_process", mod);
export default mod;
