// node:buffer via feross 'buffer' polyfill.
import BufferPoly from "buffer";
import { register } from "./registry.mjs";

const { Buffer, SlowBuffer, INSPECT_MAX_BYTES, kMaxLength, constants, Blob, File } = BufferPoly;
globalThis.Buffer = Buffer; // bare Buffer references in cli.js

const mod = { Buffer, SlowBuffer, INSPECT_MAX_BYTES, kMaxLength, constants: constants || { MAX_LENGTH: kMaxLength, MAX_STRING_LENGTH: 536870888 }, Blob: Blob || globalThis.Blob, File: File || globalThis.File, atob: globalThis.atob.bind(globalThis), btoa: globalThis.btoa.bind(globalThis), isUtf8: () => true, isAscii: () => true };
register("buffer", mod);
export default mod;
export { Buffer, SlowBuffer, INSPECT_MAX_BYTES, kMaxLength, constants };
