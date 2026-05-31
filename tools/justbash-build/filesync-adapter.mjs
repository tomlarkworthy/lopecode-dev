// Bridge so @tomlarkworthy/file-sync can sync a just-bash virtual fs with zero edits
// to file-sync or just-bash. Two published extension points:
//   - just-bash: `new Bash({ fs })` accepts any IFileSystem  -> watchableFs decorator.
//   - file-sync: its `directory` cell is a FileSystemDirectoryHandle obtained from
//     window.showDirectoryPicker -> fsDirectoryHandle adapter over the bash fs.

// --- watchableFs: emit {op, path, ts} on every mutating fs call -------------------
const MUTATORS = new Set([
  "writeFile", "appendFile", "mkdir", "rm", "rmdir", "cp", "mv",
  "chmod", "symlink", "link", "utimes", "truncate",
]);

export function watchableFs(fs) {
  const listeners = new Set();
  const emit = (op, args) => {
    const ev = { op, path: args[0], dest: typeof args[1] === "string" ? args[1] : undefined };
    for (const l of listeners) { try { l(ev); } catch (e) {} }
  };
  return new Proxy(fs, {
    get(target, prop) {
      if (prop === "onChange")
        return (fn) => (listeners.add(fn), () => listeners.delete(fn));
      const val = target[prop];
      if (typeof val !== "function") return val;
      if (!MUTATORS.has(prop)) return val.bind(target);
      return function (...args) {
        const r = val.apply(target, args);
        Promise.resolve(r).then(() => emit(prop, args), () => {});
        return r;
      };
    },
  });
}

// --- fsDirectoryHandle: a FileSystemDirectoryHandle backed by an IFileSystem -------
const notFound = (path) => {
  const e = new Error(`A requested file or directory could not be found: ${path}`);
  e.name = "NotFoundError";
  return e;
};
const join = (base, name) => (base === "/" ? "/" + name : base + "/" + name);

function fileHandle(fs, path, name) {
  return {
    kind: "file",
    name,
    async getFile() {
      const bytes = await fs.readFileBuffer(path);
      let lastModified = 0;
      try { lastModified = (await fs.stat(path)).mtime.getTime(); } catch (e) {}
      return {
        name,
        size: bytes.byteLength,
        lastModified,
        async text() { return new TextDecoder().decode(bytes); },
        async arrayBuffer() {
          return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        },
      };
    },
    async createWritable() {
      const chunks = [];
      return {
        async write(data) { chunks.push(data); },
        async close() {
          if (chunks.length === 1 && typeof chunks[0] === "string") {
            await fs.writeFile(path, chunks[0]);
            return;
          }
          const parts = chunks.map((c) =>
            typeof c === "string" ? new TextEncoder().encode(c)
            : c instanceof ArrayBuffer ? new Uint8Array(c)
            : c
          );
          const total = parts.reduce((n, p) => n + p.length, 0);
          const buf = new Uint8Array(total);
          let off = 0;
          for (const p of parts) { buf.set(p, off); off += p.length; }
          await fs.writeFile(path, buf);
        },
      };
    },
  };
}

export function fsDirectoryHandle(fs, path = "/", name = "") {
  const handle = {
    kind: "directory",
    name: name || (path === "/" ? "" : path.split("/").filter(Boolean).pop() || ""),
    async getDirectoryHandle(child, opts = {}) {
      const full = join(path, child);
      if (await fs.exists(full)) {
        if (!(await fs.stat(full)).isDirectory) throw notFound(full + " (not a directory)");
      } else if (opts.create) {
        await fs.mkdir(full, { recursive: true });
      } else throw notFound(full);
      return fsDirectoryHandle(fs, full, child);
    },
    async getFileHandle(child, opts = {}) {
      const full = join(path, child);
      if (!(await fs.exists(full))) {
        if (opts.create) await fs.writeFile(full, "");
        else throw notFound(full);
      }
      return fileHandle(fs, full, child);
    },
    async removeEntry(child, opts = {}) {
      await fs.rm(join(path, child), { recursive: !!opts.recursive, force: true });
    },
    async *entries() {
      let names;
      try { names = await fs.readdir(path); } catch (e) { return; }
      for (const n of names.sort()) {
        const full = join(path, n);
        let st;
        try { st = await fs.stat(full); } catch (e) { continue; }
        yield [n, st.isDirectory ? fsDirectoryHandle(fs, full, n) : fileHandle(fs, full, n)];
      }
    },
    async *keys() { for await (const [n] of handle.entries()) yield n; },
    async *values() { for await (const [, h] of handle.entries()) yield h; },
    [Symbol.asyncIterator]() { return handle.entries(); },
  };
  return handle;
}
