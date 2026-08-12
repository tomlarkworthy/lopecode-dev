// node:readline — stub (non-interactive -p never prompts).
import { register } from "./registry.mjs";
import { EventEmitter } from "./events.mjs";

class Interface extends EventEmitter {
  question(_q, cb) { queueMicrotask(() => cb("")); }
  close() { this.emit("close"); }
  prompt() {} write() {} pause() { return this; } resume() { return this; }
  [Symbol.asyncIterator]() { return { next() { return Promise.resolve({ value: undefined, done: true }); } }; }
}
export function createInterface() { return new Interface(); }
export function clearLine() {} export function cursorTo() {} export function moveCursor() {} export function clearScreenDown() {}
export function emitKeypressEvents() {}
export const promises = { createInterface: () => new Interface() };

const mod = { createInterface, clearLine, cursorTo, moveCursor, clearScreenDown, emitKeypressEvents, Interface, promises };
register("readline", mod);
export default mod;
