// node:assert
import { register } from "./registry.mjs";

function assert(v, msg) { if (!v) { const e = new Error(msg || "assertion failed"); e.code = "ERR_ASSERTION"; throw e; } }
assert.ok = assert;
assert.equal = (a, b, m) => { if (a != b) throw new Error(m || `${a} != ${b}`); };
assert.notEqual = (a, b, m) => { if (a == b) throw new Error(m || "notEqual failed"); };
assert.strictEqual = (a, b, m) => { if (!Object.is(a, b)) throw new Error(m || `${a} !== ${b}`); };
assert.notStrictEqual = (a, b, m) => { if (Object.is(a, b)) throw new Error(m || "notStrictEqual failed"); };
assert.deepEqual = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(m || "deepEqual failed"); };
assert.deepStrictEqual = assert.deepEqual;
assert.notDeepStrictEqual = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) throw new Error(m || "notDeepStrictEqual failed"); };
assert.fail = (m) => { throw new Error(m || "failed"); };
assert.throws = (fn, m) => { try { fn(); } catch { return; } throw new Error(m || "Missing expected exception"); };
assert.doesNotThrow = (fn) => { fn(); };
assert.match = (s, re, m) => { if (!re.test(s)) throw new Error(m || "match failed"); };
assert.ifError = (e) => { if (e) throw e; };
assert.strict = assert;

register("assert", assert);
export default assert;
export const ok = assert.ok, equal = assert.equal, strictEqual = assert.strictEqual, deepStrictEqual = assert.deepStrictEqual, deepEqual = assert.deepEqual, notEqual = assert.notEqual, fail = assert.fail, throws = assert.throws, ifError = assert.ifError, match = assert.match;
export const strict = assert;
