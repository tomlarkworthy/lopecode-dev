// node:tty — in INTERACTIVE mode fds 0/1/2 are ttys bridged to xterm; otherwise stub.
import { register } from "./registry.mjs";
import { EventEmitter } from "./events.mjs";

const INTERACTIVE = !!globalThis.__INTERACTIVE;

export function isatty(fd) { return INTERACTIVE && (fd === 0 || fd === 1 || fd === 2); }

function termSize() { const s = globalThis.__termSize || {}; return { cols: s.cols || 80, rows: s.rows || 24 }; }

export class ReadStream extends EventEmitter {
  constructor() { super(); this.isTTY = true; this.isRaw = false; }
  setRawMode(m) { this.isRaw = !!m; return this; }
  resume() { return this; }
  pause() { return this; }
  ref() { return this; }
  unref() { return this; }
  setEncoding() { return this; }
}
export class WriteStream extends EventEmitter {
  constructor() { super(); this.isTTY = true; }
  get columns() { return termSize().cols; }
  get rows() { return termSize().rows; }
  getWindowSize() { const { cols, rows } = termSize(); return [cols, rows]; }
  getColorDepth() { return INTERACTIVE ? 24 : 1; }
  hasColors() { return INTERACTIVE; }
  write() { return true; }
  clearLine() {} cursorTo() {} moveCursor() {} clearScreenDown() {}
}

const mod = { isatty, ReadStream, WriteStream };
register("tty", mod);
export default mod;
