const _0 = function(md){return(
md`# Safe Local Storage

If a reader has localStorage disabled, simply referencing it will throw an error and prevent any downstream cells from running. This can break your notebook!

If you import from this notebook instead, you’ll be able to use localStorage safely: if the reader has disabled local storage, you’ll get an in-memory storage instance that evaporates when the page is unloaded.

\`\`\`js
import {localStorage} from "@mbostock/safe-local-storage"
\`\`\`

Please note that this implementation does not support direct-setting of properties on localStorage; use the [Storage interface methods](https://html.spec.whatwg.org/multipage/webstorage.html#webstorage) instead.
`
)};

const _5 = function localStorage(MemoryStorage)
{
  try {
    const storage = window.localStorage;
    const key = "__storage_test__";
    storage.setItem(key, key);
    storage.removeItem(key);
    return storage;
  } catch (error) {
    return new MemoryStorage;
  }
}
;

const _12 = function MemoryStorage(){return(
class MemoryStorage {
  constructor() {
    Object.defineProperties(this, {_: {value: new Map}});
  }
  get length() {
    return this._.size;
  }
  key(index) {
    return Array.from(this._.keys())[index | 0];
  }
  getItem(key) {
    return this._.has(key += "") ? this._.get(key) : null;
  }
  setItem(key, value) {
    this._.set(key + "", value + "");
  }
  removeItem(key) {
    this._.delete(key + "");
  }
  clear() {
    this._.clear();
  }
}
)};

export default function define(runtime) {
  const main = runtime.module();
  main.define("cell 0", ["md"], _0);
  main.define("localStorage", ["MemoryStorage"], _5);
  main.define("MemoryStorage", [], _12);
  return main;
}
