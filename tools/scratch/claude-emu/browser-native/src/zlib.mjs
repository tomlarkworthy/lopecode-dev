// node:zlib — stub. Decompression on the -p fetch path is handled by the
// browser's fetch; these throw if actually driven so we notice.
import { register } from "./registry.mjs";
import { Transform } from "./stream.mjs";

class ZStream extends Transform { _transform(c, e, cb) { cb(null, c); } }
export function createGzip() { return new ZStream(); }
export function createGunzip() { return new ZStream(); }
export function createDeflate() { return new ZStream(); }
export function createInflate() { return new ZStream(); }
export function createBrotliCompress() { return new ZStream(); }
export function createBrotliDecompress() { return new ZStream(); }
function nyi() { throw new Error("zlib sync ops unsupported in browser-native"); }
export const gzipSync = nyi, gunzipSync = nyi, deflateSync = nyi, inflateSync = nyi, brotliCompressSync = nyi, brotliDecompressSync = nyi;
export function gzip(b, o, cb) { (cb || o)(new Error("zlib.gzip unsupported")); }
export function gunzip(b, o, cb) { (cb || o)(new Error("zlib.gunzip unsupported")); }
export const constants = {};

const mod = { createGzip, createGunzip, createDeflate, createInflate, createBrotliCompress, createBrotliDecompress, gzipSync, gunzipSync, deflateSync, inflateSync, brotliCompressSync, brotliDecompressSync, gzip, gunzip, constants };
register("zlib", mod);
export default mod;
