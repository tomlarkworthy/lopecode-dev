const nope = () => { throw new Error("node:zlib unavailable in browser build (gzip/gunzip/zcat unsupported)"); };
export const constants = {};
export const gzipSync = nope, gunzipSync = nope, brotliCompressSync = nope, brotliDecompressSync = nope;
export const createGzip = nope, createGunzip = nope, deflateSync = nope, inflateSync = nope, deflateRawSync = nope, inflateRawSync = nope;
export default { constants };
