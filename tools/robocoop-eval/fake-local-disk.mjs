// Headless File System Access API for Playwright: window.showDirectoryPicker() returns a
// synthetic directory handle whose ops are proxied (exposeFunction, no server) to a real host
// directory. Handle shape mirrors lopecode-plugin/dist/fakefs-init.js.
import { promises as fs } from "node:fs";
import path from "node:path";

const installed = new WeakSet();

const BINDING = "__lopeFakeFs";

function fail(name, message) {
  return { ok: false, name, message };
}

/**
 * Build the host-side op handler. Every path is relative to `root` and can never escape it.
 * Ops: list, stat, read, write, mkdir, remove, exists.
 */
export function createFsHandler(root) {
  const rootAbs = path.resolve(root);

  function resolveSafe(rel) {
    const clean = String(rel ?? "").replace(/^\/+/, "");
    if (clean.split(/[\\/]/).some((seg) => seg === "..")) return null;
    const abs = path.resolve(rootAbs, clean);
    if (abs !== rootAbs && !abs.startsWith(rootAbs + path.sep)) return null;
    return abs;
  }

  async function statOf(abs) {
    try {
      const st = await fs.stat(abs);
      return {
        size: st.size,
        lastModified: Math.round(st.mtimeMs),
        kind: st.isDirectory() ? "directory" : "file",
      };
    } catch (err) {
      if (err.code === "ENOENT" || err.code === "ENOTDIR") return null;
      throw err;
    }
  }

  return async function handler(op, args = {}) {
    const abs = resolveSafe(args.path);
    if (abs === null) return fail("NotAllowedError", `path escapes sandbox root: ${args.path}`);
    try {
      switch (op) {
        case "list": {
          const st = await statOf(abs);
          if (!st) return fail("NotFoundError", `no such directory: ${args.path}`);
          if (st.kind !== "directory") return fail("TypeMismatchError", `not a directory: ${args.path}`);
          const ents = await fs.readdir(abs, { withFileTypes: true });
          return {
            ok: true,
            value: ents
              .filter((e) => e.isFile() || e.isDirectory())
              .map((e) => ({ name: e.name, kind: e.isDirectory() ? "directory" : "file" })),
          };
        }
        case "stat":
          return { ok: true, value: await statOf(abs) };
        case "exists":
          return { ok: true, value: (await statOf(abs)) !== null };
        case "read": {
          const st = await statOf(abs);
          if (!st) return fail("NotFoundError", `no such file: ${args.path}`);
          if (st.kind !== "file") return fail("TypeMismatchError", `not a file: ${args.path}`);
          const buf = await fs.readFile(abs);
          return { ok: true, value: buf.toString("base64") };
        }
        case "write": {
          const create = args.create !== false;
          const st = await statOf(abs);
          if (st && st.kind === "directory") return fail("TypeMismatchError", `not a file: ${args.path}`);
          if (!st && !create) return fail("NotFoundError", `no such file: ${args.path}`);
          if (!st && create) await fs.mkdir(path.dirname(abs), { recursive: true });
          const bytes = Buffer.from(args.data || "", "base64");
          if (args.truncate === false && st) {
            const fh = await fs.open(abs, "r+");
            try {
              await fh.write(bytes, 0, bytes.length, 0);
            } finally {
              await fh.close();
            }
          } else {
            await fs.writeFile(abs, bytes);
          }
          return { ok: true, value: { size: bytes.length } };
        }
        case "mkdir": {
          const st = await statOf(abs);
          if (st && st.kind === "file") return fail("TypeMismatchError", `not a directory: ${args.path}`);
          await fs.mkdir(abs, { recursive: true });
          return { ok: true, value: true };
        }
        case "remove": {
          const st = await statOf(abs);
          if (!st) return fail("NotFoundError", `no such entry: ${args.path}`);
          if (st.kind === "directory" && !args.recursive) {
            const ents = await fs.readdir(abs);
            if (ents.length) return fail("InvalidModificationError", `directory not empty: ${args.path}`);
          }
          await fs.rm(abs, { recursive: !!args.recursive, force: true });
          return { ok: true, value: true };
        }
        default:
          return fail("NotSupportedError", `unknown op: ${op}`);
      }
    } catch (err) {
      return fail("InvalidStateError", err && err.message ? err.message : String(err));
    }
  };
}

