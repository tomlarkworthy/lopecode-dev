// node:process shim. The full process object is built in bootstrap.mjs and set
// on globalThis BEFORE cli.js imports anything, so here we just re-export it.
import { register } from "./registry.mjs";

const proc = globalThis.process;
register("process", proc);
export default proc;
export const {
  env, argv, platform, arch, version, versions, pid, cwd, chdir,
  nextTick, exit, hrtime, stdout, stderr, stdin, on, once, off,
  emit, removeListener, addListener, exitCode, title, execPath,
  binding, features, config, kill, umask, uptime, memoryUsage,
  emitWarning, getuid, geteuid, getgid,
} = proc;
