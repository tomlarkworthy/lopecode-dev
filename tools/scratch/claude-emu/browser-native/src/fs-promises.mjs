// node:fs/promises via memfs, augmented with methods memfs may lack.
import { fs } from "./fs-core.mjs";
import { register } from "./registry.mjs";

const p = { ...fs.promises };
if (!p.constants) p.constants = fs.constants;
if (!p.link) p.link = async () => {};
if (!p.mkdtemp) p.mkdtemp = async (prefix) => { const d = prefix + Math.random().toString(36).slice(2, 8); fs.mkdirSync(d, { recursive: true }); return d; };
if (!p.utimes) p.utimes = async () => {};
if (!p.truncate) p.truncate = async () => {};
if (!p.copyFile) p.copyFile = async (a, b) => { fs.writeFileSync(b, fs.readFileSync(a)); };

register("fs/promises", p);
export default p;
export const {
  readFile, writeFile, stat, lstat, readdir, realpath, mkdir, rm, rmdir,
  unlink, access, readlink, symlink, rename, appendFile, chmod, open, copyFile,
  link, mkdtemp, utimes, truncate, constants,
} = p;
