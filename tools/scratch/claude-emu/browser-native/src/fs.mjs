// node:fs — memfs-backed by default, but delegates to an INJECTABLE host-fs
// backend when one is provided at globalThis.__HOSTFS. This lets a lopecode
// notebook back cli.js's Read/Write/Edit/Grep with robocoop-5's virtual
// filesystem while the standalone harness keeps memfs.
//
// Host-fs interface (all synchronous; prime-then-serve):
//   snapshot(): { [path]: string }   // called once at boot to prime the cache
//   readSync(path): string | null     // null = ENOENT
//   writeSync(path, content): void     // write-through (may fire async apply)
//   list(): string[]                   // flat path list
//   exists(path): boolean
//
// The primed cache IS the memfs volume: snapshot() is written into memfs at boot,
// reads/readdir/exists/stat serve synchronously from memfs, writeFileSync updates
// memfs AND calls hostfs.writeSync. ~/.claude.json onboarding seeding (in
// fs-core) is preserved in both modes.
import { fs as memfs, vol } from "./fs-core.mjs";
import { register } from "./registry.mjs";

const fs = memfs;
if (!fs.fsyncSync) fs.fsyncSync = () => {};
if (!fs.fsync) fs.fsync = (fd, cb) => cb && cb(null);
if (!fs.fstat) fs.fstat = (fd, cb) => cb && cb(null, fs.fstatSync ? fs.fstatSync(fd) : {});
if (!fs.rm) fs.rm = (p, o, cb) => { const c = typeof o === "function" ? o : cb; try { fs.rmSync(p, typeof o === "object" ? o : {}); c && c(null); } catch (e) { c && c(e); } };
if (!fs.copyFileSync) fs.copyFileSync = (a, b) => fs.writeFileSync(b, fs.readFileSync(a));

// ---- optional method tracing (report which fs methods cli.js exercises) ----
const TRACE = !!globalThis.__FS_TRACE;
if (TRACE) {
  const seen = (globalThis.__fsTrace = globalThis.__fsTrace || {});
  for (const name of Object.keys(fs)) {
    const orig = fs[name];
    if (typeof orig !== "function") continue;
    fs[name] = function (...args) { seen[name] = (seen[name] || 0) + 1; return orig.apply(this, args); };
  }
}

// ---- host-fs delegation ----
const hostfs = globalThis.__HOSTFS;
if (hostfs && typeof hostfs === "object") {
  const B = globalThis.Buffer;
  const toStr = (c) => (c == null ? "" : typeof c === "string" ? c : (B && B.isBuffer(c) ? c.toString("utf8") : (c instanceof Uint8Array ? new TextDecoder().decode(c) : String(c))));
  const wantsString = (opts) => {
    if (!opts) return false;
    if (typeof opts === "string") return true;                 // encoding string
    if (typeof opts === "object" && opts.encoding) return true;
    return false;
  };

  // capture originals BEFORE wrapping so priming / fallback don't recurse
  const _writeFileSync = fs.writeFileSync.bind(fs);
  const _readFileSync = fs.readFileSync.bind(fs);
  const _existsSync = fs.existsSync.bind(fs);
  const _mkdirSync = fs.mkdirSync.bind(fs);

  // 1) prime memfs from the host snapshot (source of truth for host paths)
  try {
    const snap = typeof hostfs.snapshot === "function" ? hostfs.snapshot() : null;
    if (snap) {
      for (const [p, content] of Object.entries(snap)) {
        try {
          const slash = p.lastIndexOf("/");
          if (slash > 0) _mkdirSync(p.slice(0, slash), { recursive: true });
          _writeFileSync(p, toStr(content));
        } catch {}
      }
    }
  } catch (e) { console.warn("[fs] hostfs prime failed:", e && e.message); }

  // 2) reads prefer the live host (falls back to primed memfs for seeded config)
  fs.readFileSync = function (path, opts) {
    const p = typeof path === "string" ? path : (path && path.toString ? path.toString() : path);
    if (typeof p === "string" && typeof hostfs.readSync === "function") {
      let hv = null;
      try { hv = hostfs.readSync(p); } catch {}
      if (hv != null) return wantsString(opts) ? String(hv) : (B ? B.from(String(hv), "utf8") : new TextEncoder().encode(String(hv)));
    }
    return _readFileSync(path, opts);
  };

  // 3) writes update memfs (the sync cache) AND write through to the host
  fs.writeFileSync = function (path, data, opts) {
    _writeFileSync(path, data, opts);
    const p = typeof path === "string" ? path : (path && path.toString ? path.toString() : path);
    if (typeof p === "string" && typeof hostfs.writeSync === "function") {
      try { hostfs.writeSync(p, toStr(data)); } catch (e) { console.warn("[fs] hostfs writeSync failed:", e && e.message); }
    }
  };

  // 4) existence consults the host as a backstop for paths outside the snapshot
  fs.existsSync = function (path) {
    if (_existsSync(path)) return true;
    const p = typeof path === "string" ? path : (path && path.toString ? path.toString() : path);
    if (typeof p === "string" && typeof hostfs.exists === "function") { try { return !!hostfs.exists(p); } catch {} }
    return false;
  };
}

register("fs", fs);
export default fs;
export const {
  createReadStream, createWriteStream, readFileSync, writeFileSync, existsSync,
  mkdirSync, readdirSync, statSync, lstatSync, realpathSync, unlinkSync,
  rmSync, rmdirSync, readlinkSync, symlinkSync, renameSync, appendFileSync,
  chmodSync, accessSync, openSync, readSync, writeSync, closeSync, fstatSync,
  fsyncSync, fstat, fsync, stat, rm, watch, watchFile, unwatchFile, constants, promises,
} = fs;