// Runs in the page on every navigation; defines the synthetic handles and the picker.
function pageInit(cfg) {
  if (window.__lopeFakeLocalDisk) return;

  const BINDING = cfg.binding;
  const MIME = {
    json: "application/json",
    csv: "text/csv",
    tsv: "text/tab-separated-values",
    txt: "text/plain",
    md: "text/markdown",
    js: "text/javascript",
    py: "text/x-python",
    png: "image/png",
    jpg: "image/jpeg",
    gz: "application/gzip",
  };

  async function fsOp(op, args) {
    const bind = window[BINDING];
    if (typeof bind !== "function") throw new DOMException("fake local disk binding missing", "InvalidStateError");
    const res = await bind(op, args || {});
    if (!res || res.ok === false) {
      throw new DOMException((res && res.message) || op + " failed", (res && res.name) || "InvalidStateError");
    }
    return res.value;
  }

  const join = (base, name) => (base ? base + "/" + name : name);

  function bytesToB64(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function b64ToBytes(b64) {
    const bin = atob(b64 || "");
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function mimeOf(name) {
    const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
    return MIME[ext] || "application/octet-stream";
  }
  async function toBytes(chunk) {
    if (typeof chunk === "string") return new TextEncoder().encode(chunk);
    if (chunk instanceof Blob) return new Uint8Array(await chunk.arrayBuffer());
    if (chunk instanceof ArrayBuffer) return new Uint8Array(chunk);
    if (ArrayBuffer.isView(chunk)) return new Uint8Array(chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength));
    throw new TypeError("unsupported write chunk type");
  }

  class FakeFileSystemWritableFileStream {
    constructor(path, initial) {
      this._path = path;
      this._data = initial ? new Uint8Array(initial) : new Uint8Array(0);
      this._size = this._data.length;
      this._pos = 0;
      this._closed = false;
    }
    _ensure(n) {
      if (n <= this._data.length) return;
      const grown = new Uint8Array(Math.max(n, this._data.length * 2, 1024));
      grown.set(this._data.subarray(0, this._size));
      this._data = grown;
    }
    async write(chunk) {
      if (this._closed) throw new TypeError("stream already closed");
      if (chunk && typeof chunk === "object" && !(chunk instanceof Blob) && !ArrayBuffer.isView(chunk) && !(chunk instanceof ArrayBuffer) && "type" in chunk) {
        if (chunk.type === "seek") return void this.seek(chunk.position);
        if (chunk.type === "truncate") return void (await this.truncate(chunk.size));
        if (chunk.type !== "write") throw new DOMException("unsupported command: " + chunk.type, "NotSupportedError");
        if (chunk.position !== undefined && chunk.position !== null) this._pos = chunk.position;
        chunk = chunk.data;
      }
      const bytes = await toBytes(chunk);
      this._ensure(this._pos + bytes.length);
      this._data.set(bytes, this._pos);
      this._pos += bytes.length;
      if (this._pos > this._size) this._size = this._pos;
    }
    async seek(position) {
      this._pos = Number(position) || 0;
    }
    async truncate(size) {
      const n = Number(size) || 0;
      this._ensure(n);
      if (n > this._size) this._data.fill(0, this._size, n);
      this._size = n;
      if (this._pos > n) this._pos = n;
    }
    async close() {
      if (this._closed) return;
      this._closed = true;
      await fsOp("write", { path: this._path, data: bytesToB64(this._data.subarray(0, this._size)), create: true, truncate: true });
    }
    async abort() {
      this._closed = true;
      this._data = new Uint8Array(0);
      this._size = 0;
    }
  }

  class FakeFileSystemFileHandle {
    constructor(path, name) {
      this._path = path;
      this.name = name;
      this.kind = "file";
    }
    async isSameEntry(other) {
      return !!other && other.kind === this.kind && other._path === this._path;
    }
    async queryPermission() { return "granted"; }
    async requestPermission() { return "granted"; }
    async getFile() {
      const [b64, st] = await Promise.all([fsOp("read", { path: this._path }), fsOp("stat", { path: this._path })]);
      return new File([b64ToBytes(b64)], this.name, {
        lastModified: (st && st.lastModified) || Date.now(),
        type: mimeOf(this.name),
      });
    }
    async createWritable(opts = {}) {
      let initial = null;
      if (opts.keepExistingData && (await fsOp("exists", { path: this._path }))) {
        initial = b64ToBytes(await fsOp("read", { path: this._path }));
      }
      return new FakeFileSystemWritableFileStream(this._path, initial);
    }
  }

  class FakeFileSystemDirectoryHandle {
    constructor(path, name) {
      this._path = path;
      this.name = name;
      this.kind = "directory";
    }
    async isSameEntry(other) {
      return !!other && other.kind === this.kind && other._path === this._path;
    }
    async queryPermission() { return "granted"; }
    async requestPermission() { return "granted"; }
    async getDirectoryHandle(name, opts = {}) {
      const child = join(this._path, name);
      const st = await fsOp("stat", { path: child });
      if (st && st.kind !== "directory") throw new DOMException(`'${name}' is a file`, "TypeMismatchError");
      if (!st) {
        if (!opts.create) throw new DOMException(`directory '${name}' not found`, "NotFoundError");
        await fsOp("mkdir", { path: child });
      }
      return new FakeFileSystemDirectoryHandle(child, name);
    }
    async getFileHandle(name, opts = {}) {
      const child = join(this._path, name);
      const st = await fsOp("stat", { path: child });
      if (st && st.kind !== "file") throw new DOMException(`'${name}' is a directory`, "TypeMismatchError");
      if (!st) {
        if (!opts.create) throw new DOMException(`file '${name}' not found`, "NotFoundError");
        await fsOp("write", { path: child, data: "", create: true, truncate: true });
      }
      return new FakeFileSystemFileHandle(child, name);
    }
    async removeEntry(name, opts = {}) {
      await fsOp("remove", { path: join(this._path, name), recursive: !!opts.recursive });
    }
    // Path components from this directory down to `handle`, or null if not a descendant.
    async resolve(handle) {
      if (!handle || typeof handle._path !== "string") return null;
      if (handle._path === this._path) return [];
      const prefix = this._path ? this._path + "/" : "";
      if (!handle._path.startsWith(prefix)) return null;
      return handle._path.slice(prefix.length).split("/");
    }
    async *entries() {
      for (const entry of await fsOp("list", { path: this._path })) {
        const child = join(this._path, entry.name);
        yield [
          entry.name,
          entry.kind === "directory"
            ? new FakeFileSystemDirectoryHandle(child, entry.name)
            : new FakeFileSystemFileHandle(child, entry.name),
        ];
      }
    }
    async *keys() { for await (const [k] of this.entries()) yield k; }
    async *values() { for await (const [, v] of this.entries()) yield v; }
    [Symbol.asyncIterator]() { return this.entries(); }
  }

  const rootHandle = new FakeFileSystemDirectoryHandle("", cfg.rootName || "fakefs");

  Object.defineProperty(window, "showDirectoryPicker", {
    configurable: true,
    writable: true,
    value: async () => rootHandle,
  });
  window.__lopeFakeLocalDisk = { root: rootHandle };
}

/**
 * Install a headless fake local disk on a Playwright BrowserContext.
 * `root` is the host directory the page is sandboxed to; `name` names the root handle.
 * Returns { root, name, handler }. Idempotent per context.
 */
export async function installFakeLocalDisk(context, { root, name = path.basename(path.resolve(root)) } = {}) {
  if (!root) throw new Error("installFakeLocalDisk: `root` is required");
  const rootAbs = path.resolve(root);
  await fs.mkdir(rootAbs, { recursive: true });
  const handler = createFsHandler(rootAbs);
  if (installed.has(context)) return { root: rootAbs, name, handler };
  installed.add(context);
  await context.exposeFunction(BINDING, handler);
  await context.addInitScript(pageInit, { rootName: name, binding: BINDING });
  return { root: rootAbs, name, handler };
}

export default installFakeLocalDisk;
