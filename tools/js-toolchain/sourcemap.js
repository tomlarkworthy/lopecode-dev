// Ported from notebook-kit src/javascript/sourcemap.ts (translate() retained for parity).
import {lineBreakG} from "acorn";

export class Sourcemap {
  constructor(input) {
    this.input = input;
    this._edits = [];
  }
  _bisectLeft(index) {
    let lo = 0, hi = this._edits.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this._edits[mid].start < index) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
  _bisectRight(index) {
    let lo = 0, hi = this._edits.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this._edits[mid].start > index) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  }
  _subsume(start, end) {
    let n = 0;
    for (let i = 0; i < this._edits.length; ++i) {
      const e = this._edits[i];
      if (start <= e.start && e.end < end) continue;
      this._edits[n++] = e;
    }
    this._edits.length = n;
  }
  insertLeft(index, value) {
    return this.replaceLeft(index, index, value);
  }
  insertRight(index, value) {
    return this.replaceRight(index, index, value);
  }
  delete(start, end) {
    return this.replaceRight(start, end, "");
  }
  replaceLeft(start, end, value) {
    this._subsume(start, end);
    this._edits.splice(this._bisectLeft(start), 0, {start, end, value});
    return this;
  }
  replaceRight(start, end, value) {
    this._subsume(start, end);
    this._edits.splice(this._bisectRight(start), 0, {start, end, value});
    return this;
  }
  trim() {
    const input = this.input;
    if (input.startsWith("\n")) this.delete(0, 1);
    if (input.endsWith("\n")) this.delete(input.length - 1, input.length);
    return this;
  }
  toString() {
    let output = "";
    let index = 0;
    for (const {start, end, value} of this._edits) {
      if (start > index) output += this.input.slice(index, start);
      output += value;
      index = end;
    }
    output += this.input.slice(index);
    return output;
  }
}
