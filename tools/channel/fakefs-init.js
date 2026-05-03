// Injected via page.addInitScript() when qa_open_notebook is called with fakefs_root.
// Replaces window.showDirectoryPicker with a synthetic FileSystemDirectoryHandle
// proxied over WebSocket to the lopecode channel server. Channel enforces a
// per-page sandbox root; the page never sees absolute paths.
//
// Config is set on window before this script runs:
//   window.__lopecode_fakefs = { port: number, token: string, rootName: string }

(() => {
  const cfg = window.__lopecode_fakefs;
  if (!cfg || !cfg.port || !cfg.token) return;

  let wsReady = null;
  const pending = new Map();
  let nextId = 1;

  function connect() {
    if (wsReady) return wsReady;
    wsReady = new Promise((resolve, reject) => {
      const w = new WebSocket(`ws://127.0.0.1:${cfg.port}/ws`);
      w.addEventListener("open", () => {
        w.send(JSON.stringify({ type: "fs-pair", token: cfg.token }));
      });
      w.addEventListener("message", (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }
        if (msg.type === "fs-paired") {
          resolve(w);
        } else if (msg.type === "fs-pair-failed") {
          reject(new Error(msg.reason || "fs-pair failed"));
        } else if (msg.type === "fs-response") {
          const p = pending.get(msg.id);
          if (p) {
            pending.delete(msg.id);
            if (msg.ok) p.resolve(msg.result);
            else p.reject(new Error(msg.error || "fs op failed"));
          }
        }
      });
      w.addEventListener("close", () => {
        wsReady = null;
        for (const p of pending.values()) p.reject(new Error("fs ws closed"));
        pending.clear();
      });
      w.addEventListener("error", () => reject(new Error("fs ws error")));
    });
    return wsReady;
  }

  async function fsOp(op, args) {
    const w = await connect();
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      w.send(JSON.stringify({ type: "fs-request", id, op, args }));
    });
  }

  function bytesToB64(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(s);
  }
  function b64ToBytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  class FakeWritableFileStream {
    constructor(path) {
      this._path = path;
      this._chunks = [];
    }
    async write(chunk) {
      if (chunk && typeof chunk === "object" && "type" in chunk && !(chunk instanceof Blob)) {
        if (chunk.type !== "write") {
          throw new DOMException("only plain write supported", "NotSupportedError");
        }
        chunk = chunk.data;
      }
      let bytes;
      if (typeof chunk === "string") {
        bytes = new TextEncoder().encode(chunk);
      } else if (chunk instanceof Blob) {
        bytes = new Uint8Array(await chunk.arrayBuffer());
      } else if (chunk instanceof ArrayBuffer) {
        bytes = new Uint8Array(chunk);
      } else if (ArrayBuffer.isView(chunk)) {
        bytes = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      } else {
        throw new TypeError("unsupported chunk type");
      }
      this._chunks.push(bytes);
    }
    async close() {
      const total = this._chunks.reduce((n, c) => n + c.length, 0);
      const merged = new Uint8Array(total);
      let off = 0;
      for (const c of this._chunks) { merged.set(c, off); off += c.length; }
      await fsOp("write", { path: this._path, dataB64: bytesToB64(merged) });
    }
    async truncate() { throw new DOMException("truncate unsupported", "NotSupportedError"); }
    async seek() { throw new DOMException("seek unsupported", "NotSupportedError"); }
    async abort() { this._chunks = []; }
  }

  class FakeFileHandle {
    constructor(path, name) {
      this._path = path;
      this.name = name;
      this.kind = "file";
    }
    async getFile() {
      const { dataB64, lastModified, type } = await fsOp("read", { path: this._path });
      const bytes = b64ToBytes(dataB64);
      return new File([bytes], this.name, { lastModified: lastModified || Date.now(), type: type || "" });
    }
    async createWritable() {
      return new FakeWritableFileStream(this._path);
    }
    async queryPermission() { return "granted"; }
    async requestPermission() { return "granted"; }
  }

  class FakeDirectoryHandle {
    constructor(path, name) {
      this._path = path;
      this.name = name;
      this.kind = "directory";
    }
    async getDirectoryHandle(name, opts = {}) {
      const childPath = this._path ? this._path + "/" + name : name;
      if (opts.create) {
        await fsOp("mkdir", { path: childPath });
      } else {
        const st = await fsOp("stat", { path: childPath });
        if (!st || st.kind !== "directory") {
          throw new DOMException(`directory '${name}' not found`, "NotFoundError");
        }
      }
      return new FakeDirectoryHandle(childPath, name);
    }
    async getFileHandle(name, opts = {}) {
      const childPath = this._path ? this._path + "/" + name : name;
      if (opts.create) {
        await fsOp("touch", { path: childPath });
      } else {
        const st = await fsOp("stat", { path: childPath });
        if (!st || st.kind !== "file") {
          throw new DOMException(`file '${name}' not found`, "NotFoundError");
        }
      }
      return new FakeFileHandle(childPath, name);
    }
    async removeEntry(name, opts = {}) {
      const childPath = this._path ? this._path + "/" + name : name;
      await fsOp("remove", { path: childPath, recursive: !!opts.recursive });
    }
    async *entries() {
      const list = await fsOp("list", { path: this._path });
      for (const entry of list) {
        const childPath = this._path ? this._path + "/" + entry.name : entry.name;
        if (entry.kind === "directory") {
          yield [entry.name, new FakeDirectoryHandle(childPath, entry.name)];
        } else if (entry.kind === "file") {
          yield [entry.name, new FakeFileHandle(childPath, entry.name)];
        }
      }
    }
    async *keys() { for await (const [k] of this.entries()) yield k; }
    async *values() { for await (const [, v] of this.entries()) yield v; }
    [Symbol.asyncIterator]() { return this.entries(); }
    async resolve() { return null; }
    async queryPermission() { return "granted"; }
    async requestPermission() { return "granted"; }
  }

  // Pre-warm sandbox root (no-op if already exists)
  fsOp("mkdir", { path: "" }).catch(() => {});

  const rootHandle = new FakeDirectoryHandle("", cfg.rootName || "fakefs");

  Object.defineProperty(window, "showDirectoryPicker", {
    configurable: true,
    writable: true,
    value: async (_opts) => rootHandle,
  });

  console.log("[lopecode fakefs] showDirectoryPicker proxied; sandbox root = " + (cfg.rootName || "(unnamed)"));
})();
