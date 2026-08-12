// node:path via path-browserify (posix).
import posixImpl from "path-browserify";
import { register } from "./registry.mjs";

const mod = { ...posixImpl, sep: "/", delimiter: ":" };
mod.posix = mod;
mod.win32 = mod;
register("path", mod);
export default mod;
export const { resolve, relative, join, dirname, basename, extname, normalize, isAbsolute, parse, format } = mod;
export const sep = "/";
export const delimiter = ":";
export const posix = mod;
export const win32 = mod;
