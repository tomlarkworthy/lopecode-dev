var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  if (mod && typeof mod === "object" || typeof mod === "function") {
    for (let key of __getOwnPropNames(mod))
      if (!__hasOwnProp.call(to, key))
        __defProp(to, key, {
          get: __accessProp.bind(mod, key),
          enumerable: true
        });
  }
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);

// node_modules/@jitl/quickjs-ffi-types/dist/index.mjs
var EvalFlags, IntrinsicsFlags, JSPromiseStateEnum, GetOwnPropertyNamesFlags, IsEqualOp;
var init_dist = __esm(() => {
  EvalFlags = { JS_EVAL_TYPE_GLOBAL: 0, JS_EVAL_TYPE_MODULE: 1, JS_EVAL_TYPE_DIRECT: 2, JS_EVAL_TYPE_INDIRECT: 3, JS_EVAL_TYPE_MASK: 3, JS_EVAL_FLAG_STRICT: 8, JS_EVAL_FLAG_STRIP: 16, JS_EVAL_FLAG_COMPILE_ONLY: 32, JS_EVAL_FLAG_BACKTRACE_BARRIER: 64 };
  IntrinsicsFlags = { BaseObjects: 1, Date: 2, Eval: 4, StringNormalize: 8, RegExp: 16, RegExpCompiler: 32, JSON: 64, Proxy: 128, MapSet: 256, TypedArrays: 512, Promise: 1024, BigInt: 2048, BigFloat: 4096, BigDecimal: 8192, OperatorOverloading: 16384, BignumExt: 32768 };
  JSPromiseStateEnum = { Pending: 0, Fulfilled: 1, Rejected: 2 };
  GetOwnPropertyNamesFlags = { JS_GPN_STRING_MASK: 1, JS_GPN_SYMBOL_MASK: 2, JS_GPN_PRIVATE_MASK: 4, JS_GPN_ENUM_ONLY: 16, JS_GPN_SET_ENUM: 32, QTS_GPN_NUMBER_MASK: 64, QTS_STANDARD_COMPLIANT_NUMBER: 128 };
  IsEqualOp = { IsStrictlyEqual: 0, IsSameValue: 1, IsSameValueZero: 2 };
});

// node_modules/quickjs-emscripten-core/dist/chunk-V2S4ZYJR.mjs
function debugLog(...args) {
  QTS_DEBUG && console.log("quickjs-emscripten:", ...args);
}
function* awaitYield(value) {
  return yield value;
}
function awaitYieldOf(generator) {
  return awaitYield(awaitEachYieldedPromise(generator));
}
function maybeAsyncFn(that, fn) {
  return (...args) => {
    let generator = fn.call(that, AwaitYield, ...args);
    return awaitEachYieldedPromise(generator);
  };
}
function maybeAsync(that, startGenerator) {
  let generator = startGenerator.call(that, AwaitYield);
  return awaitEachYieldedPromise(generator);
}
function awaitEachYieldedPromise(gen) {
  function handleNextStep(step) {
    return step.done ? step.value : step.value instanceof Promise ? step.value.then((value) => handleNextStep(gen.next(value)), (error) => handleNextStep(gen.throw(error))) : handleNextStep(gen.next(step.value));
  }
  return handleNextStep(gen.next());
}
function scopeFinally(scope, blockError) {
  let disposeError;
  try {
    scope.dispose();
  } catch (error) {
    disposeError = error;
  }
  if (blockError && disposeError)
    throw Object.assign(blockError, { message: `${blockError.message}
 Then, failed to dispose scope: ${disposeError.message}`, disposeError }), blockError;
  if (blockError || disposeError)
    throw blockError || disposeError;
}
function createDisposableArray(items) {
  let array = items ? Array.from(items) : [];
  function disposeAlive() {
    return array.forEach((disposable) => disposable.alive ? disposable.dispose() : undefined);
  }
  function someIsAlive() {
    return array.some((disposable) => disposable.alive);
  }
  return Object.defineProperty(array, SymbolDispose, { configurable: true, enumerable: false, value: disposeAlive }), Object.defineProperty(array, "dispose", { configurable: true, enumerable: false, value: disposeAlive }), Object.defineProperty(array, "alive", { configurable: true, enumerable: false, get: someIsAlive }), array;
}
function isDisposable(value) {
  return !!(value && (typeof value == "object" || typeof value == "function") && ("alive" in value) && typeof value.alive == "boolean" && ("dispose" in value) && typeof value.dispose == "function");
}
function intrinsicsToFlags(intrinsics) {
  if (!intrinsics)
    return 0;
  let result = 0;
  for (let [maybeIntrinsicName, enabled] of Object.entries(intrinsics)) {
    if (!(maybeIntrinsicName in IntrinsicsFlags))
      throw new QuickJSUnknownIntrinsic(maybeIntrinsicName);
    enabled && (result |= IntrinsicsFlags[maybeIntrinsicName]);
  }
  return result;
}
function evalOptionsToFlags(evalOptions) {
  if (typeof evalOptions == "number")
    return evalOptions;
  if (evalOptions === undefined)
    return 0;
  let { type, strict, strip, compileOnly, backtraceBarrier } = evalOptions, flags = 0;
  return type === "global" && (flags |= EvalFlags.JS_EVAL_TYPE_GLOBAL), type === "module" && (flags |= EvalFlags.JS_EVAL_TYPE_MODULE), strict && (flags |= EvalFlags.JS_EVAL_FLAG_STRICT), strip && (flags |= EvalFlags.JS_EVAL_FLAG_STRIP), compileOnly && (flags |= EvalFlags.JS_EVAL_FLAG_COMPILE_ONLY), backtraceBarrier && (flags |= EvalFlags.JS_EVAL_FLAG_BACKTRACE_BARRIER), flags;
}
function getOwnPropertyNamesOptionsToFlags(options) {
  if (typeof options == "number")
    return options;
  if (options === undefined)
    return 0;
  let { strings: includeStrings, symbols: includeSymbols, quickjsPrivate: includePrivate, onlyEnumerable, numbers: includeNumbers, numbersAsStrings } = options, flags = 0;
  return includeStrings && (flags |= GetOwnPropertyNamesFlags.JS_GPN_STRING_MASK), includeSymbols && (flags |= GetOwnPropertyNamesFlags.JS_GPN_SYMBOL_MASK), includePrivate && (flags |= GetOwnPropertyNamesFlags.JS_GPN_PRIVATE_MASK), onlyEnumerable && (flags |= GetOwnPropertyNamesFlags.JS_GPN_ENUM_ONLY), includeNumbers && (flags |= GetOwnPropertyNamesFlags.QTS_GPN_NUMBER_MASK), numbersAsStrings && (flags |= GetOwnPropertyNamesFlags.QTS_STANDARD_COMPLIANT_NUMBER), flags;
}
function concat(...values) {
  let result = [];
  for (let value of values)
    value !== undefined && (result = result.concat(value));
  return result;
}
function getGroupId(id) {
  return id >> 8;
}
function applyBaseRuntimeOptions(runtime, options) {
  options.interruptHandler && runtime.setInterruptHandler(options.interruptHandler), options.maxStackSizeBytes !== undefined && runtime.setMaxStackSize(options.maxStackSizeBytes), options.memoryLimitBytes !== undefined && runtime.setMemoryLimit(options.memoryLimitBytes);
}
function applyModuleEvalRuntimeOptions(runtime, options) {
  options.moduleLoader && runtime.setModuleLoader(options.moduleLoader), options.shouldInterrupt && runtime.setInterruptHandler(options.shouldInterrupt), options.memoryLimitBytes !== undefined && runtime.setMemoryLimit(options.memoryLimitBytes), options.maxStackSizeBytes !== undefined && runtime.setMaxStackSize(options.maxStackSizeBytes);
}
var __defProp2, __export2 = (target, all) => {
  for (var name in all)
    __defProp2(target, name, { get: all[name], enumerable: true });
}, QTS_DEBUG = false, errors_exports, QuickJSUnwrapError, QuickJSWrongOwner, QuickJSUseAfterFree, QuickJSNotImplemented, QuickJSAsyncifyError, QuickJSAsyncifySuspended, QuickJSMemoryLeakDetected, QuickJSEmscriptenModuleError, QuickJSUnknownIntrinsic, QuickJSPromisePending, QuickJSEmptyGetOwnPropertyNames, QuickJSHostRefRangeExceeded, QuickJSHostRefInvalid, AwaitYield, UsingDisposable, SymbolDispose, prototypeAsAny, Lifetime, StaticLifetime, WeakLifetime, Scope, AbstractDisposableResult, DisposableSuccess, DisposableFail, DisposableResult, QuickJSDeferredPromise, ModuleMemory = class {
  constructor(module) {
    this.module = module;
  }
  toPointerArray(handleArray) {
    let typedArray = new Int32Array(handleArray.map((handle) => handle.value)), numBytes = typedArray.length * typedArray.BYTES_PER_ELEMENT, ptr = this.module._malloc(numBytes);
    return new Uint8Array(this.module.HEAPU8.buffer, ptr, numBytes).set(new Uint8Array(typedArray.buffer)), new Lifetime(ptr, undefined, (ptr2) => this.module._free(ptr2));
  }
  newTypedArray(kind, length) {
    let zeros = new kind(new Array(length).fill(0)), numBytes = zeros.length * zeros.BYTES_PER_ELEMENT, ptr = this.module._malloc(numBytes), typedArray = new kind(this.module.HEAPU8.buffer, ptr, length);
    return typedArray.set(zeros), new Lifetime({ typedArray, ptr }, undefined, (value) => this.module._free(value.ptr));
  }
  newMutablePointerArray(length) {
    return this.newTypedArray(Int32Array, length);
  }
  newHeapCharPointer(string) {
    let strlen = this.module.lengthBytesUTF8(string), dataBytes = strlen + 1, ptr = this.module._malloc(dataBytes);
    return this.module.stringToUTF8(string, ptr, dataBytes), new Lifetime({ ptr, strlen }, undefined, (value) => this.module._free(value.ptr));
  }
  newHeapBufferPointer(buffer) {
    let numBytes = buffer.byteLength, ptr = this.module._malloc(numBytes);
    return this.module.HEAPU8.set(buffer, ptr), new Lifetime({ pointer: ptr, numBytes }, undefined, (value) => this.module._free(value.pointer));
  }
  consumeHeapCharPointer(ptr) {
    let str = this.module.UTF8ToString(ptr);
    return this.module._free(ptr), str;
  }
}, UnstableSymbol, DefaultIntrinsics, QuickJSIterator, INT32_MIN = -2147483648, INT32_MAX = 2147483647, INVALID_HOST_REF_ID = 0, HostRefMap = class {
  constructor() {
    this.nextId = INT32_MIN;
    this.freelist = [];
    this.groups = new Map;
  }
  put(value) {
    let id = this.allocateId(), groupId = getGroupId(id), group = this.groups.get(groupId);
    return group || (group = new Map, this.groups.set(groupId, group)), group.set(id, value), id;
  }
  get(id) {
    if (id === INVALID_HOST_REF_ID)
      throw new QuickJSHostRefInvalid("no host reference id defined");
    let groupId = getGroupId(id), group = this.groups.get(groupId);
    if (!group)
      throw new QuickJSHostRefInvalid(`host reference id ${id} is not defined`);
    let value = group.get(id);
    if (!value)
      throw new QuickJSHostRefInvalid(`host reference id ${id} is not defined`);
    return value;
  }
  delete(id) {
    if (id === INVALID_HOST_REF_ID)
      throw new QuickJSHostRefInvalid("no host reference id defined");
    let groupId = getGroupId(id), group = this.groups.get(groupId);
    if (!group)
      throw new QuickJSHostRefInvalid(`host reference id ${id} is not defined`);
    group.delete(id), group.size === 0 && this.groups.delete(groupId), this.freelist.push(id);
  }
  allocateId() {
    if (this.freelist.length > 0)
      return this.freelist.shift();
    if (this.nextId === INVALID_HOST_REF_ID && this.nextId++, this.nextId > INT32_MAX)
      throw new QuickJSHostRefRangeExceeded(`HostRefMap: too many host refs created without disposing. Max simultaneous host refs: ${INT32_MAX - INT32_MIN}`);
    return this.nextId++;
  }
}, HostRef, ContextMemory, QuickJSContext, QuickJSRuntime, QuickJSEmscriptenModuleCallbacks = class {
  constructor(args) {
    this.freeHostRef = args.freeHostRef, this.callFunction = args.callFunction, this.shouldInterrupt = args.shouldInterrupt, this.loadModuleSource = args.loadModuleSource, this.normalizeModule = args.normalizeModule;
  }
}, QuickJSModuleCallbacks = class {
  constructor(module) {
    this.contextCallbacks = new Map;
    this.runtimeCallbacks = new Map;
    this.suspendedCount = 0;
    this.cToHostCallbacks = new QuickJSEmscriptenModuleCallbacks({ freeHostRef: (_asyncify, rt, host_ref_id) => {
      let runtimeCallbacks = this.runtimeCallbacks.get(rt);
      if (!runtimeCallbacks)
        throw new Error(`QuickJSRuntime(rt = ${rt}) not found when trying to free HostRef(id = ${host_ref_id})`);
      runtimeCallbacks.freeHostRef(rt, host_ref_id);
    }, callFunction: (asyncify, ctx, this_ptr, argc, argv, fn_id) => this.handleAsyncify(asyncify, () => {
      try {
        let vm = this.contextCallbacks.get(ctx);
        if (!vm)
          throw new Error(`QuickJSContext(ctx = ${ctx}) not found for C function call "${fn_id}"`);
        return vm.callFunction(ctx, this_ptr, argc, argv, fn_id);
      } catch (error) {
        return console.error("[C to host error: returning null]", error), 0;
      }
    }), shouldInterrupt: (asyncify, rt) => this.handleAsyncify(asyncify, () => {
      try {
        let vm = this.runtimeCallbacks.get(rt);
        if (!vm)
          throw new Error(`QuickJSRuntime(rt = ${rt}) not found for C interrupt`);
        return vm.shouldInterrupt(rt);
      } catch (error) {
        return console.error("[C to host interrupt: returning error]", error), 1;
      }
    }), loadModuleSource: (asyncify, rt, ctx, moduleName) => this.handleAsyncify(asyncify, () => {
      try {
        let runtimeCallbacks = this.runtimeCallbacks.get(rt);
        if (!runtimeCallbacks)
          throw new Error(`QuickJSRuntime(rt = ${rt}) not found for C module loader`);
        let loadModule = runtimeCallbacks.loadModuleSource;
        if (!loadModule)
          throw new Error(`QuickJSRuntime(rt = ${rt}) does not support module loading`);
        return loadModule(rt, ctx, moduleName);
      } catch (error) {
        return console.error("[C to host module loader error: returning null]", error), 0;
      }
    }), normalizeModule: (asyncify, rt, ctx, moduleBaseName, moduleName) => this.handleAsyncify(asyncify, () => {
      try {
        let runtimeCallbacks = this.runtimeCallbacks.get(rt);
        if (!runtimeCallbacks)
          throw new Error(`QuickJSRuntime(rt = ${rt}) not found for C module loader`);
        let normalizeModule = runtimeCallbacks.normalizeModule;
        if (!normalizeModule)
          throw new Error(`QuickJSRuntime(rt = ${rt}) does not support module loading`);
        return normalizeModule(rt, ctx, moduleBaseName, moduleName);
      } catch (error) {
        return console.error("[C to host module loader error: returning null]", error), 0;
      }
    }) });
    this.module = module, this.module.callbacks = this.cToHostCallbacks;
  }
  setRuntimeCallbacks(rt, callbacks) {
    this.runtimeCallbacks.set(rt, callbacks);
  }
  deleteRuntime(rt) {
    this.runtimeCallbacks.delete(rt);
  }
  setContextCallbacks(ctx, callbacks) {
    this.contextCallbacks.set(ctx, callbacks);
  }
  deleteContext(ctx) {
    this.contextCallbacks.delete(ctx);
  }
  handleAsyncify(asyncify, fn) {
    if (asyncify)
      return asyncify.handleSleep((done) => {
        try {
          let result = fn();
          if (!(result instanceof Promise)) {
            debugLog("asyncify.handleSleep: not suspending:", result), done(result);
            return;
          }
          if (this.suspended)
            throw new QuickJSAsyncifyError(`Already suspended at: ${this.suspended.stack}
Attempted to suspend at:`);
          this.suspended = new QuickJSAsyncifySuspended(`(${this.suspendedCount++})`), debugLog("asyncify.handleSleep: suspending:", this.suspended), result.then((resolvedResult) => {
            this.suspended = undefined, debugLog("asyncify.handleSleep: resolved:", resolvedResult), done(resolvedResult);
          }, (error) => {
            debugLog("asyncify.handleSleep: rejected:", error), console.error("QuickJS: cannot handle error in suspended function", error), this.suspended = undefined;
          });
        } catch (error) {
          throw debugLog("asyncify.handleSleep: error:", error), this.suspended = undefined, error;
        }
      });
    let value = fn();
    if (value instanceof Promise)
      throw new Error("Promise return value not supported in non-asyncify context.");
    return value;
  }
}, QuickJSWASMModule = class {
  constructor(module, ffi) {
    this.module = module, this.ffi = ffi, this.callbacks = new QuickJSModuleCallbacks(module);
  }
  newRuntime(options = {}) {
    let rt = new Lifetime(this.ffi.QTS_NewRuntime(), undefined, (rt_ptr) => {
      this.ffi.QTS_FreeRuntime(rt_ptr), this.callbacks.deleteRuntime(rt_ptr);
    }), runtime = new QuickJSRuntime({ module: this.module, callbacks: this.callbacks, ffi: this.ffi, rt });
    return applyBaseRuntimeOptions(runtime, options), options.moduleLoader && runtime.setModuleLoader(options.moduleLoader), runtime;
  }
  newContext(options = {}) {
    let runtime = this.newRuntime(), context = runtime.newContext({ ...options, ownedLifetimes: concat(runtime, options.ownedLifetimes) });
    return runtime.context = context, context;
  }
  evalCode(code, options = {}) {
    return Scope.withScope((scope) => {
      let vm = scope.manage(this.newContext());
      applyModuleEvalRuntimeOptions(vm.runtime, options);
      let result = vm.evalCode(code, "eval.js");
      if (options.memoryLimitBytes !== undefined && vm.runtime.setMemoryLimit(-1), result.error)
        throw vm.dump(scope.manage(result.error));
      return vm.dump(scope.manage(result.value));
    });
  }
  getWasmMemory() {
    let memory = this.module.quickjsEmscriptenInit?.(() => {})?.getWasmMemory?.();
    if (!memory)
      throw new Error("Variant does not support getting WebAssembly.Memory");
    return memory;
  }
  getFFI() {
    return this.ffi;
  }
};
var init_chunk_V2S4ZYJR = __esm(() => {
  init_dist();
  init_dist();
  __defProp2 = Object.defineProperty;
  errors_exports = {};
  __export2(errors_exports, { QuickJSAsyncifyError: () => QuickJSAsyncifyError, QuickJSAsyncifySuspended: () => QuickJSAsyncifySuspended, QuickJSEmptyGetOwnPropertyNames: () => QuickJSEmptyGetOwnPropertyNames, QuickJSEmscriptenModuleError: () => QuickJSEmscriptenModuleError, QuickJSHostRefInvalid: () => QuickJSHostRefInvalid, QuickJSHostRefRangeExceeded: () => QuickJSHostRefRangeExceeded, QuickJSMemoryLeakDetected: () => QuickJSMemoryLeakDetected, QuickJSNotImplemented: () => QuickJSNotImplemented, QuickJSPromisePending: () => QuickJSPromisePending, QuickJSUnknownIntrinsic: () => QuickJSUnknownIntrinsic, QuickJSUnwrapError: () => QuickJSUnwrapError, QuickJSUseAfterFree: () => QuickJSUseAfterFree, QuickJSWrongOwner: () => QuickJSWrongOwner });
  QuickJSUnwrapError = class extends Error {
    constructor(cause, context) {
      let message = typeof cause == "object" && cause && "message" in cause ? String(cause.message) : String(cause);
      super(message);
      this.cause = cause;
      this.context = context;
      this.name = "QuickJSUnwrapError";
    }
  };
  QuickJSWrongOwner = class extends Error {
    constructor() {
      super(...arguments);
      this.name = "QuickJSWrongOwner";
    }
  };
  QuickJSUseAfterFree = class extends Error {
    constructor() {
      super(...arguments);
      this.name = "QuickJSUseAfterFree";
    }
  };
  QuickJSNotImplemented = class extends Error {
    constructor() {
      super(...arguments);
      this.name = "QuickJSNotImplemented";
    }
  };
  QuickJSAsyncifyError = class extends Error {
    constructor() {
      super(...arguments);
      this.name = "QuickJSAsyncifyError";
    }
  };
  QuickJSAsyncifySuspended = class extends Error {
    constructor() {
      super(...arguments);
      this.name = "QuickJSAsyncifySuspended";
    }
  };
  QuickJSMemoryLeakDetected = class extends Error {
    constructor() {
      super(...arguments);
      this.name = "QuickJSMemoryLeakDetected";
    }
  };
  QuickJSEmscriptenModuleError = class extends Error {
    constructor() {
      super(...arguments);
      this.name = "QuickJSEmscriptenModuleError";
    }
  };
  QuickJSUnknownIntrinsic = class extends TypeError {
    constructor() {
      super(...arguments);
      this.name = "QuickJSUnknownIntrinsic";
    }
  };
  QuickJSPromisePending = class extends Error {
    constructor() {
      super(...arguments);
      this.name = "QuickJSPromisePending";
    }
  };
  QuickJSEmptyGetOwnPropertyNames = class extends Error {
    constructor() {
      super(...arguments);
      this.name = "QuickJSEmptyGetOwnPropertyNames";
    }
  };
  QuickJSHostRefRangeExceeded = class extends Error {
    constructor() {
      super(...arguments);
      this.name = "QuickJSHostRefRangeExceeded";
    }
  };
  QuickJSHostRefInvalid = class extends Error {
    constructor() {
      super(...arguments);
      this.name = "QuickJSHostRefInvalid";
    }
  };
  AwaitYield = awaitYield;
  AwaitYield.of = awaitYieldOf;
  UsingDisposable = class {
    [Symbol.dispose]() {
      return this.dispose();
    }
  };
  SymbolDispose = Symbol.dispose ?? Symbol.for("Symbol.dispose");
  prototypeAsAny = UsingDisposable.prototype;
  prototypeAsAny[SymbolDispose] || (prototypeAsAny[SymbolDispose] = function() {
    return this.dispose();
  });
  Lifetime = class _Lifetime extends UsingDisposable {
    constructor(_value, copier, disposer, _owner) {
      super();
      this._value = _value;
      this.copier = copier;
      this.disposer = disposer;
      this._owner = _owner;
      this._alive = true;
      this._constructorStack = QTS_DEBUG ? new Error("Lifetime constructed").stack : undefined;
    }
    get alive() {
      return this._alive;
    }
    get value() {
      return this.assertAlive(), this._value;
    }
    get owner() {
      return this._owner;
    }
    get dupable() {
      return !!this.copier;
    }
    dup() {
      if (this.assertAlive(), !this.copier)
        throw new Error("Non-dupable lifetime");
      return new _Lifetime(this.copier(this._value), this.copier, this.disposer, this._owner);
    }
    consume(map) {
      this.assertAlive();
      let result = map(this);
      return this.dispose(), result;
    }
    map(map) {
      return this.assertAlive(), map(this);
    }
    tap(fn) {
      return fn(this), this;
    }
    dispose() {
      this.assertAlive(), this.disposer && this.disposer(this._value), this._alive = false;
    }
    assertAlive() {
      if (!this.alive)
        throw this._constructorStack ? new QuickJSUseAfterFree(`Lifetime not alive
${this._constructorStack}
Lifetime used`) : new QuickJSUseAfterFree("Lifetime not alive");
    }
  };
  StaticLifetime = class extends Lifetime {
    constructor(value, owner) {
      super(value, undefined, undefined, owner);
    }
    get dupable() {
      return true;
    }
    dup() {
      return this;
    }
    dispose() {}
  };
  WeakLifetime = class extends Lifetime {
    constructor(value, copier, disposer, owner) {
      super(value, copier, disposer, owner);
    }
    dispose() {
      this._alive = false;
    }
  };
  Scope = class _Scope extends UsingDisposable {
    constructor() {
      super(...arguments);
      this._disposables = new Lifetime(new Set);
      this.manage = (lifetime) => (this._disposables.value.add(lifetime), lifetime);
    }
    static withScope(block) {
      let scope = new _Scope, blockError;
      try {
        return block(scope);
      } catch (error) {
        throw blockError = error, error;
      } finally {
        scopeFinally(scope, blockError);
      }
    }
    static withScopeMaybeAsync(_this, block) {
      return maybeAsync(undefined, function* (awaited) {
        let scope = new _Scope, blockError;
        try {
          return yield* awaited.of(block.call(_this, awaited, scope));
        } catch (error) {
          throw blockError = error, error;
        } finally {
          scopeFinally(scope, blockError);
        }
      });
    }
    static async withScopeAsync(block) {
      let scope = new _Scope, blockError;
      try {
        return await block(scope);
      } catch (error) {
        throw blockError = error, error;
      } finally {
        scopeFinally(scope, blockError);
      }
    }
    get alive() {
      return this._disposables.alive;
    }
    dispose() {
      let lifetimes = Array.from(this._disposables.value.values()).reverse();
      for (let lifetime of lifetimes)
        lifetime.alive && lifetime.dispose();
      this._disposables.dispose();
    }
  };
  AbstractDisposableResult = class _AbstractDisposableResult extends UsingDisposable {
    static success(value) {
      return new DisposableSuccess(value);
    }
    static fail(error, onUnwrap) {
      return new DisposableFail(error, onUnwrap);
    }
    static is(result) {
      return result instanceof _AbstractDisposableResult;
    }
  };
  DisposableSuccess = class extends AbstractDisposableResult {
    constructor(value) {
      super();
      this.value = value;
    }
    get alive() {
      return isDisposable(this.value) ? this.value.alive : true;
    }
    dispose() {
      isDisposable(this.value) && this.value.dispose();
    }
    unwrap() {
      return this.value;
    }
    unwrapOr(_fallback) {
      return this.value;
    }
  };
  DisposableFail = class extends AbstractDisposableResult {
    constructor(error, onUnwrap) {
      super();
      this.error = error;
      this.onUnwrap = onUnwrap;
    }
    get alive() {
      return isDisposable(this.error) ? this.error.alive : true;
    }
    dispose() {
      isDisposable(this.error) && this.error.dispose();
    }
    unwrap() {
      throw this.onUnwrap(this), this.error;
    }
    unwrapOr(fallback) {
      return fallback;
    }
  };
  DisposableResult = AbstractDisposableResult;
  QuickJSDeferredPromise = class extends UsingDisposable {
    constructor(args) {
      super();
      this.resolve = (value) => {
        this.resolveHandle.alive && (this.context.unwrapResult(this.context.callFunction(this.resolveHandle, this.context.undefined, value || this.context.undefined)).dispose(), this.disposeResolvers(), this.onSettled());
      };
      this.reject = (value) => {
        this.rejectHandle.alive && (this.context.unwrapResult(this.context.callFunction(this.rejectHandle, this.context.undefined, value || this.context.undefined)).dispose(), this.disposeResolvers(), this.onSettled());
      };
      this.dispose = () => {
        this.handle.alive && this.handle.dispose(), this.disposeResolvers();
      };
      this.context = args.context, this.owner = args.context.runtime, this.handle = args.promiseHandle, this.settled = new Promise((resolve) => {
        this.onSettled = resolve;
      }), this.resolveHandle = args.resolveHandle, this.rejectHandle = args.rejectHandle;
    }
    get alive() {
      return this.handle.alive || this.resolveHandle.alive || this.rejectHandle.alive;
    }
    disposeResolvers() {
      this.resolveHandle.alive && this.resolveHandle.dispose(), this.rejectHandle.alive && this.rejectHandle.dispose();
    }
  };
  UnstableSymbol = Symbol("Unstable");
  DefaultIntrinsics = Object.freeze({ BaseObjects: true, Date: true, Eval: true, StringNormalize: true, RegExp: true, JSON: true, Proxy: true, MapSet: true, TypedArrays: true, Promise: true });
  QuickJSIterator = class extends UsingDisposable {
    constructor(handle, context) {
      super();
      this.handle = handle;
      this.context = context;
      this._isDone = false;
      this.owner = context.runtime;
    }
    [Symbol.iterator]() {
      return this;
    }
    next(value) {
      if (!this.alive || this._isDone)
        return { done: true, value: undefined };
      let nextMethod = this._next ?? (this._next = this.context.getProp(this.handle, "next"));
      return this.callIteratorMethod(nextMethod, value);
    }
    return(value) {
      if (!this.alive)
        return { done: true, value: undefined };
      let returnMethod = this.context.getProp(this.handle, "return");
      if (returnMethod === this.context.undefined && value === undefined)
        return this.dispose(), { done: true, value: undefined };
      let result = this.callIteratorMethod(returnMethod, value);
      return returnMethod.dispose(), this.dispose(), result;
    }
    throw(e) {
      if (!this.alive)
        return { done: true, value: undefined };
      let errorHandle = e instanceof Lifetime ? e : this.context.newError(e), throwMethod = this.context.getProp(this.handle, "throw"), result = this.callIteratorMethod(throwMethod, e);
      return errorHandle.alive && errorHandle.dispose(), throwMethod.dispose(), this.dispose(), result;
    }
    get alive() {
      return this.handle.alive;
    }
    dispose() {
      this._isDone = true, this.handle.dispose(), this._next?.dispose();
    }
    callIteratorMethod(method, input) {
      let callResult = input ? this.context.callFunction(method, this.handle, input) : this.context.callFunction(method, this.handle);
      if (callResult.error)
        return this.dispose(), { value: callResult };
      let done = this.context.getProp(callResult.value, "done").consume((v) => this.context.dump(v)), value = this.context.getProp(callResult.value, "value");
      return callResult.value.dispose(), done && this.dispose(), { value: DisposableResult.success(value), done };
    }
  };
  HostRef = class extends UsingDisposable {
    constructor(runtime, handle, id) {
      if (id === INVALID_HOST_REF_ID)
        throw new QuickJSHostRefInvalid("cannot create HostRef with undefined id");
      super();
      this.runtime = runtime;
      this.handle = handle;
      this.id = id;
    }
    get alive() {
      return this.handle.alive;
    }
    dispose() {
      this.handle.dispose();
    }
    get value() {
      return this.runtime.hostRefs.get(this.id);
    }
  };
  ContextMemory = class extends ModuleMemory {
    constructor(args) {
      super(args.module);
      this.scope = new Scope;
      this.copyJSValue = (ptr) => this.ffi.QTS_DupValuePointer(this.ctx.value, ptr);
      this.freeJSValue = (ptr) => {
        this.ffi.QTS_FreeValuePointer(this.ctx.value, ptr);
      };
      args.ownedLifetimes?.forEach((lifetime) => this.scope.manage(lifetime)), this.owner = args.owner, this.module = args.module, this.ffi = args.ffi, this.rt = args.rt, this.ctx = this.scope.manage(args.ctx);
    }
    get alive() {
      return this.scope.alive;
    }
    dispose() {
      return this.scope.dispose();
    }
    [Symbol.dispose]() {
      return this.dispose();
    }
    manage(lifetime) {
      return this.scope.manage(lifetime);
    }
    consumeJSCharPointer(ptr) {
      let str = this.module.UTF8ToString(ptr);
      return this.ffi.QTS_FreeCString(this.ctx.value, ptr), str;
    }
    heapValueHandle(ptr, extraDispose) {
      let dispose = extraDispose ? (val) => {
        extraDispose(), this.freeJSValue(val);
      } : this.freeJSValue;
      return new Lifetime(ptr, this.copyJSValue, dispose, this.owner);
    }
    staticHeapValueHandle(ptr) {
      return this.manage(this.heapValueHandle(ptr)), new StaticLifetime(ptr, this.owner);
    }
  };
  QuickJSContext = class extends UsingDisposable {
    constructor(args) {
      super();
      this._undefined = undefined;
      this._null = undefined;
      this._false = undefined;
      this._true = undefined;
      this._global = undefined;
      this._BigInt = undefined;
      this._Symbol = undefined;
      this._SymbolIterator = undefined;
      this._SymbolAsyncIterator = undefined;
      this.cToHostCallbacks = { callFunction: (ctx, this_ptr, argc, argv, fn_id) => {
        if (ctx !== this.ctx.value)
          throw new Error("QuickJSContext instance received C -> JS call with mismatched ctx");
        let fn = this.getFunction(fn_id);
        return Scope.withScopeMaybeAsync(this, function* (awaited, scope) {
          let thisHandle = scope.manage(new WeakLifetime(this_ptr, this.memory.copyJSValue, this.memory.freeJSValue, this.runtime)), argHandles = new Array(argc);
          for (let i = 0;i < argc; i++) {
            let ptr = this.ffi.QTS_ArgvGetJSValueConstPointer(argv, i);
            argHandles[i] = scope.manage(new WeakLifetime(ptr, this.memory.copyJSValue, this.memory.freeJSValue, this.runtime));
          }
          try {
            let result = yield* awaited(fn.apply(thisHandle, argHandles));
            if (result) {
              if ("error" in result && result.error)
                throw this.runtime.debugLog("throw error", result.error), result.error;
              let handle = scope.manage(result instanceof Lifetime ? result : result.value);
              return this.ffi.QTS_DupValuePointer(this.ctx.value, handle.value);
            }
            return 0;
          } catch (error) {
            return this.errorToHandle(error).consume((errorHandle) => this.ffi.QTS_Throw(this.ctx.value, errorHandle.value));
          }
        });
      } };
      this.runtime = args.runtime, this.module = args.module, this.ffi = args.ffi, this.rt = args.rt, this.ctx = args.ctx, this.memory = new ContextMemory({ ...args, owner: this.runtime }), args.callbacks.setContextCallbacks(this.ctx.value, this.cToHostCallbacks), this.dump = this.dump.bind(this), this.getString = this.getString.bind(this), this.getNumber = this.getNumber.bind(this), this.resolvePromise = this.resolvePromise.bind(this), this.uint32Out = this.memory.manage(this.memory.newTypedArray(Uint32Array, 1));
    }
    get alive() {
      return this.memory.alive;
    }
    dispose() {
      this.memory.dispose();
    }
    get undefined() {
      if (this._undefined)
        return this._undefined;
      let ptr = this.ffi.QTS_GetUndefined();
      return this._undefined = new StaticLifetime(ptr);
    }
    get null() {
      if (this._null)
        return this._null;
      let ptr = this.ffi.QTS_GetNull();
      return this._null = new StaticLifetime(ptr);
    }
    get true() {
      if (this._true)
        return this._true;
      let ptr = this.ffi.QTS_GetTrue();
      return this._true = new StaticLifetime(ptr);
    }
    get false() {
      if (this._false)
        return this._false;
      let ptr = this.ffi.QTS_GetFalse();
      return this._false = new StaticLifetime(ptr);
    }
    get global() {
      if (this._global)
        return this._global;
      let ptr = this.ffi.QTS_GetGlobalObject(this.ctx.value);
      return this._global = this.memory.staticHeapValueHandle(ptr), this._global;
    }
    newNumber(num) {
      return this.memory.heapValueHandle(this.ffi.QTS_NewFloat64(this.ctx.value, num));
    }
    newString(str) {
      let ptr = this.memory.newHeapCharPointer(str).consume((charHandle) => this.ffi.QTS_NewString(this.ctx.value, charHandle.value.ptr));
      return this.memory.heapValueHandle(ptr);
    }
    newUniqueSymbol(description) {
      let key = (typeof description == "symbol" ? description.description : description) ?? "", ptr = this.memory.newHeapCharPointer(key).consume((charHandle) => this.ffi.QTS_NewSymbol(this.ctx.value, charHandle.value.ptr, 0));
      return this.memory.heapValueHandle(ptr);
    }
    newSymbolFor(key) {
      let description = (typeof key == "symbol" ? key.description : key) ?? "", ptr = this.memory.newHeapCharPointer(description).consume((charHandle) => this.ffi.QTS_NewSymbol(this.ctx.value, charHandle.value.ptr, 1));
      return this.memory.heapValueHandle(ptr);
    }
    getWellKnownSymbol(name) {
      return this._Symbol ?? (this._Symbol = this.memory.manage(this.getProp(this.global, "Symbol"))), this.getProp(this._Symbol, name);
    }
    newBigInt(num) {
      if (!this._BigInt) {
        let bigIntHandle2 = this.getProp(this.global, "BigInt");
        this.memory.manage(bigIntHandle2), this._BigInt = new StaticLifetime(bigIntHandle2.value, this.runtime);
      }
      let bigIntHandle = this._BigInt, asString = String(num);
      return this.newString(asString).consume((handle) => this.unwrapResult(this.callFunction(bigIntHandle, this.undefined, handle)));
    }
    newObject(prototype) {
      prototype && this.runtime.assertOwned(prototype);
      let ptr = prototype ? this.ffi.QTS_NewObjectProto(this.ctx.value, prototype.value) : this.ffi.QTS_NewObject(this.ctx.value);
      return this.memory.heapValueHandle(ptr);
    }
    newArray() {
      let ptr = this.ffi.QTS_NewArray(this.ctx.value);
      return this.memory.heapValueHandle(ptr);
    }
    newArrayBuffer(buffer) {
      let array = new Uint8Array(buffer), handle = this.memory.newHeapBufferPointer(array), ptr = this.ffi.QTS_NewArrayBuffer(this.ctx.value, handle.value.pointer, array.length);
      return this.memory.heapValueHandle(ptr);
    }
    newPromise(value) {
      let deferredPromise = Scope.withScope((scope) => {
        let mutablePointerArray = scope.manage(this.memory.newMutablePointerArray(2)), promisePtr = this.ffi.QTS_NewPromiseCapability(this.ctx.value, mutablePointerArray.value.ptr), promiseHandle = this.memory.heapValueHandle(promisePtr), [resolveHandle, rejectHandle] = Array.from(mutablePointerArray.value.typedArray).map((jsvaluePtr) => this.memory.heapValueHandle(jsvaluePtr));
        return new QuickJSDeferredPromise({ context: this, promiseHandle, resolveHandle, rejectHandle });
      });
      return value && typeof value == "function" && (value = new Promise(value)), value && Promise.resolve(value).then(deferredPromise.resolve, (error) => error instanceof Lifetime ? deferredPromise.reject(error) : this.newError(error).consume(deferredPromise.reject)), deferredPromise;
    }
    newFunction(nameOrFn, maybeFn) {
      let fn = typeof nameOrFn == "function" ? nameOrFn : maybeFn;
      if (!fn)
        throw new TypeError("Expected a function");
      return this.newFunctionWithOptions({ name: typeof nameOrFn == "string" ? nameOrFn : undefined, length: fn.length, isConstructor: false, fn });
    }
    newConstructorFunction(nameOrFn, maybeFn) {
      let fn = typeof nameOrFn == "function" ? nameOrFn : maybeFn;
      if (!fn)
        throw new TypeError("Expected a function");
      return this.newFunctionWithOptions({ name: typeof nameOrFn == "string" ? nameOrFn : undefined, length: fn.length, isConstructor: true, fn });
    }
    newFunctionWithOptions(args) {
      let { name, length, isConstructor, fn } = args, refId = this.runtime.hostRefs.put(fn);
      try {
        return this.memory.heapValueHandle(this.ffi.QTS_NewFunction(this.ctx.value, name ?? "", length, isConstructor, refId));
      } catch (error) {
        throw this.runtime.hostRefs.delete(refId), error;
      }
    }
    newError(error) {
      let errorHandle = this.memory.heapValueHandle(this.ffi.QTS_NewError(this.ctx.value));
      return error && typeof error == "object" ? (error.name !== undefined && this.newString(error.name).consume((handle) => this.setProp(errorHandle, "name", handle)), error.message !== undefined && this.newString(error.message).consume((handle) => this.setProp(errorHandle, "message", handle))) : typeof error == "string" ? this.newString(error).consume((handle) => this.setProp(errorHandle, "message", handle)) : error !== undefined && this.newString(String(error)).consume((handle) => this.setProp(errorHandle, "message", handle)), errorHandle;
    }
    newHostRef(value) {
      let id = this.runtime.hostRefs.put(value);
      try {
        let handle = this.memory.heapValueHandle(this.ffi.QTS_NewHostRef(this.ctx.value, id));
        return new HostRef(this.runtime, handle, id);
      } catch (error) {
        throw this.runtime.hostRefs.delete(id), error;
      }
    }
    toHostRef(handle) {
      let id = this.ffi.QTS_GetHostRefId(handle.value);
      if (id !== 0)
        return this.runtime.hostRefs.get(id), new HostRef(this.runtime, handle.dup(), id);
    }
    unwrapHostRef(handle) {
      let id = this.ffi.QTS_GetHostRefId(handle.value);
      if (id === 0)
        throw new QuickJSHostRefInvalid("handle is not a HostRef");
      return this.runtime.hostRefs.get(id);
    }
    typeof(handle) {
      return this.runtime.assertOwned(handle), this.memory.consumeHeapCharPointer(this.ffi.QTS_Typeof(this.ctx.value, handle.value));
    }
    getNumber(handle) {
      return this.runtime.assertOwned(handle), this.ffi.QTS_GetFloat64(this.ctx.value, handle.value);
    }
    getString(handle) {
      return this.runtime.assertOwned(handle), this.memory.consumeJSCharPointer(this.ffi.QTS_GetString(this.ctx.value, handle.value));
    }
    getSymbol(handle) {
      this.runtime.assertOwned(handle);
      let key = this.memory.consumeJSCharPointer(this.ffi.QTS_GetSymbolDescriptionOrKey(this.ctx.value, handle.value));
      return this.ffi.QTS_IsGlobalSymbol(this.ctx.value, handle.value) ? Symbol.for(key) : Symbol(key);
    }
    getBigInt(handle) {
      this.runtime.assertOwned(handle);
      let asString = this.getString(handle);
      return BigInt(asString);
    }
    getArrayBuffer(handle) {
      this.runtime.assertOwned(handle);
      let len = this.ffi.QTS_GetArrayBufferLength(this.ctx.value, handle.value), ptr = this.ffi.QTS_GetArrayBuffer(this.ctx.value, handle.value);
      if (!ptr)
        throw new Error("Couldn't allocate memory to get ArrayBuffer");
      return new Lifetime(this.module.HEAPU8.subarray(ptr, ptr + len), undefined, () => this.module._free(ptr));
    }
    getPromiseState(handle) {
      this.runtime.assertOwned(handle);
      let state = this.ffi.QTS_PromiseState(this.ctx.value, handle.value);
      if (state < 0)
        return { type: "fulfilled", value: handle, notAPromise: true };
      if (state === JSPromiseStateEnum.Pending)
        return { type: "pending", get error() {
          return new QuickJSPromisePending("Cannot unwrap a pending promise");
        } };
      let ptr = this.ffi.QTS_PromiseResult(this.ctx.value, handle.value), result = this.memory.heapValueHandle(ptr);
      if (state === JSPromiseStateEnum.Fulfilled)
        return { type: "fulfilled", value: result };
      if (state === JSPromiseStateEnum.Rejected)
        return { type: "rejected", error: result };
      throw result.dispose(), new Error(`Unknown JSPromiseStateEnum: ${state}`);
    }
    resolvePromise(promiseLikeHandle) {
      this.runtime.assertOwned(promiseLikeHandle);
      let vmResolveResult = Scope.withScope((scope) => {
        let vmPromise = scope.manage(this.getProp(this.global, "Promise")), vmPromiseResolve = scope.manage(this.getProp(vmPromise, "resolve"));
        return this.callFunction(vmPromiseResolve, vmPromise, promiseLikeHandle);
      });
      return vmResolveResult.error ? Promise.resolve(vmResolveResult) : new Promise((resolve) => {
        Scope.withScope((scope) => {
          let resolveHandle = scope.manage(this.newFunction("resolve", (value) => {
            resolve(this.success(value && value.dup()));
          })), rejectHandle = scope.manage(this.newFunction("reject", (error) => {
            resolve(this.fail(error && error.dup()));
          })), promiseHandle = scope.manage(vmResolveResult.value), promiseThenHandle = scope.manage(this.getProp(promiseHandle, "then"));
          this.callFunction(promiseThenHandle, promiseHandle, resolveHandle, rejectHandle).unwrap().dispose();
        });
      });
    }
    isEqual(a, b, equalityType = IsEqualOp.IsStrictlyEqual) {
      if (a === b)
        return true;
      this.runtime.assertOwned(a), this.runtime.assertOwned(b);
      let result = this.ffi.QTS_IsEqual(this.ctx.value, a.value, b.value, equalityType);
      if (result === -1)
        throw new QuickJSNotImplemented("WASM variant does not expose equality");
      return !!result;
    }
    eq(handle, other) {
      return this.isEqual(handle, other, IsEqualOp.IsStrictlyEqual);
    }
    sameValue(handle, other) {
      return this.isEqual(handle, other, IsEqualOp.IsSameValue);
    }
    sameValueZero(handle, other) {
      return this.isEqual(handle, other, IsEqualOp.IsSameValueZero);
    }
    getProp(handle, key) {
      this.runtime.assertOwned(handle);
      let ptr;
      return typeof key == "number" && key >= 0 ? ptr = this.ffi.QTS_GetPropNumber(this.ctx.value, handle.value, key) : ptr = this.borrowPropertyKey(key).consume((quickJSKey) => this.ffi.QTS_GetProp(this.ctx.value, handle.value, quickJSKey.value)), this.memory.heapValueHandle(ptr);
    }
    getLength(handle) {
      if (this.runtime.assertOwned(handle), !(this.ffi.QTS_GetLength(this.ctx.value, this.uint32Out.value.ptr, handle.value) < 0))
        return this.uint32Out.value.typedArray[0];
    }
    getOwnPropertyNames(handle, options = { strings: true, numbersAsStrings: true }) {
      this.runtime.assertOwned(handle), handle.value;
      let flags = getOwnPropertyNamesOptionsToFlags(options);
      if (flags === 0)
        throw new QuickJSEmptyGetOwnPropertyNames("No options set, will return an empty array");
      return Scope.withScope((scope) => {
        let outPtr = scope.manage(this.memory.newMutablePointerArray(1)), errorPtr = this.ffi.QTS_GetOwnPropertyNames(this.ctx.value, outPtr.value.ptr, this.uint32Out.value.ptr, handle.value, flags);
        if (errorPtr)
          return this.fail(this.memory.heapValueHandle(errorPtr));
        let len = this.uint32Out.value.typedArray[0], ptr = outPtr.value.typedArray[0], pointerArray = new Uint32Array(this.module.HEAP8.buffer, ptr, len), handles = Array.from(pointerArray).map((ptr2) => this.memory.heapValueHandle(ptr2));
        return this.ffi.QTS_FreeVoidPointer(this.ctx.value, ptr), this.success(createDisposableArray(handles));
      });
    }
    getIterator(iterableHandle) {
      let SymbolIterator = this._SymbolIterator ?? (this._SymbolIterator = this.memory.manage(this.getWellKnownSymbol("iterator")));
      return Scope.withScope((scope) => {
        let methodHandle = scope.manage(this.getProp(iterableHandle, SymbolIterator)), iteratorCallResult = this.callFunction(methodHandle, iterableHandle);
        return iteratorCallResult.error ? iteratorCallResult : this.success(new QuickJSIterator(iteratorCallResult.value, this));
      });
    }
    setProp(handle, key, value) {
      this.runtime.assertOwned(handle), this.borrowPropertyKey(key).consume((quickJSKey) => this.ffi.QTS_SetProp(this.ctx.value, handle.value, quickJSKey.value, value.value));
    }
    defineProp(handle, key, descriptor) {
      this.runtime.assertOwned(handle), Scope.withScope((scope) => {
        let quickJSKey = scope.manage(this.borrowPropertyKey(key)), value = descriptor.value || this.undefined, configurable = !!descriptor.configurable, enumerable = !!descriptor.enumerable, hasValue = !!descriptor.value, get = descriptor.get ? scope.manage(this.newFunction(descriptor.get.name, descriptor.get)) : this.undefined, set = descriptor.set ? scope.manage(this.newFunction(descriptor.set.name, descriptor.set)) : this.undefined;
        this.ffi.QTS_DefineProp(this.ctx.value, handle.value, quickJSKey.value, value.value, get.value, set.value, configurable, enumerable, hasValue);
      });
    }
    callFunction(func, thisVal, ...restArgs) {
      this.runtime.assertOwned(func);
      let args, firstArg = restArgs[0];
      firstArg === undefined || Array.isArray(firstArg) ? args = firstArg ?? [] : args = restArgs;
      let resultPtr = this.memory.toPointerArray(args).consume((argsArrayPtr) => this.ffi.QTS_Call(this.ctx.value, func.value, thisVal.value, args.length, argsArrayPtr.value)), errorPtr = this.ffi.QTS_ResolveException(this.ctx.value, resultPtr);
      return errorPtr ? (this.ffi.QTS_FreeValuePointer(this.ctx.value, resultPtr), this.fail(this.memory.heapValueHandle(errorPtr))) : this.success(this.memory.heapValueHandle(resultPtr));
    }
    callMethod(thisHandle, key, args = []) {
      return this.getProp(thisHandle, key).consume((func) => this.callFunction(func, thisHandle, args));
    }
    evalCode(code, filename = "eval.js", options) {
      let detectModule = options === undefined ? 1 : 0, flags = evalOptionsToFlags(options), resultPtr = this.memory.newHeapCharPointer(code).consume((charHandle) => this.ffi.QTS_Eval(this.ctx.value, charHandle.value.ptr, charHandle.value.strlen, filename, detectModule, flags)), errorPtr = this.ffi.QTS_ResolveException(this.ctx.value, resultPtr);
      return errorPtr ? (this.ffi.QTS_FreeValuePointer(this.ctx.value, resultPtr), this.fail(this.memory.heapValueHandle(errorPtr))) : this.success(this.memory.heapValueHandle(resultPtr));
    }
    throw(error) {
      return this.errorToHandle(error).consume((handle) => this.ffi.QTS_Throw(this.ctx.value, handle.value));
    }
    borrowPropertyKey(key) {
      return typeof key == "number" ? this.newNumber(key) : typeof key == "string" ? this.newString(key) : new StaticLifetime(key.value, this.runtime);
    }
    getMemory(rt) {
      if (rt === this.rt.value)
        return this.memory;
      throw new Error("Private API. Cannot get memory from a different runtime");
    }
    dump(handle) {
      this.runtime.assertOwned(handle);
      let type = this.typeof(handle);
      if (type === "string")
        return this.getString(handle);
      if (type === "number")
        return this.getNumber(handle);
      if (type === "bigint")
        return this.getBigInt(handle);
      if (type === "undefined")
        return;
      if (type === "symbol")
        return this.getSymbol(handle);
      let asPromiseState = this.getPromiseState(handle);
      if (asPromiseState.type === "fulfilled" && !asPromiseState.notAPromise)
        return handle.dispose(), { type: asPromiseState.type, value: asPromiseState.value.consume(this.dump) };
      if (asPromiseState.type === "pending")
        return handle.dispose(), { type: asPromiseState.type };
      if (asPromiseState.type === "rejected")
        return handle.dispose(), { type: asPromiseState.type, error: asPromiseState.error.consume(this.dump) };
      let str = this.memory.consumeJSCharPointer(this.ffi.QTS_Dump(this.ctx.value, handle.value));
      try {
        return JSON.parse(str);
      } catch {
        return str;
      }
    }
    unwrapResult(result) {
      if (result.error) {
        let context = "context" in result.error ? result.error.context : this, cause = result.error.consume((error) => this.dump(error));
        if (cause && typeof cause == "object" && typeof cause.message == "string") {
          let { message, name, stack, ...rest } = cause, exception = new QuickJSUnwrapError(cause, context);
          typeof name == "string" && (exception.name = cause.name), exception.message = message;
          let hostStack = exception.stack;
          throw typeof stack == "string" && (exception.stack = `${name}: ${message}
${cause.stack}Host: ${hostStack}`), Object.assign(exception, rest), exception;
        }
        throw new QuickJSUnwrapError(cause);
      }
      return result.value;
    }
    [Symbol.for("nodejs.util.inspect.custom")]() {
      return this.alive ? `${this.constructor.name} { ctx: ${this.ctx.value} rt: ${this.rt.value} }` : `${this.constructor.name} { disposed }`;
    }
    getFunction(fn_id) {
      let fn = this.runtime.hostRefs.get(fn_id);
      if (typeof fn != "function")
        throw new Error(`Host reference ${fn_id} is not a function`);
      return fn;
    }
    errorToHandle(error) {
      return error instanceof Lifetime ? error : this.newError(error);
    }
    encodeBinaryJSON(handle) {
      let ptr = this.ffi.QTS_bjson_encode(this.ctx.value, handle.value);
      return this.memory.heapValueHandle(ptr);
    }
    decodeBinaryJSON(handle) {
      let ptr = this.ffi.QTS_bjson_decode(this.ctx.value, handle.value);
      return this.memory.heapValueHandle(ptr);
    }
    success(value) {
      return DisposableResult.success(value);
    }
    fail(error) {
      return DisposableResult.fail(error, (error2) => this.unwrapResult(error2));
    }
  };
  QuickJSRuntime = class extends UsingDisposable {
    constructor(args) {
      super();
      this.scope = new Scope;
      this.contextMap = new Map;
      this.hostRefs = new HostRefMap;
      this._debugMode = false;
      this.cToHostCallbacks = { freeHostRef: (rt, host_ref_id) => {
        if (rt !== this.rt.value)
          throw new Error("Runtime pointer mismatch");
        this.hostRefs.delete(host_ref_id);
      }, shouldInterrupt: (rt) => {
        if (rt !== this.rt.value)
          throw new Error("QuickJSContext instance received C -> JS interrupt with mismatched rt");
        let fn = this.interruptHandler;
        if (!fn)
          throw new Error("QuickJSContext had no interrupt handler");
        return fn(this) ? 1 : 0;
      }, loadModuleSource: maybeAsyncFn(this, function* (awaited, rt, ctx, moduleName) {
        let moduleLoader = this.moduleLoader;
        if (!moduleLoader)
          throw new Error("Runtime has no module loader");
        if (rt !== this.rt.value)
          throw new Error("Runtime pointer mismatch");
        let context = this.contextMap.get(ctx) ?? this.newContext({ contextPointer: ctx });
        try {
          let result = yield* awaited(moduleLoader(moduleName, context));
          if (typeof result == "object" && "error" in result && result.error)
            throw this.debugLog("cToHostLoadModule: loader returned error", result.error), result.error;
          let moduleSource = typeof result == "string" ? result : ("value" in result) ? result.value : result;
          return this.memory.newHeapCharPointer(moduleSource).value.ptr;
        } catch (error) {
          return this.debugLog("cToHostLoadModule: caught error", error), context.throw(error), 0;
        }
      }), normalizeModule: maybeAsyncFn(this, function* (awaited, rt, ctx, baseModuleName, moduleNameRequest) {
        let moduleNormalizer = this.moduleNormalizer;
        if (!moduleNormalizer)
          throw new Error("Runtime has no module normalizer");
        if (rt !== this.rt.value)
          throw new Error("Runtime pointer mismatch");
        let context = this.contextMap.get(ctx) ?? this.newContext({ contextPointer: ctx });
        try {
          let result = yield* awaited(moduleNormalizer(baseModuleName, moduleNameRequest, context));
          if (typeof result == "object" && "error" in result && result.error)
            throw this.debugLog("cToHostNormalizeModule: normalizer returned error", result.error), result.error;
          let name = typeof result == "string" ? result : result.value;
          return context.getMemory(this.rt.value).newHeapCharPointer(name).value.ptr;
        } catch (error) {
          return this.debugLog("normalizeModule: caught error", error), context.throw(error), 0;
        }
      }) };
      args.ownedLifetimes?.forEach((lifetime) => this.scope.manage(lifetime)), this.module = args.module, this.memory = new ModuleMemory(this.module), this.ffi = args.ffi, this.rt = args.rt, this.callbacks = args.callbacks, this.scope.manage(this.rt), this.callbacks.setRuntimeCallbacks(this.rt.value, this.cToHostCallbacks), this.executePendingJobs = this.executePendingJobs.bind(this), QTS_DEBUG && this.setDebugMode(true);
    }
    get alive() {
      return this.scope.alive;
    }
    dispose() {
      return this.scope.dispose();
    }
    newContext(options = {}) {
      let intrinsics = intrinsicsToFlags(options.intrinsics), ctx = new Lifetime(options.contextPointer || this.ffi.QTS_NewContext(this.rt.value, intrinsics), undefined, (ctx_ptr) => {
        this.contextMap.delete(ctx_ptr), this.callbacks.deleteContext(ctx_ptr), this.ffi.QTS_FreeContext(ctx_ptr);
      }), context = new QuickJSContext({ module: this.module, ctx, ffi: this.ffi, rt: this.rt, ownedLifetimes: options.ownedLifetimes, runtime: this, callbacks: this.callbacks });
      return this.contextMap.set(ctx.value, context), context;
    }
    setModuleLoader(moduleLoader, moduleNormalizer) {
      this.moduleLoader = moduleLoader, this.moduleNormalizer = moduleNormalizer, this.ffi.QTS_RuntimeEnableModuleLoader(this.rt.value, this.moduleNormalizer ? 1 : 0);
    }
    removeModuleLoader() {
      this.moduleLoader = undefined, this.ffi.QTS_RuntimeDisableModuleLoader(this.rt.value);
    }
    hasPendingJob() {
      return !!this.ffi.QTS_IsJobPending(this.rt.value);
    }
    setInterruptHandler(cb) {
      let prevInterruptHandler = this.interruptHandler;
      this.interruptHandler = cb, prevInterruptHandler || this.ffi.QTS_RuntimeEnableInterruptHandler(this.rt.value);
    }
    removeInterruptHandler() {
      this.interruptHandler && (this.ffi.QTS_RuntimeDisableInterruptHandler(this.rt.value), this.interruptHandler = undefined);
    }
    executePendingJobs(maxJobsToExecute = -1) {
      let ctxPtrOut = this.memory.newMutablePointerArray(1), valuePtr = this.ffi.QTS_ExecutePendingJob(this.rt.value, maxJobsToExecute ?? -1, ctxPtrOut.value.ptr), ctxPtr = ctxPtrOut.value.typedArray[0];
      if (ctxPtrOut.dispose(), ctxPtr === 0)
        return this.ffi.QTS_FreeValuePointerRuntime(this.rt.value, valuePtr), DisposableResult.success(0);
      let context = this.contextMap.get(ctxPtr) ?? this.newContext({ contextPointer: ctxPtr }), resultValue = context.getMemory(this.rt.value).heapValueHandle(valuePtr);
      if (context.typeof(resultValue) === "number") {
        let executedJobs = context.getNumber(resultValue);
        return resultValue.dispose(), DisposableResult.success(executedJobs);
      } else {
        let error = Object.assign(resultValue, { context });
        return DisposableResult.fail(error, (error2) => context.unwrapResult(error2));
      }
    }
    setMemoryLimit(limitBytes) {
      if (limitBytes < 0 && limitBytes !== -1)
        throw new Error("Cannot set memory limit to negative number. To unset, pass -1");
      this.ffi.QTS_RuntimeSetMemoryLimit(this.rt.value, limitBytes);
    }
    computeMemoryUsage() {
      let serviceContextMemory = this.getSystemContext().getMemory(this.rt.value);
      return serviceContextMemory.heapValueHandle(this.ffi.QTS_RuntimeComputeMemoryUsage(this.rt.value, serviceContextMemory.ctx.value));
    }
    dumpMemoryUsage() {
      return this.memory.consumeHeapCharPointer(this.ffi.QTS_RuntimeDumpMemoryUsage(this.rt.value));
    }
    setMaxStackSize(stackSize) {
      if (stackSize < 0)
        throw new Error("Cannot set memory limit to negative number. To unset, pass 0.");
      this.ffi.QTS_RuntimeSetMaxStackSize(this.rt.value, stackSize);
    }
    assertOwned(handle) {
      if (handle.owner && handle.owner.rt !== this.rt)
        throw new QuickJSWrongOwner(`Handle is not owned by this runtime: ${handle.owner.rt.value} != ${this.rt.value}`);
    }
    setDebugMode(enabled) {
      this._debugMode = enabled, this.ffi.DEBUG && this.rt.alive && this.ffi.QTS_SetDebugLogEnabled(this.rt.value, enabled ? 1 : 0);
    }
    isDebugMode() {
      return this._debugMode;
    }
    debugLog(...msg) {
      this._debugMode && console.log("quickjs-emscripten:", ...msg);
    }
    [Symbol.for("nodejs.util.inspect.custom")]() {
      return this.alive ? `${this.constructor.name} { rt: ${this.rt.value} }` : `${this.constructor.name} { disposed }`;
    }
    getSystemContext() {
      return this.context || (this.context = this.scope.manage(this.newContext())), this.context;
    }
  };
});

// node_modules/quickjs-emscripten-core/dist/module-ES6BEMUI.mjs
var exports_module_ES6BEMUI = {};
__export(exports_module_ES6BEMUI, {
  QuickJSModuleCallbacks: () => QuickJSModuleCallbacks,
  QuickJSWASMModule: () => QuickJSWASMModule,
  applyBaseRuntimeOptions: () => applyBaseRuntimeOptions,
  applyModuleEvalRuntimeOptions: () => applyModuleEvalRuntimeOptions
});
var init_module_ES6BEMUI = __esm(() => {
  init_chunk_V2S4ZYJR();
});

// node_modules/@jitl/quickjs-wasmfile-release-sync/dist/ffi.mjs
var exports_ffi = {};
__export(exports_ffi, {
  QuickJSFFI: () => QuickJSFFI
});
var QuickJSFFI = class {
  constructor(module) {
    this.module = module;
    this.DEBUG = false;
    this.QTS_Throw = this.module.cwrap("QTS_Throw", "number", ["number", "number"]);
    this.QTS_NewError = this.module.cwrap("QTS_NewError", "number", ["number"]);
    this.QTS_RuntimeSetMemoryLimit = this.module.cwrap("QTS_RuntimeSetMemoryLimit", null, ["number", "number"]);
    this.QTS_RuntimeComputeMemoryUsage = this.module.cwrap("QTS_RuntimeComputeMemoryUsage", "number", ["number", "number"]);
    this.QTS_RuntimeDumpMemoryUsage = this.module.cwrap("QTS_RuntimeDumpMemoryUsage", "number", ["number"]);
    this.QTS_RecoverableLeakCheck = this.module.cwrap("QTS_RecoverableLeakCheck", "number", []);
    this.QTS_BuildIsSanitizeLeak = this.module.cwrap("QTS_BuildIsSanitizeLeak", "number", []);
    this.QTS_RuntimeSetMaxStackSize = this.module.cwrap("QTS_RuntimeSetMaxStackSize", null, ["number", "number"]);
    this.QTS_GetUndefined = this.module.cwrap("QTS_GetUndefined", "number", []);
    this.QTS_GetNull = this.module.cwrap("QTS_GetNull", "number", []);
    this.QTS_GetFalse = this.module.cwrap("QTS_GetFalse", "number", []);
    this.QTS_GetTrue = this.module.cwrap("QTS_GetTrue", "number", []);
    this.QTS_NewHostRef = this.module.cwrap("QTS_NewHostRef", "number", ["number", "number"]);
    this.QTS_GetHostRefId = this.module.cwrap("QTS_GetHostRefId", "number", ["number"]);
    this.QTS_NewRuntime = this.module.cwrap("QTS_NewRuntime", "number", []);
    this.QTS_FreeRuntime = this.module.cwrap("QTS_FreeRuntime", null, ["number"]);
    this.QTS_NewContext = this.module.cwrap("QTS_NewContext", "number", ["number", "number"]);
    this.QTS_FreeContext = this.module.cwrap("QTS_FreeContext", null, ["number"]);
    this.QTS_FreeValuePointer = this.module.cwrap("QTS_FreeValuePointer", null, ["number", "number"]);
    this.QTS_FreeValuePointerRuntime = this.module.cwrap("QTS_FreeValuePointerRuntime", null, ["number", "number"]);
    this.QTS_FreeVoidPointer = this.module.cwrap("QTS_FreeVoidPointer", null, ["number", "number"]);
    this.QTS_FreeCString = this.module.cwrap("QTS_FreeCString", null, ["number", "number"]);
    this.QTS_DupValuePointer = this.module.cwrap("QTS_DupValuePointer", "number", ["number", "number"]);
    this.QTS_NewObject = this.module.cwrap("QTS_NewObject", "number", ["number"]);
    this.QTS_NewObjectProto = this.module.cwrap("QTS_NewObjectProto", "number", ["number", "number"]);
    this.QTS_NewArray = this.module.cwrap("QTS_NewArray", "number", ["number"]);
    this.QTS_NewArrayBuffer = this.module.cwrap("QTS_NewArrayBuffer", "number", ["number", "number", "number"]);
    this.QTS_NewFloat64 = this.module.cwrap("QTS_NewFloat64", "number", ["number", "number"]);
    this.QTS_GetFloat64 = this.module.cwrap("QTS_GetFloat64", "number", ["number", "number"]);
    this.QTS_NewString = this.module.cwrap("QTS_NewString", "number", ["number", "number"]);
    this.QTS_GetString = this.module.cwrap("QTS_GetString", "number", ["number", "number"]);
    this.QTS_GetArrayBuffer = this.module.cwrap("QTS_GetArrayBuffer", "number", ["number", "number"]);
    this.QTS_GetArrayBufferLength = this.module.cwrap("QTS_GetArrayBufferLength", "number", ["number", "number"]);
    this.QTS_NewSymbol = this.module.cwrap("QTS_NewSymbol", "number", ["number", "number", "number"]);
    this.QTS_GetSymbolDescriptionOrKey = this.module.cwrap("QTS_GetSymbolDescriptionOrKey", "number", ["number", "number"]);
    this.QTS_IsGlobalSymbol = this.module.cwrap("QTS_IsGlobalSymbol", "number", ["number", "number"]);
    this.QTS_IsJobPending = this.module.cwrap("QTS_IsJobPending", "number", ["number"]);
    this.QTS_ExecutePendingJob = this.module.cwrap("QTS_ExecutePendingJob", "number", ["number", "number", "number"]);
    this.QTS_GetProp = this.module.cwrap("QTS_GetProp", "number", ["number", "number", "number"]);
    this.QTS_GetPropNumber = this.module.cwrap("QTS_GetPropNumber", "number", ["number", "number", "number"]);
    this.QTS_SetProp = this.module.cwrap("QTS_SetProp", null, ["number", "number", "number", "number"]);
    this.QTS_DefineProp = this.module.cwrap("QTS_DefineProp", null, ["number", "number", "number", "number", "number", "number", "boolean", "boolean", "boolean"]);
    this.QTS_GetOwnPropertyNames = this.module.cwrap("QTS_GetOwnPropertyNames", "number", ["number", "number", "number", "number", "number"]);
    this.QTS_Call = this.module.cwrap("QTS_Call", "number", ["number", "number", "number", "number", "number"]);
    this.QTS_ResolveException = this.module.cwrap("QTS_ResolveException", "number", ["number", "number"]);
    this.QTS_Dump = this.module.cwrap("QTS_Dump", "number", ["number", "number"]);
    this.QTS_Eval = this.module.cwrap("QTS_Eval", "number", ["number", "number", "number", "string", "number", "number"]);
    this.QTS_GetModuleNamespace = this.module.cwrap("QTS_GetModuleNamespace", "number", ["number", "number"]);
    this.QTS_Typeof = this.module.cwrap("QTS_Typeof", "number", ["number", "number"]);
    this.QTS_GetLength = this.module.cwrap("QTS_GetLength", "number", ["number", "number", "number"]);
    this.QTS_IsEqual = this.module.cwrap("QTS_IsEqual", "number", ["number", "number", "number", "number"]);
    this.QTS_GetGlobalObject = this.module.cwrap("QTS_GetGlobalObject", "number", ["number"]);
    this.QTS_NewPromiseCapability = this.module.cwrap("QTS_NewPromiseCapability", "number", ["number", "number"]);
    this.QTS_PromiseState = this.module.cwrap("QTS_PromiseState", "number", ["number", "number"]);
    this.QTS_PromiseResult = this.module.cwrap("QTS_PromiseResult", "number", ["number", "number"]);
    this.QTS_TestStringArg = this.module.cwrap("QTS_TestStringArg", null, ["string"]);
    this.QTS_GetDebugLogEnabled = this.module.cwrap("QTS_GetDebugLogEnabled", "number", ["number"]);
    this.QTS_SetDebugLogEnabled = this.module.cwrap("QTS_SetDebugLogEnabled", null, ["number", "number"]);
    this.QTS_BuildIsDebug = this.module.cwrap("QTS_BuildIsDebug", "number", []);
    this.QTS_BuildIsAsyncify = this.module.cwrap("QTS_BuildIsAsyncify", "number", []);
    this.QTS_NewFunction = this.module.cwrap("QTS_NewFunction", "number", ["number", "string", "number", "boolean", "number"]);
    this.QTS_ArgvGetJSValueConstPointer = this.module.cwrap("QTS_ArgvGetJSValueConstPointer", "number", ["number", "number"]);
    this.QTS_RuntimeEnableInterruptHandler = this.module.cwrap("QTS_RuntimeEnableInterruptHandler", null, ["number"]);
    this.QTS_RuntimeDisableInterruptHandler = this.module.cwrap("QTS_RuntimeDisableInterruptHandler", null, ["number"]);
    this.QTS_RuntimeEnableModuleLoader = this.module.cwrap("QTS_RuntimeEnableModuleLoader", null, ["number", "number"]);
    this.QTS_RuntimeDisableModuleLoader = this.module.cwrap("QTS_RuntimeDisableModuleLoader", null, ["number"]);
    this.QTS_bjson_encode = this.module.cwrap("QTS_bjson_encode", "number", ["number", "number"]);
    this.QTS_bjson_decode = this.module.cwrap("QTS_bjson_decode", "number", ["number", "number"]);
  }
};
var init_ffi = () => {};

// node_modules/@jitl/quickjs-wasmfile-release-sync/dist/emscripten-module.cloudflare.cjs
var require_emscripten_module_cloudflare = __commonJS(function(exports, module) {
  var QuickJSRaw = (() => {
    var _scriptName = globalThis.document?.currentScript?.src;
    return async function(moduleArg = {}) {
      var moduleRtn;
      var c = moduleArg;
      function n(a) {
        a = { log: a || function() {} };
        for (const d of n.Pa)
          d(a);
        return c.quickJSEmscriptenExtensions = a;
      }
      n.Pa = [];
      c.quickjsEmscriptenInit = n;
      n.Pa.push((a) => {
        a.getWasmMemory = function() {
          return q;
        };
      });
      var r = "./this.program", t = "", u;
      try {
        t = new URL(".", _scriptName).href;
      } catch {}
      u = async (a) => {
        a = await fetch(a, { credentials: "same-origin" });
        if (a.ok)
          return a.arrayBuffer();
        throw Error(a.status + " : " + a.url);
      };
      var v = console.log.bind(console), w = console.error.bind(console), y, z = false, A, B, C, D, E, F, G, H = false;
      function I() {
        var a = q.buffer;
        c.HEAP8 = D = new Int8Array(a);
        new Int16Array(a);
        c.HEAPU8 = E = new Uint8Array(a);
        new Uint16Array(a);
        F = new Int32Array(a);
        G = new Uint32Array(a);
        new Float32Array(a);
        new Float64Array(a);
        new BigInt64Array(a);
        new BigUint64Array(a);
      }
      function J(a) {
        c.onAbort?.(a);
        a = "Aborted(" + a + ")";
        w(a);
        z = true;
        a = new WebAssembly.RuntimeError(a + ". Build with -sASSERTIONS for more info.");
        C?.(a);
        throw a;
      }
      var K;
      async function aa(a) {
        if (!y)
          try {
            var d = await u(a);
            return new Uint8Array(d);
          } catch {}
        if (a == K && y)
          a = new Uint8Array(y);
        else
          throw "both async and sync fetching of the wasm failed";
        return a;
      }
      async function ba(a, d) {
        try {
          var b = await aa(a);
          return await WebAssembly.instantiate(b, d);
        } catch (e) {
          w(`failed to asynchronously prepare wasm: ${e}`), J(e);
        }
      }
      async function ca(a) {
        var d = K;
        if (!y)
          try {
            var b = fetch(d, { credentials: "same-origin" });
            return await WebAssembly.instantiateStreaming(b, a);
          } catch (e) {
            w(`wasm streaming compile failed: ${e}`), w("falling back to ArrayBuffer instantiation");
          }
        return ba(d, a);
      }

      class L {
        name = "ExitStatus";
        constructor(a) {
          this.message = `Program terminated with exit(${a})`;
          this.status = a;
        }
      }
      var M = (a) => {
        for (;0 < a.length; )
          a.shift()(c);
      }, N = [], O = [], da = () => {
        var a = c.preRun.shift();
        O.push(a);
      }, P = true, q, Q = new TextDecoder, ea = (a, d, b, e) => {
        b = d + b;
        if (e)
          return b;
        for (;a[d] && !(d >= b); )
          ++d;
        return d;
      }, R = (a, d, b) => a ? Q.decode(E.subarray(a, ea(E, a, d, b))) : "", S = 0, fa = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335], ha = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334], T = {}, ia = (a) => {
        if (!(a instanceof L || a == "unwind"))
          throw a;
      }, ja = (a) => {
        A = a;
        P || 0 < S || (c.onExit?.(a), z = true);
        throw new L(a);
      }, ka = (a) => {
        if (!z)
          try {
            a();
          } catch (d) {
            ia(d);
          } finally {
            if (!(P || 0 < S))
              try {
                A = a = A, ja(a);
              } catch (d) {
                ia(d);
              }
          }
      }, U = (a, d, b) => {
        var e = E;
        if (!(0 < b))
          return 0;
        var f = d;
        b = d + b - 1;
        for (var g = 0;g < a.length; ++g) {
          var h = a.codePointAt(g);
          if (127 >= h) {
            if (d >= b)
              break;
            e[d++] = h;
          } else if (2047 >= h) {
            if (d + 1 >= b)
              break;
            e[d++] = 192 | h >> 6;
            e[d++] = 128 | h & 63;
          } else if (65535 >= h) {
            if (d + 2 >= b)
              break;
            e[d++] = 224 | h >> 12;
            e[d++] = 128 | h >> 6 & 63;
            e[d++] = 128 | h & 63;
          } else {
            if (d + 3 >= b)
              break;
            e[d++] = 240 | h >> 18;
            e[d++] = 128 | h >> 12 & 63;
            e[d++] = 128 | h >> 6 & 63;
            e[d++] = 128 | h & 63;
            g++;
          }
        }
        e[d] = 0;
        return d - f;
      }, V = {}, la = () => {
        if (!W) {
          var a = {
            USER: "web_user",
            LOGNAME: "web_user",
            PATH: "/",
            PWD: "/",
            HOME: "/home/web_user",
            LANG: (globalThis.navigator?.language ?? "C").replace("-", "_") + ".UTF-8",
            _: r || "./this.program"
          }, d;
          for (d in V)
            V[d] === undefined ? delete a[d] : a[d] = V[d];
          var b = [];
          for (d in a)
            b.push(`${d}=${a[d]}`);
          W = b;
        }
        return W;
      }, W, X = (a) => {
        for (var d = 0, b = 0;b < a.length; ++b) {
          var e = a.charCodeAt(b);
          127 >= e ? d++ : 2047 >= e ? d += 2 : 55296 <= e && 57343 >= e ? (d += 4, ++b) : d += 3;
        }
        return d;
      }, ma = [null, [], []], pa = (a, d, b, e) => {
        var f = { string: (k) => {
          var l = 0;
          if (k !== null && k !== undefined && k !== 0) {
            l = X(k) + 1;
            var p = Y(l);
            U(k, p, l);
            l = p;
          }
          return l;
        }, array: (k) => {
          var l = Y(k.length);
          D.set(k, l);
          return l;
        } };
        a = c["_" + a];
        var g = [], h = 0;
        if (e)
          for (var m = 0;m < e.length; m++) {
            var x = f[b[m]];
            x ? (h === 0 && (h = na()), g[m] = x(e[m])) : g[m] = e[m];
          }
        b = a(...g);
        return b = function(k) {
          h !== 0 && oa(h);
          return d === "string" ? R(k) : d === "boolean" ? !!k : k;
        }(b);
      };
      c.wasmMemory ? q = c.wasmMemory : q = new WebAssembly.Memory({ initial: (c.INITIAL_MEMORY || 16777216) / 65536, maximum: 32768 });
      I();
      c.noExitRuntime && (P = c.noExitRuntime);
      c.print && (v = c.print);
      c.printErr && (w = c.printErr);
      c.wasmBinary && (y = c.wasmBinary);
      c.thisProgram && (r = c.thisProgram);
      if (c.preInit)
        for (typeof c.preInit == "function" && (c.preInit = [c.preInit]);0 < c.preInit.length; )
          c.preInit.shift()();
      c.cwrap = (a, d, b, e) => {
        var f = !b || b.every((g) => g === "number" || g === "boolean");
        return d !== "string" && f && !e ? c["_" + a] : (...g) => pa(a, d, b, g);
      };
      c.UTF8ToString = R;
      c.stringToUTF8 = (a, d, b) => U(a, d, b);
      c.lengthBytesUTF8 = X;
      var qa, oa, Y, na, ra = { b: (a, d, b, e) => J(`Assertion failed: ${R(a)}, at: ` + [d ? R(d) : "unknown filename", b, e ? R(e) : "unknown function"]), q: () => J(""), l: () => {
        P = false;
        S = 0;
      }, m: function(a, d) {
        a = -9007199254740992 > a || 9007199254740992 < a ? NaN : Number(a);
        a = new Date(1000 * a);
        F[d >> 2] = a.getSeconds();
        F[d + 4 >> 2] = a.getMinutes();
        F[d + 8 >> 2] = a.getHours();
        F[d + 12 >> 2] = a.getDate();
        F[d + 16 >> 2] = a.getMonth();
        F[d + 20 >> 2] = a.getFullYear() - 1900;
        F[d + 24 >> 2] = a.getDay();
        var b = a.getFullYear();
        F[d + 28 >> 2] = (b % 4 !== 0 || b % 100 === 0 && b % 400 !== 0 ? ha : fa)[a.getMonth()] + a.getDate() - 1 | 0;
        F[d + 36 >> 2] = -(60 * a.getTimezoneOffset());
        b = new Date(a.getFullYear(), 6, 1).getTimezoneOffset();
        var e = new Date(a.getFullYear(), 0, 1).getTimezoneOffset();
        F[d + 32 >> 2] = (b != e && a.getTimezoneOffset() == Math.min(e, b)) | 0;
      }, j: (a, d) => {
        T[a] && (clearTimeout(T[a].id), delete T[a]);
        if (!d)
          return 0;
        var b = setTimeout(() => {
          delete T[a];
          ka(() => qa(a, performance.now()));
        }, d);
        T[a] = { id: b, Qa: d };
        return 0;
      }, n: (a, d, b, e) => {
        var f = new Date().getFullYear(), g = new Date(f, 0, 1).getTimezoneOffset();
        f = new Date(f, 6, 1).getTimezoneOffset();
        G[a >> 2] = 60 * Math.max(g, f);
        F[d >> 2] = Number(g != f);
        d = (h) => {
          var m = Math.abs(h);
          return `UTC${0 <= h ? "-" : "+"}${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}`;
        };
        a = d(g);
        d = d(f);
        f < g ? (U(a, b, 17), U(d, e, 17)) : (U(a, e, 17), U(d, b, 17));
      }, p: () => Date.now(), k: (a) => {
        var d = E.length;
        a >>>= 0;
        if (2147483648 < a)
          return false;
        for (var b = 1;4 >= b; b *= 2) {
          var e = d * (1 + 0.2 / b);
          e = Math.min(e, a + 100663296);
          a: {
            e = (Math.min(2147483648, 65536 * Math.ceil(Math.max(a, e) / 65536)) - q.buffer.byteLength + 65535) / 65536 | 0;
            try {
              q.grow(e);
              I();
              var f = 1;
              break a;
            } catch (g) {}
            f = undefined;
          }
          if (f)
            return true;
        }
        return false;
      }, e: (a, d) => {
        var b = 0, e = 0, f;
        for (f of la()) {
          var g = d + b;
          G[a + e >> 2] = g;
          b += U(f, g, Infinity) + 1;
          e += 4;
        }
        return 0;
      }, f: (a, d) => {
        var b = la();
        G[a >> 2] = b.length;
        a = 0;
        for (var e of b)
          a += X(e) + 1;
        G[d >> 2] = a;
        return 0;
      }, d: () => 52, o: function() {
        return 70;
      }, c: (a, d, b, e) => {
        for (var f = 0, g = 0;g < b; g++) {
          var h = G[d >> 2], m = G[d + 4 >> 2];
          d += 8;
          for (var x = 0;x < m; x++) {
            var k = a, l = E[h + x], p = ma[k];
            l === 0 || l === 10 ? (k = k === 1 ? v : w, l = ea(p, 0), l = Q.decode(p.buffer ? p.subarray(0, l) : new Uint8Array(p.slice(0, l))), k(l), p.length = 0) : p.push(l);
          }
          f += m;
        }
        G[e >> 2] = f;
        return 0;
      }, a: q, r: ja, s: function(a, d, b, e, f) {
        return c.callbacks.callFunction(undefined, a, d, b, e, f);
      }, i: function(a) {
        return c.callbacks.shouldInterrupt(undefined, a);
      }, h: function(a, d, b) {
        b = R(b);
        return c.callbacks.loadModuleSource(undefined, a, d, b);
      }, g: function(a, d, b, e) {
        b = R(b);
        e = R(e);
        return c.callbacks.normalizeModule(undefined, a, d, b, e);
      }, t: function(a, d) {
        c.callbacks.freeHostRef(undefined, a, d);
      } }, Z;
      Z = await async function() {
        function a(b) {
          b = Z = b.exports;
          c._malloc = b.v;
          c._QTS_Throw = b.w;
          c._QTS_NewError = b.x;
          c._QTS_RuntimeSetMemoryLimit = b.y;
          c._QTS_RuntimeComputeMemoryUsage = b.z;
          c._QTS_RuntimeDumpMemoryUsage = b.A;
          c._QTS_RecoverableLeakCheck = b.B;
          c._QTS_BuildIsSanitizeLeak = b.C;
          c._QTS_RuntimeSetMaxStackSize = b.D;
          c._QTS_GetUndefined = b.E;
          c._QTS_GetNull = b.F;
          c._QTS_GetFalse = b.G;
          c._QTS_GetTrue = b.H;
          c._QTS_NewHostRef = b.I;
          c._QTS_GetHostRefId = b.J;
          c._QTS_NewRuntime = b.K;
          c._QTS_FreeRuntime = b.L;
          c._free = b.M;
          c._QTS_NewContext = b.N;
          c._QTS_FreeContext = b.O;
          c._QTS_FreeValuePointer = b.P;
          c._QTS_FreeValuePointerRuntime = b.Q;
          c._QTS_FreeVoidPointer = b.R;
          c._QTS_FreeCString = b.S;
          c._QTS_DupValuePointer = b.T;
          c._QTS_NewObject = b.U;
          c._QTS_NewObjectProto = b.V;
          c._QTS_NewArray = b.W;
          c._QTS_NewArrayBuffer = b.X;
          c._QTS_NewFloat64 = b.Y;
          c._QTS_GetFloat64 = b.Z;
          c._QTS_NewString = b._;
          c._QTS_GetString = b.$;
          c._QTS_GetArrayBuffer = b.aa;
          c._QTS_GetArrayBufferLength = b.ba;
          c._QTS_NewSymbol = b.ca;
          c._QTS_GetSymbolDescriptionOrKey = b.da;
          c._QTS_IsGlobalSymbol = b.ea;
          c._QTS_IsJobPending = b.fa;
          c._QTS_ExecutePendingJob = b.ga;
          c._QTS_GetProp = b.ha;
          c._QTS_GetPropNumber = b.ia;
          c._QTS_SetProp = b.ja;
          c._QTS_DefineProp = b.ka;
          c._QTS_GetOwnPropertyNames = b.la;
          c._QTS_Call = b.ma;
          c._QTS_ResolveException = b.na;
          c._QTS_Dump = b.oa;
          c._QTS_Eval = b.pa;
          c._QTS_GetModuleNamespace = b.qa;
          c._QTS_Typeof = b.ra;
          c._QTS_GetLength = b.sa;
          c._QTS_IsEqual = b.ta;
          c._QTS_GetGlobalObject = b.ua;
          c._QTS_NewPromiseCapability = b.va;
          c._QTS_PromiseState = b.wa;
          c._QTS_PromiseResult = b.xa;
          c._QTS_TestStringArg = b.ya;
          c._QTS_GetDebugLogEnabled = b.za;
          c._QTS_SetDebugLogEnabled = b.Aa;
          c._QTS_BuildIsDebug = b.Ba;
          c._QTS_BuildIsAsyncify = b.Ca;
          c._QTS_NewFunction = b.Da;
          c._QTS_ArgvGetJSValueConstPointer = b.Ea;
          c._QTS_RuntimeEnableInterruptHandler = b.Fa;
          c._QTS_RuntimeDisableInterruptHandler = b.Ga;
          c._QTS_RuntimeEnableModuleLoader = b.Ha;
          c._QTS_RuntimeDisableModuleLoader = b.Ia;
          c._QTS_bjson_encode = b.Ja;
          c._QTS_bjson_decode = b.Ka;
          qa = b.La;
          oa = b.Ma;
          Y = b.Na;
          na = b.Oa;
          return Z;
        }
        var d = { a: ra };
        if (c.instantiateWasm)
          return new Promise((b) => {
            c.instantiateWasm(d, (e, f) => {
              b(a(e, f));
            });
          });
        K ??= c.locateFile ? c.locateFile("emscripten-module.wasm", t) : t + "emscripten-module.wasm";
        return a((await ca(d)).instance);
      }();
      (function() {
        function a() {
          c.calledRun = true;
          if (!z) {
            H = true;
            Z.u();
            B?.(c);
            c.onRuntimeInitialized?.();
            if (c.postRun)
              for (typeof c.postRun == "function" && (c.postRun = [c.postRun]);c.postRun.length; ) {
                var d = c.postRun.shift();
                N.push(d);
              }
            M(N);
          }
        }
        if (c.preRun)
          for (typeof c.preRun == "function" && (c.preRun = [c.preRun]);c.preRun.length; )
            da();
        M(O);
        c.setStatus ? (c.setStatus("Running..."), setTimeout(() => {
          setTimeout(() => c.setStatus(""), 1);
          a();
        }, 1)) : a();
      })();
      H ? moduleRtn = c : moduleRtn = new Promise((a, d) => {
        B = a;
        C = d;
      });
      return moduleRtn;
    };
  })();
  if (typeof exports === "object" && typeof module === "object") {
    module.exports = QuickJSRaw;
    module.exports.default = QuickJSRaw;
  } else if (typeof define === "function" && define["amd"])
    define([], () => QuickJSRaw);
});

// node_modules/quickjs-emscripten-core/dist/index.mjs
init_chunk_V2S4ZYJR();
init_dist();
async function newQuickJSWASMModuleFromVariant(variantOrPromise) {
  let variant = smartUnwrap(await variantOrPromise), [wasmModuleLoader, QuickJSFFI, { QuickJSWASMModule: QuickJSWASMModule2 }] = await Promise.all([variant.importModuleLoader().then(smartUnwrap), variant.importFFI(), Promise.resolve().then(() => (init_module_ES6BEMUI(), exports_module_ES6BEMUI)).then(smartUnwrap)]), wasmModule = await wasmModuleLoader();
  wasmModule.type = "sync";
  let ffi = new QuickJSFFI(wasmModule);
  return new QuickJSWASMModule2(wasmModule, ffi);
}
function smartUnwrap(val) {
  return val && "default" in val && val.default ? val.default && "default" in val.default && val.default.default ? val.default.default : val.default : val;
}
function newVariant(baseVariant, options) {
  return { ...baseVariant, async importModuleLoader() {
    let moduleLoader = smartUnwrap(await baseVariant.importModuleLoader());
    return async function() {
      let moduleLoaderArg = options.emscriptenModule ? { ...options.emscriptenModule } : {}, log = options.log ?? ((...args) => debugLog("newVariant moduleLoader:", ...args)), tapValue = (message, val) => (log(...message, val), val), force = (val) => typeof val == "function" ? val() : val;
      (options.wasmLocation || options.wasmSourceMapLocation || options.locateFile) && (moduleLoaderArg.locateFile = (fileName, relativeTo) => {
        let args = { fileName, relativeTo };
        if (fileName.endsWith(".wasm") && options.wasmLocation !== undefined)
          return tapValue(["locateFile .wasm: provide wasmLocation", args], options.wasmLocation);
        if (fileName.endsWith(".map")) {
          if (options.wasmSourceMapLocation !== undefined)
            return tapValue(["locateFile .map: provide wasmSourceMapLocation", args], options.wasmSourceMapLocation);
          if (options.wasmLocation && !options.locateFile)
            return tapValue(["locateFile .map: infer from wasmLocation", args], options.wasmLocation + ".map");
        }
        return options.locateFile ? tapValue(["locateFile: use provided fn", args], options.locateFile(fileName, relativeTo)) : tapValue(["locateFile: unhandled, passthrough", args], fileName);
      }), options.wasmBinary && (moduleLoaderArg.wasmBinary = await force(options.wasmBinary)), options.wasmMemory && (moduleLoaderArg.wasmMemory = await force(options.wasmMemory));
      let optionsWasmModule = options.wasmModule, modulePromise;
      optionsWasmModule && (moduleLoaderArg.instantiateWasm = async (imports, onSuccess) => {
        modulePromise ?? (modulePromise = Promise.resolve(force(optionsWasmModule)));
        let wasmModule = await modulePromise;
        if (!wasmModule)
          throw new QuickJSEmscriptenModuleError(`options.wasmModule returned ${String(wasmModule)}`);
        let instance = await WebAssembly.instantiate(wasmModule, imports);
        return onSuccess(instance), instance.exports;
      }), moduleLoaderArg.monitorRunDependencies = (left) => {
        log("monitorRunDependencies:", left);
      }, moduleLoaderArg.quickjsEmscriptenInit = () => newMockExtensions(log);
      let resultPromise = moduleLoader(moduleLoaderArg), extensions = moduleLoaderArg.quickjsEmscriptenInit?.(log);
      if (optionsWasmModule && extensions?.receiveWasmOffsetConverter && !extensions.existingWasmOffsetConverter) {
        let wasmBinary = await force(options.wasmBinary) ?? new ArrayBuffer(0);
        modulePromise ?? (modulePromise = Promise.resolve(force(optionsWasmModule)));
        let wasmModule = await modulePromise;
        if (!wasmModule)
          throw new QuickJSEmscriptenModuleError(`options.wasmModule returned ${String(wasmModule)}`);
        extensions.receiveWasmOffsetConverter(wasmBinary, wasmModule);
      }
      if (extensions?.receiveSourceMapJSON) {
        let loadedSourceMapData = await force(options.wasmSourceMapData);
        typeof loadedSourceMapData == "string" ? extensions.receiveSourceMapJSON(JSON.parse(loadedSourceMapData)) : loadedSourceMapData ? extensions.receiveSourceMapJSON(loadedSourceMapData) : extensions.receiveSourceMapJSON({ version: 3, names: [], sources: [], mappings: "" });
      }
      return resultPromise;
    };
  } };
}
function newMockExtensions(log) {
  let mockMessage = "mock called, emscripten module may not be initialized yet";
  return { mock: true, removeRunDependency(name) {
    log(`${mockMessage}: removeRunDependency called:`, name);
  }, receiveSourceMapJSON(data) {
    log(`${mockMessage}: receiveSourceMapJSON called:`, data);
  }, WasmOffsetConverter: undefined, receiveWasmOffsetConverter(bytes, mod) {
    log(`${mockMessage}: receiveWasmOffsetConverter called:`, bytes, mod);
  } };
}

// node_modules/@jitl/quickjs-wasmfile-release-sync/dist/index.mjs
var variant = { type: "sync", importFFI: () => Promise.resolve().then(() => (init_ffi(), exports_ffi)).then((mod) => mod.QuickJSFFI), importModuleLoader: () => Promise.resolve().then(() => __toESM(require_emscripten_module_cloudflare(), 1)).then((mod) => mod.default) };
var src_default = variant;

// sha256.ts
var K = new Uint32Array(64);
{
  let n = 0;
  for (let c = 2;n < 64; c++) {
    let prime = true;
    for (let d = 2;d * d <= c; d++)
      if (c % d === 0) {
        prime = false;
        break;
      }
    if (prime)
      K[n++] = Math.cbrt(c) % 1 * 2 ** 32;
  }
}
var sha256hex = (hex) => {
  const len = hex.length / 2, total = (len + 8 >> 6) + 1 << 6;
  const m = new Uint8Array(total);
  for (let i = 0;i < len; i++)
    m[i] = parseInt(hex.substr(i * 2, 2), 16);
  m[len] = 128;
  const dv = new DataView(m.buffer);
  dv.setUint32(total - 8, Math.floor(len * 8 / 2 ** 32));
  dv.setUint32(total - 4, len * 8 >>> 0);
  const h = new Uint32Array([1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225]);
  const w = new Uint32Array(64), r = (x, n) => x >>> n | x << 32 - n;
  for (let o = 0;o < total; o += 64) {
    for (let i = 0;i < 16; i++)
      w[i] = dv.getUint32(o + i * 4);
    for (let i = 16;i < 64; i++)
      w[i] = w[i - 16] + (r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ w[i - 15] >>> 3) + w[i - 7] + (r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ w[i - 2] >>> 10) >>> 0;
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0;i < 64; i++) {
      const t1 = hh + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + (e & f ^ ~e & g) + K[i] + w[i] >>> 0;
      const t2 = (r(a, 2) ^ r(a, 13) ^ r(a, 22)) + (a & b ^ a & c ^ b & c) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = d + t1 >>> 0;
      d = c;
      c = b;
      b = a;
      a = t1 + t2 >>> 0;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f;
    h[6] += g;
    h[7] += hh;
  }
  return [...h].map((x) => x.toString(16).padStart(8, "0")).join("");
};

// worker.ts
import wasmModule from "./quickjs.wasm";
// data.json
var data_default = {
  modules: { "observable-runtime": `// ../../../node_modules/@observablehq/runtime/src/errors.js
class RuntimeError extends Error {
  constructor(message, input) {
    super(message);
    this.input = input;
  }
}
RuntimeError.prototype.name = "RuntimeError";
// ../../../node_modules/@observablehq/runtime/src/generatorish.js
function generatorish(value) {
  return value && typeof value.next === "function" && typeof value.return === "function";
}

// ../../../node_modules/@observablehq/runtime/src/constant.js
function constant(x) {
  return () => x;
}

// ../../../node_modules/@observablehq/runtime/src/identity.js
function identity(x) {
  return x;
}

// ../../../node_modules/@observablehq/runtime/src/rethrow.js
function rethrow(error) {
  return () => {
    throw error;
  };
}

// ../../../node_modules/@observablehq/runtime/src/array.js
var prototype = Array.prototype;
var map = prototype.map;
var forEach = prototype.forEach;

// ../../../node_modules/@observablehq/runtime/src/noop.js
function noop() {}

// ../../../node_modules/@observablehq/runtime/src/variable.js
var TYPE_NORMAL = 1;
var TYPE_IMPLICIT = 2;
var TYPE_DUPLICATE = 3;
var no_observer = Symbol("no-observer");
var no_value = Promise.resolve();
function Variable(type, module, observer, options) {
  if (!observer)
    observer = no_observer;
  Object.defineProperties(this, {
    _observer: { value: observer, writable: true },
    _definition: { value: variable_undefined, writable: true },
    _duplicate: { value: undefined, writable: true },
    _duplicates: { value: undefined, writable: true },
    _indegree: { value: NaN, writable: true },
    _inputs: { value: [], writable: true },
    _invalidate: { value: noop, writable: true },
    _module: { value: module },
    _name: { value: null, writable: true },
    _outputs: { value: new Set, writable: true },
    _promise: { value: no_value, writable: true },
    _reachable: { value: observer !== no_observer, writable: true },
    _rejector: { value: variable_rejector(this) },
    _shadow: { value: initShadow(module, options) },
    _type: { value: type },
    _value: { value: undefined, writable: true },
    _version: { value: 0, writable: true }
  });
}
Object.defineProperties(Variable.prototype, {
  _pending: { value: variable_pending, writable: true, configurable: true },
  _fulfilled: { value: variable_fulfilled, writable: true, configurable: true },
  _rejected: { value: variable_rejected, writable: true, configurable: true },
  _resolve: { value: variable_resolve, writable: true, configurable: true },
  define: { value: variable_define, writable: true, configurable: true },
  delete: { value: variable_delete, writable: true, configurable: true },
  import: { value: variable_import, writable: true, configurable: true }
});
function initShadow(module, options) {
  if (!options?.shadow)
    return null;
  return new Map(Object.entries(options.shadow).map(([name, definition]) => [name, new Variable(TYPE_IMPLICIT, module).define([], definition)]));
}
function variable_attach(variable) {
  variable._module._runtime._dirty.add(variable);
  variable._outputs.add(this);
}
function variable_detach(variable) {
  variable._module._runtime._dirty.add(variable);
  variable._outputs.delete(this);
}
function variable_undefined() {
  throw variable_undefined;
}
function variable_stale() {
  throw variable_stale;
}
function variable_rejector(variable) {
  return (error) => {
    if (error === variable_stale)
      throw error;
    if (error === variable_undefined)
      throw new RuntimeError(\`\${variable._name} is not defined\`, variable._name);
    if (error instanceof Error && error.message)
      throw new RuntimeError(error.message, variable._name);
    throw new RuntimeError(\`\${variable._name} could not be resolved\`, variable._name);
  };
}
function variable_duplicate(name) {
  return () => {
    throw new RuntimeError(\`\${name} is defined more than once\`);
  };
}
function variable_define(name, inputs, definition) {
  switch (arguments.length) {
    case 1: {
      definition = name, name = inputs = null;
      break;
    }
    case 2: {
      definition = inputs;
      if (typeof name === "string")
        inputs = null;
      else
        inputs = name, name = null;
      break;
    }
  }
  return variable_defineImpl.call(this, name == null ? null : String(name), inputs == null ? [] : map.call(inputs, this._resolve, this), typeof definition === "function" ? definition : constant(definition));
}
function variable_resolve(name) {
  return this._shadow?.get(name) ?? this._module._resolve(name);
}
function variable_defineImpl(name, inputs, definition) {
  const scope = this._module._scope, runtime = this._module._runtime;
  this._inputs.forEach(variable_detach, this);
  inputs.forEach(variable_attach, this);
  this._inputs = inputs;
  this._definition = definition;
  this._value = undefined;
  if (definition === noop)
    runtime._variables.delete(this);
  else
    runtime._variables.add(this);
  if (name !== this._name || scope.get(name) !== this) {
    let error, found;
    if (this._name) {
      if (this._outputs.size) {
        scope.delete(this._name);
        found = this._module._resolve(this._name);
        found._outputs = this._outputs, this._outputs = new Set;
        found._outputs.forEach(function(output) {
          output._inputs[output._inputs.indexOf(this)] = found;
        }, this);
        found._outputs.forEach(runtime._updates.add, runtime._updates);
        runtime._dirty.add(found).add(this);
        scope.set(this._name, found);
      } else if ((found = scope.get(this._name)) === this) {
        scope.delete(this._name);
      } else if (found._type === TYPE_DUPLICATE) {
        found._duplicates.delete(this);
        this._duplicate = undefined;
        if (found._duplicates.size === 1) {
          found = found._duplicates.keys().next().value;
          error = scope.get(this._name);
          found._outputs = error._outputs, error._outputs = new Set;
          found._outputs.forEach(function(output) {
            output._inputs[output._inputs.indexOf(error)] = found;
          });
          found._definition = found._duplicate, found._duplicate = undefined;
          runtime._dirty.add(error).add(found);
          runtime._updates.add(found);
          scope.set(this._name, found);
        }
      } else {
        throw new Error;
      }
    }
    if (this._outputs.size)
      throw new Error;
    if (name) {
      if (found = scope.get(name)) {
        if (found._type === TYPE_DUPLICATE) {
          this._definition = variable_duplicate(name), this._duplicate = definition;
          found._duplicates.add(this);
        } else if (found._type === TYPE_IMPLICIT) {
          this._outputs = found._outputs, found._outputs = new Set;
          this._outputs.forEach(function(output) {
            output._inputs[output._inputs.indexOf(found)] = this;
          }, this);
          runtime._dirty.add(found).add(this);
          scope.set(name, this);
        } else {
          found._duplicate = found._definition, this._duplicate = definition;
          error = new Variable(TYPE_DUPLICATE, this._module);
          error._name = name;
          error._definition = this._definition = found._definition = variable_duplicate(name);
          error._outputs = found._outputs, found._outputs = new Set;
          error._outputs.forEach(function(output) {
            output._inputs[output._inputs.indexOf(found)] = error;
          });
          error._duplicates = new Set([this, found]);
          runtime._dirty.add(found).add(error);
          runtime._updates.add(found).add(error);
          scope.set(name, error);
        }
      } else {
        scope.set(name, this);
      }
    }
    this._name = name;
  }
  if (this._version > 0)
    ++this._version;
  runtime._updates.add(this);
  runtime._compute();
  return this;
}
function variable_import(remote, name, module) {
  if (arguments.length < 3)
    module = name, name = remote;
  return variable_defineImpl.call(this, String(name), [module._resolve(String(remote))], identity);
}
function variable_delete() {
  return variable_defineImpl.call(this, null, [], noop);
}
function variable_pending() {
  if (this._observer.pending)
    this._observer.pending();
}
function variable_fulfilled(value) {
  if (this._observer.fulfilled)
    this._observer.fulfilled(value, this._name);
}
function variable_rejected(error) {
  if (this._observer.rejected)
    this._observer.rejected(error, this._name);
}

// ../../../node_modules/@observablehq/runtime/src/module.js
var variable_variable = Symbol("variable");
var variable_invalidation = Symbol("invalidation");
var variable_visibility = Symbol("visibility");
function Module(runtime, builtins = []) {
  Object.defineProperties(this, {
    _runtime: { value: runtime },
    _scope: { value: new Map },
    _builtins: { value: new Map([
      ["@variable", variable_variable],
      ["invalidation", variable_invalidation],
      ["visibility", variable_visibility],
      ...builtins
    ]) },
    _source: { value: null, writable: true }
  });
}
Object.defineProperties(Module.prototype, {
  _resolve: { value: module_resolve, writable: true, configurable: true },
  redefine: { value: module_redefine, writable: true, configurable: true },
  define: { value: module_define, writable: true, configurable: true },
  derive: { value: module_derive, writable: true, configurable: true },
  import: { value: module_import, writable: true, configurable: true },
  value: { value: module_value, writable: true, configurable: true },
  variable: { value: module_variable, writable: true, configurable: true },
  builtin: { value: module_builtin, writable: true, configurable: true }
});
function module_redefine(name) {
  const v = this._scope.get(name);
  if (!v)
    throw new RuntimeError(\`\${name} is not defined\`);
  if (v._type === TYPE_DUPLICATE)
    throw new RuntimeError(\`\${name} is defined more than once\`);
  return v.define.apply(v, arguments);
}
function module_define() {
  const v = new Variable(TYPE_NORMAL, this);
  return v.define.apply(v, arguments);
}
function module_import() {
  const v = new Variable(TYPE_NORMAL, this);
  return v.import.apply(v, arguments);
}
function module_variable(observer, options) {
  return new Variable(TYPE_NORMAL, this, observer, options);
}
async function module_value(name) {
  let v = this._scope.get(name);
  if (!v)
    throw new RuntimeError(\`\${name} is not defined\`);
  if (v._observer === no_observer) {
    v = this.variable(true).define([name], identity);
    try {
      return await module_revalue(this._runtime, v);
    } finally {
      v.delete();
    }
  } else {
    return module_revalue(this._runtime, v);
  }
}
async function module_revalue(runtime, variable) {
  await runtime._compute();
  try {
    return await variable._promise;
  } catch (error) {
    if (error === variable_stale)
      return module_revalue(runtime, variable);
    throw error;
  }
}
function module_derive(injects, injectModule) {
  const map2 = new Map;
  const modules = new Set;
  const copies = [];
  function alias(source) {
    let target = map2.get(source);
    if (target)
      return target;
    target = new Module(source._runtime, source._builtins);
    target._source = source;
    map2.set(source, target);
    copies.push([target, source]);
    modules.add(source);
    return target;
  }
  const derive = alias(this);
  for (const inject of injects) {
    const { alias: alias2, name } = typeof inject === "object" ? inject : { name: inject };
    derive.import(name, alias2 == null ? name : alias2, injectModule);
  }
  for (const module of modules) {
    for (const [name, variable] of module._scope) {
      if (variable._definition === identity) {
        if (module === this && derive._scope.has(name))
          continue;
        const importedModule = variable._inputs[0]._module;
        if (importedModule._source)
          alias(importedModule);
      }
    }
  }
  for (const [target, source] of copies) {
    for (const [name, sourceVariable] of source._scope) {
      const targetVariable = target._scope.get(name);
      if (targetVariable && targetVariable._type !== TYPE_IMPLICIT)
        continue;
      if (sourceVariable._definition === identity) {
        const sourceInput = sourceVariable._inputs[0];
        const sourceModule = sourceInput._module;
        target.import(sourceInput._name, name, map2.get(sourceModule) || sourceModule);
      } else {
        target.define(name, sourceVariable._inputs.map(variable_name), sourceVariable._definition);
      }
    }
  }
  return derive;
}
function module_resolve(name) {
  let variable = this._scope.get(name), value;
  if (!variable) {
    variable = new Variable(TYPE_IMPLICIT, this);
    if (this._builtins.has(name)) {
      variable.define(name, constant(this._builtins.get(name)));
    } else if (this._runtime._builtin._scope.has(name)) {
      variable.import(name, this._runtime._builtin);
    } else {
      try {
        value = this._runtime._global(name);
      } catch (error) {
        return variable.define(name, rethrow(error));
      }
      if (value === undefined) {
        this._scope.set(variable._name = name, variable);
      } else {
        variable.define(name, constant(value));
      }
    }
  }
  return variable;
}
function module_builtin(name, value) {
  this._builtins.set(name, value);
}
function variable_name(variable) {
  return variable._name;
}

// ../../../node_modules/@observablehq/runtime/src/runtime.js
var frame = typeof requestAnimationFrame === "function" ? requestAnimationFrame : typeof setImmediate === "function" ? setImmediate : (f) => setTimeout(f, 0);
function Runtime(builtins, global = window_global) {
  const builtin = this.module();
  Object.defineProperties(this, {
    _dirty: { value: new Set },
    _updates: { value: new Set },
    _precomputes: { value: [], writable: true },
    _computing: { value: null, writable: true },
    _init: { value: null, writable: true },
    _modules: { value: new Map },
    _variables: { value: new Set },
    _disposed: { value: false, writable: true },
    _builtin: { value: builtin },
    _global: { value: global }
  });
  if (builtins)
    for (const name in builtins) {
      new Variable(TYPE_IMPLICIT, builtin).define(name, [], builtins[name]);
    }
}
Object.defineProperties(Runtime.prototype, {
  _precompute: { value: runtime_precompute, writable: true, configurable: true },
  _compute: { value: runtime_compute, writable: true, configurable: true },
  _computeSoon: { value: runtime_computeSoon, writable: true, configurable: true },
  _computeNow: { value: runtime_computeNow, writable: true, configurable: true },
  dispose: { value: runtime_dispose, writable: true, configurable: true },
  module: { value: runtime_module, writable: true, configurable: true }
});
function runtime_dispose() {
  this._computing = Promise.resolve();
  this._disposed = true;
  this._variables.forEach((v) => {
    v._invalidate();
    v._version = NaN;
  });
}
function runtime_module(define, observer = noop) {
  let module;
  if (define === undefined) {
    if (module = this._init) {
      this._init = null;
      return module;
    }
    return new Module(this);
  }
  module = this._modules.get(define);
  if (module)
    return module;
  this._init = module = new Module(this);
  this._modules.set(define, module);
  try {
    define(this, observer);
  } finally {
    this._init = null;
  }
  return module;
}
function runtime_precompute(callback) {
  this._precomputes.push(callback);
  this._compute();
}
function runtime_compute() {
  return this._computing || (this._computing = this._computeSoon());
}
function runtime_computeSoon() {
  return new Promise(frame).then(() => this._disposed ? undefined : this._computeNow());
}
async function runtime_computeNow() {
  let queue = [], variables, variable, precomputes = this._precomputes;
  if (precomputes.length) {
    this._precomputes = [];
    for (const callback of precomputes)
      callback();
    await runtime_defer(3);
  }
  variables = new Set(this._dirty);
  variables.forEach(function(variable2) {
    variable2._inputs.forEach(variables.add, variables);
    const reachable = variable_reachable(variable2);
    if (reachable > variable2._reachable) {
      this._updates.add(variable2);
    } else if (reachable < variable2._reachable) {
      variable2._invalidate();
    }
    variable2._reachable = reachable;
  }, this);
  variables = new Set(this._updates);
  variables.forEach(function(variable2) {
    if (variable2._reachable) {
      variable2._indegree = 0;
      variable2._outputs.forEach(variables.add, variables);
    } else {
      variable2._indegree = NaN;
      variables.delete(variable2);
    }
  });
  this._computing = null;
  this._updates.clear();
  this._dirty.clear();
  variables.forEach(function(variable2) {
    variable2._outputs.forEach(variable_increment);
  });
  do {
    variables.forEach(function(variable2) {
      if (variable2._indegree === 0) {
        queue.push(variable2);
      }
    });
    while (variable = queue.pop()) {
      variable_compute(variable);
      variable._outputs.forEach(postqueue);
      variables.delete(variable);
    }
    variables.forEach(function(variable2) {
      if (variable_circular(variable2)) {
        variable_error(variable2, new RuntimeError("circular definition"));
        variable2._outputs.forEach(variable_decrement);
        variables.delete(variable2);
      }
    });
  } while (variables.size);
  function postqueue(variable2) {
    if (--variable2._indegree === 0) {
      queue.push(variable2);
    }
  }
}
function runtime_defer(depth = 0) {
  let p = Promise.resolve();
  for (let i = 0;i < depth; ++i)
    p = p.then(() => {});
  return p;
}
function variable_circular(variable) {
  const inputs = new Set(variable._inputs);
  for (const i of inputs) {
    if (i === variable)
      return true;
    i._inputs.forEach(inputs.add, inputs);
  }
  return false;
}
function variable_increment(variable) {
  ++variable._indegree;
}
function variable_decrement(variable) {
  --variable._indegree;
}
function variable_value(variable) {
  return variable._promise.catch(variable._rejector);
}
function variable_invalidator(variable) {
  return new Promise(function(resolve) {
    variable._invalidate = resolve;
  });
}
function variable_intersector(invalidation, variable) {
  let node = typeof IntersectionObserver === "function" && variable._observer && variable._observer._node;
  let visible = !node, resolve = noop, reject = noop, promise, observer;
  if (node) {
    observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting) && (promise = null, resolve()));
    observer.observe(node);
    invalidation.then(() => (observer.disconnect(), observer = null, reject()));
  }
  return function(value) {
    if (visible)
      return Promise.resolve(value);
    if (!observer)
      return Promise.reject();
    if (!promise)
      promise = new Promise((y, n) => (resolve = y, reject = n));
    return promise.then(() => value);
  };
}
function variable_compute(variable) {
  variable._invalidate();
  variable._invalidate = noop;
  variable._pending();
  const value0 = variable._value;
  const version = ++variable._version;
  const inputs = variable._inputs;
  const definition = variable._definition;
  let invalidation = null;
  const promise = variable._promise = variable._promise.then(init, init).then(define).then(generate);
  function init() {
    return Promise.all(inputs.map(variable_value));
  }
  function define(inputs2) {
    if (variable._version !== version)
      throw variable_stale;
    for (let i = 0, n = inputs2.length;i < n; ++i) {
      switch (inputs2[i]) {
        case variable_invalidation: {
          inputs2[i] = invalidation = variable_invalidator(variable);
          break;
        }
        case variable_visibility: {
          if (!invalidation)
            invalidation = variable_invalidator(variable);
          inputs2[i] = variable_intersector(invalidation, variable);
          break;
        }
        case variable_variable: {
          inputs2[i] = variable;
          break;
        }
      }
    }
    return definition.apply(value0, inputs2);
  }
  function generate(value) {
    if (variable._version !== version)
      throw variable_stale;
    if (generatorish(value)) {
      (invalidation || variable_invalidator(variable)).then(variable_return(value));
      return variable_generate(variable, version, value);
    }
    return value;
  }
  promise.then((value) => {
    variable._value = value;
    variable._fulfilled(value);
  }, (error) => {
    if (error === variable_stale || variable._version !== version)
      return;
    variable._value = undefined;
    variable._rejected(error);
  });
}
function variable_generate(variable, version, generator) {
  const runtime = variable._module._runtime;
  let currentValue;
  function compute(onfulfilled) {
    return new Promise((resolve) => resolve(generator.next(currentValue))).then(({ done, value }) => {
      return done ? undefined : Promise.resolve(value).then(onfulfilled);
    });
  }
  function recompute() {
    const promise = compute((value) => {
      if (variable._version !== version)
        throw variable_stale;
      currentValue = value;
      postcompute(value, promise).then(() => runtime._precompute(recompute));
      variable._fulfilled(value);
      return value;
    });
    promise.catch((error) => {
      if (error === variable_stale || variable._version !== version)
        return;
      postcompute(undefined, promise);
      variable._rejected(error);
    });
  }
  function postcompute(value, promise) {
    variable._value = value;
    variable._promise = promise;
    variable._outputs.forEach(runtime._updates.add, runtime._updates);
    return runtime._compute();
  }
  return compute((value) => {
    if (variable._version !== version)
      throw variable_stale;
    currentValue = value;
    runtime._precompute(recompute);
    return value;
  });
}
function variable_error(variable, error) {
  variable._invalidate();
  variable._invalidate = noop;
  variable._pending();
  ++variable._version;
  variable._indegree = NaN;
  (variable._promise = Promise.reject(error)).catch(noop);
  variable._value = undefined;
  variable._rejected(error);
}
function variable_return(generator) {
  return function() {
    generator.return();
  };
}
function variable_reachable(variable) {
  if (variable._observer !== no_observer)
    return true;
  const outputs = new Set(variable._outputs);
  for (const output of outputs) {
    if (output._observer !== no_observer)
      return true;
    output._outputs.forEach(outputs.add, outputs);
  }
  return false;
}
function window_global(name) {
  return globalThis[name];
}
export {
  Runtime,
  RuntimeError
};
`, "/@tomlarkworthy/cloudflare-iac.js?v=4": `
const _cloudflareiac_anon_f7118db8d3 = function _anonymous(md) {return (md\`# Cloudflare from a notebook

A Cloudflare Worker declared as a notebook value. \\\`cloudflare.Worker(name, fn)\\\` returns a service: call it in the tab with \\\`service.fetch(request)\\\`, read the module it would upload with \\\`service.emit()\\\`, run that module in the tab with \\\`simulate(service)\\\`.

The module is the function plus every cell it depends on, across imports, written out in dependency order with no Observable runtime. The walk stops at **platform cells** (\\\`secrets\\\`, \\\`rows\\\`, \\\`inbox\\\`, \\\`xrpc\\\`), which work in the notebook and are replaced on the Worker by the Cloudflare resource they stand for, and at **library cells** (\\\`library(name, file)\\\`), which are uploaded as a second file.

Refused, naming the cell: a generator, a \\\`viewof\\\` or \\\`mutable\\\` cell, a cell that depends on a notebook builtin such as \\\`html\\\` or \\\`width\\\`, and a secret read by a computed name.

Not built yet (2026-10-05): \\\`service.deploy()\\\` needs the guard, and \\\`service.status\\\` needs a deployed Worker to ask.\`);};
const _cloudflareiac_anon_7666d59571 = function _anonymous(md) {return (md\`## Services in this notebook

A module announces a service with \\\`plugins.add("workers", service, { invalidation })\\\`, in a cell of its own. \\\`declaredWorkers\\\` is every service announced on the page, and \\\`serviceList\\\` shows them against what a guard says is running, with one Apply.

A service's hash is recomputed when its cell or any cell it reaches changes, because that re-runs the cell that announces it.\`);};
const _cloudflareiac_declaredWorkers = function _declaredWorkers(plugins) {return (plugins.get("workers"));};
const _cloudflareiac_serviceRows = function _serviceRows() {return ((emitted, guardState, reported = {}, registry = {}) => [
  ...emitted.map((e) => {
    if (e.error) return { name: e.name, worker: null, state: "cannot deploy", note: e.error };
    const worker = e.meta.worker;
    const rec = guardState ? (guardState.workers || []).find((w) => w.worker === worker) : null;
    const running = rec && rec.hash ? rec.hash : null;
    const k = guardState && guardState.kernel ? guardState.kernel[worker] : null;
    const waiting = guardState ? (guardState.pending || []).some((p) => p.hash === e.hash) : false;
    const approved = guardState ? (guardState.approved || []).includes(e.hash) : false;
    // asDeployed: the page loaded this module from the Worker and it has not been edited since.
    const mine = e.asDeployed || e.hash;
    const route = registry[worker];
    const state = !guardState ? "unknown" : !running ? "not installed" : reported[worker] && reported[worker] !== running ? "skewed" : rec.fails >= 2 ? "failing" : running === mine ? "in sync" : "changed";
    const note = waiting ? "waiting for approval"
      : approved && state !== "in sync" ? "approved, press Apply"
      : rec && rec.lastError && rec.failedHash === e.hash ? \`put back: \${rec.lastError}\`
      : k && k.state === "probation" ? "on probation"
      : route && route.hash === running && route.verified && !route.verified.ok ? \`its tests failed: \${(route.verified.failed || []).join(", ") || route.verified.reason}\`
      : route && route.hash === running && route.failing ? \`verified, and its tests fail now: \${(route.failing.failed || []).join(", ") || route.failing.reason}\`
      : route && route.hash === running && !route.verified ? "unverified: its tests have not been run from this version"
      : state === "skewed" ? \`\${worker} is running \${String(reported[worker]).slice(0, 12)}, which the guard did not deploy.\`
      : "";
    return { name: e.name, worker, role: e.meta.role, module: e.meta.module || null, methods: e.meta.methods, calls: e.meta.calls || [], paths: e.meta.paths.map((p) => p.path), secrets: e.meta.secrets, hash: e.hash, running, state, verified: route && route.hash === running ? !!(route.verified && route.verified.ok) : null, note };
  }),
  ...((guardState && guardState.workers) || [])
    .filter((w) => w.hash && !emitted.some((e) => e.meta && e.meta.worker === w.worker))
    .map((w) => ({ name: w.worker, worker: w.worker, role: null, methods: [], paths: [], secrets: [], hash: null, running: w.hash, state: "no source", note: \`\${w.worker} is running and this notebook does not declare it. Its source is in another copy of the notebook, or was not saved.\` }))
]);};
const _cloudflareiac_serviceList = function _serviceList(htl,serviceRows,Inputs) {return (({ services = [], brain = null } = {}) => {
  const hue = { "in sync": "#2e9e5b", "not installed": "#2e9e5b", changed: "#e6a700", unknown: "var(--theme-foreground-muted)", skewed: "#e5484d", failing: "#e5484d", "cannot deploy": "#e5484d", "no source": "#e5484d" };
  const body = htl.html\`<div></div>\`;
  const root = htl.html\`<div style="font:14px/1.45 var(--sans-serif, system-ui, sans-serif);color:var(--theme-foreground)">\${body}</div>\`;
  let emitted = [], guardState = null, reported = {}, registry = {}, busy = "", results = [];
  const short = (h) => (h ? String(h).slice(0, 12) : "none");
  const draw = () => {
    const rows = serviceRows(emitted, guardState, reported, registry);
    const differing = rows.filter((r) => ["changed", "not installed"].includes(r.state));
    root.value = rows;
    const red = (note, state) => /put back|cannot|did not deploy|tests failed|tests fail now/.test(note) || state === "cannot deploy";
    const table = Inputs.table(
      rows.map((r) => ({ worker: r.worker || r.name, serves: [...(r.methods || []).map((m) => m.replace("com.lopecode.brain.", "")), ...(r.paths || [])].join(", "), version: r.hash, state: r.state, tests: root.tests[r.worker] || "", note: r.note || "", running: r.running })),
      {
        columns: ["worker", "serves", "version", "state", "tests", "note"],
        select: false,
        layout: "auto",
        rows: 40,
        format: {
          worker: (v) => htl.html\`<b>\${v}</b>\`,
          version: (v, i, data) => htl.html\`<code>\${short(v)}</code>\${data[i].running && data[i].running !== v ? htl.html\` <span style="color:var(--theme-foreground-muted)">running <code>\${short(data[i].running)}</code></span>\` : ""}\`,
          state: (v) => htl.html\`<span style=\${\`color:\${hue[v]}\`}>\${v}</span>\`,
          note: (v, i, data) => htl.html\`<span style=\${\`white-space:normal;color:\${red(v, data[i].state) ? "#e5484d" : "var(--theme-foreground-muted)"}\`}>\${v}</span>\`
        }
      }
    );
    const apply = Inputs.button(\`Apply \${differing.length} change\${differing.length === 1 ? "" : "s"}\`, { disabled: !brain || !differing.length || !!busy, reduce: () => void run(differing) });
    const again = Inputs.button("Refresh", { disabled: !brain || !!busy, reduce: () => void refresh() });
    const waiting = results.filter((r) => r.state === "waiting");
    const refused = results.filter((r) => r.state === "refused" || r.state === "put-back");
    body.replaceChildren(htl.html\`\${table}
      <div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">\${apply}\${again}<span style="color:var(--theme-foreground-muted)">\${busy}</span></div>
      \${waiting.length ? htl.html\`<div style="margin-top:6px;color:var(--theme-foreground-muted)">Waiting for approval: \${waiting.map((r) => r.worker).join(", ")}. \${brain && brain.guardUrl ? htl.html\`Approve on the <a href=\${brain.guardUrl} target="_blank" rel="noopener">guard page</a>, then press Apply again.\` : ""}</div>\` : ""}
      \${refused.map((r) => htl.html\`<div style="margin-top:6px;color:#e5484d">\${r.state === "refused" ? "Refused: " + r.reason : \`\${r.worker} failed its health check and was put back to \${short(r.previous)}. \${r.reason}\`}</div>\`)}\`);
  };
  const refresh = async () => {
    emitted = await Promise.all(services.map((s) => s.emit().catch((e) => ({ name: s.name, error: String((e && e.message) || e) }))));
    emitted.sort((a, b) => String(a.meta ? a.meta.worker : a.name).localeCompare(String(b.meta ? b.meta.worker : b.name)));
    if (brain && brain.asDeployed) for (const e of emitted) if (e.meta) e.asDeployed = brain.asDeployed(e);
    draw();
    if (!brain) return;
    busy = "reading what is running…";
    draw();
    try {
      guardState = await brain.state();
      const infos = await Promise.all(emitted.filter((e) => e.meta).map((e) => brain.info(e.meta.worker).catch(() => null)));
      reported = Object.fromEntries(infos.filter(Boolean).map((i) => [i.name, i.hash]));
      registry = brain.registry ? Object.fromEntries((await brain.registry().catch(() => [])).map((r) => [r.worker, r])) : {};
      busy = "";
    } catch (e) {
      busy = "could not read the guard: " + String((e && e.message) || e);
    }
    draw();
    root.dispatchEvent(new CustomEvent("input", { bubbles: true }));
  };
  const run = async (rows) => {
    results = [];
    // The core before anything bound to it, the kernel last.
    const order = (r) => (r.role === "core" ? 0 : r.role === "kernel" ? 2 : 1);
    for (const r of [...rows].sort((a, b) => order(a) - order(b))) {
      busy = \`applying \${r.worker}…\`;
      draw();
      try {
        const out = await brain.apply(emitted.find((e) => e.meta && e.meta.worker === r.worker));
        results.push(...out.results);
      } catch (e) {
        results.push({ worker: r.worker, state: "refused", reason: String((e && e.message) || e) });
      }
    }
    busy = "";
    await refresh();
  };
  root.refresh = refresh;
  // worker -> text for the tests column, set by whoever ran them.
  root.tests = {};
  root.value = [];
  refresh();
  return root;
});};
const _cloudflareiac_anon_468f6119e3 = function _anonymous(md) {return (md\`## The seed

The Cloudflare API answers a browser's preflight with 400 and no CORS headers, so a page cannot call it. The seed is a Worker the installer pastes into the Cloudflare dashboard by hand: it forwards \\\`/client/v4/…\\\` to \\\`api.cloudflare.com\\\` and adds CORS headers. It holds no credential; the page sends the token with each call. While it exists anyone who knows its URL can use it as a relay to the Cloudflare API, with their own token, so an install deletes it last.\`);};
const _cloudflareiac_seedSource = function _seedSource() {return (\`// Cloud Brain seed: a CORS proxy to the Cloudflare API, in your own account. Holds no credential.
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type", "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE", "access-control-max-age": "86400" };
export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/client/v4/")) return new Response("Cloud Brain seed", { headers: cors });
    const headers = new Headers();
    for (const name of ["authorization", "content-type"]) if (request.headers.has(name)) headers.set(name, request.headers.get(name));
    const upstream = await fetch("https://api.cloudflare.com" + url.pathname + url.search, { method: request.method, headers, body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body });
    const out = new Headers(upstream.headers);
    for (const [k, v] of Object.entries(cors)) out.set(k, v);
    return new Response(upstream.body, { status: upstream.status, headers: out });
  },
};
\`);};
const _cloudflareiac_anon_54244431db = function _anonymous(md) {return (md\`## The example service

\\\`fx_service\\\` is a Hono app that reads a secret, writes a row, appends to the inbox, calls out, and uses a helper cell, a constant and a function imported from another module. The tests below run it three ways.\`);};
const _cloudflareiac_fx_service = function _fx_service(cloudflare,fx_app) {return (cloudflare.Worker("fixture", fx_app, {
  paths: [{ path: "/hooks/whatsapp", who: "anyone" }],
  methods: { "com.lopecode.brain.fixture.math": { type: "query" } }
}));};
const _cloudflareiac_fx_emitted = async function _fx_emitted(fx_service) {return ((await fx_service.emit()).parts.map((p) => ({ path: p.path, bytes: p.text.length })));};
const _cloudflareiac_anon_458af5fb4f = function _anonymous(md) {return (md\`## API\`);};
const _cloudflareiac_platformTag = function _platformTag() {return (Symbol.for("cloudflare-iac.platform"));};
const _cloudflareiac_secretName = function _secretName() {return (/^[A-Z][A-Z0-9_]*$/);};
const _cloudflareiac_backend = function _backend() {
  const store = { secrets: new Map(), rows: new Map(), blobs: new Map(), inbox: [], calls: [] };
  return {
    store,
    secret: async (name) => store.secrets.get(name),
    rowsGet: async (key) => (store.rows.has(key) ? store.rows.get(key) : null),
    rowsPut: async (key, value) => (store.rows.set(key, value), true),
    rowsDelete: async (key) => store.rows.delete(key),
    rowsList: async (prefix = "") =>
      [...store.rows].filter(([k]) => k.startsWith(prefix)).map(([key, value]) => ({ key, value })),
    xrpc: async (kind, nsid, data) => {
      if (nsid === "com.lopecode.brain.inbox.append") {
        const seen = store.inbox.find((e) => e.key === data.key);
        if (seen) return { id: seen.id, duplicate: true };
        const entry = { id: store.inbox.length + 1, ...data };
        store.inbox.push(entry);
        return { id: entry.id };
      }
      store.calls.push({ kind, nsid, data });
      throw new Error("no Brain configured for " + nsid);
    },
    rowsPutIfAbsent: async (key, value) => (store.rows.has(key) ? false : (store.rows.set(key, value), true)),
    rowsIncrement: async (key) => (store.rows.set(key, (store.rows.get(key) || 0) + 1), store.rows.get(key)),
    rowsAppend: async (key, item, max = 1000) => (store.rows.set(key, [...(store.rows.get(key) || []), item].slice(-max)), store.rows.get(key).length),
    rowsDeletePrefix: async (prefix) => [...store.rows.keys()].filter((k) => k.startsWith(prefix)).map((k) => store.rows.delete(k)).length,
    blobGet: async (key) => store.blobs.get(key) ?? null,
    blobPut: async (key, bytes) => (store.blobs.set(key, bytes), true),
    blobHas: async (key) => store.blobs.has(key),
    blobDelete: async (key) => store.blobs.delete(key),
    xrpcFetch: async (nsid) => {
      throw new Error("no Brain configured for " + nsid);
    },
    config: {},
    forward: async (role, request) => {
      throw new Error("no Brain configured: cannot reach " + role);
    },
    deploy: null,
    use(impl) {
      Object.assign(this, impl);
      return this;
    }
  };
};
const _cloudflareiac_secrets = function _secrets(platformTag,secretName,backend) {return (new Proxy(
  {},
  {
    get: (_, k) =>
      k === platformTag
        ? "secrets"
        : typeof k === "string" && secretName.test(k)
        ? backend.secret(k)
        : undefined
  }
));};
const _cloudflareiac_rows = function _rows(platformTag,backend) {return ({
  [platformTag]: "rows",
  get: (key) => backend.rowsGet(key),
  put: (key, value) => backend.rowsPut(key, value),
  delete: (key) => backend.rowsDelete(key),
  list: (prefix) => backend.rowsList(prefix),
  putIfAbsent: (key, value) => backend.rowsPutIfAbsent(key, value),
  increment: (key) => backend.rowsIncrement(key),
  // One step each, so two callers cannot interleave: push onto the list at key (keeping the last max), and delete every key under a prefix.
  append: (key, item, max) => backend.rowsAppend(key, item, max),
  deletePrefix: (prefix) => backend.rowsDeletePrefix(prefix)
});};
const _cloudflareiac_blobs = function _blobs(platformTag,backend) {return ({
  [platformTag]: "blobs",
  get: (key) => backend.blobGet(key),
  put: (key, bytes) => backend.blobPut(key, bytes),
  has: (key) => backend.blobHas(key),
  delete: (key) => backend.blobDelete(key)
});};
const _cloudflareiac_settings = function _settings(rows) {
  const held = new Map();
  const read = async (k, load) => {
    const h = held.get(k);
    if (h && Date.now() - h.at < api.ttl) return h.value;
    const value = await load();
    held.set(k, { at: Date.now(), value });
    return value;
  };
  const api = {
    ttl: 5000,
    get: (key) => read("get " + key, () => rows.get(key)),
    list: (prefix = "") => read("list " + prefix, () => rows.list(prefix)),
    put: async (key, value) => {
      const done = await rows.put(key, value);
      held.clear();
      return done;
    },
    delete: async (key) => {
      const done = await rows.delete(key);
      held.clear();
      return done;
    },
    clear: () => held.clear()
  };
  return api;
};
const _cloudflareiac_config = function _config(platformTag,backend) {return (new Proxy({}, { get: (_, k) => (k === platformTag ? "config" : typeof k === "string" ? backend.config[k] : undefined) }));};
const _cloudflareiac_core = function _core(platformTag,backend) {return ({ [platformTag]: "core", fetch: (request) => backend.forward("core", request) });};
const _cloudflareiac_guard = function _guard(platformTag,backend) {return ({ [platformTag]: "guard", fetch: (request) => backend.forward("guard", request) });};
const _cloudflareiac_assets = function _assets(platformTag,backend) {return ({ [platformTag]: "assets", fetch: (request) => backend.forward("assets", request) });};
const _cloudflareiac_workers = function _workers(platformTag,backend) {return ({
  [platformTag]: "workers",
  has: (name) => false,
  fetch: (name, request) => backend.forward(name, request)
});};
const _cloudflareiac_inbox = function _inbox(platformTag,backend) {return ({
  [platformTag]: "inbox",
  append: (entry) => backend.xrpc("procedure", "com.lopecode.brain.inbox.append", entry)
});};
const _cloudflareiac_xrpc = function _xrpc(platformTag,backend) {return ({
  [platformTag]: "xrpc",
  query: (nsid, params) => backend.xrpc("query", nsid, params),
  procedure: (nsid, input) => backend.xrpc("procedure", nsid, input),
  // The same call with the body and the answer as they are: bytes in, a Response out, no error thrown for a status.
  fetch: (nsid, options) => backend.xrpcFetch(nsid, options)
});};
const _cloudflareiac_libraries = function _libraries() {return (new Map());};
const _cloudflareiac_library = function _library(libraries) {return (async (name, source) => {
  const text = typeof source === "string" ? source : await source.text();
  const ns = await import(URL.createObjectURL(new Blob([text], { type: "text/javascript" })));
  libraries.set(ns, { name, text });
  return ns;
});};
const _cloudflareiac_cloudflare = function _cloudflare(platformTag,Request,emit,backend) {return ({
  [platformTag]: "cloudflare",
  Worker: (name, fn, options = {}) => {
    const service = {
      name,
      fn,
      options,
      fetch: async (request, { caller = "owner" } = {}) => {
        const req = request instanceof Request ? request : new Request(request);
        return typeof fn?.fetch === "function" ? fn.fetch(req, {}, {}) : fn(req, { caller, info: {} });
      },
      emit: () => emit(service),
      deploy: async () => {
        if (!backend.deploy) throw new Error("no Brain configured: deploy() needs a guard");
        return backend.deploy(await emit(service));
      }
    };
    return service;
  }
});};
const _cloudflareiac_workerRuntime = function _workerRuntime(Response,URLSearchParams,Request,globalThis) {return (() => {
  let ENV = null;
  const tag = Symbol.for("cloudflare-iac.platform");
  const info = () => (ENV && ENV.BRAIN_INFO) || {};
  const json = (value, status = 200) => Response.json(value, { status });
  const core = async (kind, nsid, data) => {
    if (!ENV.CORE) throw new Error("no core binding for " + nsid);
    const query = kind === "query";
    const url = "https://core.internal/xrpc/" + nsid + (query && data ? "?" + new URLSearchParams(data) : "");
    const headers = { "content-type": "application/json", "x-brain-key": ENV.BRAIN_KEY || "" };
    const r = await ENV.CORE.fetch(
      new Request(url, query ? { headers } : { method: "POST", headers, body: JSON.stringify(data ?? {}) })
    );
    const body = await r.json().catch(() => null);
    if (!r.ok) throw Object.assign(new Error(body?.message || nsid + " " + r.status), { error: body?.error, status: r.status });
    return body;
  };
  const coreFetch = (nsid, { method = "GET", params = null, body = null, headers = {} } = {}) => {
    if (!ENV.CORE) throw new Error("no core binding for " + nsid);
    const url = "https://core.internal/xrpc/" + nsid + (params ? "?" + new URLSearchParams(params) : "");
    return ENV.CORE.fetch(new Request(url, { method, headers: { ...headers, "x-brain-key": ENV.BRAIN_KEY || "" }, body: method === "GET" ? undefined : body }));
  };
  // The bucket is one per Brain. A recipe's keys are kept under its own name, so two recipes cannot read each other's.
  const blobKey = (key) => (ENV.BRAIN_INFO && ENV.BRAIN_INFO.role === "recipe" ? ENV.BRAIN_INFO.name + "/" : "") + key;
  // rows on D1: one database per Brain, one table, a Worker's rows under its own name. Each op is one statement,
  // so two callers cannot interleave inside one. Nothing is billed while no statement runs.
  let sqlReady = null;
  const sqlCall = async (op, key, value) => {
    const t = info().name || "";
    if (ENV.SQL.sim) return ENV.SQL.sim(op, key, value);
    await (sqlReady ??= ENV.SQL.prepare("CREATE TABLE IF NOT EXISTS kv (t TEXT NOT NULL, k TEXT NOT NULL, v TEXT NOT NULL, PRIMARY KEY (t, k)) WITHOUT ROWID")
      .run()
      .catch((e) => {
        sqlReady = null;
        throw e;
      }));
    const q = (sql, ...args) => ENV.SQL.prepare(sql).bind(t, ...args);
    // Every key that starts with the prefix: from it, up to it followed by the last code point.
    const hi = (prefix) => prefix + "\\u{10FFFF}";
    if (op === "get") {
      const r = await q("SELECT v FROM kv WHERE t = ?1 AND k = ?2", key).first();
      return r ? JSON.parse(r.v) : null;
    }
    if (op === "put") return await q("INSERT INTO kv (t, k, v) VALUES (?1, ?2, ?3) ON CONFLICT (t, k) DO UPDATE SET v = excluded.v", key, JSON.stringify(value)).run(), true;
    if (op === "delete") return (await q("DELETE FROM kv WHERE t = ?1 AND k = ?2", key).run()).meta.changes > 0;
    if (op === "list") {
      const r = await q("SELECT k, v FROM kv WHERE t = ?1 AND k >= ?2 AND k < ?3 ORDER BY k", key || "", hi(key || "")).all();
      return r.results.map((x) => ({ key: x.k, value: JSON.parse(x.v) }));
    }
    if (op === "putIfAbsent") return (await q("INSERT OR IGNORE INTO kv (t, k, v) VALUES (?1, ?2, ?3)", key, JSON.stringify(value)).run()).meta.changes > 0;
    if (op === "increment")
      return Number((await q("INSERT INTO kv (t, k, v) VALUES (?1, ?2, '1') ON CONFLICT (t, k) DO UPDATE SET v = CAST(CAST(v AS INTEGER) + 1 AS TEXT) RETURNING v", key).first()).v);
    if (op === "append") {
      const item = JSON.stringify(value.item), max = value.max || 1000;
      let n = (await q("INSERT INTO kv (t, k, v) VALUES (?1, ?2, json_array(json(?3))) ON CONFLICT (t, k) DO UPDATE SET v = json_insert(v, '$[#]', json(?3)) RETURNING json_array_length(v) AS n", key, item).first()).n;
      for (; n > max; n--) await q("UPDATE kv SET v = json_remove(v, '$[0]') WHERE t = ?1 AND k = ?2", key).run();
      return n;
    }
    if (op === "deletePrefix") return (await q("DELETE FROM kv WHERE t = ?1 AND k >= ?2 AND k < ?3", key || "", hi(key || "")).run()).meta.changes;
    throw new Error("rows: no op " + op);
  };
  // The guard keeps its rows in a Durable Object, which also carries the alarm that ticks it.
  const rowsCall = async (op, key, value) => {
    if (ENV.SQL) return sqlCall(op, key, value);
    const stub = ENV.ROWS.get(ENV.ROWS.idFromName("rows"));
    const r = await stub.fetch(new Request("https://rows.internal/", { method: "POST", body: JSON.stringify({ op, key, value }) }));
    return (await r.json()).value;
  };
  // A Worker proves which Worker it is to the core and the guard with the key the guard gave it at deploy.
  const keyedRequest = (request) => {
    const headers = new Headers(request.headers);
    headers.set("x-brain-key", ENV.BRAIN_KEY || "");
    return new Request(request, { headers });
  };
  const bindingName = (name) => "X_" + name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const secretsHeld = new Map();
  const platform = {
    cloudflare: { [tag]: "cloudflare", Worker: (name, fn, options = {}) => ({ name, fn, options }) },
    // A key the platform bound (this Worker's own key, the kernel's cookie key, the guard's token) is read from the
    // binding. Any other secret is asked of secret.get as this Worker, which answers by the secret's rule, and is
    // held for 5 s: a new value or a changed rule is followed without a deploy. Undefined when unset or refused.
    secrets: new Proxy(
      {},
      {
        get: (_, k) => {
          if (typeof k !== "string" || !/^[A-Z][A-Z0-9_]*$/.test(k)) return undefined;
          if (ENV[k] !== undefined) return Promise.resolve(ENV[k]);
          const held = secretsHeld.get(k);
          if (held && Date.now() - held.at < 5000) return held.value;
          const value = core("query", "com.lopecode.brain.secret.get", { name: k }).then(
            (r) => r.value,
            (e) => {
              if (e.status === 401 || e.status === 403 || e.status === 404) return undefined;
              secretsHeld.delete(k);
              throw e;
            }
          );
          secretsHeld.set(k, { at: Date.now(), value });
          return value;
        }
      }
    ),
    config: new Proxy({}, { get: (_, k) => (typeof k === "string" && ENV ? (ENV.BRAIN_CONFIG || {})[k] : undefined) }),
    rows: {
      get: (key) => rowsCall("get", key),
      put: (key, value) => rowsCall("put", key, value),
      delete: (key) => rowsCall("delete", key),
      list: (prefix = "") => rowsCall("list", prefix),
      putIfAbsent: (key, value) => rowsCall("putIfAbsent", key, value),
      increment: (key) => rowsCall("increment", key),
      append: (key, item, max = 1000) => rowsCall("append", key, { item, max }),
      deletePrefix: (prefix) => rowsCall("deletePrefix", prefix)
    },
    blobs: {
      get: async (key) => {
        const o = await ENV.BLOBS.get(blobKey(key));
        return o ? new Uint8Array(await o.arrayBuffer()) : null;
      },
      put: async (key, bytes) => (await ENV.BLOBS.put(blobKey(key), bytes), true),
      has: async (key) => !!(await ENV.BLOBS.head(blobKey(key))),
      delete: async (key) => (await ENV.BLOBS.delete(blobKey(key)), true)
    },
    inbox: { append: (entry) => core("procedure", "com.lopecode.brain.inbox.append", entry) },
    xrpc: {
      query: (nsid, params) => core("query", nsid, params),
      procedure: (nsid, input) => core("procedure", nsid, input),
      fetch: coreFetch
    },
    core: { fetch: (request) => ENV.CORE.fetch(keyedRequest(request)) },
    guard: { fetch: (request) => ENV.GUARD.fetch(keyedRequest(request)) },
    assets: { fetch: (request) => ENV.ASSETS.fetch(request) },
    workers: {
      has: (name) => !!ENV[bindingName(name)],
      fetch: (name, request) => {
        const binding = ENV[bindingName(name)];
        if (!binding) throw new Error("no binding for worker " + name);
        return binding.fetch(request);
      }
    }
  };
  const fetch = (...args) => (ENV && ENV.__sim ? ENV.__sim.fetch(...args) : globalThis.fetch(...args));
  // \`source\` is the notebook module this Worker was emitted from: { module, text }.
  const serve = (init, source = null) => {
    let ready = null, armed = false;
    const load = () =>
      (ready ??= init().catch((e) => {
        ready = null;
        throw e;
      }));
    // Every response names the Worker and version that produced it. A Worker that passes another's response on
    // adds itself, so the header lists the whole path, the answering Worker first:
    //   x-brain-served-by: brain-x-proxy@19650b4ce520, brain-core@da75398cadd2, brain@9fe7177516cd
    const stamp = (r) => {
      const me = \`\${info().name || "unknown"}@\${String(info().hash || "").slice(0, 12)}\`;
      try {
        r.headers.append("x-brain-served-by", me);
        return r;
      } catch {}
      const headers = new Headers(r.headers);
      headers.append("x-brain-served-by", me);
      return new Response(r.body, { status: r.status, statusText: r.statusText, headers });
    };
    const self = {
      async fetch(request, env, ctx) {
        ENV = env;
        return stamp(await self.answer(request, env, ctx));
      },
      async answer(request, env, ctx) {
        const url = new URL(request.url);
        const role = info().role || "recipe";
        const edge = role === "kernel" || role === "guard";
        const inside = url.hostname.endsWith(".internal");
        const keyed = !inside && !!env.BRAIN_KEY && request.headers.get("x-brain-guard") === env.BRAIN_KEY;
        // Only the kernel and the guard answer the internet. Every other Worker answers bindings, and the guard
        // presenting that Worker's own key. A caller on the internet cannot name itself.
        if (!inside) {
          const headers = new Headers(request.headers);
          for (const name of [...headers.keys()]) if (name.startsWith("x-brain-")) headers.delete(name);
          if (keyed) headers.set("x-brain-caller", "guard");
          request = new Request(request, { headers });
          // A browser drops cookie from a Request it builds; under simulate() put it back.
          if (env.__sim) Object.defineProperty(request, "headers", { value: headers });
        }
        // A Worker with a scheduled function is ticked by an alarm on its rows object as well as by its cron, once a
        // minute, starting from the first request to its own address. Measured 2026-10-05: cron triggers set through
        // the API had run 0 times after 30 minutes, and a rollback was missed.
        if (keyed && url.pathname === "/__tick") {
          // GET: when the alarm is next due and how its last call went.
          if (request.method === "GET") return json(await rowsCall("armInfo"));
          const service = await load();
          if (service.options.scheduled) await service.options.scheduled({ alarm: true }, ctx);
          return json({ ok: true });
        }
        if (!inside && !armed && env.ROWS && !env.__sim) {
          armed = true;
          ctx.waitUntil(load().then((s) => (s.options.scheduled ? rowsCall("arm", url.origin) : null)).catch(() => void (armed = false)));
        }
        if (url.pathname === "/xrpc/_health")
          return inside || edge || keyed ? json({ ok: true, name: info().name, hash: info().hash }) : new Response("not found", { status: 404 });
        const asked = url.searchParams.get("worker");
        // Every Worker describes itself: its manifest, and the module it was emitted from. Both are public; a
        // Worker that does not answer the internet is reached for them through the kernel and the core.
        const describes = url.pathname === "/xrpc/com.lopecode.brain.getInfo" ? "info" : url.pathname === "/xrpc/com.lopecode.brain.getSource" ? "source" : null;
        if (describes && request.method === "GET" && (!asked || asked === info().name) && (inside || edge || keyed))
          return new Response(JSON.stringify(describes === "info" ? info() : { worker: info().name, hash: info().hash, module: source ? source.module : null, text: source ? source.text : null }), {
            headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
          });
        if (!inside && !edge && !keyed) return new Response("not found", { status: 404 });
        try {
          const fn = (await load()).fn;
          const out =
            typeof fn?.fetch === "function"
              ? await fn.fetch(request, env, ctx)
              : await fn(request, { caller: request.headers.get("x-brain-caller") || "anonymous", ctx, info: info() });
          if (!(out instanceof Response)) throw new Error("the function did not return a Response");
          return out;
        } catch (e) {
          return json({ error: "InternalServerError", message: String(e?.message || e) }, 500);
        }
      },
      async scheduled(event, env, ctx) {
        ENV = env;
        const service = await load();
        if (service.options.scheduled) await service.options.scheduled(event, ctx);
      }
    };
    return self;
  };
  class Rows {
    constructor(state, env) {
      this.storage = state.storage;
      this.env = env;
    }
    // Calls the Worker this object belongs to, on its own address, with that Worker's key, and sets the next alarm.
    async alarm() {
      const origin = await this.storage.get("__tick_origin");
      await this.storage.setAlarm(Date.now() + 60000);
      if (!origin) return;
      const at = Date.now();
      const last = await globalThis
        .fetch(origin + "/__tick", { method: "POST", headers: { "x-brain-guard": this.env.BRAIN_KEY || "" } })
        .then(async (r) => ({ at, status: r.status, body: r.ok ? undefined : (await r.text()).slice(0, 120) }), (e) => ({ at, error: String((e && e.message) || e) }));
      await this.storage.put("__tick_last", last);
    }
    async fetch(request) {
      const { op, key, value } = await request.json();
      const s = this.storage;
      if (op === "get") return Response.json({ value: (await s.get(key)) ?? null });
      if (op === "put") return await s.put(key, value), Response.json({ value: true });
      if (op === "delete") return Response.json({ value: await s.delete(key) });
      if (op === "list")
        return Response.json({ value: [...(await s.list({ prefix: key }))].filter(([k]) => !k.startsWith("__tick_")).map(([key, value]) => ({ key, value })) });
      if (op === "armInfo") return Response.json({ value: { origin: (await s.get("__tick_origin")) ?? null, alarm: await s.getAlarm(), last: (await s.get("__tick_last")) ?? null, now: Date.now() } });
      if (op === "arm") {
        await s.put("__tick_origin", key);
        if ((await s.getAlarm()) === null) await s.setAlarm(Date.now() + 60000);
        return Response.json({ value: true });
      }
      if (op === "putIfAbsent") {
        if ((await s.get(key)) !== undefined) return Response.json({ value: false });
        return await s.put(key, value), Response.json({ value: true });
      }
      if (op === "increment") {
        const n = ((await s.get(key)) || 0) + 1;
        return await s.put(key, n), Response.json({ value: n });
      }
      if (op === "append") {
        const list = [...((await s.get(key)) || []), value.item].slice(-(value.max || 1000));
        return await s.put(key, list), Response.json({ value: list.length });
      }
      if (op === "deletePrefix") {
        const keys = [...(await s.list({ prefix: key })).keys()].filter((k) => !k.startsWith("__tick_"));
        for (let i = 0; i < keys.length; i += 128) await s.delete(keys.slice(i, i + 128));
        return Response.json({ value: keys.length });
      }
      return Response.json({ value: null }, { status: 400 });
    }
  }
  return { platform, fetch, serve, Rows };
});};
const _cloudflareiac_notebookOnly = function _notebookOnly() {return (new Set([
  "md", "html", "svg", "tex", "htl", "dot", "mermaid", "Inputs", "Plot", "d3", "width", "now", "invalidation",
  "visibility", "DOM", "Files", "Generators", "Promises", "FileAttachment", "Mutable", "require", "Library",
  "SQLite", "DuckDBClient", "vl", "aq", "Arrow", "L", "topojson", "_", "@variable", "viewof", "main", "runtime"
]));};
const _cloudflareiac_sha256 = function _sha256() {return (async (text) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(""));};
const _cloudflareiac_partsHash = function _partsHash(sha256) {return ((parts, meta) => sha256(JSON.stringify({ parts, meta })));};
const _cloudflareiac_emit = function _emit(runtime,platformTag,libraries,notebookOnly,globalThis,acorn,acorn_walk,secretName,moduleSource,workerRuntime,checkedRule,partsHash) {return (async (service) => {
  // An imported name is an alias variable whose one input lives in the exporting module.
  const follow = (v) => {
    while ((v._inputs || []).length === 1 && v._inputs[0]._module && v._inputs[0]._module !== v._module)
      v = v._inputs[0];
    return v;
  };
  // Another module's import of the service holds the same value, and can come first in the runtime's order:
  // on 2026-10-06 09:30 the core was emitted with the page's module as its source.
  const held = [...runtime._variables].find((v) => v._value === service);
  if (!held) throw new Error(\`cloudflare.Worker("\${service.name}") is not the value of a cell\`);
  const root = follow(held);
  const refuse = (cell, why) => {
    throw new Error(\`cannot deploy "\${service.name}": cell "\${cell}" \${why}\`);
  };
  const seen = new Map(), cells = [], libs = new Map(), used = new Set(), secretNames = new Set();
  const taken = new Set(["fetch"]);
  const ident = (name) => {
    let id = name.replace(/[^A-Za-z0-9_$]/g, "_");
    if (/^[0-9]/.test(id)) id = "_" + id;
    while (taken.has(id)) id += "_";
    taken.add(id);
    return id;
  };
  const visit = (v0, from) => {
    const v = follow(v0);
    if (seen.has(v)) return seen.get(v);
    const name = v._name;
    const value = v._value;
    const kind = value != null ? value[platformTag] : undefined;
    let ref;
    if (kind) {
      used.add(kind);
      ref = "__rt.platform." + kind;
    } else if (value != null && libraries.has(value)) {
      const lib = libraries.get(value);
      libs.set(lib.name, lib.text);
      ref = "__lib_" + lib.name.replace(/[^A-Za-z0-9_$]/g, "_");
    } else if (v._module === runtime._builtin || v._type === 2) {
      if (notebookOnly.has(name) || typeof globalThis[name] === "undefined")
        refuse(from, \`depends on \${name}, which exists only in a notebook\`);
      ref = name;
    } else {
      if (!name) refuse(from, "depends on an unnamed cell");
      if (/^(viewof|mutable|initial) /.test(name)) refuse(name.replace(/^\\w+ /, ""), "is a viewof or mutable cell");
      const def = v._definition;
      if (typeof def !== "function") refuse(name, "has no definition");
      if (/Generator/.test(def.constructor.name)) refuse(name, "is a generator");
      for (const i of v._inputs || [])
        if (/^(viewof|mutable|initial) /.test(i._name || "")) refuse(name, "is a viewof or mutable cell");
      const text = String(def);
      const deps = (v._inputs || []).map((i) => visit(i, name));
      // Secret names are read from the parsed source, so a computed name cannot be bound.
      if (deps.includes("__rt.platform.secrets")) {
        const ast = acorn.parse("(" + text + ")", { ecmaVersion: "latest" });
        const fn = ast.body[0].expression;
        deps.forEach((d, i) => {
          const param = fn.params[i];
          if (d !== "__rt.platform.secrets" || !param || param.type !== "Identifier") return;
          acorn_walk.fullAncestor(ast, (node, ancestors) => {
            if (node.type !== "Identifier" || node.name !== param.name || node === param) return;
            const parent = ancestors[ancestors.length - 2];
            const member = parent.type === "MemberExpression" && parent.object === node;
            const key = !member
              ? null
              : !parent.computed
              ? parent.property.name
              : parent.property.type === "Literal"
              ? parent.property.value
              : null;
            if (typeof key !== "string" || !secretName.test(key)) refuse(name, "reads a secret by a computed name");
            secretNames.add(key);
          });
        });
      }
      ref = ident(name);
      cells.push({ id: ref, name, text, deps });
    }
    seen.set(v, ref);
    return ref;
  };
  const rootRef = visit(root, service.name);

  const role = service.options.role || "recipe";
  // A system Worker is routed like a recipe and deployed like the core: under probation, and not by a recipe's rules.
  const worker = role === "recipe" ? "brain-x-" + service.name : role === "kernel" ? "brain" : role === "system" ? "brain-" + service.name : "brain-" + role;
  const lines = [\`// \${worker}: emitted by @tomlarkworthy/cloudflare-iac. Edit the notebook, not this file.\`];
  for (const name of libs.keys())
    lines.push(\`import * as __lib_\${name.replace(/[^A-Za-z0-9_$]/g, "_")} from "./lib/\${name}.js";\`);
  // The module the service's cell is in, as source. The Worker serves it, and it is part of what is hashed, so
  // what runs and what it was made from are deployed and put back together.
  const source = await moduleSource(root._module);
  if (source) lines.push(\`import __source from "./source.js";\`);
  lines.push(\`const __rt = (\${String(workerRuntime)})();\`, \`const fetch = __rt.fetch;\`, \`const __init = async () => {\`);
  for (const c of cells) lines.push(\`  const \${c.id} = await (\${c.text})(\${c.deps.join(", ")});\`);
  lines.push(\`  return \${rootRef};\`, \`};\`, \`export default __rt.serve(__init, \${source ? "__source" : "null"});\`);
  if (used.has("rows") && role === "guard") lines.push(\`export const Rows = __rt.Rows;\`);
  // A cell value of the tab is never copied: every chased cell is evaluated again on the Worker from its source.

  const parts = [
    { path: "worker.js", text: lines.join("\\n") + "\\n" },
    ...[...libs].map(([name, text]) => ({ path: \`lib/\${name}.js\`, text })),
    ...(source ? [{ path: "source.js", text: "export default " + JSON.stringify(source) + ";\\n" }] : [])
  ];
  const resources = [...used].filter((k) => k !== "cloudflare" && k !== "secrets" && k !== "config").sort();
  const meta = {
    worker,
    role,
    module: source ? source.module : null,
    // The methods of other services this one calls. A name, never a Worker.
    calls: [...(service.options.calls || [])].sort(),
    crons: service.options.crons || [],
    // The alarm that ticks a scheduled Worker calls it on its own address, which needs this flag.
    flags: [...new Set([...(service.options.flags || []), ...(service.options.scheduled ? ["global_fetch_strictly_public"] : [])])],
    methods: Object.keys(service.options.methods || {}).sort(),
    access: Object.fromEntries(
      Object.entries(service.options.methods || {}).sort().map(([nsid, m]) => [nsid, { type: m.type || "procedure", who: m.who || "owner", ...(m.allow ? { allow: checkedRule(nsid, m.allow) } : {}), ...(m.fixed ? { fixed: true } : {}) }])
    ),
    paths: (service.options.paths || []).map((p) => (p.allow ? { ...p, allow: checkedRule(p.path, p.allow) } : p)),
    secrets: [...secretNames].sort(),
    resources,
    bindings: [
      // Only the kernel's and the core's named secrets are bound. A recipe reads its secrets through the core.
      ...(role === "kernel" || role === "core" || role === "guard" ? [...secretNames].sort().map((name) => ({ type: "secret_text", name })) : []),
      ...(used.has("rows") ? [role === "guard" ? { type: "durable_object_namespace", name: "ROWS", class_name: "Rows" } : { type: "d1", name: "SQL" }] : []),
      ...(used.has("blobs") ? [{ type: "r2_bucket", name: "BLOBS", bucket_name: "brain-blobs" }] : []),
      ...(used.has("inbox") || used.has("xrpc") || used.has("core") || (secretNames.size && (role === "recipe" || role === "system")) ? [{ type: "service", name: "CORE", service: "brain-core" }] : []),
      ...(used.has("guard") ? [{ type: "service", name: "GUARD", service: "brain-guard" }] : []),
      ...(used.has("assets") ? [{ type: "assets", name: "ASSETS" }] : [])
    ]
  };
  const hash = await partsHash(parts, meta);
  return { name: service.name, parts, meta, hash, source, info: { name: worker, hash, ...meta, bindings: undefined } };
});};
const _cloudflareiac_moduleSource = function _moduleSource(runtime,exportModuleJS) {return (async (module) => {
  let name = [...(runtime.mains || [])].find(([, m]) => m === module)?.[0] || null;
  if (!name) {
    const loader = [...runtime._variables].find((v) => v._value === module && /^module @/.test(v._name || ""));
    name = loader ? loader._name.slice("module ".length) : null;
  }
  if (!name) return null;
  try {
    return { module: name, text: (await exportModuleJS(name)).source };
  } catch {
    return null;
  }
});};
const _cloudflareiac_simulate = function _simulate(Response,Request) {return (async (service, { secrets = {}, stored = {}, fetch, config = {}, info = {}, core, guard, assets, workers = {}, rows, blobs } = {}) => {
  const emitted = await service.emit();
  const url = (text) => URL.createObjectURL(new Blob([text], { type: "text/javascript" }));
  let main = emitted.parts[0].text;
  for (const part of emitted.parts.slice(1)) main = main.split(\`"./\${part.path}"\`).join(JSON.stringify(url(part.text)));
  const mod = await import(url(main));
  const sim = { emitted, inbox: [], rows: rows || new Map(), blobs: blobs || new Map(), requests: [], calls: [] };
  const reply = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
  // The same rows for both stores: the guard's Durable Object and every other Worker's D1.
  const rowsOp = (op, key, value) => {
    const r = sim.rows;
    if (op === "get") return r.has(key) ? r.get(key) : null;
    if (op === "put") return r.set(key, value), true;
    if (op === "delete") return r.delete(key);
    if (op === "putIfAbsent") return r.has(key) ? false : (r.set(key, value), true);
    if (op === "increment") return r.set(key, (r.get(key) || 0) + 1), r.get(key);
    if (op === "append") return r.set(key, [...(r.get(key) || []), value.item].slice(-(value.max || 1000))), r.get(key).length;
    if (op === "deletePrefix") return [...r.keys()].filter((k) => k.startsWith(key)).map((k) => r.delete(k)).length;
    return [...r].filter(([k]) => k.startsWith(key)).sort(([a], [b]) => (a < b ? -1 : 1)).map(([key, value]) => ({ key, value }));
  };
  const env = {
    ...secrets,
    BRAIN_INFO: { ...JSON.parse(JSON.stringify(emitted.info)), ...info },
    BRAIN_CONFIG: config,
    ASSETS: { fetch: async (request) => (assets ? assets(request) : new Response("no asset", { status: 404 })) },
    __sim: {
      fetch: async (input, init) => {
        const request = new Request(input, init);
        sim.requests.push({ method: request.method, url: request.url });
        if (!fetch) throw new Error("simulate: outbound fetch to " + request.url + " and no fake was given");
        return fetch(request);
      }
    },
    CORE: {
      fetch: async (request) => {
        if (core) return core(request);
        const nsid = new URL(request.url).pathname.replace("/xrpc/", "");
        const data = request.method === "POST" ? await request.json() : Object.fromEntries(new URL(request.url).searchParams);
        if (nsid === "com.lopecode.brain.inbox.append") {
          const seen = sim.inbox.find((e) => e.key === data.key);
          if (seen) return reply({ id: seen.id, duplicate: true });
          sim.inbox.push({ id: sim.inbox.length + 1, ...data });
          return reply({ id: sim.inbox.length });
        }
        sim.calls.push({ nsid, data });
        // \`stored\` are the secrets brain-db would hand this Worker; \`secrets\` are bound keys.
        if (nsid === "com.lopecode.brain.secret.get") return data.name in stored ? reply({ name: data.name, value: stored[data.name] }) : reply({ error: "NotFound", message: "no such secret" }, 404);
        return reply({ error: "MethodNotImplemented", message: nsid }, 501);
      }
    },
    GUARD: { fetch: async (request) => (guard ? guard(request) : reply({ error: "NoGuard" }, 501)) },
    BLOBS: {
      get: async (key) => (sim.blobs.has(key) ? { arrayBuffer: async () => sim.blobs.get(key).buffer } : null),
      put: async (key, bytes) => void sim.blobs.set(key, new Uint8Array(bytes)),
      head: async (key) => (sim.blobs.has(key) ? {} : null),
      delete: async (key) => void sim.blobs.delete(key)
    },
    ...(emitted.meta.role === "guard" ? {} : { SQL: { sim: async (op, key, value) => rowsOp(op, key, value) } }),
    ROWS: { idFromName: (name) => name, get: () => ({ fetch: async (request) => (({ op, key, value }) => reply({ value: rowsOp(op, key, value) }))(await request.json()) }) }
  };
  for (const [name, handler] of Object.entries(workers))
    env["X_" + name.toUpperCase().replace(/[^A-Z0-9]/g, "_")] = { fetch: async (request) => handler(request) };
  sim.env = env;
  sim.fetch = (request, init) => {
    const req = request instanceof Request ? request : new Request(request, init);
    if (init && init.headers) Object.defineProperty(req, "headers", { value: new Headers(init.headers) });
    return mod.default.fetch(req, env, { waitUntil() {} });
  };
  sim.scheduled = () => mod.default.scheduled({ scheduledTime: Date.now() }, env, { waitUntil() {} });
  return sim;
});};
const _cloudflareiac_anon_45a3f5c4f1 = function _anonymous(md) {return (md\`## Fixtures and tests

Cells named \\\`fx_*\\\` exist for the tests. Three of them are services the emit must refuse.\`);};
const _cloudflareiac_fx_double = function _fx_double() {return ((x) => x * 2);};
const _cloudflareiac_fx_base = function _fx_base() {return (7);};
const _cloudflareiac_hono = function _hono(library,FileAttachment) {return (library("hono", FileAttachment("hono.js")));};
const _cloudflareiac_anon_c5db711582 = function _anonymous(md) {return (md\`## Access rules

A method or a path is open to whoever its rule says. The core decides, before it forwards.

\\\`\\\`\\\`
who: "anyone"                 true
who: "workers"                caller.trusted || caller.kind in ["worker", "guard"]
who: "worker:brain-x-NAME"    caller.trusted || caller.id == "worker:brain-x-NAME"
who: "owner", or nothing      caller.trusted
allow: "<expression>"         the expression, in place of the line who would give
\\\`\\\`\\\`

A rule is one [CEL](https://github.com/google/cel-spec) expression, evaluated by [\\\`@marcbachmann/cel-js\\\`](https://github.com/marcbachmann/cel-js). The call goes ahead only if the expression is \\\`true\\\`. Any other value, a missing field or an error refuses it. \\\`allow\\\` is the whole decision: the owner is let in only if the expression says so. A rule that does not parse stops \\\`emit\\\`.

| an expression reads | |
|---|---|
| \\\`caller.id\\\` | \\\`owner\\\`, \\\`anonymous\\\`, \\\`guard\\\`, \\\`token:NAME\\\`, \\\`did:plc:…\\\`, \\\`worker:brain-x-NAME\\\` |
| \\\`caller.kind\\\` | \\\`owner\\\`, \\\`anonymous\\\`, \\\`guard\\\`, \\\`token\\\`, \\\`did\\\`, \\\`worker\\\` |
| \\\`caller.did\\\`, \\\`caller.worker\\\`, \\\`caller.token\\\` | the DID, the Worker name, the token name; \\\`""\\\` for another kind |
| \\\`caller.session\\\` | the owner in their own tab |
| \\\`caller.trusted\\\` | the owner, or a token or granted account the kernel has checked against this method |
| \\\`request.method\\\` | the NSID, or \\\`""\\\` for a path |
| \\\`request.path\\\`, \\\`request.verb\\\` | \\\`/static/site/a.css\\\`, \\\`GET\\\` |
| \\\`request.params\\\` | the query string as a map of strings. \\\`request.params.name\\\` is an error when \\\`name\\\` is absent; test with \\\`has(request.params.name)\\\`. |

\\\`\\\`\\\`js
cloudflare.Worker("notes", app, {
  methods: {
    "com.lopecode.brain.notes.read": { type: "query", allow: 'caller.trusted || request.params.name.startsWith("pub/")' },
    "com.lopecode.brain.notes.write": { type: "procedure", allow: 'caller.did in ["did:plc:friend"] || caller.session' }
  },
  paths: [{ path: "/notes/*", allow: 'request.verb == "GET"' }]
})
\\\`\\\`\\\`

The request body is not read. A rule is part of the service's source: changing one is a deploy.\`);};
const _cloudflareiac_cel = function _cel(library,FileAttachment) {return (library("cel", FileAttachment("cel.js")));};
const _cloudflareiac_checkedRule = function _checkedRule(cel) {return ((name, expression) => {
  try {
    cel.parse(expression);
  } catch (e) {
    throw new Error(\`\${name}: the rule does not parse: \${String((e && e.message) || e).split("\\n")[0]}\`);
  }
  return expression;
});};
const _cloudflareiac_ruleExpression = function _ruleExpression() {return ((rule) =>
  (rule && rule.allow) ||
  (rule && rule.who === "anyone"
    ? "true"
    : rule && rule.who === "workers"
      ? 'caller.trusted || caller.kind in ["worker", "guard"]'
      : /^worker:/.test((rule && rule.who) || "")
        ? \`caller.trusted || caller.id == \${JSON.stringify(rule.who)}\`
        : "caller.trusted"));};
const _cloudflareiac_callerOf = function _callerOf() {return ((who) => {
  const id = (who && who.caller) || "anonymous";
  const kind = /^(token|did|worker):/.test(id) ? id.split(":")[0] : id;
  return {
    id,
    kind,
    did: kind === "did" ? id : "",
    worker: kind === "worker" ? id.slice("worker:".length) : "",
    token: kind === "token" ? id.slice("token:".length) : "",
    // The owner in their own tab, not a token or a granted account acting for them.
    session: id === "owner" && ((who && who.via) || "") === "session",
    // The kernel has checked this caller against the method: the owner, a token or a granted account.
    trusted: id === "owner" || kind === "token" || kind === "did"
  };
});};
const _cloudflareiac_decide = function _decide(ruleExpression,cel) {
  const parsed = new Map();
  return (rule, context) => {
    const expression = ruleExpression(rule);
    try {
      if (!parsed.has(expression)) parsed.set(expression, cel.parse(expression));
      return { allow: parsed.get(expression)(context) === true, expression, error: null };
    } catch (e) {
      return { allow: false, expression, error: String((e && e.message) || e).split("\\n")[0] };
    }
  };
};
const _cloudflareiac_fx_app = function _fx_app(hono,inbox,secrets,fx_double,fixtureTriple,fx_base,rows) {
  const app = new hono.Hono();
  app.get("/hooks/whatsapp", (c) => c.text(c.req.query("hub.challenge")));
  app.post("/hooks/whatsapp", async (c) => {
    const m = await c.req.json();
    await inbox.append({ source: "whatsapp", key: m.id, body: m });
    return c.text("ok");
  });
  app.use("/secrets/*", async (c, next) =>
    c.req.header("x-brain-caller") === "owner" ? next() : c.text("unauthorized", 401)
  );
  app.get("/secrets/:name", async (c) => c.json({ name: c.req.param("name"), value: await secrets.T }));
  app.get("/notebooks/:name{.+}", (c) => c.text("nb:" + c.req.param("name")));
  app.get("/math/:n", (c) => c.json({ n: fx_double(fixtureTriple(+c.req.param("n"))) + fx_base }));
  app.post("/rows/:key", async (c) => {
    await rows.put(c.req.param("key"), await c.req.json());
    return c.json({ stored: await rows.get(c.req.param("key")) });
  });
  app.get("/out", async (c) => c.text(await (await fetch("https://example.com/data")).text()));
  app.get("/xrpc/com.lopecode.brain.getInfo", (c) => c.text("replaced"));
  return app;
};
const _cloudflareiac_fx_plain = function _fx_plain(cloudflare,Response) {return (cloudflare.Worker("plain", async (request, { caller }) => {
  const r = await fetch("https://example.com/x");
  return new Response(caller + ":" + (await r.text()));
}));};
const _cloudflareiac_fx_gen = function* _fx_gen() {
  yield 1;
};
const _cloudflareiac_fx_bad_gen = function _fx_bad_gen(cloudflare,Response,fx_gen) {return (cloudflare.Worker("bad-gen", (request) => new Response(String(fx_gen))));};
const _cloudflareiac_viewof_fx_view = function _fx_view(Inputs) {return (Inputs.range([0, 10], { value: 3, label: "fx_view (a refused dependency)" }));};
const _cloudflareiac_fx_view = (G, _) => G.input(_);
const _cloudflareiac_fx_bad_view = function _fx_bad_view(cloudflare,Response,fx_view) {return (cloudflare.Worker("bad-view", (request) => new Response(String(fx_view))));};
const _cloudflareiac_fx_dom = function _fx_dom(html) {return (html\`<b>a refused dependency</b>\`);};
const _cloudflareiac_fx_bad_dom = function _fx_bad_dom(cloudflare,Response,fx_dom) {return (cloudflare.Worker("bad-dom", (request) => new Response(fx_dom.outerHTML)));};
const _cloudflareiac_fx_bad_secret = function _fx_bad_secret(cloudflare,Response,secrets) {return (cloudflare.Worker("bad-secret", async (request) => new Response(await secrets[new URL(request.url).searchParams.get("n")])));};
const _cloudflareiac_fx_six = function _fx_six() {return ([
  { req: ["https://brain.internal/hooks/whatsapp?hub.challenge=4821"], status: 200, body: "4821" },
  { req: ["https://brain.internal/hooks/whatsapp", { method: "POST", body: '{"id":"m1"}', headers: { "content-type": "application/json" } }], status: 200, body: "ok" },
  { req: ["https://brain.internal/secrets/T"], status: 401, body: "unauthorized" },
  { req: ["https://brain.internal/secrets/T", { headers: { "x-brain-caller": "owner" } }], status: 200, body: '{"name":"T","value":"s3"}' },
  { req: ["https://brain.internal/notebooks/a/b"], status: 200, body: "nb:a/b" },
  { req: ["https://brain.internal/nope"], status: 404, body: "404 Not Found" }
]);};
const _cloudflareiac_fx_refusal = function _fx_refusal() {return (async (service) => {
  try {
    await service.emit();
  } catch (e) {
    return e.message;
  }
  return "emitted";
});};
const _cloudflareiac_test_chase = async function _test_chase(fx_service,expect,simulate) {
  const e = await fx_service.emit();
  expect(e.parts.map((p) => p.path)).toEqual(["worker.js", "lib/hono.js", "source.js"]);
  const text = e.parts[0].text;
  expect([...text.matchAll(/^import .* from "(.*)";$/gm)].map((m) => m[1])).toEqual(["./lib/hono.js", "./source.js"]);
  for (const cell of ["fx_double", "fx_base", "fixtureTriple", "fx_app", "fx_service"])
    expect(text).toContain("const " + cell + " = await (");
  const sim = await simulate(fx_service);
  const r = await sim.fetch("https://brain.internal/math/5");
  expect(await r.json()).toEqual({ n: 37 });
  return "5 cells chased, 1 library, /math/5 = 37";
};
const _cloudflareiac_test_bindings_follow_platform_cells = async function _test_bindings_follow_platform_cells(fx_service,expect,simulate) {
  const { meta } = await fx_service.emit();
  expect(meta.secrets).toEqual(["T"]);
  expect(meta.resources).toEqual(["inbox", "rows"]);
  expect(meta.bindings.map((b) => b.type + ":" + b.name)).toEqual([
    "d1:SQL",
    "service:CORE"
  ]);
  // The secret it names is not bound. It is asked of secret.get while the Worker runs, and held for 5 s.
  const sim = await simulate(fx_service, { stored: { T: "from-the-database" } });
  const read = () => sim.fetch("https://brain.internal/secrets/T", { headers: { "x-brain-caller": "owner" } }).then((r) => r.json());
  expect([await read(), await read()]).toEqual(Array(2).fill({ name: "T", value: "from-the-database" }));
  expect(sim.calls.filter((c) => c.nsid === "com.lopecode.brain.secret.get").map((c) => c.data)).toEqual([{ name: "T" }]);
  // Unset or refused reads as undefined, not as an error.
  const none = await simulate(fx_service, {});
  expect(await (await none.fetch("https://brain.internal/secrets/T", { headers: { "x-brain-caller": "owner" } })).json()).toEqual({ name: "T" });
  expect(meta.role).toBe("recipe");
  expect(meta.worker).toBe("brain-x-fixture");
  return meta.bindings.length + " bindings";
};
const _cloudflareiac_test_refuses_generator = async function _test_refuses_generator(fx_refusal,fx_bad_gen,expect) {
  const message = await fx_refusal(fx_bad_gen);
  expect(message).toContain('cell "fx_gen" is a generator');
  return message;
};
const _cloudflareiac_test_refuses_viewof = async function _test_refuses_viewof(fx_refusal,fx_bad_view,expect) {
  const message = await fx_refusal(fx_bad_view);
  expect(message).toContain('cell "fx_view" is a viewof or mutable cell');
  return message;
};
const _cloudflareiac_test_refuses_dom_builtin = async function _test_refuses_dom_builtin(fx_refusal,fx_bad_dom,expect) {
  const message = await fx_refusal(fx_bad_dom);
  expect(message).toContain('cell "fx_dom" depends on html');
  return message;
};
const _cloudflareiac_test_refuses_computed_secret = async function _test_refuses_computed_secret(fx_refusal,fx_bad_secret,expect) {
  const message = await fx_refusal(fx_bad_secret);
  expect(message).toContain('cell "fx_bad_secret" reads a secret by a computed name');
  return message;
};
const _cloudflareiac_test_simulate = async function _test_simulate(simulate,fx_service,Response,expect) {
  const sim = await simulate(fx_service, {
    secrets: { T: "sim" },
    fetch: async (request) => new Response("faked " + new URL(request.url).pathname)
  });
  const stored = await sim.fetch("https://brain.internal/rows/k1", { method: "POST", body: '{"a":1}' });
  expect(await stored.json()).toEqual({ stored: { a: 1 } });
  expect(sim.rows.get("k1")).toEqual({ a: 1 });
  const post = { method: "POST", body: '{"id":"m7"}', headers: { "content-type": "application/json" } };
  await sim.fetch("https://brain.internal/hooks/whatsapp", post);
  await sim.fetch("https://brain.internal/hooks/whatsapp", post);
  expect(sim.inbox.map((e) => e.key)).toEqual(["m7"]);
  expect(await (await sim.fetch("https://brain.internal/out")).text()).toBe("faked /data");
  expect(sim.requests).toEqual([{ method: "GET", url: "https://example.com/data" }]);
  // A throw inside a Hono app is answered by Hono's own error handler, in the tab and on the Worker alike.
  const bare = await simulate(fx_service);
  expect((await bare.fetch("https://brain.internal/out")).status).toBe(500);
  expect(bare.requests.length).toBe(1);
  return "row, inbox entry and outbound call observed; no fake = 500";
};
const _cloudflareiac_test_a_worker_serves_its_manifest_and_its_source = async function _test_a_worker_serves_its_manifest_and_its_source(simulate,fx_service,expect,partsHash) {
  const sim = await simulate(fx_service, { secrets: { T: "s3" }, info: { role: "kernel" } });
  const e = sim.emitted;
  expect(e.meta.module).toBe("@tomlarkworthy/cloudflare-iac");
  expect(e.source.text).toContain("export default function define(");
  // The source is one of the hashed parts: the guard recomputes this from what it is sent.
  expect(await partsHash(e.parts, e.meta)).toBe(e.hash);
  expect(await partsHash(e.parts.filter((p) => p.path !== "source.js"), e.meta)).not.toBe(e.hash);
  // From the internet, with no key, on a Worker that answers the internet.
  const got = await sim.fetch("https://cb.sub.workers.dev/xrpc/com.lopecode.brain.getSource");
  expect(got.headers.get("access-control-allow-origin")).toBe("*");
  const body = await got.json();
  expect(body).toMatchObject({ worker: "brain-x-fixture", hash: e.hash, module: "@tomlarkworthy/cloudflare-iac" });
  // Every response says which Worker and version produced it.
  expect(got.headers.get("x-brain-served-by")).toBe("brain-x-fixture@" + e.hash.slice(0, 12));
  expect(body.text).toBe(e.source.text);
  // A question about another Worker is not this Worker's to answer.
  expect((await sim.fetch("https://cb.sub.workers.dev/xrpc/com.lopecode.brain.getSource?worker=brain-x-other")).status).not.toBe(200);
  // A recipe does not answer the internet at all; over a binding it does.
  const recipe = await simulate(fx_service, { secrets: { T: "s3" } });
  expect((await recipe.fetch("https://cb-x-fixture.sub.workers.dev/xrpc/com.lopecode.brain.getSource")).status).toBe(404);
  expect((await (await recipe.fetch("https://fixture.internal/xrpc/com.lopecode.brain.getSource?worker=brain-x-fixture")).json()).module).toBe("@tomlarkworthy/cloudflare-iac");
  return body.text.length + " characters of source";
};
const _cloudflareiac_test_plain_function_caller_and_error_shape = async function _test_plain_function_caller_and_error_shape(simulate,fx_plain,Response,expect) {
  const faked = await simulate(fx_plain, { fetch: async () => new Response("faked") });
  const ok = await faked.fetch("https://brain.internal/", { headers: { "x-brain-caller": "token:laptop" } });
  expect(await ok.text()).toBe("token:laptop:faked");
  expect(await (await faked.fetch("https://brain.internal/")).text()).toBe("anonymous:faked");
  expect(faked.emitted.parts.map((p) => p.path)).toEqual(["worker.js", "source.js"]);
  expect(faked.emitted.meta.bindings).toEqual([]);
  const bare = await simulate(fx_plain);
  const refused = await bare.fetch("https://brain.internal/");
  expect(refused.status).toBe(500);
  const body = await refused.json();
  expect(body.error).toBe("InternalServerError");
  expect(body.message).toContain("no fake was given");
  return body.message;
};
const _cloudflareiac_test_hono_same_in_tab_and_emitted = async function _test_hono_same_in_tab_and_emitted(backend,simulate,fx_service,fx_six,Request,expect) {
  backend.store.secrets.set("T", "s3");
  const sim = await simulate(fx_service, { secrets: { T: "s3" } });
  const seen = [];
  for (const { req, status, body } of fx_six) {
    for (const [where, call] of [["tab", (r) => fx_service.fetch(new Request(...r))], ["emitted", (r) => sim.fetch(...r)]]) {
      const res = await call(req);
      const got = { where, url: req[0], status: res.status, body: await res.text() };
      expect(got).toEqual({ where, url: req[0], status, body });
      seen.push(got);
    }
  }
  expect(sim.inbox.map((e) => e.key)).toEqual(["m1"]);
  expect(backend.store.inbox.some((e) => e.key === "m1")).toBe(true);
  return seen.length + " answers matched";
};
const _cloudflareiac_test_getInfo_cannot_be_replaced = async function _test_getInfo_cannot_be_replaced(simulate,fx_service,expect) {
  const sim = await simulate(fx_service);
  const info = await (await sim.fetch("https://brain.internal/xrpc/com.lopecode.brain.getInfo")).json();
  expect(info.hash).toBe(sim.emitted.hash);
  expect(info.name).toBe("brain-x-fixture");
  const health = await (await sim.fetch("https://brain.internal/xrpc/_health")).json();
  expect(health).toEqual({ ok: true, name: "brain-x-fixture", hash: sim.emitted.hash });
  return info.hash.slice(0, 12);
};
const _cloudflareiac_test_only_bindings_and_the_guard_reach_a_recipe = async function _test_only_bindings_and_the_guard_reach_a_recipe(simulate,fx_service,expect) {
  const sim = await simulate(fx_service, { secrets: { T: "s3", BRAIN_KEY: "k1" } });
  const pub = "https://brain-x-fixture.example.workers.dev";
  expect((await sim.fetch(pub + "/math/5")).status).toBe(404);
  expect((await sim.fetch(pub + "/xrpc/_health")).status).toBe(404);
  expect((await sim.fetch(pub + "/xrpc/com.lopecode.brain.getInfo")).status).toBe(404);
  const keyed = { headers: { "x-brain-guard": "k1" } };
  expect((await sim.fetch(pub + "/xrpc/_health", keyed)).status).toBe(200);
  expect((await (await sim.fetch(pub + "/xrpc/com.lopecode.brain.getInfo", keyed)).json()).name).toBe("brain-x-fixture");
  expect((await sim.fetch(pub + "/math/5", keyed)).status).toBe(200);
  // A caller on the internet cannot name itself; the guard's key makes it the guard and nothing else.
  expect((await sim.fetch(pub + "/secrets/T", { headers: { "x-brain-guard": "k1", "x-brain-caller": "owner" } })).status).toBe(401);
  expect((await sim.fetch(pub + "/xrpc/_health", { headers: { "x-brain-guard": "wrong" } })).status).toBe(404);
  expect((await sim.fetch("https://brain.internal/math/5")).status).toBe(200);
  return "404 from the internet, 200 over a binding";
};
const _cloudflareiac_test_service_rows_states = function _test_service_rows_states(serviceRows,expect) {
  const e = (name, hash) => ({ name, hash, meta: { worker: "brain-x-" + name, role: "recipe", methods: [], paths: [], secrets: [] } });
  const emitted = [e("a", "h1"), e("b", "h2"), e("c", "h3"), e("d", "h4"), e("e", "h5"), { name: "f", error: 'cell "x" is a generator' }];
  const guardState = {
    workers: [
      { worker: "brain-x-a", hash: "h1", fails: 0 },
      { worker: "brain-x-b", hash: "old", fails: 0, lastError: "self-test failed before go-live", failedHash: "h2" },
      { worker: "brain-x-d", hash: "h4", fails: 0 },
      { worker: "brain-x-e", hash: "h5", fails: 2 }
    ],
    kernel: {},
    pending: [{ hash: "h3" }],
    approved: []
  };
  const rows = serviceRows(emitted, guardState, { "brain-x-a": "h1", "brain-x-d": "by-hand" });
  expect(rows.map((r) => r.state)).toEqual(["in sync", "changed", "not installed", "skewed", "failing", "cannot deploy"]);
  expect(rows[1].note).toBe("put back: self-test failed before go-live");
  expect(rows[2].note).toBe("waiting for approval");
  expect(rows[3].note).toBe("brain-x-d is running by-hand, which the guard did not deploy.");
  expect(serviceRows(emitted.slice(0, 1), null)[0].state).toBe("unknown");
  // What the core knows about the running hash: not yet tested, failed, or passed.
  const reg = { "brain-x-a": { hash: "h1", verified: null } };
  expect(serviceRows(emitted.slice(0, 1), guardState, {}, reg)[0]).toMatchObject({ verified: false, note: "unverified: its tests have not been run from this version" });
  reg["brain-x-a"].verified = { ok: false, failed: ["test_x"] };
  expect(serviceRows(emitted.slice(0, 1), guardState, {}, reg)[0].note).toBe("its tests failed: test_x");
  reg["brain-x-a"].verified = { ok: true };
  expect(serviceRows(emitted.slice(0, 1), guardState, {}, reg)[0]).toMatchObject({ verified: true, note: "" });
  // A module loaded from its Worker and not edited since is in sync whatever its source re-exports as.
  expect(serviceRows([{ ...emitted[1], asDeployed: "old" }], guardState)[0].state).toBe("in sync");
  // A Worker the guard runs that the notebook does not declare is listed, not hidden.
  const orphan = serviceRows(emitted.slice(0, 1), guardState).filter((r) => r.state === "no source");
  expect(orphan.map((r) => r.worker)).toEqual(["brain-x-b", "brain-x-d", "brain-x-e"]);
  expect(orphan[0]).toMatchObject({ hash: null, running: "old" });
  return rows.map((r) => r.state).join(", ");
};
const _cloudflareiac_test_hash_is_stable_and_per_service = async function _test_hash_is_stable_and_per_service(fx_service,expect,cloudflare,Response,fx_refusal) {
  const a = (await fx_service.emit()).hash, b = (await fx_service.emit()).hash;
  expect(a).toBe(b);
  expect(a).toMatch(/^[0-9a-f]{64}$/);
  const other = cloudflare.Worker("fixture", () => new Response("x"));
  expect(await fx_refusal(other)).toContain("is not the value of a cell");
  return a.slice(0, 12);
};
const _cloudflareiac_iac_tests = function _iac_tests(tests) {return (tests({ filter: (t) => t.name.includes("@tomlarkworthy/cloudflare-iac") }));};
const _cloudflareiac_test_settings_reads_rows_through_memory = async function _test_settings_reads_rows_through_memory(settings,expect,rows) {
  const key = "settings-test/" + Math.random().toString(36).slice(2);
  await settings.put(key, { n: 1 });
  expect(await settings.get(key)).toEqual({ n: 1 });
  // A write that does not go through settings is not seen until ttl has passed or the copy is dropped.
  await rows.put(key, { n: 2 });
  expect(await settings.get(key)).toEqual({ n: 1 });
  expect((await settings.list("settings-test/")).find((r) => r.key === key).value).toEqual({ n: 2 });
  const ttl = settings.ttl;
  settings.ttl = 0;
  expect(await settings.get(key)).toEqual({ n: 2 });
  settings.ttl = ttl;
  // A write through settings is seen at once, in get and in list.
  await settings.put(key, { n: 3 });
  expect([await settings.get(key), (await settings.list("settings-test/")).find((r) => r.key === key).value]).toEqual([{ n: 3 }, { n: 3 }]);
  await settings.delete(key);
  expect(await settings.get(key) ?? null).toBe(null);
  return "held, then dropped on write";
};
const _cloudflareiac_test_rules_are_cel_expressions = function _test_rules_are_cel_expressions(decide,callerOf,expect) {
  const callers = { owner: { caller: "owner", via: "session" }, token: { caller: "token:laptop" }, did: { caller: "did:plc:friend" }, echo: { caller: "worker:brain-x-echo" }, other: { caller: "worker:brain-x-other" }, guard: { caller: "guard" }, anonymous: { caller: "anonymous" } };
  const who = (rule, request = { method: "", path: "/", verb: "GET", params: {} }) =>
    Object.entries(callers).filter(([, w]) => decide(rule, { caller: callerOf(w), request }).allow).map(([name]) => name).join(" ");
  // The four short forms, as before CEL.
  expect(who({ who: "anyone" })).toBe("owner token did echo other guard anonymous");
  expect(who({ who: "workers" })).toBe("owner token did echo other guard");
  expect(who({ who: "worker:brain-x-echo" })).toBe("owner token did echo");
  expect(who({ who: "owner" })).toBe("owner token did");
  expect(who({})).toBe("owner token did");
  // An expression is the whole decision: the owner is let in only if it says so.
  expect(who({ who: "owner", allow: 'caller.did in ["did:plc:friend", "did:plc:other"]' })).toBe("did");
  expect(who({ allow: "caller.session" })).toBe("owner");
  expect(who({ allow: 'request.params.name.startsWith("pub/") || caller.trusted' }, { method: "x", path: "", verb: "GET", params: { name: "pub/a" } })).toBe("owner token did echo other guard anonymous");
  // Not true is a refusal: a missing field, a number, a rule that does not parse.
  const refused = (allow) => decide({ allow }, { caller: callerOf(callers.owner), request: { method: "", path: "", verb: "GET", params: {} } });
  expect(refused("request.params.name == 'a'")).toMatchObject({ allow: false, error: "No such key: name" });
  expect(refused("1 + 1")).toMatchObject({ allow: false, error: null });
  expect(refused("caller.kind ==").allow).toBe(false);
  expect(typeof refused("caller.kind ==").error).toBe("string");
  return "4 short forms, 3 expressions, 3 refusals";
};
const _cloudflareiac_fx_badrule = function _fx_badrule(cloudflare,Response) {return (cloudflare.Worker("badrule", () => new Response("x"), { methods: { "com.lopecode.brain.bad.go": { type: "procedure", allow: "caller.kind ==" } } }));};
const _cloudflareiac_fx_goodrule = function _fx_goodrule(cloudflare,Response) {return (cloudflare.Worker("goodrule", () => new Response("x"), {
  methods: { "com.lopecode.brain.good.go": { type: "query", allow: 'caller.kind == "did"' } },
  paths: [{ path: "/good/*", allow: "true" }]
}));};
const _cloudflareiac_test_a_rule_that_does_not_parse_is_not_emitted = async function _test_a_rule_that_does_not_parse_is_not_emitted(fx_badrule,expect,fx_goodrule) {
  let said = "";
  try { await fx_badrule.emit(); } catch (e) { said = e.message; }
  expect(said.startsWith("com.lopecode.brain.bad.go: the rule does not parse")).toBe(true);
  const { meta } = await fx_goodrule.emit();
  expect(meta.access).toEqual({ "com.lopecode.brain.good.go": { type: "query", who: "owner", allow: 'caller.kind == "did"' } });
  expect(meta.paths).toEqual([{ path: "/good/*", allow: "true" }]);
  return said;
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const fileAttachments = new Map(["hono.js","cel.js"].map((name) => {
    const module_name = "@tomlarkworthy/cloudflare-iac";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_cloudflareiac_anon_f7118db8d3", null, ["md"], _cloudflareiac_anon_f7118db8d3);
  $def("_cloudflareiac_anon_7666d59571", null, ["md"], _cloudflareiac_anon_7666d59571);
  $def("_cloudflareiac_declaredWorkers", "declaredWorkers", ["plugins"], _cloudflareiac_declaredWorkers);
  $def("_cloudflareiac_serviceRows", "serviceRows", [], _cloudflareiac_serviceRows);
  $def("_cloudflareiac_serviceList", "serviceList", ["htl","serviceRows","Inputs"], _cloudflareiac_serviceList);
  $def("_cloudflareiac_anon_468f6119e3", null, ["md"], _cloudflareiac_anon_468f6119e3);
  $def("_cloudflareiac_seedSource", "seedSource", [], _cloudflareiac_seedSource);
  $def("_cloudflareiac_anon_54244431db", null, ["md"], _cloudflareiac_anon_54244431db);
  $def("_cloudflareiac_fx_service", "fx_service", ["cloudflare","fx_app"], _cloudflareiac_fx_service);
  $def("_cloudflareiac_fx_emitted", "fx_emitted", ["fx_service"], _cloudflareiac_fx_emitted);
  $def("_cloudflareiac_anon_458af5fb4f", null, ["md"], _cloudflareiac_anon_458af5fb4f);
  $def("_cloudflareiac_platformTag", "platformTag", [], _cloudflareiac_platformTag);
  $def("_cloudflareiac_secretName", "secretName", [], _cloudflareiac_secretName);
  $def("_cloudflareiac_backend", "backend", [], _cloudflareiac_backend);
  $def("_cloudflareiac_secrets", "secrets", ["platformTag","secretName","backend"], _cloudflareiac_secrets);
  $def("_cloudflareiac_rows", "rows", ["platformTag","backend"], _cloudflareiac_rows);
  $def("_cloudflareiac_blobs", "blobs", ["platformTag","backend"], _cloudflareiac_blobs);
  $def("_cloudflareiac_settings", "settings", ["rows"], _cloudflareiac_settings);
  $def("_cloudflareiac_config", "config", ["platformTag","backend"], _cloudflareiac_config);
  $def("_cloudflareiac_core", "core", ["platformTag","backend"], _cloudflareiac_core);
  $def("_cloudflareiac_guard", "guard", ["platformTag","backend"], _cloudflareiac_guard);
  $def("_cloudflareiac_assets", "assets", ["platformTag","backend"], _cloudflareiac_assets);
  $def("_cloudflareiac_workers", "workers", ["platformTag","backend"], _cloudflareiac_workers);
  $def("_cloudflareiac_inbox", "inbox", ["platformTag","backend"], _cloudflareiac_inbox);
  $def("_cloudflareiac_xrpc", "xrpc", ["platformTag","backend"], _cloudflareiac_xrpc);
  $def("_cloudflareiac_libraries", "libraries", [], _cloudflareiac_libraries);
  $def("_cloudflareiac_library", "library", ["libraries"], _cloudflareiac_library);
  $def("_cloudflareiac_cloudflare", "cloudflare", ["platformTag","Request","emit","backend"], _cloudflareiac_cloudflare);
  $def("_cloudflareiac_workerRuntime", "workerRuntime", ["Response","URLSearchParams","Request","globalThis"], _cloudflareiac_workerRuntime);
  $def("_cloudflareiac_notebookOnly", "notebookOnly", [], _cloudflareiac_notebookOnly);
  $def("_cloudflareiac_sha256", "sha256", [], _cloudflareiac_sha256);
  $def("_cloudflareiac_partsHash", "partsHash", ["sha256"], _cloudflareiac_partsHash);
  $def("_cloudflareiac_emit", "emit", ["runtime","platformTag","libraries","notebookOnly","globalThis","acorn","acorn_walk","secretName","moduleSource","workerRuntime","checkedRule","partsHash"], _cloudflareiac_emit);
  $def("_cloudflareiac_moduleSource", "moduleSource", ["runtime","exportModuleJS"], _cloudflareiac_moduleSource);
  $def("_cloudflareiac_simulate", "simulate", ["Response","Request"], _cloudflareiac_simulate);
  $def("_cloudflareiac_anon_45a3f5c4f1", null, ["md"], _cloudflareiac_anon_45a3f5c4f1);
  $def("_cloudflareiac_fx_double", "fx_double", [], _cloudflareiac_fx_double);
  $def("_cloudflareiac_fx_base", "fx_base", [], _cloudflareiac_fx_base);
  $def("_cloudflareiac_hono", "hono", ["library","FileAttachment"], _cloudflareiac_hono);
  $def("_cloudflareiac_anon_c5db711582", null, ["md"], _cloudflareiac_anon_c5db711582);
  $def("_cloudflareiac_cel", "cel", ["library","FileAttachment"], _cloudflareiac_cel);
  $def("_cloudflareiac_checkedRule", "checkedRule", ["cel"], _cloudflareiac_checkedRule);
  $def("_cloudflareiac_ruleExpression", "ruleExpression", [], _cloudflareiac_ruleExpression);
  $def("_cloudflareiac_callerOf", "callerOf", [], _cloudflareiac_callerOf);
  $def("_cloudflareiac_decide", "decide", ["ruleExpression","cel"], _cloudflareiac_decide);
  $def("_cloudflareiac_fx_app", "fx_app", ["hono","inbox","secrets","fx_double","fixtureTriple","fx_base","rows"], _cloudflareiac_fx_app);
  $def("_cloudflareiac_fx_plain", "fx_plain", ["cloudflare","Response"], _cloudflareiac_fx_plain);
  $def("_cloudflareiac_fx_gen", "fx_gen", [], _cloudflareiac_fx_gen);
  $def("_cloudflareiac_fx_bad_gen", "fx_bad_gen", ["cloudflare","Response","fx_gen"], _cloudflareiac_fx_bad_gen);
  $def("_cloudflareiac_viewof_fx_view", "viewof fx_view", ["Inputs"], _cloudflareiac_viewof_fx_view);
  $def("_cloudflareiac_fx_view", "fx_view", ["Generators","viewof fx_view"], _cloudflareiac_fx_view);
  $def("_cloudflareiac_fx_bad_view", "fx_bad_view", ["cloudflare","Response","fx_view"], _cloudflareiac_fx_bad_view);
  $def("_cloudflareiac_fx_dom", "fx_dom", ["html"], _cloudflareiac_fx_dom);
  $def("_cloudflareiac_fx_bad_dom", "fx_bad_dom", ["cloudflare","Response","fx_dom"], _cloudflareiac_fx_bad_dom);
  $def("_cloudflareiac_fx_bad_secret", "fx_bad_secret", ["cloudflare","Response","secrets"], _cloudflareiac_fx_bad_secret);
  $def("_cloudflareiac_fx_six", "fx_six", [], _cloudflareiac_fx_six);
  $def("_cloudflareiac_fx_refusal", "fx_refusal", [], _cloudflareiac_fx_refusal);
  $def("_cloudflareiac_test_chase", "test_chase", ["fx_service","expect","simulate"], _cloudflareiac_test_chase);
  $def("_cloudflareiac_test_bindings_follow_platform_cells", "test_bindings_follow_platform_cells", ["fx_service","expect","simulate"], _cloudflareiac_test_bindings_follow_platform_cells);
  $def("_cloudflareiac_test_refuses_generator", "test_refuses_generator", ["fx_refusal","fx_bad_gen","expect"], _cloudflareiac_test_refuses_generator);
  $def("_cloudflareiac_test_refuses_viewof", "test_refuses_viewof", ["fx_refusal","fx_bad_view","expect"], _cloudflareiac_test_refuses_viewof);
  $def("_cloudflareiac_test_refuses_dom_builtin", "test_refuses_dom_builtin", ["fx_refusal","fx_bad_dom","expect"], _cloudflareiac_test_refuses_dom_builtin);
  $def("_cloudflareiac_test_refuses_computed_secret", "test_refuses_computed_secret", ["fx_refusal","fx_bad_secret","expect"], _cloudflareiac_test_refuses_computed_secret);
  $def("_cloudflareiac_test_simulate", "test_simulate", ["simulate","fx_service","Response","expect"], _cloudflareiac_test_simulate);
  $def("_cloudflareiac_test_a_worker_serves_its_manifest_and_its_source", "test_a_worker_serves_its_manifest_and_its_source", ["simulate","fx_service","expect","partsHash"], _cloudflareiac_test_a_worker_serves_its_manifest_and_its_source);
  $def("_cloudflareiac_test_plain_function_caller_and_error_shape", "test_plain_function_caller_and_error_shape", ["simulate","fx_plain","Response","expect"], _cloudflareiac_test_plain_function_caller_and_error_shape);
  $def("_cloudflareiac_test_hono_same_in_tab_and_emitted", "test_hono_same_in_tab_and_emitted", ["backend","simulate","fx_service","fx_six","Request","expect"], _cloudflareiac_test_hono_same_in_tab_and_emitted);
  $def("_cloudflareiac_test_getInfo_cannot_be_replaced", "test_getInfo_cannot_be_replaced", ["simulate","fx_service","expect"], _cloudflareiac_test_getInfo_cannot_be_replaced);
  $def("_cloudflareiac_test_only_bindings_and_the_guard_reach_a_recipe", "test_only_bindings_and_the_guard_reach_a_recipe", ["simulate","fx_service","expect"], _cloudflareiac_test_only_bindings_and_the_guard_reach_a_recipe);
  $def("_cloudflareiac_test_service_rows_states", "test_service_rows_states", ["serviceRows","expect"], _cloudflareiac_test_service_rows_states);
  $def("_cloudflareiac_test_hash_is_stable_and_per_service", "test_hash_is_stable_and_per_service", ["fx_service","expect","cloudflare","Response","fx_refusal"], _cloudflareiac_test_hash_is_stable_and_per_service);
  $def("_cloudflareiac_iac_tests", "iac_tests", ["tests"], _cloudflareiac_iac_tests);
  $def("_cloudflareiac_test_settings_reads_rows_through_memory", "test_settings_reads_rows_through_memory", ["settings","expect","rows"], _cloudflareiac_test_settings_reads_rows_through_memory);
  $def("_cloudflareiac_test_rules_are_cel_expressions", "test_rules_are_cel_expressions", ["decide","callerOf","expect"], _cloudflareiac_test_rules_are_cel_expressions);
  $def("_cloudflareiac_fx_badrule", "fx_badrule", ["cloudflare","Response"], _cloudflareiac_fx_badrule);
  $def("_cloudflareiac_fx_goodrule", "fx_goodrule", ["cloudflare","Response"], _cloudflareiac_fx_goodrule);
  $def("_cloudflareiac_test_a_rule_that_does_not_parse_is_not_emitted", "test_a_rule_that_does_not_parse_is_not_emitted", ["fx_badrule","expect","fx_goodrule"], _cloudflareiac_test_a_rule_that_does_not_parse_is_not_emitted);
  main.define("module @tomlarkworthy/runtime-sdk", [], async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk","@variable"], (_, v) => v.import("runtime", _));
  main.define("module @tomlarkworthy/exporter-3", [], async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));
  main.define("exportModuleJS", ["module @tomlarkworthy/exporter-3","@variable"], (_, v) => v.import("exportModuleJS", _));
  main.define("module @tomlarkworthy/plugin-registry", [], async () => runtime.module((await import("/@tomlarkworthy/plugin-registry.js?v=4")).default));
  main.define("plugins", ["module @tomlarkworthy/plugin-registry","@variable"], (_, v) => v.import("plugins", _));
  main.define("module @tomlarkworthy/acorn-8-11-3", [], async () => runtime.module((await import("/@tomlarkworthy/acorn-8-11-3.js?v=4")).default));
  main.define("acorn", ["module @tomlarkworthy/acorn-8-11-3","@variable"], (_, v) => v.import("acorn", _));
  main.define("acorn_walk", ["module @tomlarkworthy/acorn-8-11-3","@variable"], (_, v) => v.import("acorn_walk", _));
  main.define("module @tomlarkworthy/jest-expect-standalone", [], async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone","@variable"], (_, v) => v.import("expect", _));
  main.define("module @tomlarkworthy/tests", [], async () => runtime.module((await import("/@tomlarkworthy/tests.js?v=4")).default));
  main.define("tests", ["module @tomlarkworthy/tests","@variable"], (_, v) => v.import("tests", _));
  main.define("module @tomlarkworthy/cloudflare-iac-fixtures", [], async () => runtime.module((await import("/@tomlarkworthy/cloudflare-iac-fixtures.js?v=4")).default));
  main.define("fixtureTriple", ["module @tomlarkworthy/cloudflare-iac-fixtures","@variable"], (_, v) => v.import("fixtureTriple", _));
  return main;
}
`, "/@tomlarkworthy/exporter-3.js?v=4": 'export default function define(runtime, observer) { const main = runtime.module(); main.variable(observer("exportModuleJS")).define("exportModuleJS", [], () => async (name) => ({ source: __hostCall("source", name) })); return main; }', "/@tomlarkworthy/acorn-8-11-3.js?v=4": `import * as acorn from "acorn"; import * as acorn_walk from "acorn-walk";
export default function define(runtime, observer) { const main = runtime.module(); main.variable(observer("acorn")).define("acorn", [], () => acorn); main.variable(observer("acorn_walk")).define("acorn_walk", [], () => acorn_walk); return main; }`, acorn: `// This file was generated. Do not modify manually!
var astralIdentifierCodes = [509, 0, 227, 0, 150, 4, 294, 9, 1368, 2, 2, 1, 6, 3, 41, 2, 5, 0, 166, 1, 574, 3, 9, 9, 7, 9, 32, 4, 318, 1, 78, 5, 71, 10, 50, 3, 123, 2, 54, 14, 32, 10, 3, 1, 11, 3, 46, 10, 8, 0, 46, 9, 7, 2, 37, 13, 2, 9, 6, 1, 45, 0, 13, 2, 49, 13, 9, 3, 2, 11, 83, 11, 7, 0, 3, 0, 158, 11, 6, 9, 7, 3, 56, 1, 2, 6, 3, 1, 3, 2, 10, 0, 11, 1, 3, 6, 4, 4, 68, 8, 2, 0, 3, 0, 2, 3, 2, 4, 2, 0, 15, 1, 83, 17, 10, 9, 5, 0, 82, 19, 13, 9, 214, 6, 3, 8, 28, 1, 83, 16, 16, 9, 82, 12, 9, 9, 7, 19, 58, 14, 5, 9, 243, 14, 166, 9, 71, 5, 2, 1, 3, 3, 2, 0, 2, 1, 13, 9, 120, 6, 3, 6, 4, 0, 29, 9, 41, 6, 2, 3, 9, 0, 10, 10, 47, 15, 199, 7, 137, 9, 54, 7, 2, 7, 17, 9, 57, 21, 2, 13, 123, 5, 4, 0, 2, 1, 2, 6, 2, 0, 9, 9, 49, 4, 2, 1, 2, 4, 9, 9, 55, 9, 266, 3, 10, 1, 2, 0, 49, 6, 4, 4, 14, 10, 5350, 0, 7, 14, 11465, 27, 2343, 9, 87, 9, 39, 4, 60, 6, 26, 9, 535, 9, 470, 0, 2, 54, 8, 3, 82, 0, 12, 1, 19628, 1, 4178, 9, 519, 45, 3, 22, 543, 4, 4, 5, 9, 7, 3, 6, 31, 3, 149, 2, 1418, 49, 513, 54, 5, 49, 9, 0, 15, 0, 23, 4, 2, 14, 1361, 6, 2, 16, 3, 6, 2, 1, 2, 4, 101, 0, 161, 6, 10, 9, 357, 0, 62, 13, 499, 13, 245, 1, 2, 9, 233, 0, 3, 0, 8, 1, 6, 0, 475, 6, 110, 6, 6, 9, 4759, 9, 787719, 239];

// This file was generated. Do not modify manually!
var astralIdentifierStartCodes = [0, 11, 2, 25, 2, 18, 2, 1, 2, 14, 3, 13, 35, 122, 70, 52, 268, 28, 4, 48, 48, 31, 14, 29, 6, 37, 11, 29, 3, 35, 5, 7, 2, 4, 43, 157, 19, 35, 5, 35, 5, 39, 9, 51, 13, 10, 2, 14, 2, 6, 2, 1, 2, 10, 2, 14, 2, 6, 2, 1, 4, 51, 13, 310, 10, 21, 11, 7, 25, 5, 2, 41, 2, 8, 70, 5, 3, 0, 2, 43, 2, 1, 4, 0, 3, 22, 11, 22, 10, 30, 66, 18, 2, 1, 11, 21, 11, 25, 7, 25, 39, 55, 7, 1, 65, 0, 16, 3, 2, 2, 2, 28, 43, 28, 4, 28, 36, 7, 2, 27, 28, 53, 11, 21, 11, 18, 14, 17, 111, 72, 56, 50, 14, 50, 14, 35, 39, 27, 10, 22, 251, 41, 7, 1, 17, 5, 57, 28, 11, 0, 9, 21, 43, 17, 47, 20, 28, 22, 13, 52, 58, 1, 3, 0, 14, 44, 33, 24, 27, 35, 30, 0, 3, 0, 9, 34, 4, 0, 13, 47, 15, 3, 22, 0, 2, 0, 36, 17, 2, 24, 20, 1, 64, 6, 2, 0, 2, 3, 2, 14, 2, 9, 8, 46, 39, 7, 3, 1, 3, 21, 2, 6, 2, 1, 2, 4, 4, 0, 19, 0, 13, 4, 31, 9, 2, 0, 3, 0, 2, 37, 2, 0, 26, 0, 2, 0, 45, 52, 19, 3, 21, 2, 31, 47, 21, 1, 2, 0, 185, 46, 42, 3, 37, 47, 21, 0, 60, 42, 14, 0, 72, 26, 38, 6, 186, 43, 117, 63, 32, 7, 3, 0, 3, 7, 2, 1, 2, 23, 16, 0, 2, 0, 95, 7, 3, 38, 17, 0, 2, 0, 29, 0, 11, 39, 8, 0, 22, 0, 12, 45, 20, 0, 19, 72, 200, 32, 32, 8, 2, 36, 18, 0, 50, 29, 113, 6, 2, 1, 2, 37, 22, 0, 26, 5, 2, 1, 2, 31, 15, 0, 24, 43, 261, 18, 16, 0, 2, 12, 2, 33, 125, 0, 80, 921, 103, 110, 18, 195, 2637, 96, 16, 1071, 18, 5, 26, 3994, 6, 582, 6842, 29, 1763, 568, 8, 30, 18, 78, 18, 29, 19, 47, 17, 3, 32, 20, 6, 18, 433, 44, 212, 63, 33, 24, 3, 24, 45, 74, 6, 0, 67, 12, 65, 1, 2, 0, 15, 4, 10, 7381, 42, 31, 98, 114, 8702, 3, 2, 6, 2, 1, 2, 290, 16, 0, 30, 2, 3, 0, 15, 3, 9, 395, 2309, 106, 6, 12, 4, 8, 8, 9, 5991, 84, 2, 70, 2, 1, 3, 0, 3, 1, 3, 3, 2, 11, 2, 0, 2, 6, 2, 64, 2, 3, 3, 7, 2, 6, 2, 27, 2, 3, 2, 4, 2, 0, 4, 6, 2, 339, 3, 24, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 7, 1845, 30, 7, 5, 262, 61, 147, 44, 11, 6, 17, 0, 322, 29, 19, 43, 485, 27, 229, 29, 3, 0, 208, 30, 2, 2, 2, 1, 2, 6, 3, 4, 10, 1, 225, 6, 2, 3, 2, 1, 2, 14, 2, 196, 60, 67, 8, 0, 1205, 3, 2, 26, 2, 1, 2, 0, 3, 0, 2, 9, 2, 3, 2, 0, 2, 0, 7, 0, 5, 0, 2, 0, 2, 0, 2, 2, 2, 1, 2, 0, 3, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 1, 2, 0, 3, 3, 2, 6, 2, 3, 2, 3, 2, 0, 2, 9, 2, 16, 6, 2, 2, 4, 2, 16, 4421, 42719, 33, 4381, 3, 5773, 3, 7472, 16, 621, 2467, 541, 1507, 4938, 6, 8489];

// This file was generated. Do not modify manually!
var nonASCIIidentifierChars = "\\u200c\\u200d\\xb7\\u0300-\\u036f\\u0387\\u0483-\\u0487\\u0591-\\u05bd\\u05bf\\u05c1\\u05c2\\u05c4\\u05c5\\u05c7\\u0610-\\u061a\\u064b-\\u0669\\u0670\\u06d6-\\u06dc\\u06df-\\u06e4\\u06e7\\u06e8\\u06ea-\\u06ed\\u06f0-\\u06f9\\u0711\\u0730-\\u074a\\u07a6-\\u07b0\\u07c0-\\u07c9\\u07eb-\\u07f3\\u07fd\\u0816-\\u0819\\u081b-\\u0823\\u0825-\\u0827\\u0829-\\u082d\\u0859-\\u085b\\u0897-\\u089f\\u08ca-\\u08e1\\u08e3-\\u0903\\u093a-\\u093c\\u093e-\\u094f\\u0951-\\u0957\\u0962\\u0963\\u0966-\\u096f\\u0981-\\u0983\\u09bc\\u09be-\\u09c4\\u09c7\\u09c8\\u09cb-\\u09cd\\u09d7\\u09e2\\u09e3\\u09e6-\\u09ef\\u09fe\\u0a01-\\u0a03\\u0a3c\\u0a3e-\\u0a42\\u0a47\\u0a48\\u0a4b-\\u0a4d\\u0a51\\u0a66-\\u0a71\\u0a75\\u0a81-\\u0a83\\u0abc\\u0abe-\\u0ac5\\u0ac7-\\u0ac9\\u0acb-\\u0acd\\u0ae2\\u0ae3\\u0ae6-\\u0aef\\u0afa-\\u0aff\\u0b01-\\u0b03\\u0b3c\\u0b3e-\\u0b44\\u0b47\\u0b48\\u0b4b-\\u0b4d\\u0b55-\\u0b57\\u0b62\\u0b63\\u0b66-\\u0b6f\\u0b82\\u0bbe-\\u0bc2\\u0bc6-\\u0bc8\\u0bca-\\u0bcd\\u0bd7\\u0be6-\\u0bef\\u0c00-\\u0c04\\u0c3c\\u0c3e-\\u0c44\\u0c46-\\u0c48\\u0c4a-\\u0c4d\\u0c55\\u0c56\\u0c62\\u0c63\\u0c66-\\u0c6f\\u0c81-\\u0c83\\u0cbc\\u0cbe-\\u0cc4\\u0cc6-\\u0cc8\\u0cca-\\u0ccd\\u0cd5\\u0cd6\\u0ce2\\u0ce3\\u0ce6-\\u0cef\\u0cf3\\u0d00-\\u0d03\\u0d3b\\u0d3c\\u0d3e-\\u0d44\\u0d46-\\u0d48\\u0d4a-\\u0d4d\\u0d57\\u0d62\\u0d63\\u0d66-\\u0d6f\\u0d81-\\u0d83\\u0dca\\u0dcf-\\u0dd4\\u0dd6\\u0dd8-\\u0ddf\\u0de6-\\u0def\\u0df2\\u0df3\\u0e31\\u0e34-\\u0e3a\\u0e47-\\u0e4e\\u0e50-\\u0e59\\u0eb1\\u0eb4-\\u0ebc\\u0ec8-\\u0ece\\u0ed0-\\u0ed9\\u0f18\\u0f19\\u0f20-\\u0f29\\u0f35\\u0f37\\u0f39\\u0f3e\\u0f3f\\u0f71-\\u0f84\\u0f86\\u0f87\\u0f8d-\\u0f97\\u0f99-\\u0fbc\\u0fc6\\u102b-\\u103e\\u1040-\\u1049\\u1056-\\u1059\\u105e-\\u1060\\u1062-\\u1064\\u1067-\\u106d\\u1071-\\u1074\\u1082-\\u108d\\u108f-\\u109d\\u135d-\\u135f\\u1369-\\u1371\\u1712-\\u1715\\u1732-\\u1734\\u1752\\u1753\\u1772\\u1773\\u17b4-\\u17d3\\u17dd\\u17e0-\\u17e9\\u180b-\\u180d\\u180f-\\u1819\\u18a9\\u1920-\\u192b\\u1930-\\u193b\\u1946-\\u194f\\u19d0-\\u19da\\u1a17-\\u1a1b\\u1a55-\\u1a5e\\u1a60-\\u1a7c\\u1a7f-\\u1a89\\u1a90-\\u1a99\\u1ab0-\\u1abd\\u1abf-\\u1add\\u1ae0-\\u1aeb\\u1b00-\\u1b04\\u1b34-\\u1b44\\u1b50-\\u1b59\\u1b6b-\\u1b73\\u1b80-\\u1b82\\u1ba1-\\u1bad\\u1bb0-\\u1bb9\\u1be6-\\u1bf3\\u1c24-\\u1c37\\u1c40-\\u1c49\\u1c50-\\u1c59\\u1cd0-\\u1cd2\\u1cd4-\\u1ce8\\u1ced\\u1cf4\\u1cf7-\\u1cf9\\u1dc0-\\u1dff\\u200c\\u200d\\u203f\\u2040\\u2054\\u20d0-\\u20dc\\u20e1\\u20e5-\\u20f0\\u2cef-\\u2cf1\\u2d7f\\u2de0-\\u2dff\\u302a-\\u302f\\u3099\\u309a\\u30fb\\ua620-\\ua629\\ua66f\\ua674-\\ua67d\\ua69e\\ua69f\\ua6f0\\ua6f1\\ua802\\ua806\\ua80b\\ua823-\\ua827\\ua82c\\ua880\\ua881\\ua8b4-\\ua8c5\\ua8d0-\\ua8d9\\ua8e0-\\ua8f1\\ua8ff-\\ua909\\ua926-\\ua92d\\ua947-\\ua953\\ua980-\\ua983\\ua9b3-\\ua9c0\\ua9d0-\\ua9d9\\ua9e5\\ua9f0-\\ua9f9\\uaa29-\\uaa36\\uaa43\\uaa4c\\uaa4d\\uaa50-\\uaa59\\uaa7b-\\uaa7d\\uaab0\\uaab2-\\uaab4\\uaab7\\uaab8\\uaabe\\uaabf\\uaac1\\uaaeb-\\uaaef\\uaaf5\\uaaf6\\uabe3-\\uabea\\uabec\\uabed\\uabf0-\\uabf9\\ufb1e\\ufe00-\\ufe0f\\ufe20-\\ufe2f\\ufe33\\ufe34\\ufe4d-\\ufe4f\\uff10-\\uff19\\uff3f\\uff65";

// This file was generated. Do not modify manually!
var nonASCIIidentifierStartChars = "\\xaa\\xb5\\xba\\xc0-\\xd6\\xd8-\\xf6\\xf8-\\u02c1\\u02c6-\\u02d1\\u02e0-\\u02e4\\u02ec\\u02ee\\u0370-\\u0374\\u0376\\u0377\\u037a-\\u037d\\u037f\\u0386\\u0388-\\u038a\\u038c\\u038e-\\u03a1\\u03a3-\\u03f5\\u03f7-\\u0481\\u048a-\\u052f\\u0531-\\u0556\\u0559\\u0560-\\u0588\\u05d0-\\u05ea\\u05ef-\\u05f2\\u0620-\\u064a\\u066e\\u066f\\u0671-\\u06d3\\u06d5\\u06e5\\u06e6\\u06ee\\u06ef\\u06fa-\\u06fc\\u06ff\\u0710\\u0712-\\u072f\\u074d-\\u07a5\\u07b1\\u07ca-\\u07ea\\u07f4\\u07f5\\u07fa\\u0800-\\u0815\\u081a\\u0824\\u0828\\u0840-\\u0858\\u0860-\\u086a\\u0870-\\u0887\\u0889-\\u088f\\u08a0-\\u08c9\\u0904-\\u0939\\u093d\\u0950\\u0958-\\u0961\\u0971-\\u0980\\u0985-\\u098c\\u098f\\u0990\\u0993-\\u09a8\\u09aa-\\u09b0\\u09b2\\u09b6-\\u09b9\\u09bd\\u09ce\\u09dc\\u09dd\\u09df-\\u09e1\\u09f0\\u09f1\\u09fc\\u0a05-\\u0a0a\\u0a0f\\u0a10\\u0a13-\\u0a28\\u0a2a-\\u0a30\\u0a32\\u0a33\\u0a35\\u0a36\\u0a38\\u0a39\\u0a59-\\u0a5c\\u0a5e\\u0a72-\\u0a74\\u0a85-\\u0a8d\\u0a8f-\\u0a91\\u0a93-\\u0aa8\\u0aaa-\\u0ab0\\u0ab2\\u0ab3\\u0ab5-\\u0ab9\\u0abd\\u0ad0\\u0ae0\\u0ae1\\u0af9\\u0b05-\\u0b0c\\u0b0f\\u0b10\\u0b13-\\u0b28\\u0b2a-\\u0b30\\u0b32\\u0b33\\u0b35-\\u0b39\\u0b3d\\u0b5c\\u0b5d\\u0b5f-\\u0b61\\u0b71\\u0b83\\u0b85-\\u0b8a\\u0b8e-\\u0b90\\u0b92-\\u0b95\\u0b99\\u0b9a\\u0b9c\\u0b9e\\u0b9f\\u0ba3\\u0ba4\\u0ba8-\\u0baa\\u0bae-\\u0bb9\\u0bd0\\u0c05-\\u0c0c\\u0c0e-\\u0c10\\u0c12-\\u0c28\\u0c2a-\\u0c39\\u0c3d\\u0c58-\\u0c5a\\u0c5c\\u0c5d\\u0c60\\u0c61\\u0c80\\u0c85-\\u0c8c\\u0c8e-\\u0c90\\u0c92-\\u0ca8\\u0caa-\\u0cb3\\u0cb5-\\u0cb9\\u0cbd\\u0cdc-\\u0cde\\u0ce0\\u0ce1\\u0cf1\\u0cf2\\u0d04-\\u0d0c\\u0d0e-\\u0d10\\u0d12-\\u0d3a\\u0d3d\\u0d4e\\u0d54-\\u0d56\\u0d5f-\\u0d61\\u0d7a-\\u0d7f\\u0d85-\\u0d96\\u0d9a-\\u0db1\\u0db3-\\u0dbb\\u0dbd\\u0dc0-\\u0dc6\\u0e01-\\u0e30\\u0e32\\u0e33\\u0e40-\\u0e46\\u0e81\\u0e82\\u0e84\\u0e86-\\u0e8a\\u0e8c-\\u0ea3\\u0ea5\\u0ea7-\\u0eb0\\u0eb2\\u0eb3\\u0ebd\\u0ec0-\\u0ec4\\u0ec6\\u0edc-\\u0edf\\u0f00\\u0f40-\\u0f47\\u0f49-\\u0f6c\\u0f88-\\u0f8c\\u1000-\\u102a\\u103f\\u1050-\\u1055\\u105a-\\u105d\\u1061\\u1065\\u1066\\u106e-\\u1070\\u1075-\\u1081\\u108e\\u10a0-\\u10c5\\u10c7\\u10cd\\u10d0-\\u10fa\\u10fc-\\u1248\\u124a-\\u124d\\u1250-\\u1256\\u1258\\u125a-\\u125d\\u1260-\\u1288\\u128a-\\u128d\\u1290-\\u12b0\\u12b2-\\u12b5\\u12b8-\\u12be\\u12c0\\u12c2-\\u12c5\\u12c8-\\u12d6\\u12d8-\\u1310\\u1312-\\u1315\\u1318-\\u135a\\u1380-\\u138f\\u13a0-\\u13f5\\u13f8-\\u13fd\\u1401-\\u166c\\u166f-\\u167f\\u1681-\\u169a\\u16a0-\\u16ea\\u16ee-\\u16f8\\u1700-\\u1711\\u171f-\\u1731\\u1740-\\u1751\\u1760-\\u176c\\u176e-\\u1770\\u1780-\\u17b3\\u17d7\\u17dc\\u1820-\\u1878\\u1880-\\u18a8\\u18aa\\u18b0-\\u18f5\\u1900-\\u191e\\u1950-\\u196d\\u1970-\\u1974\\u1980-\\u19ab\\u19b0-\\u19c9\\u1a00-\\u1a16\\u1a20-\\u1a54\\u1aa7\\u1b05-\\u1b33\\u1b45-\\u1b4c\\u1b83-\\u1ba0\\u1bae\\u1baf\\u1bba-\\u1be5\\u1c00-\\u1c23\\u1c4d-\\u1c4f\\u1c5a-\\u1c7d\\u1c80-\\u1c8a\\u1c90-\\u1cba\\u1cbd-\\u1cbf\\u1ce9-\\u1cec\\u1cee-\\u1cf3\\u1cf5\\u1cf6\\u1cfa\\u1d00-\\u1dbf\\u1e00-\\u1f15\\u1f18-\\u1f1d\\u1f20-\\u1f45\\u1f48-\\u1f4d\\u1f50-\\u1f57\\u1f59\\u1f5b\\u1f5d\\u1f5f-\\u1f7d\\u1f80-\\u1fb4\\u1fb6-\\u1fbc\\u1fbe\\u1fc2-\\u1fc4\\u1fc6-\\u1fcc\\u1fd0-\\u1fd3\\u1fd6-\\u1fdb\\u1fe0-\\u1fec\\u1ff2-\\u1ff4\\u1ff6-\\u1ffc\\u2071\\u207f\\u2090-\\u209c\\u2102\\u2107\\u210a-\\u2113\\u2115\\u2118-\\u211d\\u2124\\u2126\\u2128\\u212a-\\u2139\\u213c-\\u213f\\u2145-\\u2149\\u214e\\u2160-\\u2188\\u2c00-\\u2ce4\\u2ceb-\\u2cee\\u2cf2\\u2cf3\\u2d00-\\u2d25\\u2d27\\u2d2d\\u2d30-\\u2d67\\u2d6f\\u2d80-\\u2d96\\u2da0-\\u2da6\\u2da8-\\u2dae\\u2db0-\\u2db6\\u2db8-\\u2dbe\\u2dc0-\\u2dc6\\u2dc8-\\u2dce\\u2dd0-\\u2dd6\\u2dd8-\\u2dde\\u3005-\\u3007\\u3021-\\u3029\\u3031-\\u3035\\u3038-\\u303c\\u3041-\\u3096\\u309b-\\u309f\\u30a1-\\u30fa\\u30fc-\\u30ff\\u3105-\\u312f\\u3131-\\u318e\\u31a0-\\u31bf\\u31f0-\\u31ff\\u3400-\\u4dbf\\u4e00-\\ua48c\\ua4d0-\\ua4fd\\ua500-\\ua60c\\ua610-\\ua61f\\ua62a\\ua62b\\ua640-\\ua66e\\ua67f-\\ua69d\\ua6a0-\\ua6ef\\ua717-\\ua71f\\ua722-\\ua788\\ua78b-\\ua7dc\\ua7f1-\\ua801\\ua803-\\ua805\\ua807-\\ua80a\\ua80c-\\ua822\\ua840-\\ua873\\ua882-\\ua8b3\\ua8f2-\\ua8f7\\ua8fb\\ua8fd\\ua8fe\\ua90a-\\ua925\\ua930-\\ua946\\ua960-\\ua97c\\ua984-\\ua9b2\\ua9cf\\ua9e0-\\ua9e4\\ua9e6-\\ua9ef\\ua9fa-\\ua9fe\\uaa00-\\uaa28\\uaa40-\\uaa42\\uaa44-\\uaa4b\\uaa60-\\uaa76\\uaa7a\\uaa7e-\\uaaaf\\uaab1\\uaab5\\uaab6\\uaab9-\\uaabd\\uaac0\\uaac2\\uaadb-\\uaadd\\uaae0-\\uaaea\\uaaf2-\\uaaf4\\uab01-\\uab06\\uab09-\\uab0e\\uab11-\\uab16\\uab20-\\uab26\\uab28-\\uab2e\\uab30-\\uab5a\\uab5c-\\uab69\\uab70-\\uabe2\\uac00-\\ud7a3\\ud7b0-\\ud7c6\\ud7cb-\\ud7fb\\uf900-\\ufa6d\\ufa70-\\ufad9\\ufb00-\\ufb06\\ufb13-\\ufb17\\ufb1d\\ufb1f-\\ufb28\\ufb2a-\\ufb36\\ufb38-\\ufb3c\\ufb3e\\ufb40\\ufb41\\ufb43\\ufb44\\ufb46-\\ufbb1\\ufbd3-\\ufd3d\\ufd50-\\ufd8f\\ufd92-\\ufdc7\\ufdf0-\\ufdfb\\ufe70-\\ufe74\\ufe76-\\ufefc\\uff21-\\uff3a\\uff41-\\uff5a\\uff66-\\uffbe\\uffc2-\\uffc7\\uffca-\\uffcf\\uffd2-\\uffd7\\uffda-\\uffdc";

// These are a run-length and offset encoded representation of the
// >0xffff code points that are a valid part of identifiers. The
// offset starts at 0x10000, and each pair of numbers represents an
// offset to the next range, and then a size of the range.

// Reserved word lists for various dialects of the language

var reservedWords = {
  3: "abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile",
  5: "class enum extends super const export import",
  6: "enum",
  strict: "implements interface let package private protected public static yield",
  strictBind: "eval arguments"
};

// And the keywords

var ecma5AndLessKeywords = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this";

var keywords$1 = {
  5: ecma5AndLessKeywords,
  "5module": ecma5AndLessKeywords + " export import",
  6: ecma5AndLessKeywords + " const class extends export import super"
};

var keywordRelationalOperator = /^in(stanceof)?$/;

// ## Character categories

var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

// This has a complexity linear to the value of the code. The
// assumption is that looking up astral identifier characters is
// rare.
function isInAstralSet(code, set) {
  var pos = 0x10000;
  for (var i = 0; i < set.length; i += 2) {
    pos += set[i];
    if (pos > code) { return false }
    pos += set[i + 1];
    if (pos >= code) { return true }
  }
  return false
}

// Test whether a given character code starts an identifier.

function isIdentifierStart(code, astral) {
  if (code < 65) { return code === 36 }
  if (code < 91) { return true }
  if (code < 97) { return code === 95 }
  if (code < 123) { return true }
  if (code <= 0xffff) { return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code)) }
  if (astral === false) { return false }
  return isInAstralSet(code, astralIdentifierStartCodes)
}

// Test whether a given character is part of an identifier.

function isIdentifierChar(code, astral) {
  if (code < 48) { return code === 36 }
  if (code < 58) { return true }
  if (code < 65) { return false }
  if (code < 91) { return true }
  if (code < 97) { return code === 95 }
  if (code < 123) { return true }
  if (code <= 0xffff) { return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code)) }
  if (astral === false) { return false }
  return isInAstralSet(code, astralIdentifierStartCodes) || isInAstralSet(code, astralIdentifierCodes)
}

// ## Token types

// The assignment of fine-grained, information-carrying type objects
// allows the tokenizer to store the information it has about a
// token in a way that is very cheap for the parser to look up.

// All token type variables start with an underscore, to make them
// easy to recognize.

// The \`beforeExpr\` property is used to disambiguate between regular
// expressions and divisions. It is set on all token types that can
// be followed by an expression (thus, a slash after them would be a
// regular expression).
//
// The \`startsExpr\` property is used to check if the token ends a
// \`yield\` expression. It is set on all token types that either can
// directly start an expression (like a quotation mark) or can
// continue an expression (like the body of a string).
//
// \`isLoop\` marks a keyword as starting a loop, which is important
// to know when parsing a label, in order to allow or disallow
// continue jumps to that label.

var TokenType = function TokenType(label, conf) {
  if ( conf === void 0 ) conf = {};

  this.label = label;
  this.keyword = conf.keyword;
  this.beforeExpr = !!conf.beforeExpr;
  this.startsExpr = !!conf.startsExpr;
  this.isLoop = !!conf.isLoop;
  this.isAssign = !!conf.isAssign;
  this.prefix = !!conf.prefix;
  this.postfix = !!conf.postfix;
  this.binop = conf.binop || null;
  this.updateContext = null;
};

function binop(name, prec) {
  return new TokenType(name, {beforeExpr: true, binop: prec})
}
var beforeExpr = {beforeExpr: true}, startsExpr = {startsExpr: true};

// Map keyword names to token types.

var keywords = {};

// Succinct definitions of keyword token types
function kw(name, options) {
  if ( options === void 0 ) options = {};

  options.keyword = name;
  return keywords[name] = new TokenType(name, options)
}

var types$1 = {
  num: new TokenType("num", startsExpr),
  regexp: new TokenType("regexp", startsExpr),
  string: new TokenType("string", startsExpr),
  name: new TokenType("name", startsExpr),
  privateId: new TokenType("privateId", startsExpr),
  eof: new TokenType("eof"),

  // Punctuation token types.
  bracketL: new TokenType("[", {beforeExpr: true, startsExpr: true}),
  bracketR: new TokenType("]"),
  braceL: new TokenType("{", {beforeExpr: true, startsExpr: true}),
  braceR: new TokenType("}"),
  parenL: new TokenType("(", {beforeExpr: true, startsExpr: true}),
  parenR: new TokenType(")"),
  comma: new TokenType(",", beforeExpr),
  semi: new TokenType(";", beforeExpr),
  colon: new TokenType(":", beforeExpr),
  dot: new TokenType("."),
  question: new TokenType("?", beforeExpr),
  questionDot: new TokenType("?."),
  arrow: new TokenType("=>", beforeExpr),
  template: new TokenType("template"),
  invalidTemplate: new TokenType("invalidTemplate"),
  ellipsis: new TokenType("...", beforeExpr),
  backQuote: new TokenType("\`", startsExpr),
  dollarBraceL: new TokenType("\${", {beforeExpr: true, startsExpr: true}),

  // Operators. These carry several kinds of properties to help the
  // parser use them properly (the presence of these properties is
  // what categorizes them as operators).
  //
  // \`binop\`, when present, specifies that this operator is a binary
  // operator, and will refer to its precedence.
  //
  // \`prefix\` and \`postfix\` mark the operator as a prefix or postfix
  // unary operator.
  //
  // \`isAssign\` marks all of \`=\`, \`+=\`, \`-=\` etcetera, which act as
  // binary operators with a very low precedence, that should result
  // in AssignmentExpression nodes.

  eq: new TokenType("=", {beforeExpr: true, isAssign: true}),
  assign: new TokenType("_=", {beforeExpr: true, isAssign: true}),
  incDec: new TokenType("++/--", {prefix: true, postfix: true, startsExpr: true}),
  prefix: new TokenType("!/~", {beforeExpr: true, prefix: true, startsExpr: true}),
  logicalOR: binop("||", 1),
  logicalAND: binop("&&", 2),
  bitwiseOR: binop("|", 3),
  bitwiseXOR: binop("^", 4),
  bitwiseAND: binop("&", 5),
  equality: binop("==/!=/===/!==", 6),
  relational: binop("</>/<=/>=", 7),
  bitShift: binop("<</>>/>>>", 8),
  plusMin: new TokenType("+/-", {beforeExpr: true, binop: 9, prefix: true, startsExpr: true}),
  modulo: binop("%", 10),
  star: binop("*", 10),
  slash: binop("/", 10),
  starstar: new TokenType("**", {beforeExpr: true}),
  coalesce: binop("??", 1),

  // Keyword token types.
  _break: kw("break"),
  _case: kw("case", beforeExpr),
  _catch: kw("catch"),
  _continue: kw("continue"),
  _debugger: kw("debugger"),
  _default: kw("default", beforeExpr),
  _do: kw("do", {isLoop: true, beforeExpr: true}),
  _else: kw("else", beforeExpr),
  _finally: kw("finally"),
  _for: kw("for", {isLoop: true}),
  _function: kw("function", startsExpr),
  _if: kw("if"),
  _return: kw("return", beforeExpr),
  _switch: kw("switch"),
  _throw: kw("throw", beforeExpr),
  _try: kw("try"),
  _var: kw("var"),
  _const: kw("const"),
  _while: kw("while", {isLoop: true}),
  _with: kw("with"),
  _new: kw("new", {beforeExpr: true, startsExpr: true}),
  _this: kw("this", startsExpr),
  _super: kw("super", startsExpr),
  _class: kw("class", startsExpr),
  _extends: kw("extends", beforeExpr),
  _export: kw("export"),
  _import: kw("import", startsExpr),
  _null: kw("null", startsExpr),
  _true: kw("true", startsExpr),
  _false: kw("false", startsExpr),
  _in: kw("in", {beforeExpr: true, binop: 7}),
  _instanceof: kw("instanceof", {beforeExpr: true, binop: 7}),
  _typeof: kw("typeof", {beforeExpr: true, prefix: true, startsExpr: true}),
  _void: kw("void", {beforeExpr: true, prefix: true, startsExpr: true}),
  _delete: kw("delete", {beforeExpr: true, prefix: true, startsExpr: true})
};

// Matches a whole line break (where CRLF is considered a single
// line break). Used to count lines.

var lineBreak = /\\r\\n?|\\n|\\u2028|\\u2029/;
var lineBreakG = new RegExp(lineBreak.source, "g");

function isNewLine(code) {
  return code === 10 || code === 13 || code === 0x2028 || code === 0x2029
}

function nextLineBreak(code, from, end) {
  if ( end === void 0 ) end = code.length;

  for (var i = from; i < end; i++) {
    var next = code.charCodeAt(i);
    if (isNewLine(next))
      { return i < end - 1 && next === 13 && code.charCodeAt(i + 1) === 10 ? i + 2 : i + 1 }
  }
  return -1
}

var nonASCIIwhitespace = /[\\u1680\\u2000-\\u200a\\u202f\\u205f\\u3000\\ufeff]/;

var skipWhiteSpace = /(?:\\s|\\/\\/.*|\\/\\*[^]*?\\*\\/)*/g;

var ref = Object.prototype;
var hasOwnProperty = ref.hasOwnProperty;
var toString = ref.toString;

var hasOwn = Object.hasOwn || (function (obj, propName) { return (
  hasOwnProperty.call(obj, propName)
); });

var isArray = Array.isArray || (function (obj) { return (
  toString.call(obj) === "[object Array]"
); });

var regexpCache = Object.create(null);

function wordsRegexp(words) {
  return regexpCache[words] || (regexpCache[words] = new RegExp("^(?:" + words.replace(/ /g, "|") + ")$"))
}

function codePointToString(code) {
  // UTF-16 Decoding
  if (code <= 0xFFFF) { return String.fromCharCode(code) }
  code -= 0x10000;
  return String.fromCharCode((code >> 10) + 0xD800, (code & 1023) + 0xDC00)
}

var loneSurrogate = /(?:[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?:[^\\uD800-\\uDBFF]|^)[\\uDC00-\\uDFFF])/;

// These are used when \`options.locations\` is on, for the
// \`startLoc\` and \`endLoc\` properties.

var Position = function Position(line, col) {
  this.line = line;
  this.column = col;
};

Position.prototype.offset = function offset (n) {
  return new Position(this.line, this.column + n)
};

var SourceLocation = function SourceLocation(p, start, end) {
  this.start = start;
  this.end = end;
  if (p.sourceFile !== null) { this.source = p.sourceFile; }
};

// The \`getLineInfo\` function is mostly useful when the
// \`locations\` option is off (for performance reasons) and you
// want to find the line/column position for a given character
// offset. \`input\` should be the code string that the offset refers
// into.

function getLineInfo(input, offset) {
  for (var line = 1, cur = 0;;) {
    var nextBreak = nextLineBreak(input, cur, offset);
    if (nextBreak < 0) { return new Position(line, offset - cur) }
    ++line;
    cur = nextBreak;
  }
}

// A second argument must be given to configure the parser process.
// These options are recognized (only \`ecmaVersion\` is required):

var defaultOptions = {
  // \`ecmaVersion\` indicates the ECMAScript version to parse. Must be
  // either 3, 5, 6 (or 2015), 7 (2016), 8 (2017), 9 (2018), 10
  // (2019), 11 (2020), 12 (2021), 13 (2022), 14 (2023), or \`"latest"\`
  // (the latest version the library supports). This influences
  // support for strict mode, the set of reserved words, and support
  // for new syntax features.
  ecmaVersion: null,
  // \`sourceType\` indicates the mode the code should be parsed in.
  // Can be either \`"script"\`, \`"module"\` or \`"commonjs"\`. This influences global
  // strict mode and parsing of \`import\` and \`export\` declarations.
  sourceType: "script",
  // When set to true, enable strict parsing mode even if \`sourceType\`
  // is \`"script"\`.
  strict: false,
  // \`onInsertedSemicolon\` can be a callback that will be called when
  // a semicolon is automatically inserted. It will be passed the
  // position of the inserted semicolon as an offset, and if
  // \`locations\` is enabled, it is given the location as a \`{line,
  // column}\` object as second argument.
  onInsertedSemicolon: null,
  // \`onTrailingComma\` is similar to \`onInsertedSemicolon\`, but for
  // trailing commas.
  onTrailingComma: null,
  // By default, reserved words are only enforced if ecmaVersion >= 5.
  // Set \`allowReserved\` to a boolean value to explicitly turn this on
  // an off. When this option has the value "never", reserved words
  // and keywords can also not be used as property names.
  allowReserved: null,
  // When enabled, a return at the top level is not considered an
  // error.
  allowReturnOutsideFunction: false,
  // When enabled, import/export statements are not constrained to
  // appearing at the top of the program, and an import.meta expression
  // in a script isn't considered an error.
  allowImportExportEverywhere: false,
  // By default, await identifiers are allowed to appear at the top-level scope only if ecmaVersion >= 2022.
  // When enabled, await identifiers are allowed to appear at the top-level scope,
  // but they are still not allowed in non-async functions.
  allowAwaitOutsideFunction: null,
  // When enabled, super identifiers are not constrained to
  // appearing in methods and do not raise an error when they appear elsewhere.
  allowSuperOutsideMethod: null,
  // When enabled, hashbang directive in the beginning of file is
  // allowed and treated as a line comment. Enabled by default when
  // \`ecmaVersion\` >= 2023.
  allowHashBang: false,
  // By default, the parser will verify that private properties are
  // only used in places where they are valid and have been declared.
  // Set this to false to turn such checks off.
  checkPrivateFields: true,
  // When \`locations\` is on, \`loc\` properties holding objects with
  // \`start\` and \`end\` properties in \`{line, column}\` form (with
  // line being 1-based and column 0-based) will be attached to the
  // nodes.
  locations: false,
  // Pass an optional \`{line, column}\` object to use for the start of
  // the parse. This is mostly useful when using \`parseExpressionAt\`
  // with \`locations: true\`, to prevent the parser from having to
  // determine the line position at the start position.
  startLocation: null,
  // A function can be passed as \`onToken\` option, which will
  // cause Acorn to call that function with object in the same
  // format as tokens returned from \`tokenizer().getToken()\`. Note
  // that you are not allowed to call the parser from the
  // callback—that will corrupt its internal state.
  onToken: null,
  // A function can be passed as \`onComment\` option, which will
  // cause Acorn to call that function with \`(block, text, start,
  // end)\` parameters whenever a comment is skipped. \`block\` is a
  // boolean indicating whether this is a block (\`/* */\`) comment,
  // \`text\` is the content of the comment, and \`start\` and \`end\` are
  // character offsets that denote the start and end of the comment.
  // When the \`locations\` option is on, two more parameters are
  // passed, the full \`{line, column}\` locations of the start and
  // end of the comments. Note that you are not allowed to call the
  // parser from the callback—that will corrupt its internal state.
  // When this option has an array as value, objects representing the
  // comments are pushed to it.
  onComment: null,
  // Nodes have their start and end characters offsets recorded in
  // \`start\` and \`end\` properties (directly on the node, rather than
  // the \`loc\` object, which holds line/column data. To also add a
  // [semi-standardized][range] \`range\` property holding a \`[start,
  // end]\` array with the same numbers, set the \`ranges\` option to
  // \`true\`.
  //
  // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
  ranges: false,
  // It is possible to parse multiple files into a single AST by
  // passing the tree produced by parsing the first file as
  // \`program\` option in subsequent parses. This will add the
  // toplevel forms of the parsed file to the \`Program\` (top) node
  // of an existing parse tree.
  program: null,
  // When \`locations\` is on, you can pass this to record the source
  // file in every node's \`loc\` object.
  sourceFile: null,
  // This value, if given, is stored in every node, whether
  // \`locations\` is on or off.
  directSourceFile: null,
  // When enabled, parenthesized expressions are represented by
  // (non-standard) ParenthesizedExpression nodes
  preserveParens: false
};

// Interpret and default an options object

var warnedAboutEcmaVersion = false;

function getOptions(opts) {
  var options = {};

  for (var opt in defaultOptions)
    { options[opt] = opts && hasOwn(opts, opt) ? opts[opt] : defaultOptions[opt]; }

  if (options.ecmaVersion === "latest") {
    options.ecmaVersion = 1e8;
  } else if (options.ecmaVersion == null) {
    if (!warnedAboutEcmaVersion && typeof console === "object" && console.warn) {
      warnedAboutEcmaVersion = true;
      console.warn("Since Acorn 8.0.0, options.ecmaVersion is required.\\nDefaulting to 2020, but this will stop working in the future.");
    }
    options.ecmaVersion = 11;
  } else if (options.ecmaVersion >= 2015) {
    options.ecmaVersion -= 2009;
  }

  if (options.allowReserved == null)
    { options.allowReserved = options.ecmaVersion < 5; }

  if (!opts || opts.allowHashBang == null)
    { options.allowHashBang = options.ecmaVersion >= 14; }

  if (isArray(options.onToken)) {
    var tokens = options.onToken;
    options.onToken = function (token) { return tokens.push(token); };
  }
  if (isArray(options.onComment))
    { options.onComment = pushComment(options, options.onComment); }

  if (options.sourceType === "commonjs" && options.allowAwaitOutsideFunction)
    { throw new Error("Cannot use allowAwaitOutsideFunction with sourceType: commonjs") }

  return options
}

function pushComment(options, array) {
  return function(block, text, start, end, startLoc, endLoc) {
    var comment = {
      type: block ? "Block" : "Line",
      value: text,
      start: start,
      end: end
    };
    if (options.locations)
      { comment.loc = new SourceLocation(this, startLoc, endLoc); }
    if (options.ranges)
      { comment.range = [start, end]; }
    array.push(comment);
  }
}

// Each scope gets a bitset that may contain these flags
var
    SCOPE_TOP = 1,
    SCOPE_FUNCTION = 2,
    SCOPE_ASYNC = 4,
    SCOPE_GENERATOR = 8,
    SCOPE_ARROW = 16,
    SCOPE_SIMPLE_CATCH = 32,
    SCOPE_SUPER = 64,
    SCOPE_DIRECT_SUPER = 128,
    SCOPE_CLASS_STATIC_BLOCK = 256,
    SCOPE_CLASS_FIELD_INIT = 512,
    SCOPE_SWITCH = 1024,
    SCOPE_VAR = SCOPE_TOP | SCOPE_FUNCTION | SCOPE_CLASS_STATIC_BLOCK;

function functionFlags(async, generator) {
  return SCOPE_FUNCTION | (async ? SCOPE_ASYNC : 0) | (generator ? SCOPE_GENERATOR : 0)
}

// Used in checkLVal* and declareName to determine the type of a binding
var
    BIND_NONE = 0, // Not a binding
    BIND_VAR = 1, // Var-style binding
    BIND_LEXICAL = 2, // Let- or const-style binding
    BIND_FUNCTION = 3, // Function declaration
    BIND_SIMPLE_CATCH = 4, // Simple (identifier pattern) catch binding
    BIND_OUTSIDE = 5; // Special case for function names as bound inside the function

var Parser = function Parser(options, input, startPos) {
  this.options = options = getOptions(options);
  this.sourceFile = options.sourceFile;
  this.keywords = wordsRegexp(keywords$1[options.ecmaVersion >= 6 ? 6 : options.sourceType === "module" ? "5module" : 5]);
  var reserved = "";
  if (options.allowReserved !== true) {
    reserved = reservedWords[options.ecmaVersion >= 6 ? 6 : options.ecmaVersion === 5 ? 5 : 3];
    if (options.sourceType === "module") { reserved += " await"; }
  }
  this.reservedWords = wordsRegexp(reserved);
  var reservedStrict = (reserved ? reserved + " " : "") + reservedWords.strict;
  this.reservedWordsStrict = wordsRegexp(reservedStrict);
  this.reservedWordsStrictBind = wordsRegexp(reservedStrict + " " + reservedWords.strictBind);
  this.input = String(input);

  // Used to signal to callers of \`readWord1\` whether the word
  // contained any escape sequences. This is needed because words with
  // escape sequences must not be interpreted as keywords.
  this.containsEsc = false;

  // Set up token state

  // The current position of the tokenizer in the input.
  this.pos = startPos || 0;
  this.curLine = 1;
  if (options.startLocation) {
    this.lineStart = this.pos - options.startLocation.column;
    this.curLine = options.startLocation.line;
  } else if (startPos) {
    this.lineStart = this.input.lastIndexOf("\\n", startPos - 1) + 1;
    if (this.options.locations)
      { this.curLine = this.input.slice(0, this.lineStart).split(lineBreak).length; }
  } else {
    this.lineStart = 0;
  }

  // Properties of the current token:
  // Its type
  this.type = types$1.eof;
  // For tokens that include more information than their type, the value
  this.value = null;
  // Its start and end offset
  this.start = this.end = this.pos;
  // And, if locations are used, the {line, column} object
  // corresponding to those offsets
  this.startLoc = this.endLoc = this.curPosition();

  // Position information for the previous token
  this.lastTokEndLoc = this.lastTokStartLoc = null;
  this.lastTokStart = this.lastTokEnd = this.pos;

  // The context stack is used to superficially track syntactic
  // context to predict whether a regular expression is allowed in a
  // given position.
  this.context = this.initialContext();
  this.exprAllowed = true;

  // Figure out if it's a module code.
  this.inModule = options.sourceType === "module";
  this.strict = this.inModule || options.strict === true || this.strictDirective(this.pos);

  // Used to signify the start of a potential arrow function
  this.potentialArrowAt = -1;
  this.potentialArrowInForAwait = false;

  // Positions to delayed-check that yield/await does not exist in default parameters.
  this.yieldPos = this.awaitPos = this.awaitIdentPos = 0;
  // Labels in scope.
  this.labels = [];
  // Thus-far undefined exports.
  this.undefinedExports = Object.create(null);

  // If enabled, skip leading hashbang line.
  if (this.pos === 0 && options.allowHashBang && this.input.slice(0, 2) === "#!")
    { this.skipLineComment(2); }

  // Scope tracking for duplicate variable names (see scope.js)
  this.scopeStack = [];
  this.enterScope(
    this.options.sourceType === "commonjs"
      // In commonjs, the top-level scope behaves like a function scope
      ? SCOPE_FUNCTION
      : SCOPE_TOP
  );

  // For RegExp validation
  this.regexpState = null;

  // The stack of private names.
  // Each element has two properties: 'declared' and 'used'.
  // When it exited from the outermost class definition, all used private names must be declared.
  this.privateNameStack = [];
};

var prototypeAccessors = { inFunction: { configurable: true },inGenerator: { configurable: true },inAsync: { configurable: true },canAwait: { configurable: true },allowReturn: { configurable: true },allowSuper: { configurable: true },allowDirectSuper: { configurable: true },treatFunctionsAsVar: { configurable: true },allowNewDotTarget: { configurable: true },allowUsing: { configurable: true },inClassStaticBlock: { configurable: true } };

Parser.prototype.parse = function parse () {
    var this$1$1 = this;

  var node = this.options.program || this.startNode();
  this.nextToken();
  return this.catchStackOverflow(function () { return this$1$1.parseTopLevel(node); })
};

prototypeAccessors.inFunction.get = function () { return (this.currentVarScope().flags & SCOPE_FUNCTION) > 0 };

prototypeAccessors.inGenerator.get = function () { return (this.currentVarScope().flags & SCOPE_GENERATOR) > 0 };

prototypeAccessors.inAsync.get = function () { return (this.currentVarScope().flags & SCOPE_ASYNC) > 0 };

prototypeAccessors.canAwait.get = function () {
  for (var i = this.scopeStack.length - 1; i >= 0; i--) {
    var ref = this.scopeStack[i];
      var flags = ref.flags;
    if (flags & (SCOPE_CLASS_STATIC_BLOCK | SCOPE_CLASS_FIELD_INIT)) { return false }
    if (flags & SCOPE_FUNCTION) { return (flags & SCOPE_ASYNC) > 0 }
  }
  return (this.inModule && this.options.ecmaVersion >= 13) || this.options.allowAwaitOutsideFunction
};

prototypeAccessors.allowReturn.get = function () {
  if (this.inFunction) { return true }
  if (this.options.allowReturnOutsideFunction && this.currentVarScope().flags & SCOPE_TOP) { return true }
  return false
};

prototypeAccessors.allowSuper.get = function () {
  var ref = this.currentThisScope();
    var flags = ref.flags;
  return (flags & SCOPE_SUPER) > 0 || this.options.allowSuperOutsideMethod
};

prototypeAccessors.allowDirectSuper.get = function () { return (this.currentThisScope().flags & SCOPE_DIRECT_SUPER) > 0 };

prototypeAccessors.treatFunctionsAsVar.get = function () { return this.treatFunctionsAsVarInScope(this.currentScope()) };

prototypeAccessors.allowNewDotTarget.get = function () {
  for (var i = this.scopeStack.length - 1; i >= 0; i--) {
    var ref = this.scopeStack[i];
      var flags = ref.flags;
    if (flags & (SCOPE_CLASS_STATIC_BLOCK | SCOPE_CLASS_FIELD_INIT) ||
        ((flags & SCOPE_FUNCTION) && !(flags & SCOPE_ARROW))) { return true }
  }
  return false
};

prototypeAccessors.allowUsing.get = function () {
  var ref = this.currentScope();
    var flags = ref.flags;
  if (flags & SCOPE_SWITCH) { return false }
  if (!this.inModule && flags & SCOPE_TOP) { return false }
  return true
};

prototypeAccessors.inClassStaticBlock.get = function () {
  return (this.currentVarScope().flags & SCOPE_CLASS_STATIC_BLOCK) > 0
};

Parser.extend = function extend () {
    var plugins = [], len = arguments.length;
    while ( len-- ) plugins[ len ] = arguments[ len ];

  var cls = this;
  for (var i = 0; i < plugins.length; i++) { cls = plugins[i](cls); }
  return cls
};

Parser.parse = function parse (input, options) {
  return new this(options, input).parse()
};

Parser.parseExpressionAt = function parseExpressionAt (input, pos, options) {
  var parser = new this(options, input, pos);
  parser.nextToken();
  return parser.parseExpression()
};

Parser.tokenizer = function tokenizer (input, options) {
  return new this(options, input)
};

Object.defineProperties( Parser.prototype, prototypeAccessors );

var pp$9 = Parser.prototype;

// ## Parser utilities

var literal = /^(?:'((?:\\\\[^]|[^'\\\\])*?)'|"((?:\\\\[^]|[^"\\\\])*?)")/;
pp$9.strictDirective = function(start) {
  if (this.options.ecmaVersion < 5) { return false }
  for (;;) {
    // Try to find string literal.
    skipWhiteSpace.lastIndex = start;
    start += skipWhiteSpace.exec(this.input)[0].length;
    var match = literal.exec(this.input.slice(start));
    if (!match) { return false }
    if ((match[1] || match[2]) === "use strict") {
      skipWhiteSpace.lastIndex = start + match[0].length;
      var spaceAfter = skipWhiteSpace.exec(this.input), end = spaceAfter.index + spaceAfter[0].length;
      var next = this.input.charAt(end);
      return next === ";" || next === "}" ||
        (lineBreak.test(spaceAfter[0]) &&
         !(/[(\`.[+\\-/*%<>=,?^&]/.test(next) || next === "!" && this.input.charAt(end + 1) === "="))
    }
    start += match[0].length;

    // Skip semicolon, if any.
    skipWhiteSpace.lastIndex = start;
    start += skipWhiteSpace.exec(this.input)[0].length;
    if (this.input[start] === ";")
      { start++; }
  }
};

// Predicate that tests whether the next token is of the given
// type, and if yes, consumes it as a side effect.

pp$9.eat = function(type) {
  if (this.type === type) {
    this.next();
    return true
  } else {
    return false
  }
};

// Tests whether parsed token is a contextual keyword.

pp$9.isContextual = function(name) {
  return this.type === types$1.name && this.value === name && !this.containsEsc
};

// Consumes contextual keyword if possible.

pp$9.eatContextual = function(name) {
  if (!this.isContextual(name)) { return false }
  this.next();
  return true
};

pp$9.catchStackOverflow = function(f) {
  try {
    return f()
  } catch (e) {
    if (e instanceof Error && (/\\bstack\\b.*\\b(exceeded|overflow)\\b/i.test(e.message) || /\\btoo much recursion\\b/i.test(e.message)))
      { this.raise(this.start, "Not enough stack space to parse input"); }
    else
      { throw e }
  }
};

// Asserts that following token is given contextual keyword.

pp$9.expectContextual = function(name) {
  if (!this.eatContextual(name)) { this.unexpected(); }
};

// Test whether a semicolon can be inserted at the current position.

pp$9.canInsertSemicolon = function() {
  return this.type === types$1.eof ||
    this.type === types$1.braceR ||
    lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
};

pp$9.insertSemicolon = function() {
  if (this.canInsertSemicolon()) {
    if (this.options.onInsertedSemicolon)
      { this.options.onInsertedSemicolon(this.lastTokEnd, this.lastTokEndLoc); }
    return true
  }
};

// Consume a semicolon, or, failing that, see if we are allowed to
// pretend that there is a semicolon at this position.

pp$9.semicolon = function() {
  if (!this.eat(types$1.semi) && !this.insertSemicolon()) { this.unexpected(); }
};

pp$9.afterTrailingComma = function(tokType, notNext) {
  if (this.type === tokType) {
    if (this.options.onTrailingComma)
      { this.options.onTrailingComma(this.lastTokStart, this.lastTokStartLoc); }
    if (!notNext)
      { this.next(); }
    return true
  }
};

// Expect a token of a given type. If found, consume it, otherwise,
// raise an unexpected token error.

pp$9.expect = function(type) {
  this.eat(type) || this.unexpected();
};

// Raise an unexpected token error.

pp$9.unexpected = function(pos) {
  this.raise(pos != null ? pos : this.start, "Unexpected token");
};

var DestructuringErrors = function DestructuringErrors() {
  this.shorthandAssign =
  this.trailingComma =
  this.parenthesizedAssign =
  this.parenthesizedBind =
  this.doubleProto =
    -1;
};

pp$9.checkPatternErrors = function(refDestructuringErrors, isAssign) {
  if (!refDestructuringErrors) { return }
  if (refDestructuringErrors.trailingComma > -1)
    { this.raiseRecoverable(refDestructuringErrors.trailingComma, "Comma is not permitted after the rest element"); }
  var parens = isAssign ? refDestructuringErrors.parenthesizedAssign : refDestructuringErrors.parenthesizedBind;
  if (parens > -1) { this.raiseRecoverable(parens, isAssign ? "Assigning to rvalue" : "Parenthesized pattern"); }
};

pp$9.checkExpressionErrors = function(refDestructuringErrors, andThrow) {
  if (!refDestructuringErrors) { return false }
  var shorthandAssign = refDestructuringErrors.shorthandAssign;
  var doubleProto = refDestructuringErrors.doubleProto;
  if (!andThrow) { return shorthandAssign >= 0 || doubleProto >= 0 }
  if (shorthandAssign >= 0)
    { this.raise(shorthandAssign, "Shorthand property assignments are valid only in destructuring patterns"); }
  if (doubleProto >= 0)
    { this.raiseRecoverable(doubleProto, "Redefinition of __proto__ property"); }
};

pp$9.checkYieldAwaitInDefaultParams = function() {
  if (this.yieldPos && (!this.awaitPos || this.yieldPos < this.awaitPos))
    { this.raise(this.yieldPos, "Yield expression cannot be a default value"); }
  if (this.awaitPos)
    { this.raise(this.awaitPos, "Await expression cannot be a default value"); }
};

pp$9.isSimpleAssignTarget = function(expr) {
  if (expr.type === "ParenthesizedExpression")
    { return this.isSimpleAssignTarget(expr.expression) }
  return expr.type === "Identifier" || expr.type === "MemberExpression"
};

var pp$8 = Parser.prototype;

// ### Statement parsing

// Parse a program. Initializes the parser, reads any number of
// statements, and wraps them in a Program node.  Optionally takes a
// \`program\` argument.  If present, the statements will be appended
// to its body instead of creating a new node.

pp$8.parseTopLevel = function(node) {
  var exports$1 = Object.create(null);
  if (!node.body) { node.body = []; }
  while (this.type !== types$1.eof) {
    var stmt = this.parseStatement(null, true, exports$1);
    node.body.push(stmt);
  }
  if (this.inModule)
    { for (var i = 0, list = Object.keys(this.undefinedExports); i < list.length; i += 1)
      {
        var name = list[i];

        this.raiseRecoverable(this.undefinedExports[name].start, ("Export '" + name + "' is not defined"));
      } }
  this.adaptDirectivePrologue(node.body);
  this.next();
  node.sourceType = this.options.sourceType === "commonjs" ? "script" : this.options.sourceType;
  return this.finishNode(node, "Program")
};

var loopLabel = {kind: "loop"}, switchLabel = {kind: "switch"};

pp$8.isLet = function(context) {
  if (this.options.ecmaVersion < 6 || !this.isContextual("let")) { return false }
  skipWhiteSpace.lastIndex = this.pos;
  var skip = skipWhiteSpace.exec(this.input);
  var next = this.pos + skip[0].length, nextCh = this.fullCharCodeAt(next);
  // For ambiguous cases, determine if a LexicalDeclaration (or only a
  // Statement) is allowed here. If context is not empty then only a Statement
  // is allowed. However, \`let [\` is an explicit negative lookahead for
  // ExpressionStatement, so special-case it first.
  if (nextCh === 91 || nextCh === 92) { return true } // '[', '\\'
  if (context) { return false }

  if (nextCh === 123) { return true } // '{'
  if (isIdentifierStart(nextCh)) {
    var start = next;
    do { next += nextCh <= 0xffff ? 1 : 2; }
    while (isIdentifierChar(nextCh = this.fullCharCodeAt(next)))
    if (nextCh === 92) { return true }
    var ident = this.input.slice(start, next);
    if (!keywordRelationalOperator.test(ident)) { return true }
  }
  return false
};

// check 'async [no LineTerminator here] function'
// - 'async /*foo*/ function' is OK.
// - 'async /*\\n*/ function' is invalid.
pp$8.isAsyncFunction = function() {
  if (this.options.ecmaVersion < 8 || !this.isContextual("async"))
    { return false }

  skipWhiteSpace.lastIndex = this.pos;
  var skip = skipWhiteSpace.exec(this.input);
  var next = this.pos + skip[0].length, after;
  return !lineBreak.test(this.input.slice(this.pos, next)) &&
    this.input.slice(next, next + 8) === "function" &&
    (next + 8 === this.input.length ||
     !(isIdentifierChar(after = this.fullCharCodeAt(next + 8)) || after === 92 /* '\\' */))
};

pp$8.isUsingKeyword = function(isAwaitUsing, isFor) {
  if (this.options.ecmaVersion < 17 || !this.isContextual(isAwaitUsing ? "await" : "using"))
    { return false }

  skipWhiteSpace.lastIndex = this.pos;
  var skip = skipWhiteSpace.exec(this.input);
  var next = this.pos + skip[0].length;

  if (lineBreak.test(this.input.slice(this.pos, next))) { return false }

  if (isAwaitUsing) {
    var usingEndPos = next + 5 /* using */, after;
    if (this.input.slice(next, usingEndPos) !== "using" ||
      usingEndPos === this.input.length ||
      isIdentifierChar(after = this.fullCharCodeAt(usingEndPos)) ||
      after === 92 /* '\\' */
    ) { return false }

    skipWhiteSpace.lastIndex = usingEndPos;
    var skipAfterUsing = skipWhiteSpace.exec(this.input);
    next = usingEndPos + skipAfterUsing[0].length;
    if (skipAfterUsing && lineBreak.test(this.input.slice(usingEndPos, next))) { return false }
  }

  var ch = this.fullCharCodeAt(next);
  if (!isIdentifierStart(ch) && ch !== 92 /* '\\' */) { return false }
  var idStart = next;
  do { next += ch <= 0xffff ? 1 : 2; }
  while (isIdentifierChar(ch = this.fullCharCodeAt(next)))
  if (ch === 92) { return true }
  var id = this.input.slice(idStart, next);
  if (keywordRelationalOperator.test(id)) { return false }
  if (isFor && !isAwaitUsing && id === "of") {
    // Look ahead for using declaration with initializer, i.e., \`for (using of = ...)\`
    skipWhiteSpace.lastIndex = next;
    var skipAfterOf = skipWhiteSpace.exec(this.input);
    next = next + skipAfterOf[0].length;
    if (this.input.charCodeAt(next) !== 61 /* '=' */ ||
      // Check for ==, === and => operators
      (ch = this.input.charCodeAt(next + 1)) === 61 /* '=' */ || ch === 62 /* '>' */) {
      return false
    }
  }
  return true
};

pp$8.isAwaitUsing = function(isFor) {
  return this.isUsingKeyword(true, isFor)
};

pp$8.isUsing = function(isFor) {
  return this.isUsingKeyword(false, isFor)
};

// Parse a single statement.
//
// If expecting a statement and finding a slash operator, parse a
// regular expression literal. This is to handle cases like
// \`if (foo) /blah/.exec(foo)\`, where looking at the previous token
// does not help.

pp$8.parseStatement = function(context, topLevel, exports$1) {
  var starttype = this.type, node = this.startNode(), kind;

  if (this.isLet(context)) {
    starttype = types$1._var;
    kind = "let";
  }

  // Most types of statements are recognized by the keyword they
  // start with. Many are trivial to parse, some require a bit of
  // complexity.

  switch (starttype) {
  case types$1._break: case types$1._continue: return this.parseBreakContinueStatement(node, starttype.keyword)
  case types$1._debugger: return this.parseDebuggerStatement(node)
  case types$1._do: return this.parseDoStatement(node)
  case types$1._for: return this.parseForStatement(node)
  case types$1._function:
    // Function as sole body of either an if statement or a labeled statement
    // works, but not when it is part of a labeled statement that is the sole
    // body of an if statement.
    if ((context && (this.strict || context !== "if" && context !== "label")) && this.options.ecmaVersion >= 6) { this.unexpected(); }
    return this.parseFunctionStatement(node, false, !context)
  case types$1._class:
    if (context) { this.unexpected(); }
    return this.parseClass(node, true)
  case types$1._if: return this.parseIfStatement(node)
  case types$1._return: return this.parseReturnStatement(node)
  case types$1._switch: return this.parseSwitchStatement(node)
  case types$1._throw: return this.parseThrowStatement(node)
  case types$1._try: return this.parseTryStatement(node)
  case types$1._const: case types$1._var:
    kind = kind || this.value;
    if (context && kind !== "var") { this.unexpected(); }
    return this.parseVarStatement(node, kind)
  case types$1._while: return this.parseWhileStatement(node)
  case types$1._with: return this.parseWithStatement(node)
  case types$1.braceL: return this.parseBlock(true, node)
  case types$1.semi: return this.parseEmptyStatement(node)
  case types$1._export:
  case types$1._import:
    if (this.options.ecmaVersion > 10 && starttype === types$1._import) {
      skipWhiteSpace.lastIndex = this.pos;
      var skip = skipWhiteSpace.exec(this.input);
      var next = this.pos + skip[0].length, nextCh = this.input.charCodeAt(next);
      if (nextCh === 40 || nextCh === 46) // '(' or '.'
        { return this.parseExpressionStatement(node, this.parseExpression()) }
    }

    if (!this.options.allowImportExportEverywhere) {
      if (!topLevel)
        { this.raise(this.start, "'import' and 'export' may only appear at the top level"); }
      if (!this.inModule)
        { this.raise(this.start, "'import' and 'export' may appear only with 'sourceType: module'"); }
    }
    return starttype === types$1._import ? this.parseImport(node) : this.parseExport(node, exports$1)

    // If the statement does not start with a statement keyword or a
    // brace, it's an ExpressionStatement or LabeledStatement. We
    // simply start parsing an expression, and afterwards, if the
    // next token is a colon and the expression was a simple
    // Identifier node, we switch to interpreting it as a label.
  default:
    if (this.isAsyncFunction()) {
      if (context) { this.unexpected(); }
      this.next();
      return this.parseFunctionStatement(node, true, !context)
    }

    var usingKind = this.isAwaitUsing(false) ? "await using" : this.isUsing(false) ? "using" : null;
    if (usingKind) {
      if (!this.allowUsing) {
        this.raise(this.start, "Using declaration cannot appear in the top level when source type is \`script\` or in the bare case statement");
      }
      if (context) {
        // Cases like \`for (;;) using x = ...;\`, \`if (true) await using x = ...;\`, etc. are not allowed.
        this.raise(this.start, "Using declaration is not allowed in single-statement positions");
      }
      if (usingKind === "await using") {
        if (!this.canAwait) {
          this.raise(this.start, "Await using cannot appear outside of async function");
        }
        this.next();
      }
      this.next();
      this.parseVar(node, false, usingKind);
      this.semicolon();
      return this.finishNode(node, "VariableDeclaration")
    }

    var maybeName = this.value, expr = this.parseExpression();
    if (starttype === types$1.name && expr.type === "Identifier" && this.eat(types$1.colon))
      { return this.parseLabeledStatement(node, maybeName, expr, context) }
    else { return this.parseExpressionStatement(node, expr) }
  }
};

pp$8.parseBreakContinueStatement = function(node, keyword) {
  var isBreak = keyword === "break";
  this.next();
  if (this.eat(types$1.semi) || this.insertSemicolon()) { node.label = null; }
  else if (this.type !== types$1.name) { this.unexpected(); }
  else {
    node.label = this.parseIdent();
    this.semicolon();
  }

  // Verify that there is an actual destination to break or
  // continue to.
  var i = 0;
  for (; i < this.labels.length; ++i) {
    var lab = this.labels[i];
    if (node.label == null || lab.name === node.label.name) {
      if (lab.kind != null && (isBreak || lab.kind === "loop")) { break }
      if (node.label && isBreak) { break }
    }
  }
  if (i === this.labels.length) { this.raise(node.start, "Unsyntactic " + keyword); }
  return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement")
};

pp$8.parseDebuggerStatement = function(node) {
  this.next();
  this.semicolon();
  return this.finishNode(node, "DebuggerStatement")
};

pp$8.parseDoStatement = function(node) {
  this.next();
  this.labels.push(loopLabel);
  node.body = this.parseStatement("do");
  this.labels.pop();
  this.expect(types$1._while);
  node.test = this.parseParenExpression();
  if (this.options.ecmaVersion >= 6)
    { this.eat(types$1.semi); }
  else
    { this.semicolon(); }
  return this.finishNode(node, "DoWhileStatement")
};

// Disambiguating between a \`for\` and a \`for\`/\`in\` or \`for\`/\`of\`
// loop is non-trivial. Basically, we have to parse the init \`var\`
// statement or expression, disallowing the \`in\` operator (see
// the second parameter to \`parseExpression\`), and then check
// whether the next token is \`in\` or \`of\`. When there is no init
// part (semicolon immediately after the opening parenthesis), it
// is a regular \`for\` loop.

pp$8.parseForStatement = function(node) {
  this.next();
  var awaitAt = (this.options.ecmaVersion >= 9 && this.canAwait && this.eatContextual("await")) ? this.lastTokStart : -1;
  this.labels.push(loopLabel);
  this.enterScope(0);
  this.expect(types$1.parenL);
  if (this.type === types$1.semi) {
    if (awaitAt > -1) { this.unexpected(awaitAt); }
    return this.parseFor(node, null)
  }
  var isLet = this.isLet();
  if (this.type === types$1._var || this.type === types$1._const || isLet) {
    var init$1 = this.startNode(), kind = isLet ? "let" : this.value;
    this.next();
    this.parseVar(init$1, true, kind);
    this.finishNode(init$1, "VariableDeclaration");
    return this.parseForAfterInit(node, init$1, awaitAt)
  }
  var startsWithLet = this.isContextual("let"), isForOf = false;

  var usingKind = this.isUsing(true) ? "using" : this.isAwaitUsing(true) ? "await using" : null;
  if (usingKind) {
    var init$2 = this.startNode();
    this.next();
    if (usingKind === "await using") {
      if (!this.canAwait) {
        this.raise(this.start, "Await using cannot appear outside of async function");
      }
      this.next();
    }
    this.parseVar(init$2, true, usingKind);
    this.finishNode(init$2, "VariableDeclaration");
    return this.parseForAfterInit(node, init$2, awaitAt)
  }
  var containsEsc = this.containsEsc;
  var refDestructuringErrors = new DestructuringErrors;
  var initPos = this.start;
  var init = awaitAt > -1
    ? this.parseExprSubscripts(refDestructuringErrors, "await")
    : this.parseExpression(true, refDestructuringErrors);
  if (this.type === types$1._in || (isForOf = this.options.ecmaVersion >= 6 && this.isContextual("of"))) {
    if (awaitAt > -1) { // implies \`ecmaVersion >= 9\` (see declaration of awaitAt)
      if (this.type === types$1._in) { this.unexpected(awaitAt); }
      node.await = true;
    } else if (isForOf && this.options.ecmaVersion >= 8) {
      if (init.start === initPos && !containsEsc && init.type === "Identifier" && init.name === "async") { this.unexpected(); }
      else if (this.options.ecmaVersion >= 9) { node.await = false; }
    }
    if (startsWithLet && isForOf) { this.raise(init.start, "The left-hand side of a for-of loop may not start with 'let'."); }
    this.toAssignable(init, false, refDestructuringErrors);
    this.checkLValPattern(init);
    return this.parseForIn(node, init)
  } else {
    this.checkExpressionErrors(refDestructuringErrors, true);
  }
  if (awaitAt > -1) { this.unexpected(awaitAt); }
  return this.parseFor(node, init)
};

// Helper method to parse for loop after variable initialization
pp$8.parseForAfterInit = function(node, init, awaitAt) {
  if ((this.type === types$1._in || (this.options.ecmaVersion >= 6 && this.isContextual("of"))) && init.declarations.length === 1) {
    if (this.type === types$1._in) {
      if ((init.kind === "using" || init.kind === "await using") && !init.declarations[0].init) {
        this.raise(this.start, "Using declaration is not allowed in for-in loops");
      }
      if (this.options.ecmaVersion >= 9 && awaitAt > -1) { this.unexpected(awaitAt); }
    } else if (this.options.ecmaVersion >= 9) { node.await = awaitAt > -1; }
    return this.parseForIn(node, init)
  }
  if (awaitAt > -1) { this.unexpected(awaitAt); }
  return this.parseFor(node, init)
};

pp$8.parseFunctionStatement = function(node, isAsync, declarationPosition) {
  this.next();
  return this.parseFunction(node, FUNC_STATEMENT | (declarationPosition ? 0 : FUNC_HANGING_STATEMENT), false, isAsync)
};

pp$8.parseIfStatement = function(node) {
  this.next();
  node.test = this.parseParenExpression();
  // allow function declarations in branches, but only in non-strict mode
  node.consequent = this.parseStatement("if");
  node.alternate = this.eat(types$1._else) ? this.parseStatement("if") : null;
  return this.finishNode(node, "IfStatement")
};

pp$8.parseReturnStatement = function(node) {
  if (!this.allowReturn)
    { this.raise(this.start, "'return' outside of function"); }
  this.next();

  // In \`return\` (and \`break\`/\`continue\`), the keywords with
  // optional arguments, we eagerly look for a semicolon or the
  // possibility to insert one.

  if (this.eat(types$1.semi) || this.insertSemicolon()) { node.argument = null; }
  else { node.argument = this.parseExpression(); this.semicolon(); }
  return this.finishNode(node, "ReturnStatement")
};

pp$8.parseSwitchStatement = function(node) {
  this.next();
  node.discriminant = this.parseParenExpression();
  node.cases = [];
  this.expect(types$1.braceL);
  this.labels.push(switchLabel);
  this.enterScope(SCOPE_SWITCH);

  // Statements under must be grouped (by label) in SwitchCase
  // nodes. \`cur\` is used to keep the node that we are currently
  // adding statements to.

  var cur;
  for (var sawDefault = false; this.type !== types$1.braceR;) {
    if (this.type === types$1._case || this.type === types$1._default) {
      var isCase = this.type === types$1._case;
      if (cur) { this.finishNode(cur, "SwitchCase"); }
      node.cases.push(cur = this.startNode());
      cur.consequent = [];
      this.next();
      if (isCase) {
        cur.test = this.parseExpression();
      } else {
        if (sawDefault) { this.raiseRecoverable(this.lastTokStart, "Multiple default clauses"); }
        sawDefault = true;
        cur.test = null;
      }
      this.expect(types$1.colon);
    } else {
      if (!cur) { this.unexpected(); }
      cur.consequent.push(this.parseStatement(null));
    }
  }
  this.exitScope();
  if (cur) { this.finishNode(cur, "SwitchCase"); }
  this.next(); // Closing brace
  this.labels.pop();
  return this.finishNode(node, "SwitchStatement")
};

pp$8.parseThrowStatement = function(node) {
  this.next();
  if (lineBreak.test(this.input.slice(this.lastTokEnd, this.start)))
    { this.raise(this.lastTokEnd, "Illegal newline after throw"); }
  node.argument = this.parseExpression();
  this.semicolon();
  return this.finishNode(node, "ThrowStatement")
};

// Reused empty array added for node fields that are always empty.

var empty$1 = [];

pp$8.parseCatchClauseParam = function() {
  var param = this.parseBindingAtom();
  var simple = param.type === "Identifier";
  this.enterScope(simple ? SCOPE_SIMPLE_CATCH : 0);
  this.checkLValPattern(param, simple ? BIND_SIMPLE_CATCH : BIND_LEXICAL);
  this.expect(types$1.parenR);

  return param
};

pp$8.parseTryStatement = function(node) {
  this.next();
  node.block = this.parseBlock();
  node.handler = null;
  if (this.type === types$1._catch) {
    var clause = this.startNode();
    this.next();
    if (this.eat(types$1.parenL)) {
      clause.param = this.parseCatchClauseParam();
    } else {
      if (this.options.ecmaVersion < 10) { this.unexpected(); }
      clause.param = null;
      this.enterScope(0);
    }
    clause.body = this.parseBlock(false);
    this.exitScope();
    node.handler = this.finishNode(clause, "CatchClause");
  }
  node.finalizer = this.eat(types$1._finally) ? this.parseBlock() : null;
  if (!node.handler && !node.finalizer)
    { this.raise(node.start, "Missing catch or finally clause"); }
  return this.finishNode(node, "TryStatement")
};

pp$8.parseVarStatement = function(node, kind, allowMissingInitializer) {
  this.next();
  this.parseVar(node, false, kind, allowMissingInitializer);
  this.semicolon();
  return this.finishNode(node, "VariableDeclaration")
};

pp$8.parseWhileStatement = function(node) {
  this.next();
  node.test = this.parseParenExpression();
  this.labels.push(loopLabel);
  node.body = this.parseStatement("while");
  this.labels.pop();
  return this.finishNode(node, "WhileStatement")
};

pp$8.parseWithStatement = function(node) {
  if (this.strict) { this.raise(this.start, "'with' in strict mode"); }
  this.next();
  node.object = this.parseParenExpression();
  node.body = this.parseStatement("with");
  return this.finishNode(node, "WithStatement")
};

pp$8.parseEmptyStatement = function(node) {
  this.next();
  return this.finishNode(node, "EmptyStatement")
};

pp$8.parseLabeledStatement = function(node, maybeName, expr, context) {
  for (var i$1 = 0, list = this.labels; i$1 < list.length; i$1 += 1)
    {
    var label = list[i$1];

    if (label.name === maybeName)
      { this.raise(expr.start, "Label '" + maybeName + "' is already declared");
  } }
  var kind = this.type.isLoop ? "loop" : this.type === types$1._switch ? "switch" : null;
  for (var i = this.labels.length - 1; i >= 0; i--) {
    var label$1 = this.labels[i];
    if (label$1.statementStart === node.start) {
      // Update information about previous labels on this node
      label$1.statementStart = this.start;
      label$1.kind = kind;
    } else { break }
  }
  this.labels.push({name: maybeName, kind: kind, statementStart: this.start});
  node.body = this.parseStatement(context ? context.indexOf("label") === -1 ? context + "label" : context : "label");
  this.labels.pop();
  node.label = expr;
  return this.finishNode(node, "LabeledStatement")
};

pp$8.parseExpressionStatement = function(node, expr) {
  node.expression = expr;
  this.semicolon();
  return this.finishNode(node, "ExpressionStatement")
};

// Parse a semicolon-enclosed block of statements, handling \`"use
// strict"\` declarations when \`allowStrict\` is true (used for
// function bodies).

pp$8.parseBlock = function(createNewLexicalScope, node, exitStrict) {
  if ( createNewLexicalScope === void 0 ) createNewLexicalScope = true;
  if ( node === void 0 ) node = this.startNode();

  node.body = [];
  this.expect(types$1.braceL);
  if (createNewLexicalScope) { this.enterScope(0); }
  while (this.type !== types$1.braceR) {
    var stmt = this.parseStatement(null);
    node.body.push(stmt);
  }
  if (exitStrict) { this.strict = false; }
  this.next();
  if (createNewLexicalScope) { this.exitScope(); }
  return this.finishNode(node, "BlockStatement")
};

// Parse a regular \`for\` loop. The disambiguation code in
// \`parseStatement\` will already have parsed the init statement or
// expression.

pp$8.parseFor = function(node, init) {
  node.init = init;
  this.expect(types$1.semi);
  node.test = this.type === types$1.semi ? null : this.parseExpression();
  this.expect(types$1.semi);
  node.update = this.type === types$1.parenR ? null : this.parseExpression();
  this.expect(types$1.parenR);
  node.body = this.parseStatement("for");
  this.exitScope();
  this.labels.pop();
  return this.finishNode(node, "ForStatement")
};

// Parse a \`for\`/\`in\` and \`for\`/\`of\` loop, which are almost
// same from parser's perspective.

pp$8.parseForIn = function(node, init) {
  var isForIn = this.type === types$1._in;
  this.next();

  if (
    init.type === "VariableDeclaration" &&
    init.declarations[0].init != null &&
    (
      !isForIn ||
      this.options.ecmaVersion < 8 ||
      this.strict ||
      init.kind !== "var" ||
      init.declarations[0].id.type !== "Identifier"
    )
  ) {
    this.raise(
      init.start,
      ((isForIn ? "for-in" : "for-of") + " loop variable declaration may not have an initializer")
    );
  }
  node.left = init;
  node.right = isForIn ? this.parseExpression() : this.parseMaybeAssign();
  this.expect(types$1.parenR);
  node.body = this.parseStatement("for");
  this.exitScope();
  this.labels.pop();
  return this.finishNode(node, isForIn ? "ForInStatement" : "ForOfStatement")
};

// Parse a list of variable declarations.

pp$8.parseVar = function(node, isFor, kind, allowMissingInitializer) {
  node.declarations = [];
  node.kind = kind;
  for (;;) {
    var decl = this.startNode();
    this.parseVarId(decl, kind);
    if (this.eat(types$1.eq)) {
      decl.init = this.parseMaybeAssign(isFor);
    } else if (!allowMissingInitializer && kind === "const" && !(this.type === types$1._in || (this.options.ecmaVersion >= 6 && this.isContextual("of")))) {
      this.unexpected();
    } else if (!allowMissingInitializer && (kind === "using" || kind === "await using") && this.options.ecmaVersion >= 17 && this.type !== types$1._in && !this.isContextual("of")) {
      this.raise(this.lastTokEnd, ("Missing initializer in " + kind + " declaration"));
    } else if (!allowMissingInitializer && decl.id.type !== "Identifier" && !(isFor && (this.type === types$1._in || this.isContextual("of")))) {
      this.raise(this.lastTokEnd, "Complex binding patterns require an initialization value");
    } else {
      decl.init = null;
    }
    node.declarations.push(this.finishNode(decl, "VariableDeclarator"));
    if (!this.eat(types$1.comma)) { break }
  }
  return node
};

pp$8.parseVarId = function(decl, kind) {
  decl.id = kind === "using" || kind === "await using"
    ? this.parseIdent()
    : this.parseBindingAtom();

  this.checkLValPattern(decl.id, kind === "var" ? BIND_VAR : BIND_LEXICAL, false);
};

var FUNC_STATEMENT = 1, FUNC_HANGING_STATEMENT = 2, FUNC_NULLABLE_ID = 4;

// Parse a function declaration or literal (depending on the
// \`statement & FUNC_STATEMENT\`).

// Remove \`allowExpressionBody\` for 7.0.0, as it is only called with false
pp$8.parseFunction = function(node, statement, allowExpressionBody, isAsync, forInit) {
  this.initFunction(node);
  if (this.options.ecmaVersion >= 9 || this.options.ecmaVersion >= 6 && !isAsync) {
    if (this.type === types$1.star && (statement & FUNC_HANGING_STATEMENT))
      { this.unexpected(); }
    node.generator = this.eat(types$1.star);
  }
  if (this.options.ecmaVersion >= 8)
    { node.async = !!isAsync; }

  if (statement & FUNC_STATEMENT) {
    node.id = (statement & FUNC_NULLABLE_ID) && this.type !== types$1.name ? null : this.parseIdent();
    if (node.id && !(statement & FUNC_HANGING_STATEMENT))
      // If it is a regular function declaration in sloppy mode, then it is
      // subject to Annex B semantics (BIND_FUNCTION). Otherwise, the binding
      // mode depends on properties of the current scope (see
      // treatFunctionsAsVar).
      { this.checkLValSimple(node.id, (this.strict || node.generator || node.async) ? this.treatFunctionsAsVar ? BIND_VAR : BIND_LEXICAL : BIND_FUNCTION); }
  }

  var oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
  this.yieldPos = 0;
  this.awaitPos = 0;
  this.awaitIdentPos = 0;
  this.enterScope(functionFlags(node.async, node.generator));

  if (!(statement & FUNC_STATEMENT))
    { node.id = this.type === types$1.name ? this.parseIdent() : null; }

  this.parseFunctionParams(node);
  this.parseFunctionBody(node, allowExpressionBody, false, forInit);

  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.awaitIdentPos = oldAwaitIdentPos;
  return this.finishNode(node, (statement & FUNC_STATEMENT) ? "FunctionDeclaration" : "FunctionExpression")
};

pp$8.parseFunctionParams = function(node) {
  this.expect(types$1.parenL);
  node.params = this.parseBindingList(types$1.parenR, false, this.options.ecmaVersion >= 8);
  this.checkYieldAwaitInDefaultParams();
};

// Parse a class declaration or literal (depending on the
// \`isStatement\` parameter).

pp$8.parseClass = function(node, isStatement) {
  this.next();

  // ecma-262 14.6 Class Definitions
  // A class definition is always strict mode code.
  var oldStrict = this.strict;
  this.strict = true;

  this.parseClassId(node, isStatement);
  this.parseClassSuper(node);
  var privateNameMap = this.enterClassBody();
  var classBody = this.startNode();
  var hadConstructor = false;
  classBody.body = [];
  this.expect(types$1.braceL);
  while (this.type !== types$1.braceR) {
    var element = this.parseClassElement(node.superClass !== null);
    if (element) {
      classBody.body.push(element);
      if (element.type === "MethodDefinition" && element.kind === "constructor") {
        if (hadConstructor) { this.raiseRecoverable(element.start, "Duplicate constructor in the same class"); }
        hadConstructor = true;
      } else if (element.key && element.key.type === "PrivateIdentifier" && isPrivateNameConflicted(privateNameMap, element)) {
        this.raiseRecoverable(element.key.start, ("Identifier '#" + (element.key.name) + "' has already been declared"));
      }
    }
  }
  this.strict = oldStrict;
  this.next();
  node.body = this.finishNode(classBody, "ClassBody");
  this.exitClassBody();
  return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression")
};

pp$8.parseClassElement = function(constructorAllowsSuper) {
  if (this.eat(types$1.semi)) { return null }

  var ecmaVersion = this.options.ecmaVersion;
  var node = this.startNode();
  var keyName = "";
  var isGenerator = false;
  var isAsync = false;
  var kind = "method";
  var isStatic = false;

  if (this.eatContextual("static")) {
    // Parse static init block
    if (ecmaVersion >= 13 && this.eat(types$1.braceL)) {
      this.parseClassStaticBlock(node);
      return node
    }
    if (this.isClassElementNameStart() || this.type === types$1.star) {
      isStatic = true;
    } else {
      keyName = "static";
    }
  }
  node.static = isStatic;
  if (!keyName && ecmaVersion >= 8 && this.eatContextual("async")) {
    if ((this.isClassElementNameStart() || this.type === types$1.star) && !this.canInsertSemicolon()) {
      isAsync = true;
    } else {
      keyName = "async";
    }
  }
  if (!keyName && (ecmaVersion >= 9 || !isAsync) && this.eat(types$1.star)) {
    isGenerator = true;
  }
  if (!keyName && !isAsync && !isGenerator) {
    var lastValue = this.value;
    if (this.eatContextual("get") || this.eatContextual("set")) {
      if (this.isClassElementNameStart()) {
        kind = lastValue;
      } else {
        keyName = lastValue;
      }
    }
  }

  // Parse element name
  if (keyName) {
    // 'async', 'get', 'set', or 'static' were not a keyword contextually.
    // The last token is any of those. Make it the element name.
    node.computed = false;
    node.key = this.startNodeAt(this.lastTokStart, this.lastTokStartLoc);
    node.key.name = keyName;
    this.finishNode(node.key, "Identifier");
  } else {
    this.parseClassElementName(node);
  }

  // Parse element value
  if (ecmaVersion < 13 || this.type === types$1.parenL || kind !== "method" || isGenerator || isAsync) {
    var isConstructor = !node.static && checkKeyName(node, "constructor");
    var allowsDirectSuper = isConstructor && constructorAllowsSuper;
    // Couldn't move this check into the 'parseClassMethod' method for backward compatibility.
    if (isConstructor && kind !== "method") { this.raise(node.key.start, "Constructor can't have get/set modifier"); }
    node.kind = isConstructor ? "constructor" : kind;
    this.parseClassMethod(node, isGenerator, isAsync, allowsDirectSuper);
  } else {
    this.parseClassField(node);
  }

  return node
};

pp$8.isClassElementNameStart = function() {
  return (
    this.type === types$1.name ||
    this.type === types$1.privateId ||
    this.type === types$1.num ||
    this.type === types$1.string ||
    this.type === types$1.bracketL ||
    this.type.keyword
  )
};

pp$8.parseClassElementName = function(element) {
  if (this.type === types$1.privateId) {
    if (this.value === "constructor") {
      this.raise(this.start, "Classes can't have an element named '#constructor'");
    }
    element.computed = false;
    element.key = this.parsePrivateIdent();
  } else {
    this.parsePropertyName(element);
  }
};

pp$8.parseClassMethod = function(method, isGenerator, isAsync, allowsDirectSuper) {
  // Check key and flags
  var key = method.key;
  if (method.kind === "constructor") {
    if (isGenerator) { this.raise(key.start, "Constructor can't be a generator"); }
    if (isAsync) { this.raise(key.start, "Constructor can't be an async method"); }
  } else if (method.static && checkKeyName(method, "prototype")) {
    this.raise(key.start, "Classes may not have a static property named prototype");
  }

  // Parse value
  var value = method.value = this.parseMethod(isGenerator, isAsync, allowsDirectSuper);

  // Check value
  if (method.kind === "get" && value.params.length !== 0)
    { this.raiseRecoverable(value.start, "getter should have no params"); }
  if (method.kind === "set" && value.params.length !== 1)
    { this.raiseRecoverable(value.start, "setter should have exactly one param"); }
  if (method.kind === "set" && value.params[0].type === "RestElement")
    { this.raiseRecoverable(value.params[0].start, "Setter cannot use rest params"); }

  return this.finishNode(method, "MethodDefinition")
};

pp$8.parseClassField = function(field) {
  if (checkKeyName(field, "constructor")) {
    this.raise(field.key.start, "Classes can't have a field named 'constructor'");
  } else if (field.static && checkKeyName(field, "prototype")) {
    this.raise(field.key.start, "Classes can't have a static field named 'prototype'");
  }

  if (this.eat(types$1.eq)) {
    // To raise SyntaxError if 'arguments' exists in the initializer.
    this.enterScope(SCOPE_CLASS_FIELD_INIT | SCOPE_SUPER);
    field.value = this.parseMaybeAssign();
    this.exitScope();
  } else {
    field.value = null;
  }
  this.semicolon();

  return this.finishNode(field, "PropertyDefinition")
};

pp$8.parseClassStaticBlock = function(node) {
  node.body = [];

  var oldLabels = this.labels;
  this.labels = [];
  this.enterScope(SCOPE_CLASS_STATIC_BLOCK | SCOPE_SUPER);
  while (this.type !== types$1.braceR) {
    var stmt = this.parseStatement(null);
    node.body.push(stmt);
  }
  this.next();
  this.exitScope();
  this.labels = oldLabels;

  return this.finishNode(node, "StaticBlock")
};

pp$8.parseClassId = function(node, isStatement) {
  if (this.type === types$1.name) {
    node.id = this.parseIdent();
    if (isStatement)
      { this.checkLValSimple(node.id, BIND_LEXICAL, false); }
  } else {
    if (isStatement === true)
      { this.unexpected(); }
    node.id = null;
  }
};

pp$8.parseClassSuper = function(node) {
  node.superClass = this.eat(types$1._extends) ? this.parseExprSubscripts(null, false) : null;
};

pp$8.enterClassBody = function() {
  var element = {declared: Object.create(null), used: []};
  this.privateNameStack.push(element);
  return element.declared
};

pp$8.exitClassBody = function() {
  var ref = this.privateNameStack.pop();
  var declared = ref.declared;
  var used = ref.used;
  if (!this.options.checkPrivateFields) { return }
  var len = this.privateNameStack.length;
  var parent = len === 0 ? null : this.privateNameStack[len - 1];
  for (var i = 0; i < used.length; ++i) {
    var id = used[i];
    if (!hasOwn(declared, id.name)) {
      if (parent) {
        parent.used.push(id);
      } else {
        this.raiseRecoverable(id.start, ("Private field '#" + (id.name) + "' must be declared in an enclosing class"));
      }
    }
  }
};

function isPrivateNameConflicted(privateNameMap, element) {
  var name = element.key.name;
  var curr = privateNameMap[name];

  var next = "true";
  if (element.type === "MethodDefinition" && (element.kind === "get" || element.kind === "set")) {
    next = (element.static ? "s" : "i") + element.kind;
  }

  // \`class { get #a(){}; static set #a(_){} }\` is also conflict.
  if (
    curr === "iget" && next === "iset" ||
    curr === "iset" && next === "iget" ||
    curr === "sget" && next === "sset" ||
    curr === "sset" && next === "sget"
  ) {
    privateNameMap[name] = "true";
    return false
  } else if (!curr) {
    privateNameMap[name] = next;
    return false
  } else {
    return true
  }
}

function checkKeyName(node, name) {
  var computed = node.computed;
  var key = node.key;
  return !computed && (
    key.type === "Identifier" && key.name === name ||
    key.type === "Literal" && key.value === name
  )
}

// Parses module export declaration.

pp$8.parseExportAllDeclaration = function(node, exports$1) {
  if (this.options.ecmaVersion >= 11) {
    if (this.eatContextual("as")) {
      node.exported = this.parseModuleExportName();
      this.checkExport(exports$1, node.exported, this.lastTokStart);
    } else {
      node.exported = null;
    }
  }
  this.expectContextual("from");
  if (this.type !== types$1.string) { this.unexpected(); }
  node.source = this.parseExprAtom();
  if (this.options.ecmaVersion >= 16)
    { node.attributes = this.parseWithClause(); }
  this.semicolon();
  return this.finishNode(node, "ExportAllDeclaration")
};

pp$8.parseExport = function(node, exports$1) {
  this.next();
  // export * from '...'
  if (this.eat(types$1.star)) {
    return this.parseExportAllDeclaration(node, exports$1)
  }
  if (this.eat(types$1._default)) { // export default ...
    this.checkExport(exports$1, "default", this.lastTokStart);
    node.declaration = this.parseExportDefaultDeclaration();
    return this.finishNode(node, "ExportDefaultDeclaration")
  }
  // export var|const|let|function|class ...
  if (this.shouldParseExportStatement()) {
    node.declaration = this.parseExportDeclaration(node);
    if (node.declaration.type === "VariableDeclaration")
      { this.checkVariableExport(exports$1, node.declaration.declarations); }
    else
      { this.checkExport(exports$1, node.declaration.id, node.declaration.id.start); }
    node.specifiers = [];
    node.source = null;
    if (this.options.ecmaVersion >= 16)
      { node.attributes = []; }
  } else { // export { x, y as z } [from '...']
    node.declaration = null;
    node.specifiers = this.parseExportSpecifiers(exports$1);
    if (this.eatContextual("from")) {
      if (this.type !== types$1.string) { this.unexpected(); }
      node.source = this.parseExprAtom();
      if (this.options.ecmaVersion >= 16)
        { node.attributes = this.parseWithClause(); }
    } else {
      for (var i = 0, list = node.specifiers; i < list.length; i += 1) {
        // check for keywords used as local names
        var spec = list[i];

        this.checkUnreserved(spec.local);
        // check if export is defined
        this.checkLocalExport(spec.local);

        if (spec.local.type === "Literal") {
          this.raise(spec.local.start, "A string literal cannot be used as an exported binding without \`from\`.");
        }
      }

      node.source = null;
      if (this.options.ecmaVersion >= 16)
        { node.attributes = []; }
    }
    this.semicolon();
  }
  return this.finishNode(node, "ExportNamedDeclaration")
};

pp$8.parseExportDeclaration = function(node) {
  return this.parseStatement(null)
};

pp$8.parseExportDefaultDeclaration = function() {
  var isAsync;
  if (this.type === types$1._function || (isAsync = this.isAsyncFunction())) {
    var fNode = this.startNode();
    this.next();
    if (isAsync) { this.next(); }
    return this.parseFunction(fNode, FUNC_STATEMENT | FUNC_NULLABLE_ID, false, isAsync)
  } else if (this.type === types$1._class) {
    var cNode = this.startNode();
    return this.parseClass(cNode, "nullableID")
  } else {
    var declaration = this.parseMaybeAssign();
    this.semicolon();
    return declaration
  }
};

pp$8.checkExport = function(exports$1, name, pos) {
  if (!exports$1) { return }
  if (typeof name !== "string")
    { name = name.type === "Identifier" ? name.name : name.value; }
  if (hasOwn(exports$1, name))
    { this.raiseRecoverable(pos, "Duplicate export '" + name + "'"); }
  exports$1[name] = true;
};

pp$8.checkPatternExport = function(exports$1, pat) {
  var type = pat.type;
  if (type === "Identifier")
    { this.checkExport(exports$1, pat, pat.start); }
  else if (type === "ObjectPattern")
    { for (var i = 0, list = pat.properties; i < list.length; i += 1)
      {
        var prop = list[i];

        this.checkPatternExport(exports$1, prop);
      } }
  else if (type === "ArrayPattern")
    { for (var i$1 = 0, list$1 = pat.elements; i$1 < list$1.length; i$1 += 1) {
      var elt = list$1[i$1];

        if (elt) { this.checkPatternExport(exports$1, elt); }
    } }
  else if (type === "Property")
    { this.checkPatternExport(exports$1, pat.value); }
  else if (type === "AssignmentPattern")
    { this.checkPatternExport(exports$1, pat.left); }
  else if (type === "RestElement")
    { this.checkPatternExport(exports$1, pat.argument); }
};

pp$8.checkVariableExport = function(exports$1, decls) {
  if (!exports$1) { return }
  for (var i = 0, list = decls; i < list.length; i += 1)
    {
    var decl = list[i];

    this.checkPatternExport(exports$1, decl.id);
  }
};

pp$8.shouldParseExportStatement = function() {
  return this.type.keyword === "var" ||
    this.type.keyword === "const" ||
    this.type.keyword === "class" ||
    this.type.keyword === "function" ||
    this.isLet() ||
    this.isAsyncFunction()
};

// Parses a comma-separated list of module exports.

pp$8.parseExportSpecifier = function(exports$1) {
  var node = this.startNode();
  node.local = this.parseModuleExportName();

  node.exported = this.eatContextual("as") ? this.parseModuleExportName() : node.local;
  this.checkExport(
    exports$1,
    node.exported,
    node.exported.start
  );

  return this.finishNode(node, "ExportSpecifier")
};

pp$8.parseExportSpecifiers = function(exports$1) {
  var nodes = [], first = true;
  // export { x, y as z } [from '...']
  this.expect(types$1.braceL);
  while (!this.eat(types$1.braceR)) {
    if (!first) {
      this.expect(types$1.comma);
      if (this.afterTrailingComma(types$1.braceR)) { break }
    } else { first = false; }

    nodes.push(this.parseExportSpecifier(exports$1));
  }
  return nodes
};

// Parses import declaration.

pp$8.parseImport = function(node) {
  this.next();

  // import '...'
  if (this.type === types$1.string) {
    node.specifiers = empty$1;
    node.source = this.parseExprAtom();
  } else {
    node.specifiers = this.parseImportSpecifiers();
    this.expectContextual("from");
    node.source = this.type === types$1.string ? this.parseExprAtom() : this.unexpected();
  }
  if (this.options.ecmaVersion >= 16)
    { node.attributes = this.parseWithClause(); }
  this.semicolon();
  return this.finishNode(node, "ImportDeclaration")
};

// Parses a comma-separated list of module imports.

pp$8.parseImportSpecifier = function() {
  var node = this.startNode();
  node.imported = this.parseModuleExportName();

  if (this.eatContextual("as")) {
    node.local = this.parseIdent();
  } else {
    this.checkUnreserved(node.imported);
    node.local = node.imported;
  }
  this.checkLValSimple(node.local, BIND_LEXICAL);

  return this.finishNode(node, "ImportSpecifier")
};

pp$8.parseImportDefaultSpecifier = function() {
  // import defaultObj, { x, y as z } from '...'
  var node = this.startNode();
  node.local = this.parseIdent();
  this.checkLValSimple(node.local, BIND_LEXICAL);
  return this.finishNode(node, "ImportDefaultSpecifier")
};

pp$8.parseImportNamespaceSpecifier = function() {
  var node = this.startNode();
  this.next();
  this.expectContextual("as");
  node.local = this.parseIdent();
  this.checkLValSimple(node.local, BIND_LEXICAL);
  return this.finishNode(node, "ImportNamespaceSpecifier")
};

pp$8.parseImportSpecifiers = function() {
  var nodes = [], first = true;
  if (this.type === types$1.name) {
    nodes.push(this.parseImportDefaultSpecifier());
    if (!this.eat(types$1.comma)) { return nodes }
  }
  if (this.type === types$1.star) {
    nodes.push(this.parseImportNamespaceSpecifier());
    return nodes
  }
  this.expect(types$1.braceL);
  while (!this.eat(types$1.braceR)) {
    if (!first) {
      this.expect(types$1.comma);
      if (this.afterTrailingComma(types$1.braceR)) { break }
    } else { first = false; }

    nodes.push(this.parseImportSpecifier());
  }
  return nodes
};

pp$8.parseWithClause = function() {
  var nodes = [];
  if (!this.eat(types$1._with)) {
    return nodes
  }
  this.expect(types$1.braceL);
  var attributeKeys = {};
  var first = true;
  while (!this.eat(types$1.braceR)) {
    if (!first) {
      this.expect(types$1.comma);
      if (this.afterTrailingComma(types$1.braceR)) { break }
    } else { first = false; }

    var attr = this.parseImportAttribute();
    var keyName = attr.key.type === "Identifier" ? attr.key.name : attr.key.value;
    if (hasOwn(attributeKeys, keyName))
      { this.raiseRecoverable(attr.key.start, "Duplicate attribute key '" + keyName + "'"); }
    attributeKeys[keyName] = true;
    nodes.push(attr);
  }
  return nodes
};

pp$8.parseImportAttribute = function() {
  var node = this.startNode();
  node.key = this.type === types$1.string ? this.parseExprAtom() : this.parseIdent(this.options.allowReserved !== "never");
  this.expect(types$1.colon);
  if (this.type !== types$1.string) {
    this.unexpected();
  }
  node.value = this.parseExprAtom();
  return this.finishNode(node, "ImportAttribute")
};

pp$8.parseModuleExportName = function() {
  if (this.options.ecmaVersion >= 13 && this.type === types$1.string) {
    var stringLiteral = this.parseLiteral(this.value);
    if (loneSurrogate.test(stringLiteral.value)) {
      this.raise(stringLiteral.start, "An export name cannot include a lone surrogate.");
    }
    return stringLiteral
  }
  return this.parseIdent(true)
};

// Set \`ExpressionStatement#directive\` property for directive prologues.
pp$8.adaptDirectivePrologue = function(statements) {
  for (var i = 0; i < statements.length && this.isDirectiveCandidate(statements[i]); ++i) {
    statements[i].directive = statements[i].expression.raw.slice(1, -1);
  }
};
pp$8.isDirectiveCandidate = function(statement) {
  return (
    this.options.ecmaVersion >= 5 &&
    statement.type === "ExpressionStatement" &&
    statement.expression.type === "Literal" &&
    typeof statement.expression.value === "string" &&
    // Reject parenthesized strings.
    (this.input[statement.start] === "\\"" || this.input[statement.start] === "'")
  )
};

var pp$7 = Parser.prototype;

// Convert existing expression atom to assignable pattern
// if possible.

pp$7.toAssignable = function(node, isBinding, refDestructuringErrors) {
  if (this.options.ecmaVersion >= 6 && node) {
    switch (node.type) {
    case "Identifier":
      if (this.inAsync && node.name === "await")
        { this.raise(node.start, "Cannot use 'await' as identifier inside an async function"); }
      break

    case "ObjectPattern":
    case "ArrayPattern":
    case "AssignmentPattern":
    case "RestElement":
      break

    case "ObjectExpression":
      node.type = "ObjectPattern";
      if (refDestructuringErrors) { this.checkPatternErrors(refDestructuringErrors, true); }
      for (var i = 0, list = node.properties; i < list.length; i += 1) {
        var prop = list[i];

      this.toAssignable(prop, isBinding);
        // Early error:
        //   AssignmentRestProperty[Yield, Await] :
        //     \`...\` DestructuringAssignmentTarget[Yield, Await]
        //
        //   It is a Syntax Error if |DestructuringAssignmentTarget| is an |ArrayLiteral| or an |ObjectLiteral|.
        if (
          prop.type === "RestElement" &&
          (prop.argument.type === "ArrayPattern" || prop.argument.type === "ObjectPattern")
        ) {
          this.raise(prop.argument.start, "Unexpected token");
        }
      }
      break

    case "Property":
      // AssignmentProperty has type === "Property"
      if (node.kind !== "init") { this.raise(node.key.start, "Object pattern can't contain getter or setter"); }
      this.toAssignable(node.value, isBinding);
      break

    case "ArrayExpression":
      node.type = "ArrayPattern";
      if (refDestructuringErrors) { this.checkPatternErrors(refDestructuringErrors, true); }
      this.toAssignableList(node.elements, isBinding);
      break

    case "SpreadElement":
      node.type = "RestElement";
      this.toAssignable(node.argument, isBinding);
      if (node.argument.type === "AssignmentPattern")
        { this.raise(node.argument.start, "Rest elements cannot have a default value"); }
      break

    case "AssignmentExpression":
      if (node.operator !== "=") { this.raise(node.left.end, "Only '=' operator can be used for specifying default value."); }
      node.type = "AssignmentPattern";
      delete node.operator;
      this.toAssignable(node.left, isBinding);
      break

    case "ParenthesizedExpression":
      this.toAssignable(node.expression, isBinding, refDestructuringErrors);
      break

    case "ChainExpression":
      this.raiseRecoverable(node.start, "Optional chaining cannot appear in left-hand side");
      break

    case "MemberExpression":
      if (!isBinding) { break }

    default:
      this.raise(node.start, "Assigning to rvalue");
    }
  } else if (refDestructuringErrors) { this.checkPatternErrors(refDestructuringErrors, true); }
  return node
};

// Convert list of expression atoms to binding list.

pp$7.toAssignableList = function(exprList, isBinding) {
  var end = exprList.length;
  for (var i = 0; i < end; i++) {
    var elt = exprList[i];
    if (elt) { this.toAssignable(elt, isBinding); }
  }
  if (end) {
    var last = exprList[end - 1];
    if (this.options.ecmaVersion === 6 && isBinding && last && last.type === "RestElement" && last.argument.type !== "Identifier")
      { this.unexpected(last.argument.start); }
  }
  return exprList
};

// Parses spread element.

pp$7.parseSpread = function(refDestructuringErrors) {
  var node = this.startNode();
  this.next();
  node.argument = this.parseMaybeAssign(false, refDestructuringErrors);
  return this.finishNode(node, "SpreadElement")
};

pp$7.parseRestBinding = function() {
  var node = this.startNode();
  this.next();

  // RestElement inside of a function parameter must be an identifier
  if (this.options.ecmaVersion === 6 && this.type !== types$1.name)
    { this.unexpected(); }

  node.argument = this.parseBindingAtom();

  return this.finishNode(node, "RestElement")
};

// Parses lvalue (assignable) atom.

pp$7.parseBindingAtom = function() {
  if (this.options.ecmaVersion >= 6) {
    switch (this.type) {
    case types$1.bracketL:
      var node = this.startNode();
      this.next();
      node.elements = this.parseBindingList(types$1.bracketR, true, true);
      return this.finishNode(node, "ArrayPattern")

    case types$1.braceL:
      return this.parseObj(true)
    }
  }
  return this.parseIdent()
};

pp$7.parseBindingList = function(close, allowEmpty, allowTrailingComma, allowModifiers) {
  var elts = [], first = true;
  while (!this.eat(close)) {
    if (first) { first = false; }
    else { this.expect(types$1.comma); }
    if (allowEmpty && this.type === types$1.comma) {
      elts.push(null);
    } else if (allowTrailingComma && this.afterTrailingComma(close)) {
      break
    } else if (this.type === types$1.ellipsis) {
      var rest = this.parseRestBinding();
      this.parseBindingListItem(rest);
      elts.push(rest);
      if (this.type === types$1.comma) { this.raiseRecoverable(this.start, "Comma is not permitted after the rest element"); }
      this.expect(close);
      break
    } else {
      elts.push(this.parseAssignableListItem(allowModifiers));
    }
  }
  return elts
};

pp$7.parseAssignableListItem = function(allowModifiers) {
  var elem = this.parseMaybeDefault(this.start, this.startLoc);
  this.parseBindingListItem(elem);
  return elem
};

pp$7.parseBindingListItem = function(param) {
  return param
};

// Parses assignment pattern around given atom if possible.

pp$7.parseMaybeDefault = function(startPos, startLoc, left) {
  left = left || this.parseBindingAtom();
  if (this.options.ecmaVersion < 6 || !this.eat(types$1.eq)) { return left }
  var node = this.startNodeAt(startPos, startLoc);
  node.left = left;
  node.right = this.parseMaybeAssign();
  return this.finishNode(node, "AssignmentPattern")
};

// The following three functions all verify that a node is an lvalue —
// something that can be bound, or assigned to. In order to do so, they perform
// a variety of checks:
//
// - Check that none of the bound/assigned-to identifiers are reserved words.
// - Record name declarations for bindings in the appropriate scope.
// - Check duplicate argument names, if checkClashes is set.
//
// If a complex binding pattern is encountered (e.g., object and array
// destructuring), the entire pattern is recursively checked.
//
// There are three versions of checkLVal*() appropriate for different
// circumstances:
//
// - checkLValSimple() shall be used if the syntactic construct supports
//   nothing other than identifiers and member expressions. Parenthesized
//   expressions are also correctly handled. This is generally appropriate for
//   constructs for which the spec says
//
//   > It is a Syntax Error if AssignmentTargetType of [the production] is not
//   > simple.
//
//   It is also appropriate for checking if an identifier is valid and not
//   defined elsewhere, like import declarations or function/class identifiers.
//
//   Examples where this is used include:
//     a += …;
//     import a from '…';
//   where a is the node to be checked.
//
// - checkLValPattern() shall be used if the syntactic construct supports
//   anything checkLValSimple() supports, as well as object and array
//   destructuring patterns. This is generally appropriate for constructs for
//   which the spec says
//
//   > It is a Syntax Error if [the production] is neither an ObjectLiteral nor
//   > an ArrayLiteral and AssignmentTargetType of [the production] is not
//   > simple.
//
//   Examples where this is used include:
//     (a = …);
//     const a = …;
//     try { … } catch (a) { … }
//   where a is the node to be checked.
//
// - checkLValInnerPattern() shall be used if the syntactic construct supports
//   anything checkLValPattern() supports, as well as default assignment
//   patterns, rest elements, and other constructs that may appear within an
//   object or array destructuring pattern.
//
//   As a special case, function parameters also use checkLValInnerPattern(),
//   as they also support defaults and rest constructs.
//
// These functions deliberately support both assignment and binding constructs,
// as the logic for both is exceedingly similar. If the node is the target of
// an assignment, then bindingType should be set to BIND_NONE. Otherwise, it
// should be set to the appropriate BIND_* constant, like BIND_VAR or
// BIND_LEXICAL.
//
// If the function is called with a non-BIND_NONE bindingType, then
// additionally a checkClashes object may be specified to allow checking for
// duplicate argument names. checkClashes is ignored if the provided construct
// is an assignment (i.e., bindingType is BIND_NONE).

pp$7.checkLValSimple = function(expr, bindingType, checkClashes) {
  if ( bindingType === void 0 ) bindingType = BIND_NONE;

  var isBind = bindingType !== BIND_NONE;

  switch (expr.type) {
  case "Identifier":
    if (this.strict && this.reservedWordsStrictBind.test(expr.name))
      { this.raiseRecoverable(expr.start, (isBind ? "Binding " : "Assigning to ") + expr.name + " in strict mode"); }
    if (isBind) {
      if (bindingType === BIND_LEXICAL && expr.name === "let")
        { this.raiseRecoverable(expr.start, "let is disallowed as a lexically bound name"); }
      if (checkClashes) {
        if (hasOwn(checkClashes, expr.name))
          { this.raiseRecoverable(expr.start, "Argument name clash"); }
        checkClashes[expr.name] = true;
      }
      if (bindingType !== BIND_OUTSIDE) { this.declareName(expr.name, bindingType, expr.start); }
    }
    break

  case "ChainExpression":
    this.raiseRecoverable(expr.start, "Optional chaining cannot appear in left-hand side");
    break

  case "MemberExpression":
    if (isBind) { this.raiseRecoverable(expr.start, "Binding member expression"); }
    break

  case "ParenthesizedExpression":
    if (isBind) { this.raiseRecoverable(expr.start, "Binding parenthesized expression"); }
    return this.checkLValSimple(expr.expression, bindingType, checkClashes)

  default:
    this.raise(expr.start, (isBind ? "Binding" : "Assigning to") + " rvalue");
  }
};

pp$7.checkLValPattern = function(expr, bindingType, checkClashes) {
  if ( bindingType === void 0 ) bindingType = BIND_NONE;

  switch (expr.type) {
  case "ObjectPattern":
    for (var i = 0, list = expr.properties; i < list.length; i += 1) {
      var prop = list[i];

    this.checkLValInnerPattern(prop, bindingType, checkClashes);
    }
    break

  case "ArrayPattern":
    for (var i$1 = 0, list$1 = expr.elements; i$1 < list$1.length; i$1 += 1) {
      var elem = list$1[i$1];

    if (elem) { this.checkLValInnerPattern(elem, bindingType, checkClashes); }
    }
    break

  default:
    this.checkLValSimple(expr, bindingType, checkClashes);
  }
};

pp$7.checkLValInnerPattern = function(expr, bindingType, checkClashes) {
  if ( bindingType === void 0 ) bindingType = BIND_NONE;

  switch (expr.type) {
  case "Property":
    // AssignmentProperty has type === "Property"
    this.checkLValInnerPattern(expr.value, bindingType, checkClashes);
    break

  case "AssignmentPattern":
    this.checkLValPattern(expr.left, bindingType, checkClashes);
    break

  case "RestElement":
    this.checkLValPattern(expr.argument, bindingType, checkClashes);
    break

  default:
    this.checkLValPattern(expr, bindingType, checkClashes);
  }
};

// The algorithm used to determine whether a regexp can appear at a
// given point in the program is loosely based on sweet.js' approach.
// See https://github.com/mozilla/sweet.js/wiki/design


var TokContext = function TokContext(token, isExpr, preserveSpace, override, generator) {
  this.token = token;
  this.isExpr = !!isExpr;
  this.preserveSpace = !!preserveSpace;
  this.override = override;
  this.generator = !!generator;
};

var types = {
  b_stat: new TokContext("{", false),
  b_expr: new TokContext("{", true),
  b_tmpl: new TokContext("\${", false),
  p_stat: new TokContext("(", false),
  p_expr: new TokContext("(", true),
  q_tmpl: new TokContext("\`", true, true, function (p) { return p.tryReadTemplateToken(); }),
  f_stat: new TokContext("function", false),
  f_expr: new TokContext("function", true),
  f_expr_gen: new TokContext("function", true, false, null, true),
  f_gen: new TokContext("function", false, false, null, true)
};

var pp$6 = Parser.prototype;

pp$6.initialContext = function() {
  return [types.b_stat]
};

pp$6.curContext = function() {
  return this.context[this.context.length - 1]
};

pp$6.braceIsBlock = function(prevType) {
  var parent = this.curContext();
  if (parent === types.f_expr || parent === types.f_stat)
    { return true }
  if (prevType === types$1.colon && (parent === types.b_stat || parent === types.b_expr))
    { return !parent.isExpr }

  // The check for \`tt.name && exprAllowed\` detects whether we are
  // after a \`yield\` or \`of\` construct. See the \`updateContext\` for
  // \`tt.name\`.
  if (prevType === types$1._return || prevType === types$1.name && this.exprAllowed)
    { return lineBreak.test(this.input.slice(this.lastTokEnd, this.start)) }
  if (prevType === types$1._else || prevType === types$1.semi || prevType === types$1.eof || prevType === types$1.parenR || prevType === types$1.arrow)
    { return true }
  if (prevType === types$1.braceL)
    { return parent === types.b_stat }
  if (prevType === types$1._var || prevType === types$1._const || prevType === types$1.name)
    { return false }
  return !this.exprAllowed
};

pp$6.inGeneratorContext = function() {
  for (var i = this.context.length - 1; i >= 1; i--) {
    var context = this.context[i];
    if (context.token === "function")
      { return context.generator }
  }
  return false
};

pp$6.updateContext = function(prevType) {
  var update, type = this.type;
  if (type.keyword && prevType === types$1.dot)
    { this.exprAllowed = false; }
  else if (update = type.updateContext)
    { update.call(this, prevType); }
  else
    { this.exprAllowed = type.beforeExpr; }
};

// Used to handle edge cases when token context could not be inferred correctly during tokenization phase

pp$6.overrideContext = function(tokenCtx) {
  if (this.curContext() !== tokenCtx) {
    this.context[this.context.length - 1] = tokenCtx;
  }
};

// Token-specific context update code

types$1.parenR.updateContext = types$1.braceR.updateContext = function() {
  if (this.context.length === 1) {
    this.exprAllowed = true;
    return
  }
  var out = this.context.pop();
  if (out === types.b_stat && this.curContext().token === "function") {
    out = this.context.pop();
  }
  this.exprAllowed = !out.isExpr;
};

types$1.braceL.updateContext = function(prevType) {
  this.context.push(this.braceIsBlock(prevType) ? types.b_stat : types.b_expr);
  this.exprAllowed = true;
};

types$1.dollarBraceL.updateContext = function() {
  this.context.push(types.b_tmpl);
  this.exprAllowed = true;
};

types$1.parenL.updateContext = function(prevType) {
  var statementParens = prevType === types$1._if || prevType === types$1._for || prevType === types$1._with || prevType === types$1._while;
  this.context.push(statementParens ? types.p_stat : types.p_expr);
  this.exprAllowed = true;
};

types$1.incDec.updateContext = function() {
  // tokExprAllowed stays unchanged
};

types$1._function.updateContext = types$1._class.updateContext = function(prevType) {
  if (prevType.beforeExpr && prevType !== types$1._else &&
      !(prevType === types$1.semi && this.curContext() !== types.p_stat) &&
      !(prevType === types$1._return && lineBreak.test(this.input.slice(this.lastTokEnd, this.start))) &&
      !((prevType === types$1.colon || prevType === types$1.braceL) && this.curContext() === types.b_stat))
    { this.context.push(types.f_expr); }
  else
    { this.context.push(types.f_stat); }
  this.exprAllowed = false;
};

types$1.colon.updateContext = function() {
  if (this.curContext().token === "function") { this.context.pop(); }
  this.exprAllowed = true;
};

types$1.backQuote.updateContext = function() {
  if (this.curContext() === types.q_tmpl)
    { this.context.pop(); }
  else
    { this.context.push(types.q_tmpl); }
  this.exprAllowed = false;
};

types$1.star.updateContext = function(prevType) {
  if (prevType === types$1._function) {
    var index = this.context.length - 1;
    if (this.context[index] === types.f_expr)
      { this.context[index] = types.f_expr_gen; }
    else
      { this.context[index] = types.f_gen; }
  }
  this.exprAllowed = true;
};

types$1.name.updateContext = function(prevType) {
  var allowed = false;
  if (this.options.ecmaVersion >= 6 && prevType !== types$1.dot) {
    if (this.value === "of" && !this.exprAllowed ||
        this.value === "yield" && this.inGeneratorContext())
      { allowed = true; }
  }
  this.exprAllowed = allowed;
};

// A recursive descent parser operates by defining functions for all
// syntactic elements, and recursively calling those, each function
// advancing the input stream and returning an AST node. Precedence
// of constructs (for example, the fact that \`!x[1]\` means \`!(x[1])\`
// instead of \`(!x)[1]\` is handled by the fact that the parser
// function that parses unary prefix operators is called first, and
// in turn calls the function that parses \`[]\` subscripts — that
// way, it'll receive the node for \`x[1]\` already parsed, and wraps
// *that* in the unary operator node.
//
// Acorn uses an [operator precedence parser][opp] to handle binary
// operator precedence, because it is much more compact than using
// the technique outlined above, which uses different, nesting
// functions to specify precedence, for all of the ten binary
// precedence levels that JavaScript defines.
//
// [opp]: http://en.wikipedia.org/wiki/Operator-precedence_parser


var pp$5 = Parser.prototype;

// Check if property name clashes with already added.
// Object/class getters and setters are not allowed to clash —
// either with each other or with an init property — and in
// strict mode, init properties are also not allowed to be repeated.

pp$5.checkPropClash = function(prop, propHash, refDestructuringErrors) {
  if (this.options.ecmaVersion >= 9 && prop.type === "SpreadElement")
    { return }
  if (this.options.ecmaVersion >= 6 && (prop.computed || prop.method || prop.shorthand))
    { return }
  var key = prop.key;
  var name;
  switch (key.type) {
  case "Identifier": name = key.name; break
  case "Literal": name = String(key.value); break
  default: return
  }
  var kind = prop.kind;
  if (this.options.ecmaVersion >= 6) {
    if (name === "__proto__" && kind === "init") {
      if (propHash.proto) {
        if (refDestructuringErrors) {
          if (refDestructuringErrors.doubleProto < 0) {
            refDestructuringErrors.doubleProto = key.start;
          }
        } else {
          this.raiseRecoverable(key.start, "Redefinition of __proto__ property");
        }
      }
      propHash.proto = true;
    }
    return
  }
  name = "$" + name;
  var other = propHash[name];
  if (other) {
    var redefinition;
    if (kind === "init") {
      redefinition = this.strict && other.init || other.get || other.set;
    } else {
      redefinition = other.init || other[kind];
    }
    if (redefinition)
      { this.raiseRecoverable(key.start, "Redefinition of property"); }
  } else {
    other = propHash[name] = {
      init: false,
      get: false,
      set: false
    };
  }
  other[kind] = true;
};

// ### Expression parsing

// These nest, from the most general expression type at the top to
// 'atomic', nondivisible expression types at the bottom. Most of
// the functions will simply let the function(s) below them parse,
// and, *if* the syntactic construct they handle is present, wrap
// the AST node that the inner parser gave them in another node.

// Parse a full expression. The optional arguments are used to
// forbid the \`in\` operator (in for loops initalization expressions)
// and provide reference for storing '=' operator inside shorthand
// property assignment in contexts where both object expression
// and object pattern might appear (so it's possible to raise
// delayed syntax error at correct position).

pp$5.parseExpression = function(forInit, refDestructuringErrors) {
  var this$1$1 = this;

  return this.catchStackOverflow(function () {
    var startPos = this$1$1.start, startLoc = this$1$1.startLoc;
    var expr = this$1$1.parseMaybeAssign(forInit, refDestructuringErrors);
    if (this$1$1.type === types$1.comma) {
      var node = this$1$1.startNodeAt(startPos, startLoc);
      node.expressions = [expr];
      while (this$1$1.eat(types$1.comma)) { node.expressions.push(this$1$1.parseMaybeAssign(forInit, refDestructuringErrors)); }
      return this$1$1.finishNode(node, "SequenceExpression")
    }
    return expr
  })
};

// Parse an assignment expression. This includes applications of
// operators like \`+=\`.

pp$5.parseMaybeAssign = function(forInit, refDestructuringErrors, afterLeftParse) {
  if (this.isContextual("yield")) {
    if (this.inGenerator) { return this.parseYield(forInit) }
    // The tokenizer will assume an expression is allowed after
    // \`yield\`, but this isn't that kind of yield
    else { this.exprAllowed = false; }
  }

  var ownDestructuringErrors = false, oldParenAssign = -1, oldTrailingComma = -1, oldDoubleProto = -1;
  if (refDestructuringErrors) {
    oldParenAssign = refDestructuringErrors.parenthesizedAssign;
    oldTrailingComma = refDestructuringErrors.trailingComma;
    oldDoubleProto = refDestructuringErrors.doubleProto;
    refDestructuringErrors.parenthesizedAssign = refDestructuringErrors.trailingComma = -1;
  } else {
    refDestructuringErrors = new DestructuringErrors;
    ownDestructuringErrors = true;
  }

  var startPos = this.start, startLoc = this.startLoc;
  if (this.type === types$1.parenL || this.type === types$1.name) {
    this.potentialArrowAt = this.start;
    this.potentialArrowInForAwait = forInit === "await";
  }
  var left = this.parseMaybeConditional(forInit, refDestructuringErrors);
  if (afterLeftParse) { left = afterLeftParse.call(this, left, startPos, startLoc); }
  if (this.type.isAssign) {
    var node = this.startNodeAt(startPos, startLoc);
    node.operator = this.value;
    if (this.type === types$1.eq)
      { left = this.toAssignable(left, false, refDestructuringErrors); }
    if (!ownDestructuringErrors) {
      refDestructuringErrors.parenthesizedAssign = refDestructuringErrors.trailingComma = refDestructuringErrors.doubleProto = -1;
    }
    if (refDestructuringErrors.shorthandAssign >= left.start)
      { refDestructuringErrors.shorthandAssign = -1; } // reset because shorthand default was used correctly
    if (this.type === types$1.eq)
      { this.checkLValPattern(left); }
    else
      { this.checkLValSimple(left); }
    node.left = left;
    this.next();
    node.right = this.parseMaybeAssign(forInit);
    if (oldDoubleProto > -1) { refDestructuringErrors.doubleProto = oldDoubleProto; }
    return this.finishNode(node, "AssignmentExpression")
  } else {
    if (ownDestructuringErrors) { this.checkExpressionErrors(refDestructuringErrors, true); }
  }
  if (oldParenAssign > -1) { refDestructuringErrors.parenthesizedAssign = oldParenAssign; }
  if (oldTrailingComma > -1) { refDestructuringErrors.trailingComma = oldTrailingComma; }
  return left
};

// Parse a ternary conditional (\`?:\`) operator.

pp$5.parseMaybeConditional = function(forInit, refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseExprOps(forInit, refDestructuringErrors);
  if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
  if (!(expr.type === "ArrowFunctionExpression" && expr.start === startPos) && this.eat(types$1.question)) {
    var node = this.startNodeAt(startPos, startLoc);
    node.test = expr;
    node.consequent = this.parseMaybeAssign();
    this.expect(types$1.colon);
    node.alternate = this.parseMaybeAssign(forInit);
    return this.finishNode(node, "ConditionalExpression")
  }
  return expr
};

// Start the precedence parser.

pp$5.parseExprOps = function(forInit, refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseMaybeUnary(refDestructuringErrors, false, false, forInit);
  if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
  return expr.start === startPos && expr.type === "ArrowFunctionExpression" ? expr : this.parseExprOp(expr, startPos, startLoc, -1, forInit)
};

// Parse binary operators with the operator precedence parsing
// algorithm. \`left\` is the left-hand side of the operator.
// \`minPrec\` provides context that allows the function to stop and
// defer further parser to one of its callers when it encounters an
// operator that has a lower precedence than the set it is parsing.

pp$5.parseExprOp = function(left, leftStartPos, leftStartLoc, minPrec, forInit) {
  var prec = this.type.binop;
  if (prec != null && (!forInit || this.type !== types$1._in)) {
    if (prec > minPrec) {
      var logical = this.type === types$1.logicalOR || this.type === types$1.logicalAND;
      var coalesce = this.type === types$1.coalesce;
      if (coalesce) {
        // Handle the precedence of \`tt.coalesce\` as equal to the range of logical expressions.
        // In other words, \`node.right\` shouldn't contain logical expressions in order to check the mixed error.
        prec = types$1.logicalAND.binop;
      }
      var op = this.value;
      this.next();
      var startPos = this.start, startLoc = this.startLoc;
      var right = this.parseExprOp(this.parseMaybeUnary(null, false, false, forInit), startPos, startLoc, prec, forInit);
      var node = this.buildBinary(leftStartPos, leftStartLoc, left, right, op, logical || coalesce);
      if ((logical && this.type === types$1.coalesce) || (coalesce && (this.type === types$1.logicalOR || this.type === types$1.logicalAND))) {
        this.raiseRecoverable(this.start, "Logical expressions and coalesce expressions cannot be mixed. Wrap either by parentheses");
      }
      return this.parseExprOp(node, leftStartPos, leftStartLoc, minPrec, forInit)
    }
  }
  return left
};

pp$5.buildBinary = function(startPos, startLoc, left, right, op, logical) {
  if (right.type === "PrivateIdentifier") { this.raise(right.start, "Private identifier can only be left side of binary expression"); }
  var node = this.startNodeAt(startPos, startLoc);
  node.left = left;
  node.operator = op;
  node.right = right;
  return this.finishNode(node, logical ? "LogicalExpression" : "BinaryExpression")
};

// Parse unary operators, both prefix and postfix.

pp$5.parseMaybeUnary = function(refDestructuringErrors, sawUnary, incDec, forInit) {
  var startPos = this.start, startLoc = this.startLoc, expr;
  if (this.isContextual("await") && this.canAwait) {
    expr = this.parseAwait(forInit);
    sawUnary = true;
  } else if (this.type.prefix) {
    var node = this.startNode(), update = this.type === types$1.incDec;
    node.operator = this.value;
    node.prefix = true;
    this.next();
    node.argument = this.parseMaybeUnary(null, true, update, forInit);
    this.checkExpressionErrors(refDestructuringErrors, true);
    if (update) { this.checkLValSimple(node.argument); }
    else if (this.strict && node.operator === "delete" && isLocalVariableAccess(node.argument))
      { this.raiseRecoverable(node.start, "Deleting local variable in strict mode"); }
    else if (node.operator === "delete" && isPrivateFieldAccess(node.argument))
      { this.raiseRecoverable(node.start, "Private fields can not be deleted"); }
    else { sawUnary = true; }
    expr = this.finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
  } else if (!sawUnary && this.type === types$1.privateId) {
    if ((forInit || this.privateNameStack.length === 0) && this.options.checkPrivateFields) { this.unexpected(); }
    expr = this.parsePrivateIdent();
    // only could be private fields in 'in', such as #x in obj
    if (this.type !== types$1._in) { this.unexpected(); }
  } else {
    expr = this.parseExprSubscripts(refDestructuringErrors, forInit);
    if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
    while (this.type.postfix && !this.canInsertSemicolon()) {
      var node$1 = this.startNodeAt(startPos, startLoc);
      node$1.operator = this.value;
      node$1.prefix = false;
      node$1.argument = expr;
      this.checkLValSimple(expr);
      this.next();
      expr = this.finishNode(node$1, "UpdateExpression");
    }
  }

  if (!incDec && !(expr.type === "ArrowFunctionExpression" && expr.start === startPos) && this.eat(types$1.starstar)) {
    if (sawUnary)
      { this.unexpected(this.lastTokStart); }
    else
      { return this.buildBinary(startPos, startLoc, expr, this.parseMaybeUnary(null, false, false, forInit), "**", false) }
  } else {
    return expr
  }
};

function isLocalVariableAccess(node) {
  return (
    node.type === "Identifier" ||
    node.type === "ParenthesizedExpression" && isLocalVariableAccess(node.expression)
  )
}

function isPrivateFieldAccess(node) {
  return (
    node.type === "MemberExpression" && node.property.type === "PrivateIdentifier" ||
    node.type === "ChainExpression" && isPrivateFieldAccess(node.expression) ||
    node.type === "ParenthesizedExpression" && isPrivateFieldAccess(node.expression)
  )
}

// Parse call, dot, and \`[]\`-subscript expressions.

pp$5.parseExprSubscripts = function(refDestructuringErrors, forInit) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseExprAtom(refDestructuringErrors, forInit);
  if (expr.type === "ArrowFunctionExpression" && this.input.slice(this.lastTokStart, this.lastTokEnd) !== ")")
    { return expr }
  var result = this.parseSubscripts(expr, startPos, startLoc, false, forInit);
  if (refDestructuringErrors && result.type === "MemberExpression") {
    if (refDestructuringErrors.parenthesizedAssign >= result.start) { refDestructuringErrors.parenthesizedAssign = -1; }
    if (refDestructuringErrors.parenthesizedBind >= result.start) { refDestructuringErrors.parenthesizedBind = -1; }
    if (refDestructuringErrors.trailingComma >= result.start) { refDestructuringErrors.trailingComma = -1; }
  }
  return result
};

pp$5.parseSubscripts = function(base, startPos, startLoc, noCalls, forInit) {
  var maybeAsyncArrow = this.options.ecmaVersion >= 8 && base.type === "Identifier" && base.name === "async" &&
      this.lastTokEnd === base.end && !this.canInsertSemicolon() && base.end - base.start === 5 &&
      this.potentialArrowAt === base.start;
  var optionalChained = false;

  while (true) {
    var element = this.parseSubscript(base, startPos, startLoc, noCalls, maybeAsyncArrow, optionalChained, forInit);

    if (element.optional) { optionalChained = true; }
    if (element === base || element.type === "ArrowFunctionExpression") {
      if (optionalChained) {
        var chainNode = this.startNodeAt(startPos, startLoc);
        chainNode.expression = element;
        element = this.finishNode(chainNode, "ChainExpression");
      }
      return element
    }

    base = element;
  }
};

pp$5.shouldParseAsyncArrow = function() {
  return !this.canInsertSemicolon() && this.eat(types$1.arrow)
};

pp$5.parseSubscriptAsyncArrow = function(startPos, startLoc, exprList, forInit) {
  return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList, true, forInit)
};

pp$5.parseSubscript = function(base, startPos, startLoc, noCalls, maybeAsyncArrow, optionalChained, forInit) {
  var optionalSupported = this.options.ecmaVersion >= 11;
  var optional = optionalSupported && this.eat(types$1.questionDot);
  if (noCalls && optional) { this.raise(this.lastTokStart, "Optional chaining cannot appear in the callee of new expressions"); }

  var computed = this.eat(types$1.bracketL);
  if (computed || (optional && this.type !== types$1.parenL && this.type !== types$1.backQuote) || this.eat(types$1.dot)) {
    var node = this.startNodeAt(startPos, startLoc);
    node.object = base;
    if (computed) {
      node.property = this.parseExpression();
      this.expect(types$1.bracketR);
    } else if (this.type === types$1.privateId && base.type !== "Super") {
      node.property = this.parsePrivateIdent();
    } else {
      node.property = this.parseIdent(this.options.allowReserved !== "never");
    }
    node.computed = !!computed;
    if (optionalSupported) {
      node.optional = optional;
    }
    base = this.finishNode(node, "MemberExpression");
  } else if (!noCalls && this.eat(types$1.parenL)) {
    var refDestructuringErrors = new DestructuringErrors, oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
    this.yieldPos = 0;
    this.awaitPos = 0;
    this.awaitIdentPos = 0;
    var exprList = this.parseExprList(types$1.parenR, this.options.ecmaVersion >= 8, false, refDestructuringErrors);
    if (maybeAsyncArrow && !optional && this.shouldParseAsyncArrow()) {
      this.checkPatternErrors(refDestructuringErrors, false);
      this.checkYieldAwaitInDefaultParams();
      if (this.awaitIdentPos > 0)
        { this.raise(this.awaitIdentPos, "Cannot use 'await' as identifier inside an async function"); }
      this.yieldPos = oldYieldPos;
      this.awaitPos = oldAwaitPos;
      this.awaitIdentPos = oldAwaitIdentPos;
      return this.parseSubscriptAsyncArrow(startPos, startLoc, exprList, forInit)
    }
    this.checkExpressionErrors(refDestructuringErrors, true);
    this.yieldPos = oldYieldPos || this.yieldPos;
    this.awaitPos = oldAwaitPos || this.awaitPos;
    this.awaitIdentPos = oldAwaitIdentPos || this.awaitIdentPos;
    var node$1 = this.startNodeAt(startPos, startLoc);
    node$1.callee = base;
    node$1.arguments = exprList;
    if (optionalSupported) {
      node$1.optional = optional;
    }
    base = this.finishNode(node$1, "CallExpression");
  } else if (this.type === types$1.backQuote) {
    if (optional || optionalChained) {
      this.raise(this.start, "Optional chaining cannot appear in the tag of tagged template expressions");
    }
    var node$2 = this.startNodeAt(startPos, startLoc);
    node$2.tag = base;
    node$2.quasi = this.parseTemplate({isTagged: true});
    base = this.finishNode(node$2, "TaggedTemplateExpression");
  }
  return base
};

// Parse an atomic expression — either a single token that is an
// expression, an expression started by a keyword like \`function\` or
// \`new\`, or an expression wrapped in punctuation like \`()\`, \`[]\`,
// or \`{}\`.

pp$5.parseExprAtom = function(refDestructuringErrors, forInit, forNew) {
  // If a division operator appears in an expression position, the
  // tokenizer got confused, and we force it to read a regexp instead.
  if (this.type === types$1.slash) { this.readRegexp(); }

  var node, canBeArrow = this.potentialArrowAt === this.start;
  switch (this.type) {
  case types$1._super:
    if (!this.allowSuper)
      { this.raise(this.start, "'super' keyword outside a method"); }
    node = this.startNode();
    this.next();
    if (this.type === types$1.parenL && !this.allowDirectSuper)
      { this.raise(node.start, "super() call outside constructor of a subclass"); }
    // The \`super\` keyword can appear at below:
    // SuperProperty:
    //     super [ Expression ]
    //     super . IdentifierName
    // SuperCall:
    //     super ( Arguments )
    if (this.type !== types$1.dot && this.type !== types$1.bracketL && this.type !== types$1.parenL)
      { this.unexpected(); }
    return this.finishNode(node, "Super")

  case types$1._this:
    node = this.startNode();
    this.next();
    return this.finishNode(node, "ThisExpression")

  case types$1.name:
    var startPos = this.start, startLoc = this.startLoc, containsEsc = this.containsEsc;
    var id = this.parseIdent(false);
    if (this.options.ecmaVersion >= 8 && !containsEsc && id.name === "async" && !this.canInsertSemicolon() && this.eat(types$1._function)) {
      this.overrideContext(types.f_expr);
      return this.parseFunction(this.startNodeAt(startPos, startLoc), 0, false, true, forInit)
    }
    if (canBeArrow && !this.canInsertSemicolon()) {
      if (this.eat(types$1.arrow))
        { return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], false, forInit) }
      if (this.options.ecmaVersion >= 8 && id.name === "async" && this.type === types$1.name && !containsEsc &&
          (!this.potentialArrowInForAwait || this.value !== "of" || this.containsEsc)) {
        id = this.parseIdent(false);
        if (this.canInsertSemicolon() || !this.eat(types$1.arrow))
          { this.unexpected(); }
        return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], true, forInit)
      }
    }
    return id

  case types$1.regexp:
    var value = this.value;
    node = this.parseLiteral(value.value);
    node.regex = {pattern: value.pattern, flags: value.flags};
    return node

  case types$1.num: case types$1.string:
    return this.parseLiteral(this.value)

  case types$1._null: case types$1._true: case types$1._false:
    node = this.startNode();
    node.value = this.type === types$1._null ? null : this.type === types$1._true;
    node.raw = this.type.keyword;
    this.next();
    return this.finishNode(node, "Literal")

  case types$1.parenL:
    var start = this.start, expr = this.parseParenAndDistinguishExpression(canBeArrow, forInit);
    if (refDestructuringErrors) {
      if (refDestructuringErrors.parenthesizedAssign < 0 && !this.isSimpleAssignTarget(expr))
        { refDestructuringErrors.parenthesizedAssign = start; }
      if (refDestructuringErrors.parenthesizedBind < 0)
        { refDestructuringErrors.parenthesizedBind = start; }
    }
    return expr

  case types$1.bracketL:
    node = this.startNode();
    this.next();
    node.elements = this.parseExprList(types$1.bracketR, true, true, refDestructuringErrors);
    return this.finishNode(node, "ArrayExpression")

  case types$1.braceL:
    this.overrideContext(types.b_expr);
    return this.parseObj(false, refDestructuringErrors)

  case types$1._function:
    node = this.startNode();
    this.next();
    return this.parseFunction(node, 0)

  case types$1._class:
    return this.parseClass(this.startNode(), false)

  case types$1._new:
    return this.parseNew()

  case types$1.backQuote:
    return this.parseTemplate()

  case types$1._import:
    if (this.options.ecmaVersion >= 11) {
      return this.parseExprImport(forNew)
    } else {
      return this.unexpected()
    }

  default:
    return this.parseExprAtomDefault()
  }
};

pp$5.parseExprAtomDefault = function() {
  this.unexpected();
};

pp$5.parseExprImport = function(forNew) {
  var node = this.startNode();

  // Consume \`import\` as an identifier for \`import.meta\`.
  // Because \`this.parseIdent(true)\` doesn't check escape sequences, it needs the check of \`this.containsEsc\`.
  if (this.containsEsc) { this.raiseRecoverable(this.start, "Escape sequence in keyword import"); }
  this.next();

  if (this.type === types$1.parenL && !forNew) {
    return this.parseDynamicImport(node)
  } else if (this.type === types$1.dot) {
    var meta = this.startNodeAt(node.start, node.loc && node.loc.start);
    meta.name = "import";
    node.meta = this.finishNode(meta, "Identifier");
    return this.parseImportMeta(node)
  } else {
    this.unexpected();
  }
};

pp$5.parseDynamicImport = function(node) {
  this.next(); // skip \`(\`

  // Parse node.source.
  node.source = this.parseMaybeAssign();

  if (this.options.ecmaVersion >= 16) {
    if (!this.eat(types$1.parenR)) {
      this.expect(types$1.comma);
      if (!this.afterTrailingComma(types$1.parenR)) {
        node.options = this.parseMaybeAssign();
        if (!this.eat(types$1.parenR)) {
          this.expect(types$1.comma);
          if (!this.afterTrailingComma(types$1.parenR)) {
            this.unexpected();
          }
        }
      } else {
        node.options = null;
      }
    } else {
      node.options = null;
    }
  } else {
    // Verify ending.
    if (!this.eat(types$1.parenR)) {
      var errorPos = this.start;
      if (this.eat(types$1.comma) && this.eat(types$1.parenR)) {
        this.raiseRecoverable(errorPos, "Trailing comma is not allowed in import()");
      } else {
        this.unexpected(errorPos);
      }
    }
  }

  return this.finishNode(node, "ImportExpression")
};

pp$5.parseImportMeta = function(node) {
  this.next(); // skip \`.\`

  var containsEsc = this.containsEsc;
  node.property = this.parseIdent(true);

  if (node.property.name !== "meta")
    { this.raiseRecoverable(node.property.start, "The only valid meta property for import is 'import.meta'"); }
  if (containsEsc)
    { this.raiseRecoverable(node.start, "'import.meta' must not contain escaped characters"); }
  if (this.options.sourceType !== "module" && !this.options.allowImportExportEverywhere)
    { this.raiseRecoverable(node.start, "Cannot use 'import.meta' outside a module"); }

  return this.finishNode(node, "MetaProperty")
};

pp$5.parseLiteral = function(value) {
  var node = this.startNode();
  node.value = value;
  node.raw = this.input.slice(this.start, this.end);
  if (node.raw.charCodeAt(node.raw.length - 1) === 110)
    { node.bigint = node.value != null ? node.value.toString() : node.raw.slice(0, -1).replace(/_/g, ""); }
  this.next();
  return this.finishNode(node, "Literal")
};

pp$5.parseParenExpression = function() {
  this.expect(types$1.parenL);
  var val = this.parseExpression();
  this.expect(types$1.parenR);
  return val
};

pp$5.shouldParseArrow = function(exprList) {
  return !this.canInsertSemicolon()
};

pp$5.parseParenAndDistinguishExpression = function(canBeArrow, forInit) {
  var startPos = this.start, startLoc = this.startLoc, val, allowTrailingComma = this.options.ecmaVersion >= 8;
  if (this.options.ecmaVersion >= 6) {
    this.next();

    var innerStartPos = this.start, innerStartLoc = this.startLoc;
    var exprList = [], first = true, lastIsComma = false;
    var refDestructuringErrors = new DestructuringErrors, oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, spreadStart;
    this.yieldPos = 0;
    this.awaitPos = 0;
    // Do not save awaitIdentPos to allow checking awaits nested in parameters
    while (this.type !== types$1.parenR) {
      first ? first = false : this.expect(types$1.comma);
      if (allowTrailingComma && this.afterTrailingComma(types$1.parenR, true)) {
        lastIsComma = true;
        break
      } else if (this.type === types$1.ellipsis) {
        spreadStart = this.start;
        exprList.push(this.parseParenItem(this.parseRestBinding()));
        if (this.type === types$1.comma) {
          this.raiseRecoverable(
            this.start,
            "Comma is not permitted after the rest element"
          );
        }
        break
      } else {
        exprList.push(this.parseMaybeAssign(false, refDestructuringErrors, this.parseParenItem));
      }
    }
    var innerEndPos = this.lastTokEnd, innerEndLoc = this.lastTokEndLoc;
    this.expect(types$1.parenR);

    if (canBeArrow && this.shouldParseArrow(exprList) && this.eat(types$1.arrow)) {
      this.checkPatternErrors(refDestructuringErrors, false);
      this.checkYieldAwaitInDefaultParams();
      this.yieldPos = oldYieldPos;
      this.awaitPos = oldAwaitPos;
      return this.parseParenArrowList(startPos, startLoc, exprList, forInit)
    }

    if (!exprList.length || lastIsComma) { this.unexpected(this.lastTokStart); }
    if (spreadStart) { this.unexpected(spreadStart); }
    this.checkExpressionErrors(refDestructuringErrors, true);
    this.yieldPos = oldYieldPos || this.yieldPos;
    this.awaitPos = oldAwaitPos || this.awaitPos;

    if (exprList.length > 1) {
      val = this.startNodeAt(innerStartPos, innerStartLoc);
      val.expressions = exprList;
      this.finishNodeAt(val, "SequenceExpression", innerEndPos, innerEndLoc);
    } else {
      val = exprList[0];
    }
  } else {
    val = this.parseParenExpression();
  }

  if (this.options.preserveParens) {
    var par = this.startNodeAt(startPos, startLoc);
    par.expression = val;
    return this.finishNode(par, "ParenthesizedExpression")
  } else {
    return val
  }
};

pp$5.parseParenItem = function(item) {
  return item
};

pp$5.parseParenArrowList = function(startPos, startLoc, exprList, forInit) {
  return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList, false, forInit)
};

// New's precedence is slightly tricky. It must allow its argument to
// be a \`[]\` or dot subscript expression, but not a call — at least,
// not without wrapping it in parentheses. Thus, it uses the noCalls
// argument to parseSubscripts to prevent it from consuming the
// argument list.

var empty = [];

pp$5.parseNew = function() {
  if (this.containsEsc) { this.raiseRecoverable(this.start, "Escape sequence in keyword new"); }
  var node = this.startNode();
  this.next();
  if (this.options.ecmaVersion >= 6 && this.type === types$1.dot) {
    var meta = this.startNodeAt(node.start, node.loc && node.loc.start);
    meta.name = "new";
    node.meta = this.finishNode(meta, "Identifier");
    this.next();
    var containsEsc = this.containsEsc;
    node.property = this.parseIdent(true);
    if (node.property.name !== "target")
      { this.raiseRecoverable(node.property.start, "The only valid meta property for new is 'new.target'"); }
    if (containsEsc)
      { this.raiseRecoverable(node.start, "'new.target' must not contain escaped characters"); }
    if (!this.allowNewDotTarget)
      { this.raiseRecoverable(node.start, "'new.target' can only be used in functions and class static block"); }
    return this.finishNode(node, "MetaProperty")
  }
  var startPos = this.start, startLoc = this.startLoc;
  node.callee = this.parseSubscripts(this.parseExprAtom(null, false, true), startPos, startLoc, true, false);
  if (node.callee.type === "Super")
    { this.raiseRecoverable(startPos, "Invalid use of 'super'"); }
  if (this.eat(types$1.parenL)) { node.arguments = this.parseExprList(types$1.parenR, this.options.ecmaVersion >= 8, false); }
  else { node.arguments = empty; }
  return this.finishNode(node, "NewExpression")
};

// Parse template expression.

pp$5.parseTemplateElement = function(ref) {
  var isTagged = ref.isTagged;

  var elem = this.startNode();
  if (this.type === types$1.invalidTemplate) {
    if (!isTagged) {
      this.raiseRecoverable(this.start, "Bad escape sequence in untagged template literal");
    }
    elem.value = {
      raw: this.value.replace(/\\r\\n?/g, "\\n"),
      cooked: null
    };
  } else {
    elem.value = {
      raw: this.input.slice(this.start, this.end).replace(/\\r\\n?/g, "\\n"),
      cooked: this.value
    };
  }
  this.next();
  elem.tail = this.type === types$1.backQuote;
  return this.finishNode(elem, "TemplateElement")
};

pp$5.parseTemplate = function(ref) {
  if ( ref === void 0 ) ref = {};
  var isTagged = ref.isTagged; if ( isTagged === void 0 ) isTagged = false;

  var node = this.startNode();
  this.next();
  node.expressions = [];
  var curElt = this.parseTemplateElement({isTagged: isTagged});
  node.quasis = [curElt];
  while (!curElt.tail) {
    if (this.type === types$1.eof) { this.raise(this.pos, "Unterminated template literal"); }
    this.expect(types$1.dollarBraceL);
    node.expressions.push(this.parseExpression());
    this.expect(types$1.braceR);
    node.quasis.push(curElt = this.parseTemplateElement({isTagged: isTagged}));
  }
  this.next();
  return this.finishNode(node, "TemplateLiteral")
};

pp$5.isAsyncProp = function(prop) {
  return !prop.computed && prop.key.type === "Identifier" && prop.key.name === "async" &&
    (this.type === types$1.name || this.type === types$1.num || this.type === types$1.string || this.type === types$1.bracketL || this.type.keyword || (this.options.ecmaVersion >= 9 && this.type === types$1.star)) &&
    !lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
};

// Parse an object literal or binding pattern.

pp$5.parseObj = function(isPattern, refDestructuringErrors) {
  var node = this.startNode(), first = true, propHash = {};
  node.properties = [];
  this.next();
  while (!this.eat(types$1.braceR)) {
    if (!first) {
      this.expect(types$1.comma);
      if (this.options.ecmaVersion >= 5 && this.afterTrailingComma(types$1.braceR)) { break }
    } else { first = false; }

    var prop = this.parseProperty(isPattern, refDestructuringErrors);
    if (!isPattern) { this.checkPropClash(prop, propHash, refDestructuringErrors); }
    node.properties.push(prop);
  }
  return this.finishNode(node, isPattern ? "ObjectPattern" : "ObjectExpression")
};

pp$5.parseProperty = function(isPattern, refDestructuringErrors) {
  var prop = this.startNode(), isGenerator, isAsync, startPos, startLoc;
  if (this.options.ecmaVersion >= 9 && this.eat(types$1.ellipsis)) {
    if (isPattern) {
      prop.argument = this.parseIdent(false);
      if (this.type === types$1.comma) {
        this.raiseRecoverable(this.start, "Comma is not permitted after the rest element");
      }
      return this.finishNode(prop, "RestElement")
    }
    // Parse argument.
    prop.argument = this.parseMaybeAssign(false, refDestructuringErrors);
    // To disallow trailing comma via \`this.toAssignable()\`.
    if (this.type === types$1.comma && refDestructuringErrors && refDestructuringErrors.trailingComma < 0) {
      refDestructuringErrors.trailingComma = this.start;
    }
    // Finish
    return this.finishNode(prop, "SpreadElement")
  }
  if (this.options.ecmaVersion >= 6) {
    prop.method = false;
    prop.shorthand = false;
    if (isPattern || refDestructuringErrors) {
      startPos = this.start;
      startLoc = this.startLoc;
    }
    if (!isPattern)
      { isGenerator = this.eat(types$1.star); }
  }
  var containsEsc = this.containsEsc;
  this.parsePropertyName(prop);
  if (!isPattern && !containsEsc && this.options.ecmaVersion >= 8 && !isGenerator && this.isAsyncProp(prop)) {
    isAsync = true;
    isGenerator = this.options.ecmaVersion >= 9 && this.eat(types$1.star);
    this.parsePropertyName(prop);
  } else {
    isAsync = false;
  }
  this.parsePropertyValue(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors, containsEsc);
  return this.finishNode(prop, "Property")
};

pp$5.parseGetterSetter = function(prop) {
  var kind = prop.key.name;
  this.parsePropertyName(prop);
  prop.value = this.parseMethod(false);
  prop.kind = kind;
  var paramCount = prop.kind === "get" ? 0 : 1;
  if (prop.value.params.length !== paramCount) {
    var start = prop.value.start;
    if (prop.kind === "get")
      { this.raiseRecoverable(start, "getter should have no params"); }
    else
      { this.raiseRecoverable(start, "setter should have exactly one param"); }
  } else {
    if (prop.kind === "set" && prop.value.params[0].type === "RestElement")
      { this.raiseRecoverable(prop.value.params[0].start, "Setter cannot use rest params"); }
  }
};

pp$5.parsePropertyValue = function(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors, containsEsc) {
  if ((isGenerator || isAsync) && this.type === types$1.colon)
    { this.unexpected(); }

  if (this.eat(types$1.colon)) {
    prop.value = isPattern ? this.parseMaybeDefault(this.start, this.startLoc) : this.parseMaybeAssign(false, refDestructuringErrors);
    prop.kind = "init";
  } else if (this.options.ecmaVersion >= 6 && this.type === types$1.parenL) {
    if (isPattern) { this.unexpected(); }
    prop.method = true;
    prop.value = this.parseMethod(isGenerator, isAsync);
    prop.kind = "init";
  } else if (!isPattern && !containsEsc &&
             this.options.ecmaVersion >= 5 && !prop.computed && prop.key.type === "Identifier" &&
             (prop.key.name === "get" || prop.key.name === "set") &&
             (this.type !== types$1.comma && this.type !== types$1.braceR && this.type !== types$1.eq)) {
    if (isGenerator || isAsync) { this.unexpected(); }
    this.parseGetterSetter(prop);
  } else if (this.options.ecmaVersion >= 6 && !prop.computed && prop.key.type === "Identifier") {
    if (isGenerator || isAsync) { this.unexpected(); }
    this.checkUnreserved(prop.key);
    if (prop.key.name === "await" && !this.awaitIdentPos)
      { this.awaitIdentPos = startPos; }
    if (isPattern) {
      prop.value = this.parseMaybeDefault(startPos, startLoc, this.copyNode(prop.key));
    } else if (this.type === types$1.eq && refDestructuringErrors) {
      if (refDestructuringErrors.shorthandAssign < 0)
        { refDestructuringErrors.shorthandAssign = this.start; }
      prop.value = this.parseMaybeDefault(startPos, startLoc, this.copyNode(prop.key));
    } else {
      prop.value = this.copyNode(prop.key);
    }
    prop.kind = "init";
    prop.shorthand = true;
  } else { this.unexpected(); }
};

pp$5.parsePropertyName = function(prop) {
  if (this.options.ecmaVersion >= 6) {
    if (this.eat(types$1.bracketL)) {
      prop.computed = true;
      prop.key = this.parseMaybeAssign();
      this.expect(types$1.bracketR);
      return prop.key
    } else {
      prop.computed = false;
    }
  }
  return prop.key = this.type === types$1.num || this.type === types$1.string ? this.parseExprAtom() : this.parseIdent(this.options.allowReserved !== "never")
};

// Initialize empty function node.

pp$5.initFunction = function(node) {
  node.id = null;
  if (this.options.ecmaVersion >= 6) { node.generator = node.expression = false; }
  if (this.options.ecmaVersion >= 8) { node.async = false; }
};

// Parse object or class method.

pp$5.parseMethod = function(isGenerator, isAsync, allowDirectSuper) {
  var node = this.startNode(), oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;

  this.initFunction(node);
  if (this.options.ecmaVersion >= 6)
    { node.generator = isGenerator; }
  if (this.options.ecmaVersion >= 8)
    { node.async = !!isAsync; }

  this.yieldPos = 0;
  this.awaitPos = 0;
  this.awaitIdentPos = 0;
  this.enterScope(functionFlags(isAsync, node.generator) | SCOPE_SUPER | (allowDirectSuper ? SCOPE_DIRECT_SUPER : 0));

  this.expect(types$1.parenL);
  node.params = this.parseBindingList(types$1.parenR, false, this.options.ecmaVersion >= 8);
  this.checkYieldAwaitInDefaultParams();
  this.parseFunctionBody(node, false, true, false);

  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.awaitIdentPos = oldAwaitIdentPos;
  return this.finishNode(node, "FunctionExpression")
};

// Parse arrow function expression with given parameters.

pp$5.parseArrowExpression = function(node, params, isAsync, forInit) {
  var oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;

  this.enterScope(functionFlags(isAsync, false) | SCOPE_ARROW);
  this.initFunction(node);
  if (this.options.ecmaVersion >= 8) { node.async = !!isAsync; }

  this.yieldPos = 0;
  this.awaitPos = 0;
  this.awaitIdentPos = 0;

  node.params = this.toAssignableList(params, true);
  this.parseFunctionBody(node, true, false, forInit);

  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.awaitIdentPos = oldAwaitIdentPos;
  return this.finishNode(node, "ArrowFunctionExpression")
};

// Parse function body and check parameters.

pp$5.parseFunctionBody = function(node, isArrowFunction, isMethod, forInit) {
  var isExpression = isArrowFunction && this.type !== types$1.braceL;
  var oldStrict = this.strict, useStrict = false;

  if (isExpression) {
    node.body = this.parseMaybeAssign(forInit);
    node.expression = true;
    this.checkParams(node, false);
  } else {
    var nonSimple = this.options.ecmaVersion >= 7 && !this.isSimpleParamList(node.params);
    if (!oldStrict || nonSimple) {
      useStrict = this.strictDirective(this.end);
      // If this is a strict mode function, verify that argument names
      // are not repeated, and it does not try to bind the words \`eval\`
      // or \`arguments\`.
      if (useStrict && nonSimple)
        { this.raiseRecoverable(node.start, "Illegal 'use strict' directive in function with non-simple parameter list"); }
    }
    // Start a new scope with regard to labels and the \`inFunction\`
    // flag (restore them to their old value afterwards).
    var oldLabels = this.labels;
    this.labels = [];
    if (useStrict) { this.strict = true; }

    // Add the params to varDeclaredNames to ensure that an error is thrown
    // if a let/const declaration in the function clashes with one of the params.
    this.checkParams(node, !oldStrict && !useStrict && !isArrowFunction && !isMethod && this.isSimpleParamList(node.params));
    // Ensure the function name isn't a forbidden identifier in strict mode, e.g. 'eval'
    if (this.strict && node.id) { this.checkLValSimple(node.id, BIND_OUTSIDE); }
    node.body = this.parseBlock(false, undefined, useStrict && !oldStrict);
    node.expression = false;
    this.adaptDirectivePrologue(node.body.body);
    this.labels = oldLabels;
  }
  this.exitScope();
};

pp$5.isSimpleParamList = function(params) {
  for (var i = 0, list = params; i < list.length; i += 1)
    {
    var param = list[i];

    if (param.type !== "Identifier") { return false
  } }
  return true
};

// Checks function params for various disallowed patterns such as using "eval"
// or "arguments" and duplicate parameters.

pp$5.checkParams = function(node, allowDuplicates) {
  var nameHash = Object.create(null);
  for (var i = 0, list = node.params; i < list.length; i += 1)
    {
    var param = list[i];

    this.checkLValInnerPattern(param, BIND_VAR, allowDuplicates ? null : nameHash);
  }
};

// Parses a comma-separated list of expressions, and returns them as
// an array. \`close\` is the token type that ends the list, and
// \`allowEmpty\` can be turned on to allow subsequent commas with
// nothing in between them to be parsed as \`null\` (which is needed
// for array literals).

pp$5.parseExprList = function(close, allowTrailingComma, allowEmpty, refDestructuringErrors) {
  var elts = [], first = true;
  while (!this.eat(close)) {
    if (!first) {
      this.expect(types$1.comma);
      if (allowTrailingComma && this.afterTrailingComma(close)) { break }
    } else { first = false; }

    var elt = (void 0);
    if (allowEmpty && this.type === types$1.comma)
      { elt = null; }
    else if (this.type === types$1.ellipsis) {
      elt = this.parseSpread(refDestructuringErrors);
      if (refDestructuringErrors && this.type === types$1.comma && refDestructuringErrors.trailingComma < 0)
        { refDestructuringErrors.trailingComma = this.start; }
    } else {
      elt = this.parseMaybeAssign(false, refDestructuringErrors);
    }
    elts.push(elt);
  }
  return elts
};

pp$5.checkUnreserved = function(ref) {
  var start = ref.start;
  var end = ref.end;
  var name = ref.name;

  if (this.inGenerator && name === "yield")
    { this.raiseRecoverable(start, "Cannot use 'yield' as identifier inside a generator"); }
  if (this.inAsync && name === "await")
    { this.raiseRecoverable(start, "Cannot use 'await' as identifier inside an async function"); }
  if (!(this.currentThisScope().flags & SCOPE_VAR) && name === "arguments")
    { this.raiseRecoverable(start, "Cannot use 'arguments' in class field initializer"); }
  if (this.inClassStaticBlock && (name === "arguments" || name === "await"))
    { this.raise(start, ("Cannot use " + name + " in class static initialization block")); }
  if (this.keywords.test(name))
    { this.raise(start, ("Unexpected keyword '" + name + "'")); }
  if (this.options.ecmaVersion < 6 &&
    this.input.slice(start, end).indexOf("\\\\") !== -1) { return }
  var re = this.strict ? this.reservedWordsStrict : this.reservedWords;
  if (re.test(name)) {
    if (!this.inAsync && name === "await")
      { this.raiseRecoverable(start, "Cannot use keyword 'await' outside an async function"); }
    this.raiseRecoverable(start, ("The keyword '" + name + "' is reserved"));
  }
};

// Parse the next token as an identifier. If \`liberal\` is true (used
// when parsing properties), it will also convert keywords into
// identifiers.

pp$5.parseIdent = function(liberal) {
  var node = this.parseIdentNode();
  this.next(!!liberal);
  this.finishNode(node, "Identifier");
  if (!liberal) {
    this.checkUnreserved(node);
    if (node.name === "await" && !this.awaitIdentPos)
      { this.awaitIdentPos = node.start; }
  }
  return node
};

pp$5.parseIdentNode = function() {
  var node = this.startNode();
  if (this.type === types$1.name) {
    node.name = this.value;
  } else if (this.type.keyword) {
    node.name = this.type.keyword;

    // To fix https://github.com/acornjs/acorn/issues/575
    // \`class\` and \`function\` keywords push new context into this.context.
    // But there is no chance to pop the context if the keyword is consumed as an identifier such as a property name.
    // If the previous token is a dot, this does not apply because the context-managing code already ignored the keyword
    if ((node.name === "class" || node.name === "function") &&
      (this.lastTokEnd !== this.lastTokStart + 1 || this.input.charCodeAt(this.lastTokStart) !== 46)) {
      this.context.pop();
    }
    this.type = types$1.name;
  } else {
    this.unexpected();
  }
  return node
};

pp$5.parsePrivateIdent = function() {
  var node = this.startNode();
  if (this.type === types$1.privateId) {
    node.name = this.value;
  } else {
    this.unexpected();
  }
  this.next();
  this.finishNode(node, "PrivateIdentifier");

  // For validating existence
  if (this.options.checkPrivateFields) {
    if (this.privateNameStack.length === 0) {
      this.raise(node.start, ("Private field '#" + (node.name) + "' must be declared in an enclosing class"));
    } else {
      this.privateNameStack[this.privateNameStack.length - 1].used.push(node);
    }
  }

  return node
};

// Parses yield expression inside generator.

pp$5.parseYield = function(forInit) {
  if (!this.yieldPos) { this.yieldPos = this.start; }

  var node = this.startNode();
  this.next();
  if (this.type === types$1.semi || this.canInsertSemicolon() || (this.type !== types$1.star && !this.type.startsExpr)) {
    node.delegate = false;
    node.argument = null;
  } else {
    node.delegate = this.eat(types$1.star);
    node.argument = this.parseMaybeAssign(forInit);
  }
  return this.finishNode(node, "YieldExpression")
};

pp$5.parseAwait = function(forInit) {
  if (!this.awaitPos) { this.awaitPos = this.start; }

  var node = this.startNode();
  this.next();
  node.argument = this.parseMaybeUnary(null, true, false, forInit);
  return this.finishNode(node, "AwaitExpression")
};

var pp$4 = Parser.prototype;

// This function is used to raise exceptions on parse errors. It
// takes an offset integer (into the current \`input\`) to indicate
// the location of the error, attaches the position to the end
// of the error message, and then raises a \`SyntaxError\` with that
// message.

pp$4.raise = function(pos, message) {
  var loc = getLineInfo(this.input, pos);
  message += " (" + loc.line + ":" + loc.column + ")";
  if (this.sourceFile) {
    message += " in " + this.sourceFile;
  }
  var err = new SyntaxError(message);
  err.pos = pos; err.loc = loc; err.raisedAt = this.pos;
  throw err
};

pp$4.raiseRecoverable = pp$4.raise;

pp$4.curPosition = function() {
  if (this.options.locations) {
    return new Position(this.curLine, this.pos - this.lineStart)
  }
};

var pp$3 = Parser.prototype;

var Scope = function Scope(flags) {
  this.flags = flags;
  // A list of var-declared names in the current lexical scope
  this.var = [];
  // A list of lexically-declared names in the current lexical scope
  this.lexical = [];
  // A list of lexically-declared FunctionDeclaration names in the current lexical scope
  this.functions = [];
};

// The functions in this module keep track of declared variables in the current scope in order to detect duplicate variable names.

pp$3.enterScope = function(flags) {
  this.scopeStack.push(new Scope(flags));
};

pp$3.exitScope = function() {
  this.scopeStack.pop();
};

// The spec says:
// > At the top level of a function, or script, function declarations are
// > treated like var declarations rather than like lexical declarations.
pp$3.treatFunctionsAsVarInScope = function(scope) {
  return (scope.flags & SCOPE_FUNCTION) || !this.inModule && (scope.flags & SCOPE_TOP)
};

pp$3.declareName = function(name, bindingType, pos) {
  var redeclared = false;
  if (bindingType === BIND_LEXICAL) {
    var scope = this.currentScope();
    redeclared = scope.lexical.indexOf(name) > -1 || scope.functions.indexOf(name) > -1 || scope.var.indexOf(name) > -1;
    scope.lexical.push(name);
    if (this.inModule && (scope.flags & SCOPE_TOP))
      { delete this.undefinedExports[name]; }
  } else if (bindingType === BIND_SIMPLE_CATCH) {
    var scope$1 = this.currentScope();
    scope$1.lexical.push(name);
  } else if (bindingType === BIND_FUNCTION) {
    var scope$2 = this.currentScope();
    if (this.treatFunctionsAsVar)
      { redeclared = scope$2.lexical.indexOf(name) > -1; }
    else
      { redeclared = scope$2.lexical.indexOf(name) > -1 || scope$2.var.indexOf(name) > -1; }
    scope$2.functions.push(name);
  } else {
    for (var i = this.scopeStack.length - 1; i >= 0; --i) {
      var scope$3 = this.scopeStack[i];
      if (scope$3.lexical.indexOf(name) > -1 && !((scope$3.flags & SCOPE_SIMPLE_CATCH) && scope$3.lexical[0] === name) ||
          !this.treatFunctionsAsVarInScope(scope$3) && scope$3.functions.indexOf(name) > -1) {
        redeclared = true;
        break
      }
      scope$3.var.push(name);
      if (this.inModule && (scope$3.flags & SCOPE_TOP))
        { delete this.undefinedExports[name]; }
      if (scope$3.flags & SCOPE_VAR) { break }
    }
  }
  if (redeclared) { this.raiseRecoverable(pos, ("Identifier '" + name + "' has already been declared")); }
};

pp$3.checkLocalExport = function(id) {
  // scope.functions must be empty as Module code is always strict.
  if (this.scopeStack[0].lexical.indexOf(id.name) === -1 &&
      this.scopeStack[0].var.indexOf(id.name) === -1) {
    this.undefinedExports[id.name] = id;
  }
};

pp$3.currentScope = function() {
  return this.scopeStack[this.scopeStack.length - 1]
};

pp$3.currentVarScope = function() {
  for (var i = this.scopeStack.length - 1;; i--) {
    var scope = this.scopeStack[i];
    if (scope.flags & (SCOPE_VAR | SCOPE_CLASS_FIELD_INIT | SCOPE_CLASS_STATIC_BLOCK)) { return scope }
  }
};

// Could be useful for \`this\`, \`new.target\`, \`super()\`, \`super.property\`, and \`super[property]\`.
pp$3.currentThisScope = function() {
  for (var i = this.scopeStack.length - 1;; i--) {
    var scope = this.scopeStack[i];
    if (scope.flags & (SCOPE_VAR | SCOPE_CLASS_FIELD_INIT | SCOPE_CLASS_STATIC_BLOCK) &&
        !(scope.flags & SCOPE_ARROW)) { return scope }
  }
};

var Node = function Node(parser, pos, loc) {
  this.type = "";
  this.start = pos;
  this.end = 0;
  if (parser.options.locations)
    { this.loc = new SourceLocation(parser, loc); }
  if (parser.options.directSourceFile)
    { this.sourceFile = parser.options.directSourceFile; }
  if (parser.options.ranges)
    { this.range = [pos, 0]; }
};

// Start an AST node, attaching a start offset.

var pp$2 = Parser.prototype;

pp$2.startNode = function() {
  return new Node(this, this.start, this.startLoc)
};

pp$2.startNodeAt = function(pos, loc) {
  return new Node(this, pos, loc)
};

// Finish an AST node, adding \`type\` and \`end\` properties.

function finishNodeAt(node, type, pos, loc) {
  node.type = type;
  node.end = pos;
  if (this.options.locations)
    { node.loc.end = loc; }
  if (this.options.ranges)
    { node.range[1] = pos; }
  return node
}

pp$2.finishNode = function(node, type) {
  return finishNodeAt.call(this, node, type, this.lastTokEnd, this.lastTokEndLoc)
};

// Finish node at given position

pp$2.finishNodeAt = function(node, type, pos, loc) {
  return finishNodeAt.call(this, node, type, pos, loc)
};

pp$2.copyNode = function(node) {
  var newNode = new Node(this, node.start, this.startLoc);
  for (var prop in node) { newNode[prop] = node[prop]; }
  return newNode
};

// This file was generated by "bin/generate-unicode-script-values.js". Do not modify manually!
var scriptValuesAddedInUnicode = "Berf Beria_Erfe Gara Garay Gukh Gurung_Khema Hrkt Katakana_Or_Hiragana Kawi Kirat_Rai Krai Nag_Mundari Nagm Ol_Onal Onao Sidetic Sidt Sunu Sunuwar Tai_Yo Tayo Todhri Todr Tolong_Siki Tols Tulu_Tigalari Tutg Unknown Zzzz";

// This file contains Unicode properties extracted from the ECMAScript specification.
// The lists are extracted like so:
// $$('#table-binary-unicode-properties > figure > table > tbody > tr > td:nth-child(1) code').map(el => el.innerText)

// #table-binary-unicode-properties
var ecma9BinaryProperties = "ASCII ASCII_Hex_Digit AHex Alphabetic Alpha Any Assigned Bidi_Control Bidi_C Bidi_Mirrored Bidi_M Case_Ignorable CI Cased Changes_When_Casefolded CWCF Changes_When_Casemapped CWCM Changes_When_Lowercased CWL Changes_When_NFKC_Casefolded CWKCF Changes_When_Titlecased CWT Changes_When_Uppercased CWU Dash Default_Ignorable_Code_Point DI Deprecated Dep Diacritic Dia Emoji Emoji_Component Emoji_Modifier Emoji_Modifier_Base Emoji_Presentation Extender Ext Grapheme_Base Gr_Base Grapheme_Extend Gr_Ext Hex_Digit Hex IDS_Binary_Operator IDSB IDS_Trinary_Operator IDST ID_Continue IDC ID_Start IDS Ideographic Ideo Join_Control Join_C Logical_Order_Exception LOE Lowercase Lower Math Noncharacter_Code_Point NChar Pattern_Syntax Pat_Syn Pattern_White_Space Pat_WS Quotation_Mark QMark Radical Regional_Indicator RI Sentence_Terminal STerm Soft_Dotted SD Terminal_Punctuation Term Unified_Ideograph UIdeo Uppercase Upper Variation_Selector VS White_Space space XID_Continue XIDC XID_Start XIDS";
var ecma10BinaryProperties = ecma9BinaryProperties + " Extended_Pictographic";
var ecma11BinaryProperties = ecma10BinaryProperties;
var ecma12BinaryProperties = ecma11BinaryProperties + " EBase EComp EMod EPres ExtPict";
var ecma13BinaryProperties = ecma12BinaryProperties;
var ecma14BinaryProperties = ecma13BinaryProperties;

var unicodeBinaryProperties = {
  9: ecma9BinaryProperties,
  10: ecma10BinaryProperties,
  11: ecma11BinaryProperties,
  12: ecma12BinaryProperties,
  13: ecma13BinaryProperties,
  14: ecma14BinaryProperties
};

// #table-binary-unicode-properties-of-strings
var ecma14BinaryPropertiesOfStrings = "Basic_Emoji Emoji_Keycap_Sequence RGI_Emoji_Modifier_Sequence RGI_Emoji_Flag_Sequence RGI_Emoji_Tag_Sequence RGI_Emoji_ZWJ_Sequence RGI_Emoji";

var unicodeBinaryPropertiesOfStrings = {
  9: "",
  10: "",
  11: "",
  12: "",
  13: "",
  14: ecma14BinaryPropertiesOfStrings
};

// #table-unicode-general-category-values
var unicodeGeneralCategoryValues = "Cased_Letter LC Close_Punctuation Pe Connector_Punctuation Pc Control Cc cntrl Currency_Symbol Sc Dash_Punctuation Pd Decimal_Number Nd digit Enclosing_Mark Me Final_Punctuation Pf Format Cf Initial_Punctuation Pi Letter L Letter_Number Nl Line_Separator Zl Lowercase_Letter Ll Mark M Combining_Mark Math_Symbol Sm Modifier_Letter Lm Modifier_Symbol Sk Nonspacing_Mark Mn Number N Open_Punctuation Ps Other C Other_Letter Lo Other_Number No Other_Punctuation Po Other_Symbol So Paragraph_Separator Zp Private_Use Co Punctuation P punct Separator Z Space_Separator Zs Spacing_Mark Mc Surrogate Cs Symbol S Titlecase_Letter Lt Unassigned Cn Uppercase_Letter Lu";

// #table-unicode-script-values
var ecma9ScriptValues = "Adlam Adlm Ahom Anatolian_Hieroglyphs Hluw Arabic Arab Armenian Armn Avestan Avst Balinese Bali Bamum Bamu Bassa_Vah Bass Batak Batk Bengali Beng Bhaiksuki Bhks Bopomofo Bopo Brahmi Brah Braille Brai Buginese Bugi Buhid Buhd Canadian_Aboriginal Cans Carian Cari Caucasian_Albanian Aghb Chakma Cakm Cham Cham Cherokee Cher Common Zyyy Coptic Copt Qaac Cuneiform Xsux Cypriot Cprt Cyrillic Cyrl Deseret Dsrt Devanagari Deva Duployan Dupl Egyptian_Hieroglyphs Egyp Elbasan Elba Ethiopic Ethi Georgian Geor Glagolitic Glag Gothic Goth Grantha Gran Greek Grek Gujarati Gujr Gurmukhi Guru Han Hani Hangul Hang Hanunoo Hano Hatran Hatr Hebrew Hebr Hiragana Hira Imperial_Aramaic Armi Inherited Zinh Qaai Inscriptional_Pahlavi Phli Inscriptional_Parthian Prti Javanese Java Kaithi Kthi Kannada Knda Katakana Kana Kayah_Li Kali Kharoshthi Khar Khmer Khmr Khojki Khoj Khudawadi Sind Lao Laoo Latin Latn Lepcha Lepc Limbu Limb Linear_A Lina Linear_B Linb Lisu Lisu Lycian Lyci Lydian Lydi Mahajani Mahj Malayalam Mlym Mandaic Mand Manichaean Mani Marchen Marc Masaram_Gondi Gonm Meetei_Mayek Mtei Mende_Kikakui Mend Meroitic_Cursive Merc Meroitic_Hieroglyphs Mero Miao Plrd Modi Mongolian Mong Mro Mroo Multani Mult Myanmar Mymr Nabataean Nbat New_Tai_Lue Talu Newa Newa Nko Nkoo Nushu Nshu Ogham Ogam Ol_Chiki Olck Old_Hungarian Hung Old_Italic Ital Old_North_Arabian Narb Old_Permic Perm Old_Persian Xpeo Old_South_Arabian Sarb Old_Turkic Orkh Oriya Orya Osage Osge Osmanya Osma Pahawh_Hmong Hmng Palmyrene Palm Pau_Cin_Hau Pauc Phags_Pa Phag Phoenician Phnx Psalter_Pahlavi Phlp Rejang Rjng Runic Runr Samaritan Samr Saurashtra Saur Sharada Shrd Shavian Shaw Siddham Sidd SignWriting Sgnw Sinhala Sinh Sora_Sompeng Sora Soyombo Soyo Sundanese Sund Syloti_Nagri Sylo Syriac Syrc Tagalog Tglg Tagbanwa Tagb Tai_Le Tale Tai_Tham Lana Tai_Viet Tavt Takri Takr Tamil Taml Tangut Tang Telugu Telu Thaana Thaa Thai Thai Tibetan Tibt Tifinagh Tfng Tirhuta Tirh Ugaritic Ugar Vai Vaii Warang_Citi Wara Yi Yiii Zanabazar_Square Zanb";
var ecma10ScriptValues = ecma9ScriptValues + " Dogra Dogr Gunjala_Gondi Gong Hanifi_Rohingya Rohg Makasar Maka Medefaidrin Medf Old_Sogdian Sogo Sogdian Sogd";
var ecma11ScriptValues = ecma10ScriptValues + " Elymaic Elym Nandinagari Nand Nyiakeng_Puachue_Hmong Hmnp Wancho Wcho";
var ecma12ScriptValues = ecma11ScriptValues + " Chorasmian Chrs Diak Dives_Akuru Khitan_Small_Script Kits Yezi Yezidi";
var ecma13ScriptValues = ecma12ScriptValues + " Cypro_Minoan Cpmn Old_Uyghur Ougr Tangsa Tnsa Toto Vithkuqi Vith";
var ecma14ScriptValues = ecma13ScriptValues + " " + scriptValuesAddedInUnicode;

var unicodeScriptValues = {
  9: ecma9ScriptValues,
  10: ecma10ScriptValues,
  11: ecma11ScriptValues,
  12: ecma12ScriptValues,
  13: ecma13ScriptValues,
  14: ecma14ScriptValues
};

var data = {};
function buildUnicodeData(ecmaVersion) {
  var d = data[ecmaVersion] = {
    binary: wordsRegexp(unicodeBinaryProperties[ecmaVersion] + " " + unicodeGeneralCategoryValues),
    binaryOfStrings: wordsRegexp(unicodeBinaryPropertiesOfStrings[ecmaVersion]),
    nonBinary: {
      General_Category: wordsRegexp(unicodeGeneralCategoryValues),
      Script: wordsRegexp(unicodeScriptValues[ecmaVersion])
    }
  };
  d.nonBinary.Script_Extensions = d.nonBinary.Script;

  d.nonBinary.gc = d.nonBinary.General_Category;
  d.nonBinary.sc = d.nonBinary.Script;
  d.nonBinary.scx = d.nonBinary.Script_Extensions;
}

for (var i = 0, list = [9, 10, 11, 12, 13, 14]; i < list.length; i += 1) {
  var ecmaVersion = list[i];

  buildUnicodeData(ecmaVersion);
}

var pp$1 = Parser.prototype;

// Track disjunction structure to determine whether a duplicate
// capture group name is allowed because it is in a separate branch.
var BranchID = function BranchID(parent, base) {
  // Parent disjunction branch
  this.parent = parent;
  // Identifies this set of sibling branches
  this.base = base || this;
};

BranchID.prototype.separatedFrom = function separatedFrom (alt) {
  // A branch is separate from another branch if they or any of
  // their parents are siblings in a given disjunction
  for (var self = this; self; self = self.parent) {
    for (var other = alt; other; other = other.parent) {
      if (self.base === other.base && self !== other) { return true }
    }
  }
  return false
};

BranchID.prototype.sibling = function sibling () {
  return new BranchID(this.parent, this.base)
};

var RegExpValidationState = function RegExpValidationState(parser) {
  this.parser = parser;
  this.validFlags = "gim" + (parser.options.ecmaVersion >= 6 ? "uy" : "") + (parser.options.ecmaVersion >= 9 ? "s" : "") + (parser.options.ecmaVersion >= 13 ? "d" : "") + (parser.options.ecmaVersion >= 15 ? "v" : "");
  this.unicodeProperties = data[parser.options.ecmaVersion >= 14 ? 14 : parser.options.ecmaVersion];
  this.source = "";
  this.flags = "";
  this.start = 0;
  this.switchU = false;
  this.switchV = false;
  this.switchN = false;
  this.pos = 0;
  this.lastIntValue = 0;
  this.lastStringValue = "";
  this.lastAssertionIsQuantifiable = false;
  this.numCapturingParens = 0;
  this.maxBackReference = 0;
  this.groupNames = Object.create(null);
  this.backReferenceNames = [];
  this.branchID = null;
};

RegExpValidationState.prototype.reset = function reset (start, pattern, flags) {
  var unicodeSets = flags.indexOf("v") !== -1;
  var unicode = flags.indexOf("u") !== -1;
  this.start = start | 0;
  this.source = pattern + "";
  this.flags = flags;
  if (unicodeSets && this.parser.options.ecmaVersion >= 15) {
    this.switchU = true;
    this.switchV = true;
    this.switchN = true;
  } else {
    this.switchU = unicode && this.parser.options.ecmaVersion >= 6;
    this.switchV = false;
    this.switchN = unicode && this.parser.options.ecmaVersion >= 9;
  }
};

RegExpValidationState.prototype.raise = function raise (message) {
  this.parser.raiseRecoverable(this.start, ("Invalid regular expression: /" + (this.source) + "/: " + message));
};

// If u flag is given, this returns the code point at the index (it combines a surrogate pair).
// Otherwise, this returns the code unit of the index (can be a part of a surrogate pair).
RegExpValidationState.prototype.at = function at (i, forceU) {
    if ( forceU === void 0 ) forceU = false;

  var s = this.source;
  var l = s.length;
  if (i >= l) {
    return -1
  }
  var c = s.charCodeAt(i);
  if (!(forceU || this.switchU) || c <= 0xD7FF || c >= 0xE000 || i + 1 >= l) {
    return c
  }
  var next = s.charCodeAt(i + 1);
  return next >= 0xDC00 && next <= 0xDFFF ? (c << 10) + next - 0x35FDC00 : c
};

RegExpValidationState.prototype.nextIndex = function nextIndex (i, forceU) {
    if ( forceU === void 0 ) forceU = false;

  var s = this.source;
  var l = s.length;
  if (i >= l) {
    return l
  }
  var c = s.charCodeAt(i), next;
  if (!(forceU || this.switchU) || c <= 0xD7FF || c >= 0xE000 || i + 1 >= l ||
      (next = s.charCodeAt(i + 1)) < 0xDC00 || next > 0xDFFF) {
    return i + 1
  }
  return i + 2
};

RegExpValidationState.prototype.current = function current (forceU) {
    if ( forceU === void 0 ) forceU = false;

  return this.at(this.pos, forceU)
};

RegExpValidationState.prototype.lookahead = function lookahead (forceU) {
    if ( forceU === void 0 ) forceU = false;

  return this.at(this.nextIndex(this.pos, forceU), forceU)
};

RegExpValidationState.prototype.advance = function advance (forceU) {
    if ( forceU === void 0 ) forceU = false;

  this.pos = this.nextIndex(this.pos, forceU);
};

RegExpValidationState.prototype.eat = function eat (ch, forceU) {
    if ( forceU === void 0 ) forceU = false;

  if (this.current(forceU) === ch) {
    this.advance(forceU);
    return true
  }
  return false
};

RegExpValidationState.prototype.eatChars = function eatChars (chs, forceU) {
    if ( forceU === void 0 ) forceU = false;

  var pos = this.pos;
  for (var i = 0, list = chs; i < list.length; i += 1) {
    var ch = list[i];

      var current = this.at(pos, forceU);
    if (current === -1 || current !== ch) {
      return false
    }
    pos = this.nextIndex(pos, forceU);
  }
  this.pos = pos;
  return true
};

/**
 * Validate the flags part of a given RegExpLiteral.
 *
 * @param {RegExpValidationState} state The state to validate RegExp.
 * @returns {void}
 */
pp$1.validateRegExpFlags = function(state) {
  var validFlags = state.validFlags;
  var flags = state.flags;

  var u = false;
  var v = false;

  for (var i = 0; i < flags.length; i++) {
    var flag = flags.charAt(i);
    if (validFlags.indexOf(flag) === -1) {
      this.raise(state.start, "Invalid regular expression flag");
    }
    if (flags.indexOf(flag, i + 1) > -1) {
      this.raise(state.start, "Duplicate regular expression flag");
    }
    if (flag === "u") { u = true; }
    if (flag === "v") { v = true; }
  }
  if (this.options.ecmaVersion >= 15 && u && v) {
    this.raise(state.start, "Invalid regular expression flag");
  }
};

function hasProp(obj) {
  for (var _ in obj) { return true }
  return false
}

/**
 * Validate the pattern part of a given RegExpLiteral.
 *
 * @param {RegExpValidationState} state The state to validate RegExp.
 * @returns {void}
 */
pp$1.validateRegExpPattern = function(state) {
  this.regexp_pattern(state);

  // The goal symbol for the parse is |Pattern[~U, ~N]|. If the result of
  // parsing contains a |GroupName|, reparse with the goal symbol
  // |Pattern[~U, +N]| and use this result instead. Throw a *SyntaxError*
  // exception if _P_ did not conform to the grammar, if any elements of _P_
  // were not matched by the parse, or if any Early Error conditions exist.
  if (!state.switchN && this.options.ecmaVersion >= 9 && hasProp(state.groupNames)) {
    state.switchN = true;
    this.regexp_pattern(state);
  }
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-Pattern
pp$1.regexp_pattern = function(state) {
  state.pos = 0;
  state.lastIntValue = 0;
  state.lastStringValue = "";
  state.lastAssertionIsQuantifiable = false;
  state.numCapturingParens = 0;
  state.maxBackReference = 0;
  state.groupNames = Object.create(null);
  state.backReferenceNames.length = 0;
  state.branchID = null;

  this.regexp_disjunction(state);

  if (state.pos !== state.source.length) {
    // Make the same messages as V8.
    if (state.eat(0x29 /* ) */)) {
      state.raise("Unmatched ')'");
    }
    if (state.eat(0x5D /* ] */) || state.eat(0x7D /* } */)) {
      state.raise("Lone quantifier brackets");
    }
  }
  if (state.maxBackReference > state.numCapturingParens) {
    state.raise("Invalid escape");
  }
  for (var i = 0, list = state.backReferenceNames; i < list.length; i += 1) {
    var name = list[i];

    if (!state.groupNames[name]) {
      state.raise("Invalid named capture referenced");
    }
  }
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-Disjunction
pp$1.regexp_disjunction = function(state) {
  var trackDisjunction = this.options.ecmaVersion >= 16;
  if (trackDisjunction) { state.branchID = new BranchID(state.branchID, null); }
  this.regexp_alternative(state);
  while (state.eat(0x7C /* | */)) {
    if (trackDisjunction) { state.branchID = state.branchID.sibling(); }
    this.regexp_alternative(state);
  }
  if (trackDisjunction) { state.branchID = state.branchID.parent; }

  // Make the same message as V8.
  if (this.regexp_eatQuantifier(state, true)) {
    state.raise("Nothing to repeat");
  }
  if (state.eat(0x7B /* { */)) {
    state.raise("Lone quantifier brackets");
  }
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-Alternative
pp$1.regexp_alternative = function(state) {
  while (state.pos < state.source.length && this.regexp_eatTerm(state)) {}
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-Term
pp$1.regexp_eatTerm = function(state) {
  if (this.regexp_eatAssertion(state)) {
    // Handle \`QuantifiableAssertion Quantifier\` alternative.
    // \`state.lastAssertionIsQuantifiable\` is true if the last eaten Assertion
    // is a QuantifiableAssertion.
    if (state.lastAssertionIsQuantifiable && this.regexp_eatQuantifier(state)) {
      // Make the same message as V8.
      if (state.switchU) {
        state.raise("Invalid quantifier");
      }
    }
    return true
  }

  if (state.switchU ? this.regexp_eatAtom(state) : this.regexp_eatExtendedAtom(state)) {
    this.regexp_eatQuantifier(state);
    return true
  }

  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-Assertion
pp$1.regexp_eatAssertion = function(state) {
  var start = state.pos;
  state.lastAssertionIsQuantifiable = false;

  // ^, $
  if (state.eat(0x5E /* ^ */) || state.eat(0x24 /* $ */)) {
    return true
  }

  // \\b \\B
  if (state.eat(0x5C /* \\ */)) {
    if (state.eat(0x42 /* B */) || state.eat(0x62 /* b */)) {
      return true
    }
    state.pos = start;
  }

  // Lookahead / Lookbehind
  if (state.eat(0x28 /* ( */) && state.eat(0x3F /* ? */)) {
    var lookbehind = false;
    if (this.options.ecmaVersion >= 9) {
      lookbehind = state.eat(0x3C /* < */);
    }
    if (state.eat(0x3D /* = */) || state.eat(0x21 /* ! */)) {
      this.regexp_disjunction(state);
      if (!state.eat(0x29 /* ) */)) {
        state.raise("Unterminated group");
      }
      state.lastAssertionIsQuantifiable = !lookbehind;
      return true
    }
  }

  state.pos = start;
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-Quantifier
pp$1.regexp_eatQuantifier = function(state, noError) {
  if ( noError === void 0 ) noError = false;

  if (this.regexp_eatQuantifierPrefix(state, noError)) {
    state.eat(0x3F /* ? */);
    return true
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-QuantifierPrefix
pp$1.regexp_eatQuantifierPrefix = function(state, noError) {
  return (
    state.eat(0x2A /* * */) ||
    state.eat(0x2B /* + */) ||
    state.eat(0x3F /* ? */) ||
    this.regexp_eatBracedQuantifier(state, noError)
  )
};
pp$1.regexp_eatBracedQuantifier = function(state, noError) {
  var start = state.pos;
  if (state.eat(0x7B /* { */)) {
    var min = 0, max = -1;
    if (this.regexp_eatDecimalDigits(state)) {
      min = state.lastIntValue;
      if (state.eat(0x2C /* , */) && this.regexp_eatDecimalDigits(state)) {
        max = state.lastIntValue;
      }
      if (state.eat(0x7D /* } */)) {
        // SyntaxError in https://www.ecma-international.org/ecma-262/8.0/#sec-term
        if (max !== -1 && max < min && !noError) {
          state.raise("numbers out of order in {} quantifier");
        }
        return true
      }
    }
    if (state.switchU && !noError) {
      state.raise("Incomplete quantifier");
    }
    state.pos = start;
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-Atom
pp$1.regexp_eatAtom = function(state) {
  return (
    this.regexp_eatPatternCharacters(state) ||
    state.eat(0x2E /* . */) ||
    this.regexp_eatReverseSolidusAtomEscape(state) ||
    this.regexp_eatCharacterClass(state) ||
    this.regexp_eatUncapturingGroup(state) ||
    this.regexp_eatCapturingGroup(state)
  )
};
pp$1.regexp_eatReverseSolidusAtomEscape = function(state) {
  var start = state.pos;
  if (state.eat(0x5C /* \\ */)) {
    if (this.regexp_eatAtomEscape(state)) {
      return true
    }
    state.pos = start;
  }
  return false
};
pp$1.regexp_eatUncapturingGroup = function(state) {
  var start = state.pos;
  if (state.eat(0x28 /* ( */)) {
    if (state.eat(0x3F /* ? */)) {
      if (this.options.ecmaVersion >= 16) {
        var addModifiers = this.regexp_eatModifiers(state);
        var hasHyphen = state.eat(0x2D /* - */);
        if (addModifiers || hasHyphen) {
          for (var i = 0; i < addModifiers.length; i++) {
            var modifier = addModifiers.charAt(i);
            if (addModifiers.indexOf(modifier, i + 1) > -1) {
              state.raise("Duplicate regular expression modifiers");
            }
          }
          if (hasHyphen) {
            var removeModifiers = this.regexp_eatModifiers(state);
            if (!addModifiers && !removeModifiers && state.current() === 0x3A /* : */) {
              state.raise("Invalid regular expression modifiers");
            }
            for (var i$1 = 0; i$1 < removeModifiers.length; i$1++) {
              var modifier$1 = removeModifiers.charAt(i$1);
              if (
                removeModifiers.indexOf(modifier$1, i$1 + 1) > -1 ||
                addModifiers.indexOf(modifier$1) > -1
              ) {
                state.raise("Duplicate regular expression modifiers");
              }
            }
          }
        }
      }
      if (state.eat(0x3A /* : */)) {
        this.regexp_disjunction(state);
        if (state.eat(0x29 /* ) */)) {
          return true
        }
        state.raise("Unterminated group");
      }
    }
    state.pos = start;
  }
  return false
};
pp$1.regexp_eatCapturingGroup = function(state) {
  if (state.eat(0x28 /* ( */)) {
    if (this.options.ecmaVersion >= 9) {
      this.regexp_groupSpecifier(state);
    } else if (state.current() === 0x3F /* ? */) {
      state.raise("Invalid group");
    }
    this.regexp_disjunction(state);
    if (state.eat(0x29 /* ) */)) {
      state.numCapturingParens += 1;
      return true
    }
    state.raise("Unterminated group");
  }
  return false
};
// RegularExpressionModifiers ::
//   [empty]
//   RegularExpressionModifiers RegularExpressionModifier
pp$1.regexp_eatModifiers = function(state) {
  var modifiers = "";
  var ch = 0;
  while ((ch = state.current()) !== -1 && isRegularExpressionModifier(ch)) {
    modifiers += codePointToString(ch);
    state.advance();
  }
  return modifiers
};
// RegularExpressionModifier :: one of
//   \`i\` \`m\` \`s\`
function isRegularExpressionModifier(ch) {
  return ch === 0x69 /* i */ || ch === 0x6d /* m */ || ch === 0x73 /* s */
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ExtendedAtom
pp$1.regexp_eatExtendedAtom = function(state) {
  return (
    state.eat(0x2E /* . */) ||
    this.regexp_eatReverseSolidusAtomEscape(state) ||
    this.regexp_eatCharacterClass(state) ||
    this.regexp_eatUncapturingGroup(state) ||
    this.regexp_eatCapturingGroup(state) ||
    this.regexp_eatInvalidBracedQuantifier(state) ||
    this.regexp_eatExtendedPatternCharacter(state)
  )
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-InvalidBracedQuantifier
pp$1.regexp_eatInvalidBracedQuantifier = function(state) {
  if (this.regexp_eatBracedQuantifier(state, true)) {
    state.raise("Nothing to repeat");
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-SyntaxCharacter
pp$1.regexp_eatSyntaxCharacter = function(state) {
  var ch = state.current();
  if (isSyntaxCharacter(ch)) {
    state.lastIntValue = ch;
    state.advance();
    return true
  }
  return false
};
function isSyntaxCharacter(ch) {
  return (
    ch === 0x24 /* $ */ ||
    ch >= 0x28 /* ( */ && ch <= 0x2B /* + */ ||
    ch === 0x2E /* . */ ||
    ch === 0x3F /* ? */ ||
    ch >= 0x5B /* [ */ && ch <= 0x5E /* ^ */ ||
    ch >= 0x7B /* { */ && ch <= 0x7D /* } */
  )
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-PatternCharacter
// But eat eager.
pp$1.regexp_eatPatternCharacters = function(state) {
  var start = state.pos;
  var ch = 0;
  while ((ch = state.current()) !== -1 && !isSyntaxCharacter(ch)) {
    state.advance();
  }
  return state.pos !== start
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ExtendedPatternCharacter
pp$1.regexp_eatExtendedPatternCharacter = function(state) {
  var ch = state.current();
  if (
    ch !== -1 &&
    ch !== 0x24 /* $ */ &&
    !(ch >= 0x28 /* ( */ && ch <= 0x2B /* + */) &&
    ch !== 0x2E /* . */ &&
    ch !== 0x3F /* ? */ &&
    ch !== 0x5B /* [ */ &&
    ch !== 0x5E /* ^ */ &&
    ch !== 0x7C /* | */
  ) {
    state.advance();
    return true
  }
  return false
};

// GroupSpecifier ::
//   [empty]
//   \`?\` GroupName
pp$1.regexp_groupSpecifier = function(state) {
  if (state.eat(0x3F /* ? */)) {
    if (!this.regexp_eatGroupName(state)) { state.raise("Invalid group"); }
    var trackDisjunction = this.options.ecmaVersion >= 16;
    var known = state.groupNames[state.lastStringValue];
    if (known) {
      if (trackDisjunction) {
        for (var i = 0, list = known; i < list.length; i += 1) {
          var altID = list[i];

          if (!altID.separatedFrom(state.branchID))
            { state.raise("Duplicate capture group name"); }
        }
      } else {
        state.raise("Duplicate capture group name");
      }
    }
    if (trackDisjunction) {
      (known || (state.groupNames[state.lastStringValue] = [])).push(state.branchID);
    } else {
      state.groupNames[state.lastStringValue] = true;
    }
  }
};

// GroupName ::
//   \`<\` RegExpIdentifierName \`>\`
// Note: this updates \`state.lastStringValue\` property with the eaten name.
pp$1.regexp_eatGroupName = function(state) {
  state.lastStringValue = "";
  if (state.eat(0x3C /* < */)) {
    if (this.regexp_eatRegExpIdentifierName(state) && state.eat(0x3E /* > */)) {
      return true
    }
    state.raise("Invalid capture group name");
  }
  return false
};

// RegExpIdentifierName ::
//   RegExpIdentifierStart
//   RegExpIdentifierName RegExpIdentifierPart
// Note: this updates \`state.lastStringValue\` property with the eaten name.
pp$1.regexp_eatRegExpIdentifierName = function(state) {
  state.lastStringValue = "";
  if (this.regexp_eatRegExpIdentifierStart(state)) {
    state.lastStringValue += codePointToString(state.lastIntValue);
    while (this.regexp_eatRegExpIdentifierPart(state)) {
      state.lastStringValue += codePointToString(state.lastIntValue);
    }
    return true
  }
  return false
};

// RegExpIdentifierStart ::
//   UnicodeIDStart
//   \`$\`
//   \`_\`
//   \`\\\` RegExpUnicodeEscapeSequence[+U]
pp$1.regexp_eatRegExpIdentifierStart = function(state) {
  var start = state.pos;
  var forceU = this.options.ecmaVersion >= 11;
  var ch = state.current(forceU);
  state.advance(forceU);

  if (ch === 0x5C /* \\ */ && this.regexp_eatRegExpUnicodeEscapeSequence(state, forceU)) {
    ch = state.lastIntValue;
  }
  if (isRegExpIdentifierStart(ch)) {
    state.lastIntValue = ch;
    return true
  }

  state.pos = start;
  return false
};
function isRegExpIdentifierStart(ch) {
  return isIdentifierStart(ch, true) || ch === 0x24 /* $ */ || ch === 0x5F /* _ */
}

// RegExpIdentifierPart ::
//   UnicodeIDContinue
//   \`$\`
//   \`_\`
//   \`\\\` RegExpUnicodeEscapeSequence[+U]
//   <ZWNJ>
//   <ZWJ>
pp$1.regexp_eatRegExpIdentifierPart = function(state) {
  var start = state.pos;
  var forceU = this.options.ecmaVersion >= 11;
  var ch = state.current(forceU);
  state.advance(forceU);

  if (ch === 0x5C /* \\ */ && this.regexp_eatRegExpUnicodeEscapeSequence(state, forceU)) {
    ch = state.lastIntValue;
  }
  if (isRegExpIdentifierPart(ch)) {
    state.lastIntValue = ch;
    return true
  }

  state.pos = start;
  return false
};
function isRegExpIdentifierPart(ch) {
  return isIdentifierChar(ch, true) || ch === 0x24 /* $ */ || ch === 0x5F /* _ */ || ch === 0x200C /* <ZWNJ> */ || ch === 0x200D /* <ZWJ> */
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-AtomEscape
pp$1.regexp_eatAtomEscape = function(state) {
  if (
    this.regexp_eatBackReference(state) ||
    this.regexp_eatCharacterClassEscape(state) ||
    this.regexp_eatCharacterEscape(state) ||
    (state.switchN && this.regexp_eatKGroupName(state))
  ) {
    return true
  }
  if (state.switchU) {
    // Make the same message as V8.
    if (state.current() === 0x63 /* c */) {
      state.raise("Invalid unicode escape");
    }
    state.raise("Invalid escape");
  }
  return false
};
pp$1.regexp_eatBackReference = function(state) {
  var start = state.pos;
  if (this.regexp_eatDecimalEscape(state)) {
    var n = state.lastIntValue;
    if (state.switchU) {
      // For SyntaxError in https://www.ecma-international.org/ecma-262/8.0/#sec-atomescape
      if (n > state.maxBackReference) {
        state.maxBackReference = n;
      }
      return true
    }
    if (n <= state.numCapturingParens) {
      return true
    }
    state.pos = start;
  }
  return false
};
pp$1.regexp_eatKGroupName = function(state) {
  if (state.eat(0x6B /* k */)) {
    if (this.regexp_eatGroupName(state)) {
      state.backReferenceNames.push(state.lastStringValue);
      return true
    }
    state.raise("Invalid named reference");
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-CharacterEscape
pp$1.regexp_eatCharacterEscape = function(state) {
  return (
    this.regexp_eatControlEscape(state) ||
    this.regexp_eatCControlLetter(state) ||
    this.regexp_eatZero(state) ||
    this.regexp_eatHexEscapeSequence(state) ||
    this.regexp_eatRegExpUnicodeEscapeSequence(state, false) ||
    (!state.switchU && this.regexp_eatLegacyOctalEscapeSequence(state)) ||
    this.regexp_eatIdentityEscape(state)
  )
};
pp$1.regexp_eatCControlLetter = function(state) {
  var start = state.pos;
  if (state.eat(0x63 /* c */)) {
    if (this.regexp_eatControlLetter(state)) {
      return true
    }
    state.pos = start;
  }
  return false
};
pp$1.regexp_eatZero = function(state) {
  if (state.current() === 0x30 /* 0 */ && !isDecimalDigit(state.lookahead())) {
    state.lastIntValue = 0;
    state.advance();
    return true
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-ControlEscape
pp$1.regexp_eatControlEscape = function(state) {
  var ch = state.current();
  if (ch === 0x74 /* t */) {
    state.lastIntValue = 0x09; /* \\t */
    state.advance();
    return true
  }
  if (ch === 0x6E /* n */) {
    state.lastIntValue = 0x0A; /* \\n */
    state.advance();
    return true
  }
  if (ch === 0x76 /* v */) {
    state.lastIntValue = 0x0B; /* \\v */
    state.advance();
    return true
  }
  if (ch === 0x66 /* f */) {
    state.lastIntValue = 0x0C; /* \\f */
    state.advance();
    return true
  }
  if (ch === 0x72 /* r */) {
    state.lastIntValue = 0x0D; /* \\r */
    state.advance();
    return true
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-ControlLetter
pp$1.regexp_eatControlLetter = function(state) {
  var ch = state.current();
  if (isControlLetter(ch)) {
    state.lastIntValue = ch % 0x20;
    state.advance();
    return true
  }
  return false
};
function isControlLetter(ch) {
  return (
    (ch >= 0x41 /* A */ && ch <= 0x5A /* Z */) ||
    (ch >= 0x61 /* a */ && ch <= 0x7A /* z */)
  )
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-RegExpUnicodeEscapeSequence
pp$1.regexp_eatRegExpUnicodeEscapeSequence = function(state, forceU) {
  if ( forceU === void 0 ) forceU = false;

  var start = state.pos;
  var switchU = forceU || state.switchU;

  if (state.eat(0x75 /* u */)) {
    if (this.regexp_eatFixedHexDigits(state, 4)) {
      var lead = state.lastIntValue;
      if (switchU && lead >= 0xD800 && lead <= 0xDBFF) {
        var leadSurrogateEnd = state.pos;
        if (state.eat(0x5C /* \\ */) && state.eat(0x75 /* u */) && this.regexp_eatFixedHexDigits(state, 4)) {
          var trail = state.lastIntValue;
          if (trail >= 0xDC00 && trail <= 0xDFFF) {
            state.lastIntValue = (lead - 0xD800) * 0x400 + (trail - 0xDC00) + 0x10000;
            return true
          }
        }
        state.pos = leadSurrogateEnd;
        state.lastIntValue = lead;
      }
      return true
    }
    if (
      switchU &&
      state.eat(0x7B /* { */) &&
      this.regexp_eatHexDigits(state) &&
      state.eat(0x7D /* } */) &&
      isValidUnicode(state.lastIntValue)
    ) {
      return true
    }
    if (switchU) {
      state.raise("Invalid unicode escape");
    }
    state.pos = start;
  }

  return false
};
function isValidUnicode(ch) {
  return ch >= 0 && ch <= 0x10FFFF
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-IdentityEscape
pp$1.regexp_eatIdentityEscape = function(state) {
  if (state.switchU) {
    if (this.regexp_eatSyntaxCharacter(state)) {
      return true
    }
    if (state.eat(0x2F /* / */)) {
      state.lastIntValue = 0x2F; /* / */
      return true
    }
    return false
  }

  var ch = state.current();
  if (ch !== 0x63 /* c */ && (!state.switchN || ch !== 0x6B /* k */)) {
    state.lastIntValue = ch;
    state.advance();
    return true
  }

  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-DecimalEscape
pp$1.regexp_eatDecimalEscape = function(state) {
  state.lastIntValue = 0;
  var ch = state.current();
  if (ch >= 0x31 /* 1 */ && ch <= 0x39 /* 9 */) {
    do {
      state.lastIntValue = 10 * state.lastIntValue + (ch - 0x30 /* 0 */);
      state.advance();
    } while ((ch = state.current()) >= 0x30 /* 0 */ && ch <= 0x39 /* 9 */)
    return true
  }
  return false
};

// Return values used by character set parsing methods, needed to
// forbid negation of sets that can match strings.
var CharSetNone = 0; // Nothing parsed
var CharSetOk = 1; // Construct parsed, cannot contain strings
var CharSetString = 2; // Construct parsed, can contain strings

// https://www.ecma-international.org/ecma-262/8.0/#prod-CharacterClassEscape
pp$1.regexp_eatCharacterClassEscape = function(state) {
  var ch = state.current();

  if (isCharacterClassEscape(ch)) {
    state.lastIntValue = -1;
    state.advance();
    return CharSetOk
  }

  var negate = false;
  if (
    state.switchU &&
    this.options.ecmaVersion >= 9 &&
    ((negate = ch === 0x50 /* P */) || ch === 0x70 /* p */)
  ) {
    state.lastIntValue = -1;
    state.advance();
    var result;
    if (
      state.eat(0x7B /* { */) &&
      (result = this.regexp_eatUnicodePropertyValueExpression(state)) &&
      state.eat(0x7D /* } */)
    ) {
      if (negate && result === CharSetString) { state.raise("Invalid property name"); }
      return result
    }
    state.raise("Invalid property name");
  }

  return CharSetNone
};

function isCharacterClassEscape(ch) {
  return (
    ch === 0x64 /* d */ ||
    ch === 0x44 /* D */ ||
    ch === 0x73 /* s */ ||
    ch === 0x53 /* S */ ||
    ch === 0x77 /* w */ ||
    ch === 0x57 /* W */
  )
}

// UnicodePropertyValueExpression ::
//   UnicodePropertyName \`=\` UnicodePropertyValue
//   LoneUnicodePropertyNameOrValue
pp$1.regexp_eatUnicodePropertyValueExpression = function(state) {
  var start = state.pos;

  // UnicodePropertyName \`=\` UnicodePropertyValue
  if (this.regexp_eatUnicodePropertyName(state) && state.eat(0x3D /* = */)) {
    var name = state.lastStringValue;
    if (this.regexp_eatUnicodePropertyValue(state)) {
      var value = state.lastStringValue;
      this.regexp_validateUnicodePropertyNameAndValue(state, name, value);
      return CharSetOk
    }
  }
  state.pos = start;

  // LoneUnicodePropertyNameOrValue
  if (this.regexp_eatLoneUnicodePropertyNameOrValue(state)) {
    var nameOrValue = state.lastStringValue;
    return this.regexp_validateUnicodePropertyNameOrValue(state, nameOrValue)
  }
  return CharSetNone
};

pp$1.regexp_validateUnicodePropertyNameAndValue = function(state, name, value) {
  if (!hasOwn(state.unicodeProperties.nonBinary, name))
    { state.raise("Invalid property name"); }
  if (!state.unicodeProperties.nonBinary[name].test(value))
    { state.raise("Invalid property value"); }
};

pp$1.regexp_validateUnicodePropertyNameOrValue = function(state, nameOrValue) {
  if (state.unicodeProperties.binary.test(nameOrValue)) { return CharSetOk }
  if (state.switchV && state.unicodeProperties.binaryOfStrings.test(nameOrValue)) { return CharSetString }
  state.raise("Invalid property name");
};

// UnicodePropertyName ::
//   UnicodePropertyNameCharacters
pp$1.regexp_eatUnicodePropertyName = function(state) {
  var ch = 0;
  state.lastStringValue = "";
  while (isUnicodePropertyNameCharacter(ch = state.current())) {
    state.lastStringValue += codePointToString(ch);
    state.advance();
  }
  return state.lastStringValue !== ""
};

function isUnicodePropertyNameCharacter(ch) {
  return isControlLetter(ch) || ch === 0x5F /* _ */
}

// UnicodePropertyValue ::
//   UnicodePropertyValueCharacters
pp$1.regexp_eatUnicodePropertyValue = function(state) {
  var ch = 0;
  state.lastStringValue = "";
  while (isUnicodePropertyValueCharacter(ch = state.current())) {
    state.lastStringValue += codePointToString(ch);
    state.advance();
  }
  return state.lastStringValue !== ""
};
function isUnicodePropertyValueCharacter(ch) {
  return isUnicodePropertyNameCharacter(ch) || isDecimalDigit(ch)
}

// LoneUnicodePropertyNameOrValue ::
//   UnicodePropertyValueCharacters
pp$1.regexp_eatLoneUnicodePropertyNameOrValue = function(state) {
  return this.regexp_eatUnicodePropertyValue(state)
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-CharacterClass
pp$1.regexp_eatCharacterClass = function(state) {
  if (state.eat(0x5B /* [ */)) {
    var negate = state.eat(0x5E /* ^ */);
    var result = this.regexp_classContents(state);
    if (!state.eat(0x5D /* ] */))
      { state.raise("Unterminated character class"); }
    if (negate && result === CharSetString)
      { state.raise("Negated character class may contain strings"); }
    return true
  }
  return false
};

// https://tc39.es/ecma262/#prod-ClassContents
// https://www.ecma-international.org/ecma-262/8.0/#prod-ClassRanges
pp$1.regexp_classContents = function(state) {
  if (state.current() === 0x5D /* ] */) { return CharSetOk }
  if (state.switchV) { return this.regexp_classSetExpression(state) }
  this.regexp_nonEmptyClassRanges(state);
  return CharSetOk
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-NonemptyClassRanges
// https://www.ecma-international.org/ecma-262/8.0/#prod-NonemptyClassRangesNoDash
pp$1.regexp_nonEmptyClassRanges = function(state) {
  while (this.regexp_eatClassAtom(state)) {
    var left = state.lastIntValue;
    if (state.eat(0x2D /* - */) && this.regexp_eatClassAtom(state)) {
      var right = state.lastIntValue;
      if (state.switchU && (left === -1 || right === -1)) {
        state.raise("Invalid character class");
      }
      if (left !== -1 && right !== -1 && left > right) {
        state.raise("Range out of order in character class");
      }
    }
  }
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-ClassAtom
// https://www.ecma-international.org/ecma-262/8.0/#prod-ClassAtomNoDash
pp$1.regexp_eatClassAtom = function(state) {
  var start = state.pos;

  if (state.eat(0x5C /* \\ */)) {
    if (this.regexp_eatClassEscape(state)) {
      return true
    }
    if (state.switchU) {
      // Make the same message as V8.
      var ch$1 = state.current();
      if (ch$1 === 0x63 /* c */ || isOctalDigit(ch$1)) {
        state.raise("Invalid class escape");
      }
      state.raise("Invalid escape");
    }
    state.pos = start;
  }

  var ch = state.current();
  if (ch !== 0x5D /* ] */) {
    state.lastIntValue = ch;
    state.advance();
    return true
  }

  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ClassEscape
pp$1.regexp_eatClassEscape = function(state) {
  var start = state.pos;

  if (state.eat(0x62 /* b */)) {
    state.lastIntValue = 0x08; /* <BS> */
    return true
  }

  if (state.switchU && state.eat(0x2D /* - */)) {
    state.lastIntValue = 0x2D; /* - */
    return true
  }

  if (!state.switchU && state.eat(0x63 /* c */)) {
    if (this.regexp_eatClassControlLetter(state)) {
      return true
    }
    state.pos = start;
  }

  return (
    this.regexp_eatCharacterClassEscape(state) ||
    this.regexp_eatCharacterEscape(state)
  )
};

// https://tc39.es/ecma262/#prod-ClassSetExpression
// https://tc39.es/ecma262/#prod-ClassUnion
// https://tc39.es/ecma262/#prod-ClassIntersection
// https://tc39.es/ecma262/#prod-ClassSubtraction
pp$1.regexp_classSetExpression = function(state) {
  var result = CharSetOk, subResult;
  if (this.regexp_eatClassSetRange(state)) ; else if (subResult = this.regexp_eatClassSetOperand(state)) {
    if (subResult === CharSetString) { result = CharSetString; }
    // https://tc39.es/ecma262/#prod-ClassIntersection
    var start = state.pos;
    while (state.eatChars([0x26, 0x26] /* && */)) {
      if (
        state.current() !== 0x26 /* & */ &&
        (subResult = this.regexp_eatClassSetOperand(state))
      ) {
        if (subResult !== CharSetString) { result = CharSetOk; }
        continue
      }
      state.raise("Invalid character in character class");
    }
    if (start !== state.pos) { return result }
    // https://tc39.es/ecma262/#prod-ClassSubtraction
    while (state.eatChars([0x2D, 0x2D] /* -- */)) {
      if (this.regexp_eatClassSetOperand(state)) { continue }
      state.raise("Invalid character in character class");
    }
    if (start !== state.pos) { return result }
  } else {
    state.raise("Invalid character in character class");
  }
  // https://tc39.es/ecma262/#prod-ClassUnion
  for (;;) {
    if (this.regexp_eatClassSetRange(state)) { continue }
    subResult = this.regexp_eatClassSetOperand(state);
    if (!subResult) { return result }
    if (subResult === CharSetString) { result = CharSetString; }
  }
};

// https://tc39.es/ecma262/#prod-ClassSetRange
pp$1.regexp_eatClassSetRange = function(state) {
  var start = state.pos;
  if (this.regexp_eatClassSetCharacter(state)) {
    var left = state.lastIntValue;
    if (state.eat(0x2D /* - */) && this.regexp_eatClassSetCharacter(state)) {
      var right = state.lastIntValue;
      if (left !== -1 && right !== -1 && left > right) {
        state.raise("Range out of order in character class");
      }
      return true
    }
    state.pos = start;
  }
  return false
};

// https://tc39.es/ecma262/#prod-ClassSetOperand
pp$1.regexp_eatClassSetOperand = function(state) {
  if (this.regexp_eatClassSetCharacter(state)) { return CharSetOk }
  return this.regexp_eatClassStringDisjunction(state) || this.regexp_eatNestedClass(state)
};

// https://tc39.es/ecma262/#prod-NestedClass
pp$1.regexp_eatNestedClass = function(state) {
  var start = state.pos;
  if (state.eat(0x5B /* [ */)) {
    var negate = state.eat(0x5E /* ^ */);
    var result = this.regexp_classContents(state);
    if (state.eat(0x5D /* ] */)) {
      if (negate && result === CharSetString) {
        state.raise("Negated character class may contain strings");
      }
      return result
    }
    state.pos = start;
  }
  if (state.eat(0x5C /* \\ */)) {
    var result$1 = this.regexp_eatCharacterClassEscape(state);
    if (result$1) {
      return result$1
    }
    state.pos = start;
  }
  return null
};

// https://tc39.es/ecma262/#prod-ClassStringDisjunction
pp$1.regexp_eatClassStringDisjunction = function(state) {
  var start = state.pos;
  if (state.eatChars([0x5C, 0x71] /* \\q */)) {
    if (state.eat(0x7B /* { */)) {
      var result = this.regexp_classStringDisjunctionContents(state);
      if (state.eat(0x7D /* } */)) {
        return result
      }
    } else {
      // Make the same message as V8.
      state.raise("Invalid escape");
    }
    state.pos = start;
  }
  return null
};

// https://tc39.es/ecma262/#prod-ClassStringDisjunctionContents
pp$1.regexp_classStringDisjunctionContents = function(state) {
  var result = this.regexp_classString(state);
  while (state.eat(0x7C /* | */)) {
    if (this.regexp_classString(state) === CharSetString) { result = CharSetString; }
  }
  return result
};

// https://tc39.es/ecma262/#prod-ClassString
// https://tc39.es/ecma262/#prod-NonEmptyClassString
pp$1.regexp_classString = function(state) {
  var count = 0;
  while (this.regexp_eatClassSetCharacter(state)) { count++; }
  return count === 1 ? CharSetOk : CharSetString
};

// https://tc39.es/ecma262/#prod-ClassSetCharacter
pp$1.regexp_eatClassSetCharacter = function(state) {
  var start = state.pos;
  if (state.eat(0x5C /* \\ */)) {
    if (
      this.regexp_eatCharacterEscape(state) ||
      this.regexp_eatClassSetReservedPunctuator(state)
    ) {
      return true
    }
    if (state.eat(0x62 /* b */)) {
      state.lastIntValue = 0x08; /* <BS> */
      return true
    }
    state.pos = start;
    return false
  }
  var ch = state.current();
  if (ch < 0 || ch === state.lookahead() && isClassSetReservedDoublePunctuatorCharacter(ch)) { return false }
  if (isClassSetSyntaxCharacter(ch)) { return false }
  state.advance();
  state.lastIntValue = ch;
  return true
};

// https://tc39.es/ecma262/#prod-ClassSetReservedDoublePunctuator
function isClassSetReservedDoublePunctuatorCharacter(ch) {
  return (
    ch === 0x21 /* ! */ ||
    ch >= 0x23 /* # */ && ch <= 0x26 /* & */ ||
    ch >= 0x2A /* * */ && ch <= 0x2C /* , */ ||
    ch === 0x2E /* . */ ||
    ch >= 0x3A /* : */ && ch <= 0x40 /* @ */ ||
    ch === 0x5E /* ^ */ ||
    ch === 0x60 /* \` */ ||
    ch === 0x7E /* ~ */
  )
}

// https://tc39.es/ecma262/#prod-ClassSetSyntaxCharacter
function isClassSetSyntaxCharacter(ch) {
  return (
    ch === 0x28 /* ( */ ||
    ch === 0x29 /* ) */ ||
    ch === 0x2D /* - */ ||
    ch === 0x2F /* / */ ||
    ch >= 0x5B /* [ */ && ch <= 0x5D /* ] */ ||
    ch >= 0x7B /* { */ && ch <= 0x7D /* } */
  )
}

// https://tc39.es/ecma262/#prod-ClassSetReservedPunctuator
pp$1.regexp_eatClassSetReservedPunctuator = function(state) {
  var ch = state.current();
  if (isClassSetReservedPunctuator(ch)) {
    state.lastIntValue = ch;
    state.advance();
    return true
  }
  return false
};

// https://tc39.es/ecma262/#prod-ClassSetReservedPunctuator
function isClassSetReservedPunctuator(ch) {
  return (
    ch === 0x21 /* ! */ ||
    ch === 0x23 /* # */ ||
    ch === 0x25 /* % */ ||
    ch === 0x26 /* & */ ||
    ch === 0x2C /* , */ ||
    ch === 0x2D /* - */ ||
    ch >= 0x3A /* : */ && ch <= 0x3E /* > */ ||
    ch === 0x40 /* @ */ ||
    ch === 0x60 /* \` */ ||
    ch === 0x7E /* ~ */
  )
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ClassControlLetter
pp$1.regexp_eatClassControlLetter = function(state) {
  var ch = state.current();
  if (isDecimalDigit(ch) || ch === 0x5F /* _ */) {
    state.lastIntValue = ch % 0x20;
    state.advance();
    return true
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-HexEscapeSequence
pp$1.regexp_eatHexEscapeSequence = function(state) {
  var start = state.pos;
  if (state.eat(0x78 /* x */)) {
    if (this.regexp_eatFixedHexDigits(state, 2)) {
      return true
    }
    if (state.switchU) {
      state.raise("Invalid escape");
    }
    state.pos = start;
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-DecimalDigits
pp$1.regexp_eatDecimalDigits = function(state) {
  var start = state.pos;
  var ch = 0;
  state.lastIntValue = 0;
  while (isDecimalDigit(ch = state.current())) {
    state.lastIntValue = 10 * state.lastIntValue + (ch - 0x30 /* 0 */);
    state.advance();
  }
  return state.pos !== start
};
function isDecimalDigit(ch) {
  return ch >= 0x30 /* 0 */ && ch <= 0x39 /* 9 */
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-HexDigits
pp$1.regexp_eatHexDigits = function(state) {
  var start = state.pos;
  var ch = 0;
  state.lastIntValue = 0;
  while (isHexDigit(ch = state.current())) {
    state.lastIntValue = 16 * state.lastIntValue + hexToInt(ch);
    state.advance();
  }
  return state.pos !== start
};
function isHexDigit(ch) {
  return (
    (ch >= 0x30 /* 0 */ && ch <= 0x39 /* 9 */) ||
    (ch >= 0x41 /* A */ && ch <= 0x46 /* F */) ||
    (ch >= 0x61 /* a */ && ch <= 0x66 /* f */)
  )
}
function hexToInt(ch) {
  if (ch >= 0x41 /* A */ && ch <= 0x46 /* F */) {
    return 10 + (ch - 0x41 /* A */)
  }
  if (ch >= 0x61 /* a */ && ch <= 0x66 /* f */) {
    return 10 + (ch - 0x61 /* a */)
  }
  return ch - 0x30 /* 0 */
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-LegacyOctalEscapeSequence
// Allows only 0-377(octal) i.e. 0-255(decimal).
pp$1.regexp_eatLegacyOctalEscapeSequence = function(state) {
  if (this.regexp_eatOctalDigit(state)) {
    var n1 = state.lastIntValue;
    if (this.regexp_eatOctalDigit(state)) {
      var n2 = state.lastIntValue;
      if (n1 <= 3 && this.regexp_eatOctalDigit(state)) {
        state.lastIntValue = n1 * 64 + n2 * 8 + state.lastIntValue;
      } else {
        state.lastIntValue = n1 * 8 + n2;
      }
    } else {
      state.lastIntValue = n1;
    }
    return true
  }
  return false
};

// https://www.ecma-international.org/ecma-262/8.0/#prod-OctalDigit
pp$1.regexp_eatOctalDigit = function(state) {
  var ch = state.current();
  if (isOctalDigit(ch)) {
    state.lastIntValue = ch - 0x30; /* 0 */
    state.advance();
    return true
  }
  state.lastIntValue = 0;
  return false
};
function isOctalDigit(ch) {
  return ch >= 0x30 /* 0 */ && ch <= 0x37 /* 7 */
}

// https://www.ecma-international.org/ecma-262/8.0/#prod-Hex4Digits
// https://www.ecma-international.org/ecma-262/8.0/#prod-HexDigit
// And HexDigit HexDigit in https://www.ecma-international.org/ecma-262/8.0/#prod-HexEscapeSequence
pp$1.regexp_eatFixedHexDigits = function(state, length) {
  var start = state.pos;
  state.lastIntValue = 0;
  for (var i = 0; i < length; ++i) {
    var ch = state.current();
    if (!isHexDigit(ch)) {
      state.pos = start;
      return false
    }
    state.lastIntValue = 16 * state.lastIntValue + hexToInt(ch);
    state.advance();
  }
  return true
};

// Object type used to represent tokens. Note that normally, tokens
// simply exist as properties on the parser object. This is only
// used for the onToken callback and the external tokenizer.

var Token = function Token(p) {
  this.type = p.type;
  this.value = p.value;
  this.start = p.start;
  this.end = p.end;
  if (p.options.locations)
    { this.loc = new SourceLocation(p, p.startLoc, p.endLoc); }
  if (p.options.ranges)
    { this.range = [p.start, p.end]; }
};

// ## Tokenizer

var pp = Parser.prototype;

// Move to the next token

pp.next = function(ignoreEscapeSequenceInKeyword) {
  if (!ignoreEscapeSequenceInKeyword && this.type.keyword && this.containsEsc)
    { this.raiseRecoverable(this.start, "Escape sequence in keyword " + this.type.keyword); }
  if (this.options.onToken)
    { this.options.onToken(new Token(this)); }

  this.lastTokEnd = this.end;
  this.lastTokStart = this.start;
  this.lastTokEndLoc = this.endLoc;
  this.lastTokStartLoc = this.startLoc;
  this.nextToken();
};

pp.getToken = function() {
  this.next();
  return new Token(this)
};

// If we're in an ES6 environment, make parsers iterable
if (typeof Symbol !== "undefined")
  { pp[Symbol.iterator] = function() {
    var this$1$1 = this;

    return {
      next: function () {
        var token = this$1$1.getToken();
        return {
          done: token.type === types$1.eof,
          value: token
        }
      }
    }
  }; }

// Toggle strict mode. Re-reads the next number or string to please
// pedantic tests (\`"use strict"; 010;\` should fail).

// Read a single token, updating the parser object's token-related
// properties.

pp.nextToken = function() {
  var curContext = this.curContext();
  if (!curContext || !curContext.preserveSpace) { this.skipSpace(); }

  this.start = this.pos;
  if (this.options.locations) { this.startLoc = this.curPosition(); }
  if (this.pos >= this.input.length) { return this.finishToken(types$1.eof) }

  if (curContext.override) { return curContext.override(this) }
  else { this.readToken(this.fullCharCodeAtPos()); }
};

pp.readToken = function(code) {
  // Identifier or keyword. '\\uXXXX' sequences are allowed in
  // identifiers, so '\\' also dispatches to that.
  if (isIdentifierStart(code, this.options.ecmaVersion >= 6) || code === 92 /* '\\' */)
    { return this.readWord() }

  return this.getTokenFromCode(code)
};

pp.fullCharCodeAt = function(pos) {
  var code = this.input.charCodeAt(pos);
  if (code <= 0xd7ff || code >= 0xdc00) { return code }
  var next = this.input.charCodeAt(pos + 1);
  return next <= 0xdbff || next >= 0xe000 ? code : (code << 10) + next - 0x35fdc00
};

pp.fullCharCodeAtPos = function() {
  return this.fullCharCodeAt(this.pos)
};

pp.skipBlockComment = function() {
  var startLoc = this.options.onComment && this.curPosition();
  var start = this.pos, end = this.input.indexOf("*/", this.pos += 2);
  if (end === -1) { this.raise(this.pos - 2, "Unterminated comment"); }
  this.pos = end + 2;
  if (this.options.locations) {
    for (var nextBreak = (void 0), pos = start; (nextBreak = nextLineBreak(this.input, pos, this.pos)) > -1;) {
      ++this.curLine;
      pos = this.lineStart = nextBreak;
    }
  }
  if (this.options.onComment)
    { this.options.onComment(true, this.input.slice(start + 2, end), start, this.pos,
                           startLoc, this.curPosition()); }
};

pp.skipLineComment = function(startSkip) {
  var start = this.pos;
  var startLoc = this.options.onComment && this.curPosition();
  var ch = this.input.charCodeAt(this.pos += startSkip);
  while (this.pos < this.input.length && !isNewLine(ch)) {
    ch = this.input.charCodeAt(++this.pos);
  }
  if (this.options.onComment)
    { this.options.onComment(false, this.input.slice(start + startSkip, this.pos), start, this.pos,
                           startLoc, this.curPosition()); }
};

// Called at the start of the parse and after every token. Skips
// whitespace and comments, and.

pp.skipSpace = function() {
  loop: while (this.pos < this.input.length) {
    var ch = this.input.charCodeAt(this.pos);
    switch (ch) {
    case 32: case 160: // ' '
      ++this.pos;
      break
    case 13:
      if (this.input.charCodeAt(this.pos + 1) === 10) {
        ++this.pos;
      }
    case 10: case 8232: case 8233:
      ++this.pos;
      if (this.options.locations) {
        ++this.curLine;
        this.lineStart = this.pos;
      }
      break
    case 47: // '/'
      switch (this.input.charCodeAt(this.pos + 1)) {
      case 42: // '*'
        this.skipBlockComment();
        break
      case 47:
        this.skipLineComment(2);
        break
      default:
        break loop
      }
      break
    default:
      if (ch > 8 && ch < 14 || ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
        ++this.pos;
      } else {
        break loop
      }
    }
  }
};

// Called at the end of every token. Sets \`end\`, \`val\`, and
// maintains \`context\` and \`exprAllowed\`, and skips the space after
// the token, so that the next one's \`start\` will point at the
// right position.

pp.finishToken = function(type, val) {
  this.end = this.pos;
  if (this.options.locations) { this.endLoc = this.curPosition(); }
  var prevType = this.type;
  this.type = type;
  this.value = val;

  this.updateContext(prevType);
};

// ### Token reading

// This is the function that is called to fetch the next token. It
// is somewhat obscure, because it works in character codes rather
// than characters, and because operator parsing has been inlined
// into it.
//
// All in the name of speed.
//
pp.readToken_dot = function() {
  var next = this.input.charCodeAt(this.pos + 1);
  if (next >= 48 && next <= 57) { return this.readNumber(true) }
  var next2 = this.input.charCodeAt(this.pos + 2);
  if (this.options.ecmaVersion >= 6 && next === 46 && next2 === 46) { // 46 = dot '.'
    this.pos += 3;
    return this.finishToken(types$1.ellipsis)
  } else {
    ++this.pos;
    return this.finishToken(types$1.dot)
  }
};

pp.readToken_slash = function() { // '/'
  var next = this.input.charCodeAt(this.pos + 1);
  if (this.exprAllowed) { ++this.pos; return this.readRegexp() }
  if (next === 61) { return this.finishOp(types$1.assign, 2) }
  return this.finishOp(types$1.slash, 1)
};

pp.readToken_mult_modulo_exp = function(code) { // '%*'
  var next = this.input.charCodeAt(this.pos + 1);
  var size = 1;
  var tokentype = code === 42 ? types$1.star : types$1.modulo;

  // exponentiation operator ** and **=
  if (this.options.ecmaVersion >= 7 && code === 42 && next === 42) {
    ++size;
    tokentype = types$1.starstar;
    next = this.input.charCodeAt(this.pos + 2);
  }

  if (next === 61) { return this.finishOp(types$1.assign, size + 1) }
  return this.finishOp(tokentype, size)
};

pp.readToken_pipe_amp = function(code) { // '|&'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === code) {
    if (this.options.ecmaVersion >= 12) {
      var next2 = this.input.charCodeAt(this.pos + 2);
      if (next2 === 61) { return this.finishOp(types$1.assign, 3) }
    }
    return this.finishOp(code === 124 ? types$1.logicalOR : types$1.logicalAND, 2)
  }
  if (next === 61) { return this.finishOp(types$1.assign, 2) }
  return this.finishOp(code === 124 ? types$1.bitwiseOR : types$1.bitwiseAND, 1)
};

pp.readToken_caret = function() { // '^'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === 61) { return this.finishOp(types$1.assign, 2) }
  return this.finishOp(types$1.bitwiseXOR, 1)
};

pp.readToken_plus_min = function(code) { // '+-'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === code) {
    if (next === 45 && !this.inModule && this.input.charCodeAt(this.pos + 2) === 62 &&
        (this.lastTokEnd === 0 || lineBreak.test(this.input.slice(this.lastTokEnd, this.pos)))) {
      // A \`-->\` line comment
      this.skipLineComment(3);
      this.skipSpace();
      return this.nextToken()
    }
    return this.finishOp(types$1.incDec, 2)
  }
  if (next === 61) { return this.finishOp(types$1.assign, 2) }
  return this.finishOp(types$1.plusMin, 1)
};

pp.readToken_lt_gt = function(code) { // '<>'
  var next = this.input.charCodeAt(this.pos + 1);
  var size = 1;
  if (next === code) {
    size = code === 62 && this.input.charCodeAt(this.pos + 2) === 62 ? 3 : 2;
    if (this.input.charCodeAt(this.pos + size) === 61) { return this.finishOp(types$1.assign, size + 1) }
    return this.finishOp(types$1.bitShift, size)
  }
  if (next === 33 && code === 60 && !this.inModule && this.input.charCodeAt(this.pos + 2) === 45 &&
      this.input.charCodeAt(this.pos + 3) === 45) {
    // \`<!--\`, an XML-style comment that should be interpreted as a line comment
    this.skipLineComment(4);
    this.skipSpace();
    return this.nextToken()
  }
  if (next === 61) { size = 2; }
  return this.finishOp(types$1.relational, size)
};

pp.readToken_eq_excl = function(code) { // '=!'
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === 61) { return this.finishOp(types$1.equality, this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2) }
  if (code === 61 && next === 62 && this.options.ecmaVersion >= 6) { // '=>'
    this.pos += 2;
    return this.finishToken(types$1.arrow)
  }
  return this.finishOp(code === 61 ? types$1.eq : types$1.prefix, 1)
};

pp.readToken_question = function() { // '?'
  var ecmaVersion = this.options.ecmaVersion;
  if (ecmaVersion >= 11) {
    var next = this.input.charCodeAt(this.pos + 1);
    if (next === 46) {
      var next2 = this.input.charCodeAt(this.pos + 2);
      if (next2 < 48 || next2 > 57) { return this.finishOp(types$1.questionDot, 2) }
    }
    if (next === 63) {
      if (ecmaVersion >= 12) {
        var next2$1 = this.input.charCodeAt(this.pos + 2);
        if (next2$1 === 61) { return this.finishOp(types$1.assign, 3) }
      }
      return this.finishOp(types$1.coalesce, 2)
    }
  }
  return this.finishOp(types$1.question, 1)
};

pp.readToken_numberSign = function() { // '#'
  var ecmaVersion = this.options.ecmaVersion;
  var code = 35; // '#'
  if (ecmaVersion >= 13) {
    ++this.pos;
    code = this.fullCharCodeAtPos();
    if (isIdentifierStart(code, true) || code === 92 /* '\\' */) {
      return this.finishToken(types$1.privateId, this.readWord1())
    }
  }

  this.raise(this.pos, "Unexpected character '" + codePointToString(code) + "'");
};

pp.getTokenFromCode = function(code) {
  switch (code) {
  // The interpretation of a dot depends on whether it is followed
  // by a digit or another two dots.
  case 46: // '.'
    return this.readToken_dot()

  // Punctuation tokens.
  case 40: ++this.pos; return this.finishToken(types$1.parenL)
  case 41: ++this.pos; return this.finishToken(types$1.parenR)
  case 59: ++this.pos; return this.finishToken(types$1.semi)
  case 44: ++this.pos; return this.finishToken(types$1.comma)
  case 91: ++this.pos; return this.finishToken(types$1.bracketL)
  case 93: ++this.pos; return this.finishToken(types$1.bracketR)
  case 123: ++this.pos; return this.finishToken(types$1.braceL)
  case 125: ++this.pos; return this.finishToken(types$1.braceR)
  case 58: ++this.pos; return this.finishToken(types$1.colon)

  case 96: // '\`'
    if (this.options.ecmaVersion < 6) { break }
    ++this.pos;
    return this.finishToken(types$1.backQuote)

  case 48: // '0'
    var next = this.input.charCodeAt(this.pos + 1);
    if (next === 120 || next === 88) { return this.readRadixNumber(16) } // '0x', '0X' - hex number
    if (this.options.ecmaVersion >= 6) {
      if (next === 111 || next === 79) { return this.readRadixNumber(8) } // '0o', '0O' - octal number
      if (next === 98 || next === 66) { return this.readRadixNumber(2) } // '0b', '0B' - binary number
    }

  // Anything else beginning with a digit is an integer, octal
  // number, or float.
  case 49: case 50: case 51: case 52: case 53: case 54: case 55: case 56: case 57: // 1-9
    return this.readNumber(false)

  // Quotes produce strings.
  case 34: case 39: // '"', "'"
    return this.readString(code)

  // Operators are parsed inline in tiny state machines. '=' (61) is
  // often referred to. \`finishOp\` simply skips the amount of
  // characters it is given as second argument, and returns a token
  // of the type given by its first argument.
  case 47: // '/'
    return this.readToken_slash()

  case 37: case 42: // '%*'
    return this.readToken_mult_modulo_exp(code)

  case 124: case 38: // '|&'
    return this.readToken_pipe_amp(code)

  case 94: // '^'
    return this.readToken_caret()

  case 43: case 45: // '+-'
    return this.readToken_plus_min(code)

  case 60: case 62: // '<>'
    return this.readToken_lt_gt(code)

  case 61: case 33: // '=!'
    return this.readToken_eq_excl(code)

  case 63: // '?'
    return this.readToken_question()

  case 126: // '~'
    return this.finishOp(types$1.prefix, 1)

  case 35: // '#'
    return this.readToken_numberSign()
  }

  this.raise(this.pos, "Unexpected character '" + codePointToString(code) + "'");
};

pp.finishOp = function(type, size) {
  var str = this.input.slice(this.pos, this.pos + size);
  this.pos += size;
  return this.finishToken(type, str)
};

pp.readRegexp = function() {
  var escaped, inClass, start = this.pos;
  for (;;) {
    if (this.pos >= this.input.length) { this.raise(start, "Unterminated regular expression"); }
    var ch = this.input.charAt(this.pos);
    if (lineBreak.test(ch)) { this.raise(start, "Unterminated regular expression"); }
    if (!escaped) {
      if (ch === "[") { inClass = true; }
      else if (ch === "]" && inClass) { inClass = false; }
      else if (ch === "/" && !inClass) { break }
      escaped = ch === "\\\\";
    } else { escaped = false; }
    ++this.pos;
  }
  var pattern = this.input.slice(start, this.pos);
  ++this.pos;
  var flagsStart = this.pos;
  var flags = this.readWord1();
  if (this.containsEsc) { this.unexpected(flagsStart); }

  // Validate pattern
  var state = this.regexpState || (this.regexpState = new RegExpValidationState(this));
  state.reset(start, pattern, flags);
  this.validateRegExpFlags(state);
  this.validateRegExpPattern(state);

  // Create Literal#value property value.
  var value = null;
  try {
    value = new RegExp(pattern, flags);
  } catch (e) {
    // ESTree requires null if it failed to instantiate RegExp object.
    // https://github.com/estree/estree/blob/a27003adf4fd7bfad44de9cef372a2eacd527b1c/es5.md#regexpliteral
  }

  return this.finishToken(types$1.regexp, {pattern: pattern, flags: flags, value: value})
};

// Read an integer in the given radix. Return null if zero digits
// were read, the integer value otherwise. When \`len\` is given, this
// will return \`null\` unless the integer has exactly \`len\` digits.

pp.readInt = function(radix, len, maybeLegacyOctalNumericLiteral) {
  // \`len\` is used for character escape sequences. In that case, disallow separators.
  var allowSeparators = this.options.ecmaVersion >= 12 && len === undefined;

  // \`maybeLegacyOctalNumericLiteral\` is true if it doesn't have prefix (0x,0o,0b)
  // and isn't fraction part nor exponent part. In that case, if the first digit
  // is zero then disallow separators.
  var isLegacyOctalNumericLiteral = maybeLegacyOctalNumericLiteral && this.input.charCodeAt(this.pos) === 48;

  var start = this.pos, total = 0, lastCode = 0;
  for (var i = 0, e = len == null ? Infinity : len; i < e; ++i, ++this.pos) {
    var code = this.input.charCodeAt(this.pos), val = (void 0);

    if (allowSeparators && code === 95) {
      if (isLegacyOctalNumericLiteral) { this.raiseRecoverable(this.pos, "Numeric separator is not allowed in legacy octal numeric literals"); }
      if (lastCode === 95) { this.raiseRecoverable(this.pos, "Numeric separator must be exactly one underscore"); }
      if (i === 0) { this.raiseRecoverable(this.pos, "Numeric separator is not allowed at the first of digits"); }
      lastCode = code;
      continue
    }

    if (code >= 97) { val = code - 97 + 10; } // a
    else if (code >= 65) { val = code - 65 + 10; } // A
    else if (code >= 48 && code <= 57) { val = code - 48; } // 0-9
    else { val = Infinity; }
    if (val >= radix) { break }
    lastCode = code;
    total = total * radix + val;
  }

  if (allowSeparators && lastCode === 95) { this.raiseRecoverable(this.pos - 1, "Numeric separator is not allowed at the last of digits"); }
  if (this.pos === start || len != null && this.pos - start !== len) { return null }

  return total
};

function stringToNumber(str, isLegacyOctalNumericLiteral) {
  if (isLegacyOctalNumericLiteral) {
    return parseInt(str, 8)
  }

  // \`parseFloat(value)\` stops parsing at the first numeric separator then returns a wrong value.
  return parseFloat(str.replace(/_/g, ""))
}

function stringToBigInt(str) {
  if (typeof BigInt !== "function") {
    return null
  }

  // \`BigInt(value)\` throws syntax error if the string contains numeric separators.
  return BigInt(str.replace(/_/g, ""))
}

pp.readRadixNumber = function(radix) {
  var start = this.pos;
  this.pos += 2; // 0x
  var val = this.readInt(radix);
  if (val == null) { this.raise(this.start + 2, "Expected number in radix " + radix); }
  if (this.options.ecmaVersion >= 11 && this.input.charCodeAt(this.pos) === 110) {
    val = stringToBigInt(this.input.slice(start, this.pos));
    ++this.pos;
  } else if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }
  return this.finishToken(types$1.num, val)
};

// Read an integer, octal integer, or floating-point number.

pp.readNumber = function(startsWithDot) {
  var start = this.pos;
  if (!startsWithDot && this.readInt(10, undefined, true) === null) { this.raise(start, "Invalid number"); }
  var octal = this.pos - start >= 2 && this.input.charCodeAt(start) === 48;
  if (octal && this.strict) { this.raise(start, "Invalid number"); }
  var next = this.input.charCodeAt(this.pos);
  if (!octal && !startsWithDot && this.options.ecmaVersion >= 11 && next === 110) {
    var val$1 = stringToBigInt(this.input.slice(start, this.pos));
    ++this.pos;
    if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }
    return this.finishToken(types$1.num, val$1)
  }
  if (octal && /[89]/.test(this.input.slice(start, this.pos))) { octal = false; }
  if (next === 46 && !octal) { // '.'
    ++this.pos;
    this.readInt(10);
    next = this.input.charCodeAt(this.pos);
  }
  if ((next === 69 || next === 101) && !octal) { // 'eE'
    next = this.input.charCodeAt(++this.pos);
    if (next === 43 || next === 45) { ++this.pos; } // '+-'
    if (this.readInt(10) === null) { this.raise(start, "Invalid number"); }
  }
  if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }

  var val = stringToNumber(this.input.slice(start, this.pos), octal);
  return this.finishToken(types$1.num, val)
};

// Read a string value, interpreting backslash-escapes.

pp.readCodePoint = function() {
  var ch = this.input.charCodeAt(this.pos), code;

  if (ch === 123) { // '{'
    if (this.options.ecmaVersion < 6) { this.unexpected(); }
    var codePos = ++this.pos;
    code = this.readHexChar(this.input.indexOf("}", this.pos) - this.pos);
    ++this.pos;
    if (code > 0x10FFFF) { this.invalidStringToken(codePos, "Code point out of bounds"); }
  } else {
    code = this.readHexChar(4);
  }
  return code
};

pp.readString = function(quote) {
  var out = "", chunkStart = ++this.pos;
  for (;;) {
    if (this.pos >= this.input.length) { this.raise(this.start, "Unterminated string constant"); }
    var ch = this.input.charCodeAt(this.pos);
    if (ch === quote) { break }
    if (ch === 92) { // '\\'
      out += this.input.slice(chunkStart, this.pos);
      out += this.readEscapedChar(false);
      chunkStart = this.pos;
    } else if (ch === 0x2028 || ch === 0x2029) {
      if (this.options.ecmaVersion < 10) { this.raise(this.start, "Unterminated string constant"); }
      ++this.pos;
      if (this.options.locations) {
        this.curLine++;
        this.lineStart = this.pos;
      }
    } else {
      if (isNewLine(ch)) { this.raise(this.start, "Unterminated string constant"); }
      ++this.pos;
    }
  }
  out += this.input.slice(chunkStart, this.pos++);
  return this.finishToken(types$1.string, out)
};

// Reads template string tokens.

var INVALID_TEMPLATE_ESCAPE_ERROR = {};

pp.tryReadTemplateToken = function() {
  this.inTemplateElement = true;
  try {
    this.readTmplToken();
  } catch (err) {
    if (err === INVALID_TEMPLATE_ESCAPE_ERROR) {
      this.readInvalidTemplateToken();
    } else {
      throw err
    }
  }

  this.inTemplateElement = false;
};

pp.invalidStringToken = function(position, message) {
  if (this.inTemplateElement && this.options.ecmaVersion >= 9) {
    throw INVALID_TEMPLATE_ESCAPE_ERROR
  } else {
    this.raise(position, message);
  }
};

pp.readTmplToken = function() {
  var out = "", chunkStart = this.pos;
  for (;;) {
    if (this.pos >= this.input.length) { this.raise(this.start, "Unterminated template"); }
    var ch = this.input.charCodeAt(this.pos);
    if (ch === 96 || ch === 36 && this.input.charCodeAt(this.pos + 1) === 123) { // '\`', '\${'
      if (this.pos === this.start && (this.type === types$1.template || this.type === types$1.invalidTemplate)) {
        if (ch === 36) {
          this.pos += 2;
          return this.finishToken(types$1.dollarBraceL)
        } else {
          ++this.pos;
          return this.finishToken(types$1.backQuote)
        }
      }
      out += this.input.slice(chunkStart, this.pos);
      return this.finishToken(types$1.template, out)
    }
    if (ch === 92) { // '\\'
      out += this.input.slice(chunkStart, this.pos);
      out += this.readEscapedChar(true);
      chunkStart = this.pos;
    } else if (isNewLine(ch)) {
      out += this.input.slice(chunkStart, this.pos);
      ++this.pos;
      switch (ch) {
      case 13:
        if (this.input.charCodeAt(this.pos) === 10) { ++this.pos; }
      case 10:
        out += "\\n";
        break
      default:
        out += String.fromCharCode(ch);
        break
      }
      if (this.options.locations) {
        ++this.curLine;
        this.lineStart = this.pos;
      }
      chunkStart = this.pos;
    } else {
      ++this.pos;
    }
  }
};

// Reads a template token to search for the end, without validating any escape sequences
pp.readInvalidTemplateToken = function() {
  for (; this.pos < this.input.length; this.pos++) {
    switch (this.input[this.pos]) {
    case "\\\\":
      ++this.pos;
      break

    case "$":
      if (this.input[this.pos + 1] !== "{") { break }
      // fall through
    case "\`":
      return this.finishToken(types$1.invalidTemplate, this.input.slice(this.start, this.pos))

    case "\\r":
      if (this.input[this.pos + 1] === "\\n") { ++this.pos; }
      // fall through
    case "\\n": case "\\u2028": case "\\u2029":
      ++this.curLine;
      this.lineStart = this.pos + 1;
      break
    }
  }
  this.raise(this.start, "Unterminated template");
};

// Used to read escaped characters

pp.readEscapedChar = function(inTemplate) {
  var ch = this.input.charCodeAt(++this.pos);
  ++this.pos;
  switch (ch) {
  case 110: return "\\n" // 'n' -> '\\n'
  case 114: return "\\r" // 'r' -> '\\r'
  case 120: return String.fromCharCode(this.readHexChar(2)) // 'x'
  case 117: return codePointToString(this.readCodePoint()) // 'u'
  case 116: return "\\t" // 't' -> '\\t'
  case 98: return "\\b" // 'b' -> '\\b'
  case 118: return "\\u000b" // 'v' -> '\\u000b'
  case 102: return "\\f" // 'f' -> '\\f'
  case 13: if (this.input.charCodeAt(this.pos) === 10) { ++this.pos; } // '\\r\\n'
  case 10: // ' \\n'
    if (this.options.locations) { this.lineStart = this.pos; ++this.curLine; }
    return ""
  case 56:
  case 57:
    if (this.strict) {
      this.invalidStringToken(
        this.pos - 1,
        "Invalid escape sequence"
      );
    }
    if (inTemplate) {
      var codePos = this.pos - 1;

      this.invalidStringToken(
        codePos,
        "Invalid escape sequence in template string"
      );
    }
  default:
    if (ch >= 48 && ch <= 55) {
      var octalStr = this.input.substr(this.pos - 1, 3).match(/^[0-7]+/)[0];
      var octal = parseInt(octalStr, 8);
      if (octal > 255) {
        octalStr = octalStr.slice(0, -1);
        octal = parseInt(octalStr, 8);
      }
      this.pos += octalStr.length - 1;
      ch = this.input.charCodeAt(this.pos);
      if ((octalStr !== "0" || ch === 56 || ch === 57) && (this.strict || inTemplate)) {
        this.invalidStringToken(
          this.pos - 1 - octalStr.length,
          inTemplate
            ? "Octal literal in template string"
            : "Octal literal in strict mode"
        );
      }
      return String.fromCharCode(octal)
    }
    if (isNewLine(ch)) {
      // Unicode new line characters after \\ get removed from output in both
      // template literals and strings
      if (this.options.locations) { this.lineStart = this.pos; ++this.curLine; }
      return ""
    }
    return String.fromCharCode(ch)
  }
};

// Used to read character escape sequences ('\\x', '\\u', '\\U').

pp.readHexChar = function(len) {
  var codePos = this.pos;
  var n = this.readInt(16, len);
  if (n === null) { this.invalidStringToken(codePos, "Bad character escape sequence"); }
  return n
};

// Read an identifier, and return it as a string. Sets \`this.containsEsc\`
// to whether the word contained a '\\u' escape.
//
// Incrementally adds only escaped chars, adding other chunks as-is
// as a micro-optimization.

pp.readWord1 = function() {
  this.containsEsc = false;
  var word = "", first = true, chunkStart = this.pos;
  var astral = this.options.ecmaVersion >= 6;
  while (this.pos < this.input.length) {
    var ch = this.fullCharCodeAtPos();
    if (isIdentifierChar(ch, astral)) {
      this.pos += ch <= 0xffff ? 1 : 2;
    } else if (ch === 92) { // "\\"
      this.containsEsc = true;
      word += this.input.slice(chunkStart, this.pos);
      var escStart = this.pos;
      if (this.input.charCodeAt(++this.pos) !== 117) // "u"
        { this.invalidStringToken(this.pos, "Expecting Unicode escape sequence \\\\uXXXX"); }
      ++this.pos;
      var esc = this.readCodePoint();
      if (!(first ? isIdentifierStart : isIdentifierChar)(esc, astral))
        { this.invalidStringToken(escStart, "Invalid Unicode escape"); }
      word += codePointToString(esc);
      chunkStart = this.pos;
    } else {
      break
    }
    first = false;
  }
  return word + this.input.slice(chunkStart, this.pos)
};

// Read an identifier or keyword token. Will check for reserved
// words when necessary.

pp.readWord = function() {
  var word = this.readWord1();
  var type = types$1.name;
  if (this.keywords.test(word)) {
    type = keywords[word];
  }
  return this.finishToken(type, word)
};

// Acorn is a tiny, fast JavaScript parser written in JavaScript.
//
// Acorn was written by Marijn Haverbeke, Ingvar Stepanyan, and
// various contributors and released under an MIT license.
//
// Git repositories for Acorn are available at
//
//     http://marijnhaverbeke.nl/git/acorn
//     https://github.com/acornjs/acorn.git
//
// Please use the [github bug tracker][ghbt] to report issues.
//
// [ghbt]: https://github.com/acornjs/acorn/issues


var version = "8.18.0";

Parser.acorn = {
  Parser: Parser,
  version: version,
  defaultOptions: defaultOptions,
  Position: Position,
  SourceLocation: SourceLocation,
  getLineInfo: getLineInfo,
  Node: Node,
  TokenType: TokenType,
  tokTypes: types$1,
  keywordTypes: keywords,
  TokContext: TokContext,
  tokContexts: types,
  isIdentifierChar: isIdentifierChar,
  isIdentifierStart: isIdentifierStart,
  Token: Token,
  isNewLine: isNewLine,
  lineBreak: lineBreak,
  lineBreakG: lineBreakG,
  nonASCIIwhitespace: nonASCIIwhitespace
};

// The main exported interface (under \`self.acorn\` when in the
// browser) is a \`parse\` function that takes a code string and returns
// an abstract syntax tree as specified by the [ESTree spec][estree].
//
// [estree]: https://github.com/estree/estree

function parse(input, options) {
  return Parser.parse(input, options)
}

// This function tries to parse a single expression at a given
// offset in a string. Useful for parsing mixed-language formats
// that embed JavaScript expressions.

function parseExpressionAt(input, pos, options) {
  return Parser.parseExpressionAt(input, pos, options)
}

// Acorn is organized as a tokenizer and a recursive-descent parser.
// The \`tokenizer\` export provides an interface to the tokenizer.

function tokenizer(input, options) {
  return Parser.tokenizer(input, options)
}

export { Node, Parser, Position, SourceLocation, TokContext, Token, TokenType, defaultOptions, getLineInfo, isIdentifierChar, isIdentifierStart, isNewLine, keywords as keywordTypes, lineBreak, lineBreakG, nonASCIIwhitespace, parse, parseExpressionAt, types as tokContexts, types$1 as tokTypes, tokenizer, version };
`, "acorn-walk": `// AST walker module for ESTree compatible trees

// A simple walk is one where you simply specify callbacks to be
// called on specific nodes. The last two arguments are optional. A
// simple use would be
//
//     walk.simple(myTree, {
//         Expression: function(node) { ... }
//     });
//
// to do something with all expressions. All ESTree node types
// can be used to identify node types, as well as Expression and
// Statement, which denote categories of nodes.
//
// The base argument can be used to pass a custom (recursive)
// walker, and state can be used to give this walked an initial
// state.

function simple(node, visitors, baseVisitor, state, override) {
  if (!baseVisitor) { baseVisitor = base
  ; }(function c(node, st, override) {
    var type = override || node.type;
    visitNode(baseVisitor, type, node, st, c);
    if (visitors[type]) { visitors[type](node, st); }
  })(node, state, override);
}

// An ancestor walk keeps an array of ancestor nodes (including the
// current node) and passes them to the callback as third parameter
// (and also as state parameter when no other state is present).
function ancestor(node, visitors, baseVisitor, state, override) {
  var ancestors = [];
  if (!baseVisitor) { baseVisitor = base
  ; }(function c(node, st, override) {
    var type = override || node.type;
    var isNew = node !== ancestors[ancestors.length - 1];
    if (isNew) { ancestors.push(node); }
    visitNode(baseVisitor, type, node, st, c);
    if (visitors[type]) { visitors[type](node, st || ancestors, ancestors); }
    if (isNew) { ancestors.pop(); }
  })(node, state, override);
}

// A recursive walk is one where your functions override the default
// walkers. They can modify and replace the state parameter that's
// threaded through the walk, and can opt how and whether to walk
// their child nodes (by calling their third argument on these
// nodes).
function recursive(node, state, funcs, baseVisitor, override) {
  var visitor = funcs ? make(funcs, baseVisitor || undefined) : baseVisitor
  ;(function c(node, st, override) {
    visitor[override || node.type](node, st, c);
  })(node, state, override);
}

function makeTest(test) {
  if (typeof test === "string")
    { return function (type) { return type === test; } }
  else if (!test)
    { return function () { return true; } }
  else
    { return test }
}

var Found = function Found(node, state) { this.node = node; this.state = state; };

// A full walk triggers the callback on each node
function full(node, callback, baseVisitor, state, override) {
  if (!baseVisitor) { baseVisitor = base; }
  var last
  ;(function c(node, st, override) {
    var type = override || node.type;
    visitNode(baseVisitor, type, node, st, c);
    if (last !== node) {
      callback(node, st, type);
      last = node;
    }
  })(node, state, override);
}

// An fullAncestor walk is like an ancestor walk, but triggers
// the callback on each node
function fullAncestor(node, callback, baseVisitor, state) {
  if (!baseVisitor) { baseVisitor = base; }
  var ancestors = [], last
  ;(function c(node, st, override) {
    var type = override || node.type;
    var isNew = node !== ancestors[ancestors.length - 1];
    if (isNew) { ancestors.push(node); }
    visitNode(baseVisitor, type, node, st, c);
    if (last !== node) {
      callback(node, st || ancestors, ancestors, type);
      last = node;
    }
    if (isNew) { ancestors.pop(); }
  })(node, state);
}

// Find a node with a given start, end, and type (all are optional,
// null can be used as wildcard). Returns a {node, state} object, or
// undefined when it doesn't find a matching node.
function findNodeAt(node, start, end, test, baseVisitor, state) {
  if (!baseVisitor) { baseVisitor = base; }
  test = makeTest(test);
  try {
    (function c(node, st, override) {
      var type = override || node.type;
      if ((start == null || node.start <= start) &&
          (end == null || node.end >= end))
        { visitNode(baseVisitor, type, node, st, c); }
      if ((start == null || node.start === start) &&
          (end == null || node.end === end) &&
          test(type, node))
        { throw new Found(node, st) }
    })(node, state);
  } catch (e) {
    if (e instanceof Found) { return e }
    throw e
  }
}

// Find the innermost node of a given type that contains the given
// position. Interface similar to findNodeAt.
function findNodeAround(node, pos, test, baseVisitor, state) {
  test = makeTest(test);
  if (!baseVisitor) { baseVisitor = base; }
  try {
    (function c(node, st, override) {
      var type = override || node.type;
      if (node.start > pos || node.end < pos) { return }
      visitNode(baseVisitor, type, node, st, c);
      if (test(type, node)) { throw new Found(node, st) }
    })(node, state);
  } catch (e) {
    if (e instanceof Found) { return e }
    throw e
  }
}

// Find the outermost matching node after a given position.
function findNodeAfter(node, pos, test, baseVisitor, state) {
  test = makeTest(test);
  if (!baseVisitor) { baseVisitor = base; }
  try {
    (function c(node, st, override) {
      if (node.end < pos) { return }
      var type = override || node.type;
      if (node.start >= pos && test(type, node)) { throw new Found(node, st) }
      visitNode(baseVisitor, type, node, st, c);
    })(node, state);
  } catch (e) {
    if (e instanceof Found) { return e }
    throw e
  }
}

// Find the outermost matching node before a given position.
function findNodeBefore(node, pos, test, baseVisitor, state) {
  test = makeTest(test);
  if (!baseVisitor) { baseVisitor = base; }
  var max
  ;(function c(node, st, override) {
    if (node.start > pos) { return }
    var type = override || node.type;
    if (node.end <= pos && (!max || max.node.end < node.end) && test(type, node))
      { max = new Found(node, st); }
    visitNode(baseVisitor, type, node, st, c);
  })(node, state);
  return max
}

// Used to create a custom walker. Will fill in all missing node
// type properties with the defaults.
function make(funcs, baseVisitor) {
  var visitor = Object.create(baseVisitor || base);
  for (var type in funcs) { visitor[type] = funcs[type]; }
  return visitor
}

function skipThrough(node, st, c) { c(node, st); }
function ignore(_node, _st, _c) {}

function visitNode(baseVisitor, type, node, st, c) {
  if (baseVisitor[type] == null) { throw new Error(("No walker function defined for node type " + type)) }
  baseVisitor[type](node, st, c);
}

// Node walkers.

var base = {};

base.Program = base.BlockStatement = base.StaticBlock = function (node, st, c) {
  for (var i = 0, list = node.body; i < list.length; i += 1)
    {
    var stmt = list[i];

    c(stmt, st, "Statement");
  }
};
base.Statement = skipThrough;
base.EmptyStatement = ignore;
base.ExpressionStatement = base.ParenthesizedExpression = base.ChainExpression =
  function (node, st, c) { return c(node.expression, st, "Expression"); };
base.IfStatement = function (node, st, c) {
  c(node.test, st, "Expression");
  c(node.consequent, st, "Statement");
  if (node.alternate) { c(node.alternate, st, "Statement"); }
};
base.LabeledStatement = function (node, st, c) { return c(node.body, st, "Statement"); };
base.BreakStatement = base.ContinueStatement = ignore;
base.WithStatement = function (node, st, c) {
  c(node.object, st, "Expression");
  c(node.body, st, "Statement");
};
base.SwitchStatement = function (node, st, c) {
  c(node.discriminant, st, "Expression");
  for (var i = 0, list = node.cases; i < list.length; i += 1) {
    var cs = list[i];

    c(cs, st);
  }
};
base.SwitchCase = function (node, st, c) {
  if (node.test) { c(node.test, st, "Expression"); }
  for (var i = 0, list = node.consequent; i < list.length; i += 1)
    {
    var cons = list[i];

    c(cons, st, "Statement");
  }
};
base.ReturnStatement = base.YieldExpression = base.AwaitExpression = function (node, st, c) {
  if (node.argument) { c(node.argument, st, "Expression"); }
};
base.ThrowStatement = base.SpreadElement =
  function (node, st, c) { return c(node.argument, st, "Expression"); };
base.TryStatement = function (node, st, c) {
  c(node.block, st, "Statement");
  if (node.handler) { c(node.handler, st); }
  if (node.finalizer) { c(node.finalizer, st, "Statement"); }
};
base.CatchClause = function (node, st, c) {
  if (node.param) { c(node.param, st, "Pattern"); }
  c(node.body, st, "Statement");
};
base.WhileStatement = base.DoWhileStatement = function (node, st, c) {
  c(node.test, st, "Expression");
  c(node.body, st, "Statement");
};
base.ForStatement = function (node, st, c) {
  if (node.init) { c(node.init, st, "ForInit"); }
  if (node.test) { c(node.test, st, "Expression"); }
  if (node.update) { c(node.update, st, "Expression"); }
  c(node.body, st, "Statement");
};
base.ForInStatement = base.ForOfStatement = function (node, st, c) {
  c(node.left, st, "ForInit");
  c(node.right, st, "Expression");
  c(node.body, st, "Statement");
};
base.ForInit = function (node, st, c) {
  if (node.type === "VariableDeclaration") { c(node, st); }
  else { c(node, st, "Expression"); }
};
base.DebuggerStatement = ignore;

base.FunctionDeclaration = function (node, st, c) { return c(node, st, "Function"); };
base.VariableDeclaration = function (node, st, c) {
  for (var i = 0, list = node.declarations; i < list.length; i += 1)
    {
    var decl = list[i];

    c(decl, st);
  }
};
base.VariableDeclarator = function (node, st, c) {
  c(node.id, st, "Pattern");
  if (node.init) { c(node.init, st, "Expression"); }
};

base.Function = function (node, st, c) {
  if (node.id) { c(node.id, st, "Pattern"); }
  for (var i = 0, list = node.params; i < list.length; i += 1)
    {
    var param = list[i];

    c(param, st, "Pattern");
  }
  c(node.body, st, node.expression ? "Expression" : "Statement");
};

base.Pattern = function (node, st, c) {
  if (node.type === "Identifier")
    { c(node, st, "VariablePattern"); }
  else if (node.type === "MemberExpression")
    { c(node, st, "MemberPattern"); }
  else
    { c(node, st); }
};
base.VariablePattern = ignore;
base.MemberPattern = skipThrough;
base.RestElement = function (node, st, c) { return c(node.argument, st, "Pattern"); };
base.ArrayPattern = function (node, st, c) {
  for (var i = 0, list = node.elements; i < list.length; i += 1) {
    var elt = list[i];

    if (elt) { c(elt, st, "Pattern"); }
  }
};
base.ObjectPattern = function (node, st, c) {
  for (var i = 0, list = node.properties; i < list.length; i += 1) {
    var prop = list[i];

    if (prop.type === "Property") {
      if (prop.computed) { c(prop.key, st, "Expression"); }
      c(prop.value, st, "Pattern");
    } else if (prop.type === "RestElement") {
      c(prop.argument, st, "Pattern");
    }
  }
};

base.Expression = skipThrough;
base.ThisExpression = base.Super = base.MetaProperty = ignore;
base.ArrayExpression = function (node, st, c) {
  for (var i = 0, list = node.elements; i < list.length; i += 1) {
    var elt = list[i];

    if (elt) { c(elt, st, "Expression"); }
  }
};
base.ObjectExpression = function (node, st, c) {
  for (var i = 0, list = node.properties; i < list.length; i += 1)
    {
    var prop = list[i];

    c(prop, st);
  }
};
base.FunctionExpression = base.ArrowFunctionExpression = base.FunctionDeclaration;
base.SequenceExpression = function (node, st, c) {
  for (var i = 0, list = node.expressions; i < list.length; i += 1)
    {
    var expr = list[i];

    c(expr, st, "Expression");
  }
};
base.TemplateLiteral = function (node, st, c) {
  for (var i = 0, list = node.quasis; i < list.length; i += 1)
    {
    var quasi = list[i];

    c(quasi, st);
  }

  for (var i$1 = 0, list$1 = node.expressions; i$1 < list$1.length; i$1 += 1)
    {
    var expr = list$1[i$1];

    c(expr, st, "Expression");
  }
};
base.TemplateElement = ignore;
base.UnaryExpression = base.UpdateExpression = function (node, st, c) {
  c(node.argument, st, "Expression");
};
base.BinaryExpression = base.LogicalExpression = function (node, st, c) {
  c(node.left, st, "Expression");
  c(node.right, st, "Expression");
};
base.AssignmentExpression = base.AssignmentPattern = function (node, st, c) {
  c(node.left, st, "Pattern");
  c(node.right, st, "Expression");
};
base.ConditionalExpression = function (node, st, c) {
  c(node.test, st, "Expression");
  c(node.consequent, st, "Expression");
  c(node.alternate, st, "Expression");
};
base.NewExpression = base.CallExpression = function (node, st, c) {
  c(node.callee, st, "Expression");
  if (node.arguments)
    { for (var i = 0, list = node.arguments; i < list.length; i += 1)
      {
        var arg = list[i];

        c(arg, st, "Expression");
      } }
};
base.MemberExpression = function (node, st, c) {
  c(node.object, st, "Expression");
  if (node.computed) { c(node.property, st, "Expression"); }
};
base.ExportNamedDeclaration = base.ExportDefaultDeclaration = function (node, st, c) {
  if (node.declaration)
    { c(node.declaration, st, node.type === "ExportNamedDeclaration" || node.declaration.id ? "Statement" : "Expression"); }
  if (node.source) { c(node.source, st, "Expression"); }
  if (node.attributes)
    { for (var i = 0, list = node.attributes; i < list.length; i += 1)
      {
        var attr = list[i];

        c(attr, st);
      } }
};
base.ExportAllDeclaration = function (node, st, c) {
  if (node.exported)
    { c(node.exported, st); }
  c(node.source, st, "Expression");
  if (node.attributes)
    { for (var i = 0, list = node.attributes; i < list.length; i += 1)
      {
        var attr = list[i];

        c(attr, st);
      } }
};
base.ImportAttribute = function (node, st, c) {
  c(node.value, st, "Expression");
};
base.ImportDeclaration = function (node, st, c) {
  for (var i = 0, list = node.specifiers; i < list.length; i += 1)
    {
    var spec = list[i];

    c(spec, st);
  }
  c(node.source, st, "Expression");
  if (node.attributes)
    { for (var i$1 = 0, list$1 = node.attributes; i$1 < list$1.length; i$1 += 1)
      {
        var attr = list$1[i$1];

        c(attr, st);
      } }
};
base.ImportExpression = function (node, st, c) {
  c(node.source, st, "Expression");
  if (node.options) { c(node.options, st, "Expression"); }
};
base.ImportSpecifier = base.ImportDefaultSpecifier = base.ImportNamespaceSpecifier = base.Identifier = base.PrivateIdentifier = base.Literal = ignore;

base.TaggedTemplateExpression = function (node, st, c) {
  c(node.tag, st, "Expression");
  c(node.quasi, st, "Expression");
};
base.ClassDeclaration = base.ClassExpression = function (node, st, c) { return c(node, st, "Class"); };
base.Class = function (node, st, c) {
  if (node.id) { c(node.id, st, "Pattern"); }
  if (node.superClass) { c(node.superClass, st, "Expression"); }
  c(node.body, st);
};
base.ClassBody = function (node, st, c) {
  for (var i = 0, list = node.body; i < list.length; i += 1)
    {
    var elt = list[i];

    c(elt, st);
  }
};
base.MethodDefinition = base.PropertyDefinition = base.Property = function (node, st, c) {
  if (node.computed) { c(node.key, st, "Expression"); }
  if (node.value) { c(node.value, st, "Expression"); }
};

export { ancestor, base, findNodeAfter, findNodeAround, findNodeAt, findNodeBefore, full, fullAncestor, make, recursive, simple };
`, "/@tomlarkworthy/runtime-sdk.js?v=4": 'export default function define(runtime, observer) { const main = runtime.module(); main.variable(observer("runtime")).define("runtime", [], () => runtime); return main; }' },
  content: { "@tomlarkworthy/cloudflare-iac/hono.js": `
var tt=Symbol();var et=(t,e)=>new Response(t,{headers:{"Content-Type":e.replace(/^[^;]+/,(r)=>r.toLowerCase())}}).formData();var At=1e4,C=(t)=>("headers"in t),nt=async(t,e=Object.create(null))=>{let{all:r=!1,dot:s=!1}=e,n=(C(t)?t.headers:t.raw.headers).get("Content-Type")?.split(";")[0].trim().toLowerCase();if(n==="multipart/form-data"||n==="application/x-www-form-urlencoded")return St(t,{all:r,dot:s});return{}};async function St(t,e){if(!C(t)&&t.bodyCache.formData)return rt(await t.bodyCache.formData,e);let r=C(t)?t.headers:t.raw.headers,s=await t.arrayBuffer(),n=et(s,r.get("Content-Type")||"");if(!C(t))t.bodyCache.formData=n;let o=await n;if(o)return rt(o,e);return{}}function rt(t,e){let r=Object.create(null),s={count:0};if(t.forEach((n,o)=>{if(!(e.all||o.endsWith("[]")))r[o]=n;else Lt(r,o,n)}),e.dot)Object.entries(r).forEach(([n,o])=>{if(n.includes("."))Ot(r,n,o,s),delete r[n]});return r}var Lt=(t,e,r)=>{if(t[e]!==void 0)if(Array.isArray(t[e]))t[e].push(r);else t[e]=[t[e],r];else if(!e.endsWith("[]"))t[e]=r;else t[e]=[r]},Ot=(t,e,r,s)=>{if(/(?:^|\\.)__proto__\\./.test(e))return;let n=t,o=e.split(".",34);if(o.length>33)st();o.forEach((c,i)=>{if(i===o.length-1)n[c]=r;else{if(!n[c]||typeof n[c]!=="object"||Array.isArray(n[c])||n[c]instanceof File){if(s.count++>=At)st();n[c]=Object.create(null)}n=n[c]}})},st=()=>{throw Error("Nesting limit exceeded")};var k=(t)=>{let e=t.split("/");if(e[0]==="")e.shift();return e},ot=(t)=>{let{groups:e,path:r}=Ct(t),s=k(r);return Tt(s,e)},Ct=(t)=>{let e=[];return t=t.replace(/\\{[^}]+\\}/g,(r,s)=>{let n=\`@\${s}\`;return e.push([n,r]),n}),{groups:e,path:t}},Tt=(t,e)=>{for(let r=e.length-1;r>=0;r--){let[s]=e[r];for(let n=t.length-1;n>=0;n--)if(t[n].includes(s)){t[n]=t[n].replace(s,e[r][1]);break}}return t},T={},it=(t,e)=>{if(t==="*")return"*";let r=t.match(/^\\:([^\\{\\}]+)(?:\\{(.+)\\})?$/);if(r){let s=\`\${t}#\${e}\`;if(!T[s])if(r[2])T[s]=e&&e[0]!==":"&&e[0]!=="*"?[s,r[1],new RegExp(\`^\${r[2]}(?=/\${e})\`)]:[t,r[1],new RegExp(\`^\${r[2]}$\`)];else T[s]=[t,r[1],!0];return T[s]}return null},at=(t,e)=>{try{return e(t)}catch{return t.replace(/(?:%[0-9A-Fa-f]{2})+/g,(r)=>{try{return e(r)}catch{return r}})}},_t=(t)=>at(t,decodeURI),U=(t)=>{let e=t.url,r=e.indexOf("/",e.indexOf(":")+4),s=r;for(;s<e.length;s++){let n=e.charCodeAt(s);if(n===37){let o=e.indexOf("?",s),c=e.indexOf("#",s),i=o===-1?c===-1?void 0:c:c===-1?o:Math.min(o,c),a=e.slice(r,i);return _t(a.includes("%25")?a.replace(/%25/g,"%2525"):a)}else if(n===63||n===35)break}return e.slice(r,s)};var ct=(t)=>{let e=U(t);return e.length>1&&e.at(-1)==="/"?e.slice(0,-1):e},E=(t,e,...r)=>{if(r.length)e=E(e,...r);return\`\${t?.[0]==="/"?"":"/"}\${t}\${e==="/"?"":\`\${t?.at(-1)==="/"?"":"/"}\${e?.[0]==="/"?e.slice(1):e}\`}\`},_=(t)=>{if(t.charCodeAt(t.length-1)!==63||!t.includes(":"))return null;let e=t.split("/"),r=[],s="";return e.forEach((n)=>{if(n!==""&&!/\\:/.test(n))s+="/"+n;else if(/\\:/.test(n))if(n.charCodeAt(n.length-1)===63){if(r.length===0&&s==="")r.push("/");else r.push(s);let o=n.slice(0,-1);s+="/"+o,r.push(s)}else s+="/"+n}),r.filter((n,o,c)=>c.indexOf(n)===o)},H=(t)=>t.indexOf("%")!==-1?at(t,Ht):t,B=(t)=>{if(t.indexOf("+")!==-1)t=t.replace(/\\+/g," ");return H(t)},ht=(t,e,r)=>{let s=t.indexOf("#",8);if(s!==-1)t=t.slice(0,s);let n;if(!r&&e&&e.indexOf("%")===-1&&e.indexOf("+")===-1){let i=t.indexOf("?",8);if(i===-1)return;if(!t.startsWith(e,i+1))i=t.indexOf(\`&\${e}\`,i+1);while(i!==-1){let a=t.charCodeAt(i+e.length+1);if(a===61){let h=i+e.length+2,l=t.indexOf("&",h);return B(t.slice(h,l===-1?void 0:l))}else if(a==38||isNaN(a))return"";i=t.indexOf(\`&\${e}\`,i+1)}if(n=/[%+]/.test(t),!n)return}let o=Object.create(null);n??=/[%+]/.test(t);let c=t.indexOf("?",8);while(c!==-1){let i=t.indexOf("&",c+1),a=t.indexOf("=",c);if(a>i&&i!==-1)a=-1;let h=t.slice(c+1,a===-1?i===-1?void 0:i:a);if(n)h=B(h);if(c=i,h==="")continue;let l;if(a===-1)l="";else if(l=t.slice(a+1,i===-1?void 0:i),n)l=B(l);if(r){if(!(o[h]&&Array.isArray(o[h])))o[h]=[];o[h].push(l)}else o[h]??=l}return e?o[e]:o},lt=ht,ft=(t,e)=>ht(t,e,!0),Ht=decodeURIComponent;var ut=class{raw;#e;#t;routeIndex=0;path;bodyCache={};constructor(t,e="/",r=[[]]){this.raw=t,this.path=e,this.#t=r}param(t){return t?this.#r(t):this.#o()}#r(t){let e=this.#t[0][this.routeIndex]?.[1][t],r=this.#s(e);return r&&H(r)}#o(){let t={},e=Object.keys(this.#t[0][this.routeIndex]?.[1]??{});for(let r of e){let s=this.#s(this.#t[0][this.routeIndex][1][r]);if(s!==void 0)t[r]=H(s)}return t}#s(t){return this.#t[1]?this.#t[1][t]:t}query(t){return lt(this.url,t)}queries(t){return ft(this.url,t)}header(t){if(t)return this.raw.headers.get(t)??void 0;let e=Object.create(null);return this.raw.headers.forEach((r,s)=>{e[s]=r}),e}async parseBody(t){return nt(this,t)}#n=(t)=>{let{bodyCache:e,raw:r}=this,s=e[t];if(s)return s;for(let n in e)return e[n].then((o)=>{if(n==="json")o=JSON.stringify(o);let c=n==="formData"?void 0:r.headers.get("content-type");return new Response(o,{headers:c?{"Content-Type":c}:void 0})[t]()});return e[t]=r[t]()};json(){return this.#n("text").then((t)=>JSON.parse(t))}text(){return this.#n("text")}arrayBuffer(){return this.#n("arrayBuffer")}bytes(){return this.#n("arrayBuffer").then((t)=>new Uint8Array(t))}blob(){return this.#n("blob")}formData(){return this.#n("formData")}addValidatedData(t,e){(this.#e??={})[t]=e}valid(t){return this.#e?.[t]}get url(){return this.raw.url}get method(){return this.raw.method}get[tt](){return this.#t}get matchedRoutes(){return this.#t[0].map(([[,t]])=>t)}get routePath(){return this.#t[0].map(([[,t]])=>t)[this.routeIndex].path}};var dt={Stringify:1,BeforeStream:2,Stream:3},vt=(t,e)=>{let r=new String(t);return r.isEscaped=!0,r.callbacks=e,r};var F=async(t,e,r,s,n)=>{if(typeof t==="object"&&!(t instanceof String)){if(!(t instanceof Promise))t=t.toString();if(t instanceof Promise)t=await t}let o=t.callbacks;if(!o?.length)return Promise.resolve(t);if(n)n[0]+=t;else n=[t];let c=Promise.all(o.map((i)=>i({phase:e,buffer:n,context:s}))).then((i)=>Promise.all(i.filter(Boolean).map((a)=>F(a,e,!1,s,n))).then(()=>n[0]));if(r)return vt(await c,o);else return c};var Dt="text/plain; charset=UTF-8",W=(t,e)=>({"Content-Type":t,...e}),S=(t,e)=>new Response(t,e),G=class{#e;#t;env={};#r;finalized=!1;error;#o;#s;#n;#l;#c;#h;#a;#f;#u;constructor(t,e){if(this.#e=t,e)this.#s=e.executionCtx,this.env=e.env,this.#h=e.notFoundHandler,this.#u=e.path,this.#f=e.matchResult}get req(){return this.#t??=new ut(this.#e,this.#u,this.#f),this.#t}get event(){if(this.#s&&"respondWith"in this.#s)return this.#s;else throw Error("This context has no FetchEvent")}get executionCtx(){if(this.#s)return this.#s;else throw Error("This context has no ExecutionContext")}get res(){return this.#n||=S(null,{headers:this.#a??=new Headers})}set res(t){if(this.#n&&t){t=S(t.body,t);for(let[e,r]of this.#n.headers.entries()){if(e==="content-type")continue;if(e==="set-cookie"){let s=this.#n.headers.getSetCookie();t.headers.delete("set-cookie");for(let n of s)t.headers.append("set-cookie",n)}else t.headers.set(e,r)}}this.#n=t,this.finalized=!0}render=(...t)=>(this.#c??=(e)=>this.html(e),this.#c(...t));setLayout=(t)=>this.#l=t;getLayout=()=>this.#l;setRenderer=(t)=>{this.#c=t};header=(t,e,r)=>{if(this.finalized)this.#n=S(this.#n.body,this.#n);let s=this.#n?this.#n.headers:this.#a??=new Headers;if(e===void 0)s.delete(t);else if(r?.append)s.append(t,e);else s.set(t,e)};status=(t)=>{this.#o=t};set=(t,e)=>{this.#r??=new Map,this.#r.set(t,e)};get=(t)=>this.#r?this.#r.get(t):void 0;get var(){if(!this.#r)return{};return Object.fromEntries(this.#r)}#i(t,e,r){let s=this.#n?new Headers(this.#n.headers):this.#a;if(typeof e==="object"&&e.headers){s??=new Headers;for(let[o,c]of new Headers(e.headers))if(o==="set-cookie")s.append(o,c);else s.set(o,c)}if(r){if(!s){let o=0;for(let c in r)if(++o>1||typeof r[c]!=="string"){s=new Headers;break}}if(s)for(let o in r){let c=r[o];if(typeof c==="string")s.set(o,c);else{s.delete(o);for(let i of c)s.append(o,i)}}}let n=typeof e==="number"?e:e?.status??this.#o;return S(t,{status:n,headers:s??r})}newResponse=(...t)=>this.#i(...t);body=(t,e,r)=>this.#i(t,e,r);text=(t,e,r)=>!this.#a&&!this.#o&&!e&&!r&&!this.finalized?new Response(t):this.#i(t,e,W(Dt,r));json=(t,e,r)=>this.#i(JSON.stringify(t),e,W("application/json",r));html=(t,e,r)=>{let s=(n)=>this.#i(n,e,W("text/html; charset=UTF-8",r));return typeof t==="object"?F(t,dt.Stringify,!1,{}).then(s):s(t)};redirect=(t,e)=>{let r=String(t);return this.header("Location",!/[^\\x00-\\xFF]/.test(r)?r:encodeURI(r)),this.newResponse(null,e??302)};notFound=()=>(this.#h??=()=>S(),this.#h(this))};var z=(t,e,r)=>(s,n)=>{let o=-1;return c(0);async function c(i){if(i<=o)throw Error("next() called multiple times");o=i;let a,h=!1,l;if(t[i])l=t[i][0][0],s.req.routeIndex=i;else l=i===t.length&&n||void 0;if(l)try{a=await l(s,()=>c(i+1))}catch(f){if(f instanceof Error&&e)s.error=f,a=await e(f,s),h=!0;else throw f}else if(s.finalized===!1&&r)a=await r(s);if(a&&(s.finalized===!1||h))s.res=a;return s}};var pt=["get","post","put","delete","options","patch","query"],v="Can not add a route since the matcher is already built.",D=class extends Error{};var mt="__COMPOSED_HANDLER";var It=(t)=>t.text("404 Not Found",404),gt=(t,e)=>{if("getResponse"in t){let r=t.getResponse();return e.newResponse(r.body,r)}return console.error(t),e.text("Internal Server Error",500)},wt=class t{get;post;put;delete;options;patch;query;all;on;use;router;getPath;_basePath="/";#e="/";routes=[];constructor(e={}){[...pt,"all"].forEach((n)=>{this[n]=(o,...c)=>{let i=n.toUpperCase();if(typeof o==="string")this.#e=o;else this.#o(i,this.#e,o);return c.forEach((a)=>{this.#o(i,this.#e,a)}),this}}),this.on=(n,o,...c)=>{for(let i of[o].flat()){this.#e=i;for(let a of[n].flat()){let h=a.toUpperCase();for(let l of c)this.#o(h,this.#e,l)}}return this},this.use=(n,...o)=>{if(typeof n==="string")this.#e=n;else this.#e="*",o.unshift(n);return o.forEach((c)=>{this.#o("ALL",this.#e,c)}),this};let{strict:r,...s}=e;Object.assign(this,s),this.getPath=r??!0?e.getPath??U:ct}#t(){let e=new t({router:this.router,getPath:this.getPath});return e.errorHandler=this.errorHandler,e.#r=this.#r,e.routes=this.routes,e}#r=It;errorHandler=gt;route(e,r){let s=this.basePath(e);return r.routes.map((n)=>{let o;if(r.errorHandler===gt)o=n.handler;else o=async(c,i)=>(await z([],r.errorHandler)(c,()=>n.handler(c,i))).res,o[mt]=n.handler;s.#o(n.method,n.path,o,n.basePath)}),this}basePath(e){let r=this.#t();return r._basePath=E(this._basePath,e),r}onError=(e)=>(this.errorHandler=e,this);notFound=(e)=>(this.#r=e,this);mount(e,r,s){let n,o;if(s)if(typeof s==="function")o=s;else if(o=s.optionHandler,s.replaceRequest===!1)n=(a)=>a;else n=s.replaceRequest;let c=o?(a)=>{let h=o(a);return Array.isArray(h)?h:[h]}:(a)=>{let h=void 0;try{h=a.executionCtx}catch{}return[a.env,h]};n||=(()=>{let a=E(this._basePath,e),h=a==="/"?0:a.length;return(l)=>{let f=new URL(l.url);return f.pathname=this.getPath(l).slice(h)||"/",new Request(f,l)}})();let i=async(a,h)=>{let l=await r(n(a.req.raw),...c(a));if(l)return l;await h()};return this.#o("ALL",E(e,"*"),i),this}#o(e,r,s,n){r=E(this._basePath,r);let o={basePath:n!==void 0?E(this._basePath,n):this._basePath,path:r,method:e,handler:s};this.router.add(e,r,[s,o]),this.routes.push(o)}#s(e,r){if(e instanceof Error)return this.errorHandler(e,r);throw e}#n(e,r,s,n){if(n==="HEAD")return(async()=>new Response(null,await this.#n(e,r,s,"GET")))();let o=this.getPath(e,{env:s}),c=this.router.match(n,o),i=new G(e,{path:o,matchResult:c,env:s,executionCtx:r,notFoundHandler:this.#r});if(c[0].length===1){let h;try{h=c[0][0][0][0](i,async()=>{i.res=await this.#r(i)})}catch(l){return this.#s(l,i)}return h instanceof Promise?h.then((l)=>l||(i.finalized?i.res:this.#r(i))).catch((l)=>this.#s(l,i)):h??this.#r(i)}let a=z(c[0],this.errorHandler,this.#r);return(async()=>{try{let h=await a(i);if(!h.finalized)throw Error("Context is not finalized. Did you forget to return a Response object or \`await next()\`?");return h.res}catch(h){return this.#s(h,i)}})()}fetch=(e,...r)=>this.#n(e,r[1],r[0],e.method);request=(e,r,s,n)=>{if(e instanceof Request)return this.fetch(r?new Request(e,r):e,s,n);return e=e.toString(),this.fetch(new Request(/^https?:\\/\\//.test(e)?e:\`http://localhost\${E("/",e)}\`,r),s,n)};fire=()=>{addEventListener("fetch",(e)=>{e.respondWith(this.#n(e.request,e,void 0,e.request.method))})}};var p=()=>Object.create(null);var I=[];function K(t,e){let r=this.buildAllMatchers(),s=(n,o)=>{let c=r[n]||r.ALL,i=c[2][o];if(i)return i;let a=o.match(c[0]);if(!a)return[[],I];let h=a.indexOf("",1);return[c[1][h],a]};return this.match=s,s(t,e)}var J="[^/]+";var Q="(?:|/.*)",R=Symbol(),yt=new Set(".\\\\+*[^]$()");function Mt(t,e){if(t.length===1)return e.length===1?t<e?-1:1:-1;if(e.length===1)return 1;if(t===".*"||t==="(?:|/.*)")return e==="(?:|/.*)"?-1:1;else if(e===".*"||e==="(?:|/.*)")return-1;if(t==="[^/]+")return 1;else if(e==="[^/]+")return-1;return t.length===e.length?t<e?-1:1:e.length-t.length}var xt=class t{#e;#t;#r=p();insert(e,r,s,n,o){let c=this;for(let i=0,a=e.length;i<a;i++){let h=e[i],l=h.length===1?h==="*"?i===a-1?["","",".*"]:["","",J]:null:h==="/*"?["","",Q]:h.match(/^\\:([^\\{\\}]+)(?:\\{(.+)\\})?$/),f;if(l){let u=l[1],d=l[2]||"[^/]+";if(u&&l[2]){if(d===".*")throw R;if(d=d.replace(/^\\((?!\\?:)(?=[^)]+\\)$)/,"(?:"),/\\((?!\\?:)/.test(d))throw R;if(d.length===1&&yt.has(d))throw R}if(f=c.#r[d],!f){if(d!==".*"&&d!=="(?:|/.*)"){for(let w in c.#r)if((d.length>1||w.length>1)&&w!==".*"&&w!=="(?:|/.*)")throw R}f=c.#r[d]=new t}if(u!=="")f.#t??=n.varIndex++,s.push([u,f.#t])}else if(f=c.#r[h],!f){for(let u in c.#r)if(u.length>1&&u!==".*"&&u!=="(?:|/.*)")throw R;f=c.#r[h]=new t}c=f}if(c.#e!==void 0)throw R;c.#e=o?-1:r}buildRegExpStr(){let e=Object.keys(this.#r).sort(Mt).map((r)=>{let s=this.#r[r],n=s.buildRegExpStr();return n===""?"":(typeof s.#t==="number"?\`(\${r})@\${s.#t}\`:yt.has(r)?\`\\\\\${r}\`:r)+n}).filter(Boolean);if(typeof this.#e==="number"&&this.#e!==-1)e.unshift(\`#\${this.#e}\`);if(e.length===0)return"";if(e.length===1)return e[0];return"(?:"+e.join("|")+")"}};var V=class{#e={varIndex:0};#t=new xt;#r=0;paths=p();insert(t,e){if(e){this.#t.insert(t.split(""),0,[],this.#e,!0);return}let r=[],s=[],n=t;for(let c=0;;){let i=!1;if(n=n.replace(/\\{[^}]+\\}/g,(a)=>{let h=\`@\\\\\${c}\`;return s[c]=[h,a],c++,i=!0,h}),!i)break}let o=n.match(/(?::[^\\/]+)|(?:\\/\\*$)|./g)||[];for(let c=s.length-1;c>=0;c--){let[i]=s[c];for(let a=o.length-1;a>=0;a--)if(o[a].indexOf(i)!==-1){o[a]=o[a].replace(i,s[c][1]);break}}this.#t.insert(o,this.#r,r,this.#e,!1),this.paths[t]=[this.#r++,r]}buildRegExp(){let t=this.#t.buildRegExpStr();if(t==="")return[/^$/,[],[]];let e=0,r=[],s=[];return t=t.replace(/#(\\d+)|@(\\d+)|\\.\\*\\$/g,(n,o,c)=>{if(o!==void 0)return r[++e]=Number(o),"$()";if(c!==void 0)return s[Number(c)]=++e,"";return""}),[new RegExp(\`^\${t}\`),r,s]}};var Et=p();function Rt(t){return Et[t]??=new RegExp(\`^\${t.replace(/\\/:[^/{}]+(?:\\{\\[\\^\\/]\\+})?(?=[/{]|$)|\\/?\\*$|([.\\\\+*[^\\]$()?{}|])/g,(e,r)=>r?\`\\\\\${r}\`:e==="/*"?Q:e==="*"?".*":\`/:\${J}\`)}$\`)}function M(t,e){for(let r of Object.keys(t).sort((s,n)=>n.length-s.length))if(Rt(r).test(e))return[...t[r]]}var N=class{name="RegExpRouter";#e;#t;#r;constructor(){this.#e={["ALL"]:p()},this.#t={["ALL"]:p()},this.#r={["ALL"]:new V}}#o(t,e){try{this.#r[t].insert(e,!/\\*|\\/:/.test(e))}catch(r){throw r===R?new D(e):r}}add(t,e,r){let s=this.#e,n=this.#t;if(!s)throw Error(v);if(!s[t]){this.#r[t]=new V;for(let i of[s,n]){i[t]=p();for(let a in i.ALL)i[t][a]=[...i.ALL[a]],this.#o(t,a)}}if(e==="/*")e="*";let o=t==="ALL"?Object.keys(s):[t];if(/\\*$/.test(e)){let i=Rt(e);for(let a of o)if(!s[a][e])this.#o(a,e),s[a][e]=M(s[a],e)||M(s.ALL,e)||[];for(let a of[s,n])for(let h of o)for(let l in a[h])i.test(l)&&a[h][l].push([r,e]);return}let c=_(e)||[e];for(let i of c)for(let a of o){if(!n[a][i])this.#o(a,i),n[a][i]=M(s[a],i)||M(s.ALL,i)||[];n[a][i].push([r,i])}}match=K;buildAllMatchers(){let t=p();for(let e of Object.keys(this.#t))t[e]=this.#s(e);return this.#e=this.#t=this.#r=void 0,Et=p(),t}#s(t){let e=this.#e[t],r=this.#t[t],s=this.#r[t],n=p(),o=[],[c,i,a]=s.buildRegExp();for(let h of[e,r])for(let l in h){let f=h[l],u=s.paths[l];if(!u){n[l]=[f.map(([d])=>[d,p()]),I];continue}o[u[0]]=f.map(([d,w])=>[d,s.paths[w][1].reduceRight((L,[g],x)=>(L[g]=a[u[1][x][1]],L),p())])}return[c,i.map((h)=>o[h]),n]}};var Pt=class{name="SmartRouter";#e=[];#t=[];constructor(t){this.#e=t.routers}add(t,e,r){if(!this.#t)throw Error(v);this.#t.push([t,e,r])}match(t,e){if(!this.#t)throw Error("Fatal error");let r=this.#e,s=this.#t,n=r.length,o=0,c;for(;o<n;o++){let i=r[o];try{for(let a=0,h=s.length;a<h;a++)i.add(...s[a]);c=i.match(t,e)}catch(a){if(a instanceof D)continue;throw a}this.match=i.match.bind(i),this.#e=[i],this.#t=void 0;break}if(o===n)throw Error("Fatal error");return this.name=\`SmartRouter + \${this.activeRouter.name}\`,c}get activeRouter(){if(this.#t||this.#e.length!==1)throw Error("No active router has been determined yet.");return this.#e[0]}};var X=p(),Nt=0,bt=class t{#e=[];#t=p();#r=[];#o;#s=X;insert(e,r,s){let n=this,o=ot(r),c=new Set,i=0;for(let a of o){let h=o[++i],l=it(a,h)||(h===void 0&&a&&a.indexOf("*")===a.length-1?a:null),f=Array.isArray(l),u=f?l[0]:l||a,d=n.#t[u]||=new t;if(l&&!d.#o)d.#o=l,n.#r.push(d);if(n=d,f)c.add(l[1])}n.#e.push({[e]:{handler:s,possibleKeys:[...c],score:++Nt}})}#n(e,r,s,n,o){for(let c=0,i=r.#e.length;c<i;c++){let a=r.#e[c],h=a[s]||a.ALL;if(h){h.params=p(),e.push(h);for(let l=0,f=h.possibleKeys.length;l<f;l++){let u=h.possibleKeys[l];h.params[u]=o?.[u]&&!l?o[u]:n[u]??o?.[u]}}}}search(e,r){let s=[];this.#s=X;let n=[this],o=k(r),c=[],i=o.length,a=null;for(let h=0;h<i;h++){let l=o[h],f=h===i-1,u=[];for(let w=0,L=n.length;w<L;w++){let g=n[w],x=g.#t[l];if(x)if(x.#s=g.#s,f){if(x.#t["*"])this.#n(s,x.#t["*"],e,g.#s);this.#n(s,x,e,g.#s)}else u.push(x);for(let m of g.#r){let b=m.#o,y=g.#s===X?{}:{...g.#s};if(typeof b==="string"){if(b==="*"||l.startsWith(b.slice(0,-1))){if(this.#n(s,m,e,g.#s),b==="*")m.#s=y,u.push(m)}continue}let[,Y,A]=b;if(!l&&A===!0)continue;if(A!==!0){if(!a){a=[];let j=r[0]==="/"?1:0;for(let P=0;P<i;P++)a[P]=j,j+=o[P].length+1}let Z=r.slice(a[h]),O=A.exec(Z);if(O){if(y[Y]=O[0],this.#n(s,m,e,g.#s,y),O[0].length===Z.length&&m.#t["*"])this.#n(s,m.#t["*"],e,g.#s,y);for(let j in m.#t){m.#s=y;let P=O[0].match(/\\//g)?.length??0;(c[P]||=[]).push(m);break}continue}}if(A===!0||A.test(l))if(y[Y]=l,f){if(this.#n(s,m,e,y,g.#s),m.#t["*"])this.#n(s,m.#t["*"],e,y,g.#s)}else m.#s=y,u.push(m)}}let d=c.shift();n=d?u.concat(d):u}if(s[1])s.sort((h,l)=>h.score-l.score);return[s.map(({handler:h,params:l})=>[h,l])]}};var q=class{name="TrieRouter";#e=new bt;add(t,e,r){for(let s of _(e)||[e])this.#e.insert(t,s,r)}match(t,e){return this.#e.search(t,e)}};var $t=class extends wt{constructor(t={}){super(t);this.router=t.router??new Pt({routers:[new N,new q]})}};export{G as Context,$t as Hono};
`, "@tomlarkworthy/cloudflare-iac/cel.js": `
var j=class extends Error{#e;#t;#n;#i;constructor({name:e,code:t,message:r,node:i,cause:s,range:a}){super(r,s?{cause:s}:void 0),this.name=e,this.#t=t,this.#i=r,this.#e=i,this.#n=a&&Te(a)||Te(i),i?.input&&(this.message=Ue(this.#i,i,this.#n))}get node(){return this.#e}get code(){return this.#t}get range(){return this.#n}get summary(){return this.#i}withAst(e){return this.#e||!e?.input?this:(this.#e=e,this.#n??=Te(e),this.message=Ue(this.#i,e,this.#n),this)}};function be(n,e,t,r,i){if(typeof t=="string")return{name:n,code:e,message:t,node:r,cause:i};let s=t;if(typeof s!="object")throw new Error("First param to error must be a string or object");return{name:n,code:s.code||e,message:s.message,node:s.node,cause:s.cause,range:s.range}}var Q=class extends j{constructor(e,t,r){super(be("ParseError","parse_error",e,t,r))}},V=class extends j{constructor(e,t,r){super(be("EvaluationError","evaluation_error",e,t,r))}},W=class extends j{constructor(e,t,r){super(be("TypeError","type_error",e,t,r))}};function O(n,e,t){return typeof n=="object"?new Q(n):new Q({code:n,message:e,node:t})}function w(n,e,t){return typeof n=="object"?new V(n):new V({code:n,message:e,node:t})}function je(n,e,t){return typeof n=="object"?new W(n):new W({code:n,message:e,node:t})}function Te(n){let e=n?.pos??n?.start;if(typeof e!="number")return;let t=typeof n.end=="number"?n.end:e;return{start:e,end:t}}function Ue(n,e,t){let r=e.pos??t?.start;if(typeof r!="number")return n;let i=e.input,s=1,a=0,u=0;for(;a<r;)i[a]===\`
\`?(s++,u=0):u++,a++;let h=r,f=r;for(;h>0&&i[h-1]!==\`
\`;)h--;for(;f<i.length&&i[f]!==\`
\`;)f++;let g=i.slice(h,f),l=\`> \${\`\${s}\`.padStart(4," ")} | \${g}
\${" ".repeat(9+u)}^\`;return\`\${n}

\${l}\`}function X(n,e){return n instanceof j?n.withAst(e):n}var I=class n{#e;constructor(e){this.#e=e}static of(e){return e===void 0?J:new n(e)}static none(){return J}hasValue(){return this.#e!==void 0}value(){if(this.#e===void 0)throw w("optional_value_missing","Optional value is not present");return this.#e}or(e){if(this.#e!==void 0)return this;if(e instanceof n)return e;throw w("invalid_optional_argument","Optional.or must be called with an Optional argument")}orValue(e){return this.#e===void 0?e:this.#e}get[Symbol.toStringTag](){return"optional"}[Symbol.for("nodejs.util.inspect.custom")](){return this.#e===void 0?"Optional { none }":\`Optional { value: \${JSON.stringify(this.#e)} }\`}},J=Object.freeze(new I),se=class{},Fe=new se;function ze(n,e){let t=e?Fe:void 0;n.deleteVariable("optional"),n.registerConstant("optional","OptionalNamespace",t)}function Ke(n){let e={async:!1},t=(c,y)=>n.registerFunctionOverload(c,y,e),r=n.enableOptionalTypes?Fe:void 0;n.registerType("OptionalNamespace",se),n.registerConstant("optional","OptionalNamespace",r),t("optional.hasValue(): bool",c=>c.hasValue()),t("optional<A>.value(): A",c=>c.value()),n.registerFunctionOverload("OptionalNamespace.none(): optional<T>",()=>I.none()),t("OptionalNamespace.of(A): optional<A>",(c,y)=>I.of(y));function i(c,y,b){if(c instanceof I)return c;throw w("optional_expected",\`\${b} must be optional\`,y)}function s(c,y,b){let o=c.run(y.receiver,b);return o instanceof Promise?o.then(p=>a(p,c,y,b)):a(o,c,y,b)}function a(c,y,b,o){let p=i(c,b.receiver,\`\${b.functionDesc} receiver\`);return p.hasValue()?b.onHasValue(p):b.onEmpty(y,b,o)}function u(c,y,b,o){let p=c.check(y,b);if(p.kind==="optional")return p;if(p.kind==="dyn")return c.getType("optional");throw c.createError("optional_expected",\`\${o} must be optional, got '\${p}'\`,y)}function h({functionDesc:c,evaluate:y,typeCheck:b,onHasValue:o,onEmpty:p}){return({ast:m,args:E,receiver:C})=>({ast:m,functionDesc:c,receiver:C,arg:E[0],evaluate:y,typeCheck:b,onHasValue:o,onEmpty:p})}let f="optional.orValue() receiver",g="optional.or(optional) receiver",l="optional.or(optional) argument";n.registerFunctionOverload("optional.or(ast): optional<dyn>",h({functionDesc:"optional.or(optional)",evaluate:s,typeCheck(c,y,b){let o=u(c,y.receiver,b,g),p=u(c,y.arg,b,l);y.receiver.maybeAsync||y.arg.maybeAsync||y.ast.setMeta("async",!1);let m=o.unify(c.registry,p);if(m)return m;throw c.createError("incompatible_argument_type",\`\${y.functionDesc} argument must be compatible type, got '\${o}' and '\${p}'\`,y.arg)},onHasValue:c=>c,onEmpty(c,y,b){let o=y.arg,p=c.run(o,b);return p instanceof Promise?p.then(m=>i(m,o,l)):i(p,o,l)}})),n.registerFunctionOverload("optional.orValue(ast): dyn",h({functionDesc:"optional.orValue(value)",onHasValue:c=>c.value(),onEmpty(c,y,b){return c.run(y.arg,b)},evaluate:s,typeCheck(c,y,b){let o=u(c,y.receiver,b,f).valueType,p=c.check(y.arg,b);y.receiver.maybeAsync||y.arg.maybeAsync||y.ast.setMeta("async",!1);let m=o.unify(c.registry,p);if(m)return m;throw c.createError("incompatible_argument_type",\`\${y.functionDesc} argument must be compatible type, got '\${o}' and '\${p}'\`,y.arg)}}))}var F=Object.hasOwn,A=Object.keys,x=Object.freeze,He=Object.entries,R=Array.isArray,we=Array.from,L=0n,qe=18446744073709551615n,oe=9223372036854775807n,ae=-9223372036854775808n;function Z(n,e){return n?.[Symbol.toStringTag]==="AsyncFunction"?!0:typeof e=="boolean"?e:!0}var z=new Set(["as","break","const","continue","else","for","function","if","import","let","loop","package","namespace","return","var","void","while","__proto__","prototype"]);var _=class{#e;constructor(e){this.verify(typeof e=="bigint"?e:BigInt(e))}get value(){return this.#e}valueOf(){return this.#e}toString(){return\`\${this.#e}\`}verify(e){if(e<L||e>qe)throw w("numeric_overflow","Unsigned integer overflow");this.#e=e}get[Symbol.toStringTag](){return\`value = \${this.#e}\`}[Symbol.for("nodejs.util.inspect.custom")](){return\`UnsignedInteger { value: \${this.#e} }\`}},K=1e9,H=1000000000n,Mt={h:3600000000000n,m:60000000000n,s:H,ms:1000000n,us:1000n,\\u00B5s:1000n,ns:1n},P=class n{#e;#t;constructor(e,t=0){this.#e=BigInt(e),this.#t=t}get seconds(){return this.#e}get nanos(){return this.#t}valueOf(){return Number(this.#e)*1e3+this.#t/1e6}static fromMilliseconds(e){let t=BigInt(Math.trunc(e*1e6)),r=t/H,i=Number(t%H);return new n(r,i)}addDuration(e){let t=this.#t+e.nanos;return new n(this.#e+e.seconds+BigInt(Math.floor(t/K)),t%K)}subtractDuration(e){let t=this.#t-e.nanos;return new n(this.#e-e.seconds+BigInt(Math.floor(t/K)),(t+K)%K)}extendTimestamp(e){return new Date(e.getTime()+Number(this.#e)*1e3+Math.floor(this.#t/1e6))}subtractTimestamp(e){return new Date(e.getTime()-Number(this.#e)*1e3-Math.floor(this.#t/1e6))}toString(){let e=this.#t?(this.#t/K).toLocaleString("en-US",{useGrouping:!1,maximumFractionDigits:9}).slice(1):"";return\`\${this.#e}\${e}s\`}getHours(){return this.#e/3600n}getMinutes(){return this.#e/60n}getSeconds(){return this.#e}getMilliseconds(){return this.#e*1000n+BigInt(Math.floor(this.#t/1e6))}get[Symbol.toStringTag](){return"google.protobuf.Duration"}[Symbol.for("nodejs.util.inspect.custom")](){return\`google.protobuf.Duration { seconds: \${this.#e}, nanos: \${this.#t} }\`}};function Ge(n){let e={async:!1},t=(o,p)=>n.registerFunctionOverload(o,p,e),r=o=>o;t("dyn(dyn): dyn",r);for(let o in D){let p=D[o];p instanceof $&&t(\`type(\${p.name}): type\`,()=>p)}t("bool(bool): bool",r),t("bool(string): bool",o=>{switch(o){case"1":case"t":case"true":case"TRUE":case"True":return!0;case"0":case"f":case"false":case"FALSE":case"False":return!1;default:throw w("bool_conversion_error",\`bool() conversion error: invalid string value "\${o}"\`)}}),t("size(string): int",o=>BigInt(Ye(o))),t("size(bytes): int",o=>BigInt(o.length)),t("size(list): int",o=>BigInt(o.length??o.size)),t("size(map): int",o=>BigInt(o instanceof Map?o.size:A(o).length)),t("string.size(): int",o=>BigInt(Ye(o))),t("bytes.size(): int",o=>BigInt(o.length)),t("list.size(): int",o=>BigInt(o.length??o.size)),t("map.size(): int",o=>BigInt(o instanceof Map?o.size:A(o).length)),t("bytes(string): bytes",o=>a.fromString(o)),t("bytes(bytes): bytes",r),t("double(double): double",r),t("double(int): double",o=>Number(o)),t("double(uint): double",o=>Number(o)),t("double(string): double",o=>{if(!o||o!==o.trim())throw w("double_conversion_error","double() type error: cannot convert to double");switch(o.toLowerCase()){case"inf":case"+inf":case"infinity":case"+infinity":return Number.POSITIVE_INFINITY;case"-inf":case"-infinity":return Number.NEGATIVE_INFINITY;case"nan":return Number.NaN;default:{let m=Number(o);if(!Number.isNaN(m))return m;throw w("double_conversion_error","double() type error: cannot convert to double")}}}),t("int(int): int",r),t("int(double): int",o=>{if(Number.isFinite(o))return BigInt(Math.trunc(o));throw w("numeric_overflow","int() type error: integer overflow")}),t("int(string): int",o=>{if(o!==o.trim()||o.length>20||o.includes("0x"))throw w("int_conversion_error","int() type error: cannot convert to int");try{let p=BigInt(o);if(p<=oe&&p>=ae)return p}catch{}throw w("int_conversion_error","int() type error: cannot convert to int")}),t("uint(uint): uint",r),t("uint(int): uint",o=>{try{return new _(o)}catch{throw w("uint_conversion_error","uint() type error: cannot convert to uint")}}),t("uint(double): uint",o=>{try{return new _(Math.trunc(o))}catch{throw w("numeric_overflow","uint() type error: unsigned integer overflow")}}),t("uint(string): uint",o=>{if(o!==o.trim()||o.length>20||o.includes("0x"))throw w("uint_conversion_error","uint() type error: cannot convert to uint");try{return new _(o)}catch{throw w("uint_conversion_error","uint() type error: cannot convert to uint")}}),t("string(string): string",r),t("string(bool): string",o=>\`\${o}\`),t("string(int): string",o=>\`\${o}\`),t("string(uint): string",o=>\`\${o}\`),t("string(bytes): string",o=>a.toUtf8(o)),t("string(double): string",o=>o===1/0?"+Inf":o===-1/0?"-Inf":\`\${o}\`),t("string.startsWith(string): bool",(o,p)=>o.startsWith(p)),t("string.endsWith(string): bool",(o,p)=>o.endsWith(p)),t("string.contains(string): bool",(o,p)=>o.includes(p)),t("string.lowerAscii(): string",o=>o.toLowerCase()),t("string.upperAscii(): string",o=>o.toUpperCase()),t("string.trim(): string",o=>o.trim()),t("string.indexOf(string): int",(o,p)=>BigInt(o.indexOf(p))),t("string.indexOf(string, int): int",(o,p,m)=>{if(p==="")return m;if(m=Number(m),m<0||m>=o.length)throw w("index_out_of_range","string.indexOf(search, fromIndex): fromIndex out of range");return BigInt(o.indexOf(p,m))}),t("string.lastIndexOf(string): int",(o,p)=>BigInt(o.lastIndexOf(p))),t("string.lastIndexOf(string, int): int",(o,p,m)=>{if(p==="")return m;if(m=Number(m),m<0||m>=o.length)throw w("index_out_of_range","string.lastIndexOf(search, fromIndex): fromIndex out of range");return BigInt(o.lastIndexOf(p,m))}),t("string.substring(int): string",(o,p)=>{if(p=Number(p),p<0||p>o.length)throw w("index_out_of_range","string.substring(start, end): start index out of range");return o.substring(p)}),t("string.substring(int, int): string",(o,p,m)=>{if(p=Number(p),p<0||p>o.length)throw w("index_out_of_range","string.substring(start, end): start index out of range");if(m=Number(m),m<p||m>o.length)throw w("index_out_of_range","string.substring(start, end): end index out of range");return o.substring(p,m)}),t("string.matches(string): bool",(o,p)=>{try{return new RegExp(p).test(o)}catch{throw w("invalid_regular_expression",\`Invalid regular expression: \${p}\`)}}),t("string.split(string): list<string>",(o,p)=>o.split(p)),t("string.split(string, int): list<string>",(o,p,m)=>{if(m=Number(m),m===0)return[];let E=o.split(p);if(m<0||E.length<=m)return E;let C=E.slice(0,m-1);return C.push(E.slice(m-1).join(p)),C}),t("list<string>.join(): string",o=>{for(let p=0;p<o.length;p++)if(typeof o[p]!="string")throw w("invalid_list_element_type","string.join(): list must contain only strings");return o.join("")}),t("list<string>.join(string): string",(o,p)=>{for(let m=0;m<o.length;m++)if(typeof o[m]!="string")throw w("invalid_list_element_type","string.join(separator): list must contain only strings");return o.join(p)});let i=new TextEncoder("utf8"),s=new TextDecoder("utf8"),a=typeof Buffer<"u"?{byteLength:o=>Buffer.byteLength(o),fromString:o=>Buffer.from(o,"utf8"),toHex:o=>Buffer.prototype.hexSlice.call(o,0,o.length),toBase64:o=>Buffer.prototype.base64Slice.call(o,0,o.length),toUtf8:o=>Buffer.prototype.utf8Slice.call(o,0,o.length),jsonParse:o=>JSON.parse(o)}:{textEncoder:new TextEncoder("utf8"),byteLength:o=>i.encode(o).length,fromString:o=>i.encode(o),toHex:Uint8Array.prototype.toHex?o=>o.toHex():o=>we(o,p=>p.toString(16).padStart(2,"0")).join(""),toBase64:Uint8Array.prototype.toBase64?o=>o.toBase64():o=>btoa(we(o,p=>String.fromCodePoint(p)).join("")),toUtf8:o=>s.decode(o),jsonParse:o=>JSON.parse(i.decode(o))};t("bytes.json(): map",a.jsonParse),t("bytes.hex(): string",a.toHex),t("bytes.string(): string",a.toUtf8),t("bytes.base64(): string",a.toBase64),t("bytes.at(int): int",(o,p)=>{if(p<0||p>=o.length)throw w("index_out_of_range","Bytes index out of range");return BigInt(o[p])});let u="google.protobuf.Timestamp",h="google.protobuf.Duration",f=n.registerType(u,Date).typeType,g=n.registerType(h,P).typeType;n.registerConstant("google","map<string, map<string, type>>",{protobuf:{Duration:g,Timestamp:f}});function l(o,p){return new Date(o.toLocaleString("en-US",{timeZone:p}))}function c(o,p){let m=p?l(o,p):new Date(o.getUTCFullYear(),o.getUTCMonth(),o.getUTCDate()),E=new Date(m.getFullYear(),0,0);return BigInt(Math.floor((m-E)/864e5)-1)}t(\`timestamp(string): \${u}\`,o=>{if(o.length<20||o.length>30)throw w("invalid_timestamp","timestamp() requires a string in ISO 8601 format");let p=new Date(o);if(p<=0xe677d21fdbff&&p>=-621355968e5)return p;throw w("invalid_timestamp","timestamp() requires a string in ISO 8601 format")}),t(\`timestamp(int): \${u}\`,o=>{if(o=Number(o)*1e3,o<=0xe677d21fdbff&&o>=-621355968e5)return new Date(o);throw w("invalid_timestamp","timestamp() requires a valid integer unix timestamp")}),t(\`\${u}.getDate(): int\`,o=>BigInt(o.getUTCDate())),t(\`\${u}.getDate(string): int\`,(o,p)=>BigInt(l(o,p).getDate())),t(\`\${u}.getDayOfMonth(): int\`,o=>BigInt(o.getUTCDate()-1)),t(\`\${u}.getDayOfMonth(string): int\`,(o,p)=>BigInt(l(o,p).getDate()-1)),t(\`\${u}.getDayOfWeek(): int\`,o=>BigInt(o.getUTCDay())),t(\`\${u}.getDayOfWeek(string): int\`,(o,p)=>BigInt(l(o,p).getDay())),t(\`\${u}.getDayOfYear(): int\`,c),t(\`\${u}.getDayOfYear(string): int\`,c),t(\`\${u}.getFullYear(): int\`,o=>BigInt(o.getUTCFullYear())),t(\`\${u}.getFullYear(string): int\`,(o,p)=>BigInt(l(o,p).getFullYear())),t(\`\${u}.getHours(): int\`,o=>BigInt(o.getUTCHours())),t(\`\${u}.getHours(string): int\`,(o,p)=>BigInt(l(o,p).getHours())),t(\`\${u}.getMilliseconds(): int\`,o=>BigInt(o.getUTCMilliseconds())),t(\`\${u}.getMilliseconds(string): int\`,o=>BigInt(o.getUTCMilliseconds())),t(\`\${u}.getMinutes(): int\`,o=>BigInt(o.getUTCMinutes())),t(\`\${u}.getMinutes(string): int\`,(o,p)=>BigInt(l(o,p).getMinutes())),t(\`\${u}.getMonth(): int\`,o=>BigInt(o.getUTCMonth())),t(\`\${u}.getMonth(string): int\`,(o,p)=>BigInt(l(o,p).getMonth())),t(\`\${u}.getSeconds(): int\`,o=>BigInt(o.getUTCSeconds())),t(\`\${u}.getSeconds(string): int\`,(o,p)=>BigInt(l(o,p).getSeconds()));let y=/(\\d*\\.?\\d*)(ns|us|µs|ms|s|m|h)/;function b(o){if(!o)throw w("invalid_duration","Invalid duration string: ''");let p=o[0]==="-";(o[0]==="-"||o[0]==="+")&&(o=o.slice(1));let m=BigInt(0);for(;;){let S=y.exec(o);if(!S)throw w("invalid_duration",\`Invalid duration string: \${o}\`);if(S.index!==0)throw w("invalid_duration",\`Invalid duration string: \${o}\`);o=o.slice(S[0].length);let ie=Mt[S[2]],[It="0",Le=""]=S[1].split("."),xt=BigInt(It)*ie,Nt=Le?BigInt(Le.slice(0,13).padEnd(13,"0"))*ie/10000000000000n:0n;if(m+=xt+Nt,o==="")break}let E=m>=H?m/H:0n,C=Number(m%H);return p?new P(-E,-C):new P(E,C)}t("duration(string): google.protobuf.Duration",o=>b(o)),t("google.protobuf.Duration.getHours(): int",o=>o.getHours()),t("google.protobuf.Duration.getMinutes(): int",o=>o.getMinutes()),t("google.protobuf.Duration.getSeconds(): int",o=>o.getSeconds()),t("google.protobuf.Duration.getMilliseconds(): int",o=>o.getMilliseconds()),Ke(n)}function Ye(n){let e=0;for(let t of n)e++;return e}var $=class{#e;constructor(e){this.#e=e,x(this)}get name(){return this.#e}get[Symbol.toStringTag](){return\`Type<\${this.#e}>\`}toString(){return\`Type<\${this.#e}>\`}},D={string:new $("string"),bool:new $("bool"),int:new $("int"),uint:new $("uint"),double:new $("double"),map:new $("map"),list:new $("list"),bytes:new $("bytes"),null_type:new $("null"),type:new $("type")},Ct=new $("optional"),le={dyn(n,e){switch(typeof n){case"string":case"bigint":case"number":case"boolean":return!0;case"object":switch(n&&n.constructor){case null:case void 0:case Object:case Map:case Array:case Set:return!0;default:if(e.objectTypesByConstructor.get(n.constructor))return!0}}return!!e.debugType(n)},string(n){return typeof n=="string"},int(n){return typeof n=="bigint"},double(n){return typeof n=="number"},bool(n){return typeof n=="boolean"},null(n){return n===null},bytes(n){return n instanceof Uint8Array},uint(n){return n instanceof _},type(n){return n instanceof $},list(n){switch(n?.constructor){case Array:case Set:return!0;default:return!1}},map(n){switch(typeof n=="object"&&n?n.constructor:null){case void 0:case Object:case Map:return!0;default:return!1}},optional(n){return n instanceof I},message(n,e){return this===e.debugType(n)}};le.param=le.dyn;var N=class{#e=new WeakMap;constructor({kind:e,type:t,name:r,keyType:i,valueType:s}){this.kind=e,this.type=t,this.name=r,this.keyType=i,this.valueType=s,this.unwrappedType=e==="dyn"&&s?s.unwrappedType:this,this.wrappedType=e==="dyn"?this:Ze(this.unwrappedType),this.hasDynType=this.kind==="dyn"||this.valueType?.hasDynType||this.keyType?.hasDynType||!1,this.hasPlaceholderType=this.kind==="param"||this.keyType?.hasPlaceholderType||this.valueType?.hasPlaceholderType||!1,e==="list"?this.fieldLazy=this.#o:e==="map"?this.fieldLazy=this.#i:e==="message"?this.fieldLazy=this.#n:e==="optional"&&(this.fieldLazy=this.#t),this.matchesValueType=le[r]||le[e],x(this)}isDynOrBool(){return this.type==="bool"||this.kind==="dyn"}isEmpty(){return this.valueType&&this.valueType.kind==="param"}unify(e,t){let r=this;if(r===t||r.kind==="dyn"||t.kind==="param")return r;if(t.kind==="dyn"||r.kind==="param")return t;if(r.kind!==t.kind||!(r.hasPlaceholderType||t.hasPlaceholderType||r.hasDynType||t.hasDynType))return null;let i=r.valueType.unify(e,t.valueType);if(!i)return null;switch(r.kind){case"optional":return e.getOptionalType(i);case"list":return e.getListType(i);case"map":let s=r.keyType.unify(e,t.keyType);return s?e.getMapType(s,i):null}}templated(e,t){if(!this.hasPlaceholderType)return this;switch(this.kind){case"dyn":return this.valueType.templated(e,t);case"param":return t?.get(this.name)||this;case"map":return e.getMapType(this.keyType.templated(e,t),this.valueType.templated(e,t));case"list":return e.getListType(this.valueType.templated(e,t));case"optional":return e.getOptionalType(this.valueType.templated(e,t));default:return this}}toString(){return this.name}#t(e,t,r,i){if(e=e instanceof I?e.orValue():e,e===void 0)return J;let s=i.debugType(e);try{return I.of(s.fieldLazy(e,t,r,i))}catch(a){if(a instanceof V)return J;throw a}}#n(e,t,r,i){let s=e?i.objectTypesByConstructor.get(e.constructor):void 0;if(!s)return;let a=s.fields?s.fields[t]:k;if(!a)return;let u=e instanceof Map?e.get(t):e[t];if(u!==void 0){if(a.matchesValueType(u,i))return u;throw w("field_type_mismatch",\`Field '\${t}' is not of type '\${a}', got '\${i.debugType(u)}'\`,r)}}#i(e,t,r,i){let s=e instanceof Map?e.get(t):e&&F(e,t)?e[t]:void 0;if(s!==void 0){if(this.valueType.matchesValueType(s,i))return s;throw w("field_type_mismatch",\`Field '\${t}' is not of type '\${this.valueType}', got '\${i.debugType(s)}'\`,r)}}#s(e,t){switch(e?.constructor){case Array:return e[t];case Set:{let r=0;for(let i of e)if(r++===t)return i}}}#o(e,t,r,i){if(typeof t=="bigint")t=Number(t);else if(typeof t!="number")return;let s=this.#s(e,t);if(s===void 0){if(!e)return;throw w("index_out_of_bounds",\`No such key: index out of bounds, index \${t} \${t<0?"< 0":\`>= size \${e.length||e.size}\`}\`,r)}if(this.valueType.matchesValueType(s,i))return s;throw w("list_item_type_mismatch",\`List item with index '\${t}' is not of type '\${this.valueType}', got '\${i.debugType(s)}'\`,r)}fieldLazy(){}field(e,t,r,i){let s=this.fieldLazy(e,t,r,i);if(s!==void 0)return s;throw w("no_such_key",\`No such key: \${t}\`,r)}matchesBoth(e){return this.matches(e)&&e.matches(this)}matches(e){let t=this.unwrappedType;return e=e.unwrappedType,t===e||t.kind==="dyn"||e.kind==="dyn"||e.kind==="param"?!0:this.#e.get(e)??this.#e.set(e,this.#r(t,e)).get(e)}#r(e,t){switch(e.kind){case"dyn":case"param":return!0;case"list":return t.kind==="list"&&e.valueType.matches(t.valueType);case"map":return t.kind==="map"&&e.keyType.matches(t.keyType)&&e.valueType.matches(t.valueType);case"optional":return t.kind==="optional"&&e.valueType.matches(t.valueType);default:return e.name===t.name}}},Dt="have a .callAst property or .evaluate(checker, macro, ctx) method.",Bt="have a .callAst property or .typeCheck(checker, macro, ctx) method.";function St(n,e){let t=\`Macro '\${n}' must\`;return function(i){let s=e(i);if(!s||typeof s!="object")throw new Error(\`\${t} return an object.\`);if(s.callAst)return s;if(!s.evaluate)throw new Error(\`\${t} \${Dt}\`);if(!s.typeCheck)throw new Error(\`\${t} \${Bt}\`);return s}}var ee=class{constructor(e,t,r,i){this.name=e,this.type=t,this.description=r??null,this.constant=i!==void 0,this.value=i,x(this)}},Ee=class{constructor({name:e,receiverType:t,returnType:r,handler:i,description:s,params:a,async:u}){if(typeof e!="string")throw new Error("name must be a string");if(typeof i!="function")throw new Error("handler must be a function");this.name=e,this.async=Z(i,u),this.receiverType=t??null,this.returnType=r,this.description=s??null,this.params=a,this.argTypes=a.map(f=>f.type),this.macro=this.argTypes.includes(tt);let h=t?\`\${t}.\`:"";this.signature=\`\${h}\${e}(\${this.argTypes.join(", ")}): \${r}\`,this.handler=this.macro?St(this.signature,i):i,this.partitionKey=\`\${t?"rcall":"call"}:\${e}:\${a.length}\`,this.hasPlaceholderType=this.returnType.hasPlaceholderType||this.receiverType?.hasPlaceholderType||this.argTypes.some(f=>f.hasPlaceholderType)||!1,x(this)}matchesArgs(e){return e.length===this.argTypes.length&&this.argTypes.every((t,r)=>t.matches(e[r]))?this:null}},U=class{constructor({op:e,leftType:t,rightType:r,handler:i,returnType:s,async:a}){this.operator=e,this.leftType=t,this.rightType=r||null,this.handler=i,this.async=Z(i,a),this.returnType=s,r?this.signature=\`\${t} \${e} \${r}: \${s}\`:this.signature=\`\${e}\${t}: \${s}\`,this.hasPlaceholderType=this.leftType.hasPlaceholderType||this.rightType?.hasPlaceholderType||!1,x(this)}equals(e){return this.operator===e.operator&&this.leftType===e.leftType&&this.rightType===e.rightType}};function Ae(n){return new N({kind:"list",name:\`list<\${n}>\`,type:"list",valueType:n})}function B(n){return new N({kind:"primitive",name:n,type:n})}function Pt(n){return new N({kind:"message",name:n,type:n})}function Ze(n){let e=n?\`dyn<\${n}>\`:"dyn";return new N({kind:"dyn",name:e,type:e,valueType:n})}function et(n){let e=\`optional<\${n}>\`;return new N({kind:"optional",name:e,type:"optional",valueType:n})}function ke(n,e){return new N({kind:"map",name:\`map<\${n}, \${e}>\`,type:"map",keyType:n,valueType:e})}function Vt(n){return new N({kind:"param",name:n,type:n})}var k=Ze(),tt=B("ast"),Qe=Ae(k),We=ke(k,k),v={string:B("string"),bool:B("bool"),int:B("int"),uint:B("uint"),double:B("double"),bytes:B("bytes"),dyn:k,null:B("null"),type:B("type"),optional:et(k),list:Qe,"list<dyn>":Qe,map:We,"map<dyn, dyn>":We};for(let n of[v.string,v.double,v.int]){let e=Ae(n),t=ke(v.string,n);v[e.name]=e,v[t.name]=t}Object.freeze(v);var _e=class{returnType=null;async=!1;macro=!1;#e=null;#t=null;declarations=[];constructor(e){this.registry=e}[Symbol.iterator](){return this.declarations[Symbol.iterator]()}add(e){this.returnType=(this.returnType||e.returnType).unify(this.registry,e.returnType)||k,e.macro&&(this.macro=e),e.async&&!this.async&&(this.async=!0),this.declarations.push(e),this.#e?.clear(),this.#t?.clear()}findFunction(e,t=null){for(let r=0;r<this.declarations.length;r++){let i=this.#a(this.declarations[r],e,t);if(i)return i}return null}findUnaryOverload(e){let t=(this.#e??=new Map).get(e);if(t!==void 0)return t;let r=!1;for(let i of this.declarations)if(i.leftType===e){r=i;break}return this.#e.set(e,r),r}findBinaryOverload(e,t){return e.kind==="dyn"&&e.valueType?t=t.wrappedType:t.kind==="dyn"&&t.valueType&&(e=e.wrappedType),(this.#e??=new Map).get(e)?.get(t)??this.#n(this.#e,e,t,this.#i(e,t))}checkBinaryOverload(e,t){return(this.#t??=new Map).get(e)?.get(t)??this.#n(this.#t,e,t,this.#s(e,t))}#n(e,t,r,i){return(e.get(t)||e.set(t,new Map).get(t)).set(r,i),i}#i(e,t){let r=this.#o(e,t);if(r.length===0)return!1;if(r.length===1)return r[0];throw new Error(\`Operator overload '\${r[0].signature}' overlaps with '\${r[1].signature}'.\`)}#s(e,t){let r=this.#o(e,t);if(r.length===0)return!1;let i=r[0].returnType;for(let s=1;s<r.length;s++)i=i.unify(this.registry,r[s].returnType)||k;return i}#o(e,t){let r=[];for(let i of this.declarations){if(i.leftType===e&&i.rightType===t)return[i];let s=this.#r(i,e,t);s&&r.push(s)}if(r.length===0){let i=this.declarations[0]?.operator;if((i==="=="||i==="!=")&&e.kind==="dyn")return Ut[i]}return r}#r(e,t,r){let i=e.hasPlaceholderType?new Map:null,s=this.#c(e.leftType,t,i);if(!s)return;let a=this.#c(e.rightType,r,i);if(a)return(e.operator==="=="||e.operator==="!=")&&e.leftType.kind==="dyn"&&e.leftType.valueType&&t.kind!=="dyn"&&r.kind!=="dyn"?!1:e.hasPlaceholderType?{async:e.async,signature:e.signature,handler:e.handler,leftType:s,rightType:a,returnType:e.returnType.templated(this.registry,i)}:e}#a(e,t,r){if(e.hasPlaceholderType)return this.#h(e,t,r);if(!(r&&e.receiverType&&!r.matches(e.receiverType)))return e.matchesArgs(t)}#h(e,t,r){let i=new Map;if(r&&e.receiverType&&!this.#c(e.receiverType,r,i))return null;for(let s=0;s<t.length;s++)if(!this.#c(e.argTypes[s],t[s],i))return null;return{async:e.async,handler:e.handler,signature:e.signature,returnType:e.returnType.templated(this.registry,i)}}#c(e,t,r){if(!e.hasPlaceholderType)return t.matches(e)?t:null;let i=t.kind==="dyn";return this.#l(e,t,r,i)&&(i||t.matches(e.templated(this.registry,r)))?t:null}#l(e,t,r,i=!1){if(!e.hasPlaceholderType)return!0;if(!t)return!1;let s=i||t.kind==="dyn";switch(t=t.unwrappedType,e.kind){case"param":{let a=s?k:t,u=r.get(e.name);return u?u.kind==="dyn"||a.kind==="dyn"?!0:u.matchesBoth(a):r.set(e.name,a)&&!0}case"list":return t.name==="dyn"&&(t=e),t.kind!=="list"?!1:this.#l(e.valueType,t.valueType,r,s);case"map":return t.name==="dyn"&&(t=e),t.kind!=="map"?!1:this.#l(e.keyType,t.keyType,r,s)&&this.#l(e.valueType,t.valueType,r,s);case"optional":return t.name==="dyn"&&(t=e),t.kind!=="optional"?!1:this.#l(e.valueType,t.valueType,r,s)}return!0}};function Xe(n){let e=[],t="",r=0;for(let i of n){if(i==="<")r++;else if(i===">")r--;else if(i===","&&r===0){e.push(t.trim()),t="";continue}t+=i}return t&&e.push(t.trim()),e}var rt=[[_,"uint",D.uint,v.uint],[$,"type",D.type,v.type],[I,"optional",Ct,v.optional],[Uint8Array,"bytes",D.bytes,v.bytes],...typeof Buffer<"u"?[[Buffer,"bytes",D.bytes,v.bytes]]:[]].map(([n,e,t,r])=>Object.freeze({name:e,typeType:t,type:r,ctor:n})),Rt=rt.map(n=>[n.name,n]),Lt=rt.map(n=>[n.ctor,n]),ue=n=>new Error(\`Invalid variable declaration: \${n}\`),ce=n=>new Error(\`Invalid type declaration: \${n}\`),Ut={"==":[{handler:(n,e)=>n===e,returnType:v.bool}],"!=":[{handler:(n,e)=>n!==e,returnType:v.bool}]},$e=class n{#e=null;#t;#n=!0;#i=null;#s=null;#o=null;#r=null;#a=null;#h=null;#c=null;#l=null;#p=!1;constructor(e={}){this.enableOptionalTypes=e.enableOptionalTypes??!1,this.unlistedVariablesAreDyn=e.unlistedVariablesAreDyn??!1;let t=e.parent instanceof n?e.parent:null;if(t){this.#e=t;let r=t;for(;r&&!r.#i;)r=r.#e;let i=t;for(;i&&!i.#s;)i=i.#e;this.#o=t.#o,this.#r=t.#r,this.#l={operators:r.#i,functions:i.#s},this.objectTypes=new Map(t.objectTypes),this.objectTypesByConstructor=new Map(t.objectTypesByConstructor),this.variables=t.variables,this.#n=!1,this.#t=t.#t,this.#a=t.#a,this.#h=t.#h,this.#c=t.#c,(this.enableOptionalTypes!==t.enableOptionalTypes||this.unlistedVariablesAreDyn!==t.unlistedVariablesAreDyn)&&ze(this,this.enableOptionalTypes)}else{this.#i=[],this.#s=[],this.objectTypes=new Map(Rt),this.objectTypesByConstructor=new Map(Lt),this.#t=new Map(He(v)),this.#a=new Map,this.#h=new Map,this.#c=new Map,this.variables=new Map,this.variables.dyn=this.unlistedVariablesAreDyn;for(let r in D)this.registerConstant(r,"type",D[r])}}#b(){this.#n||(this.variables=new Map(this.variables),this.variables.dyn=this.unlistedVariablesAreDyn,this.#n=!0)}deleteVariable(e){this.#b(),this.variables.delete(e)}#g(e){this.#i||(this.#o=null),this.operatorCandidates(e.operator).add(e),this.#i.push(e)}#E(e){this.#s||(this.#r=null),this.#m(e.partitionKey).add(e),this.#s.push(e)}#f(e,t){return e.get(t)||e.set(t,new _e(this)).get(t)}#_(){return this.#i?this.#i:this.#i=[...this.#l.operators]}#w(){return this.#s?this.#s:this.#s=[...this.#l.functions]}operatorCandidates(e){if(this.#o)return this.#f(this.#o,e);let t=this.#o=new Map;for(let r of this.#_())this.#f(t,r.operator).add(r);return this.#f(t,e)}functionCandidates(e,t,r){return this.#m(\`\${e?"rcall":"call"}:\${t}:\${r}\`)}#m(e){if(this.#r)return this.#f(this.#r,e);let t=this.#r=new Map;for(let r of this.#w())this.#f(t,r.partitionKey).add(r);return this.#f(t,e)}registerVariable(e,t,r){if(this.#p)throw new Error("Cannot modify frozen registry");let i=r?.description,s;if(typeof e=="string"&&typeof t=="object"&&!(t instanceof N)?(i=t.description,s=t.value,t.schema?t=this.registerType({name:\`$\${e}\`,schema:t.schema}).type:t=t.type):typeof e=="object"&&(e.schema?t=this.registerType({name:\`$\${e.name}\`,schema:e.schema}).type:t=e.type,i=e.description,s=e.value,e=e.name),typeof e!="string"||!e)throw ue("name must be a string");if(z.has(e))throw ue(\`'\${e}' is a reserved name\`);if(this.variables.get(e)!==void 0)throw ue(\`'\${e}' is already registered\`);if(typeof t=="string")t=this.getType(t);else if(!(t instanceof N))throw ue("type is required");return this.#b(),this.variables.set(e,new ee(e,t,i,s)),this}#$(e,t){let r=Object.create(null);for(let i of A(t)){let s=t[i];if(typeof s=="object"&&s)r[i]=this.registerType({name:\`\${e}.\${i}\`,schema:s}).type.name;else if(typeof s=="string")r[i]=s;else throw new Error(\`Invalid field definition for '\${e}.\${i}'\`)}return r}registerConstant(e,t,r){return typeof e=="object"?this.registerVariable(e):this.registerVariable({name:e,type:t,value:r}),this}getType(e){return this.#u(e,!0)}getListType(e){return this.#a.get(e)||this.#a.set(e,this.#u(\`list<\${e}>\`,!0)).get(e)}getMapType(e,t){return this.#h.get(e)?.get(t)||(this.#h.get(e)||this.#h.set(e,new Map).get(e)).set(t,this.#u(\`map<\${e}, \${t}>\`,!0)).get(t)}getOptionalType(e){return this.#c.get(e)||this.#c.set(e,this.#u(\`optional<\${e}>\`,!0)).get(e)}assertType(e,t,r){try{return this.#u(e,!0)}catch(i){throw i.message=\`Invalid \${t} '\${i.unknownType||e}' in '\${r}'\`,i}}getFunctionType(e){if(e==="ast")return tt;let t=this.#u(e,!0);if(t.kind==="dyn"&&t.valueType)throw new Error(\`type '\${t.name}' is not supported\`);return t}registerType(e,t){if(this.#p)throw new Error("Cannot modify frozen registry");if(typeof e=="object"&&(t=e,e=t.fullName||t.name||t.ctor?.name),typeof e=="string"&&e[0]==="."&&(e=e.slice(1)),typeof e!="string"||e.length<2||z.has(e))throw ce(\`name '\${e}' is not valid\`);if(this.objectTypes.has(e))throw ce(\`type '\${e}' already registered\`);let r=this.#u(e,!1);if(r.kind!=="message")throw ce(\`type '\${e}' is not valid\`);let i={name:e,typeType:new $(e),type:r,ctor:typeof t=="function"?t:t?.ctor,convert:typeof t=="function"?void 0:t?.convert,fields:typeof t?.schema=="object"?this.#v(e,this.#$(e,t.schema)):this.#v(e,typeof t=="function"?void 0:t?.fields)};if(typeof i.ctor!="function"){if(!i.fields)throw ce(\`type '\${e}' requires a constructor or fields\`);Object.assign(i,this.#k(e,i.fields))}return this.objectTypes.set(e,Object.freeze(i)),this.objectTypesByConstructor.set(i.ctor,i),this.registerFunctionOverload(\`type(\${e}): type\`,()=>i.typeType,{async:!1}),i}#u(e,t=!0){let r=this.#t.get(e);if(r)return r;if(typeof e!="string"||!e.length)throw new Error("Invalid type: must be a string");if(r=e.match(/^[A-Z]$/),r)return this.#y(Vt,e,e);if(r=e.match(/^(dyn|list|map|optional)<(.+)>$/),!r){if(t){let a=new Error(\`Unknown type: \${e}\`);throw a.unknownType=e,a}return this.#y(Pt,e,e)}let i=r[1],s=r[2].trim();switch(i){case"dyn":{let a=this.#u(s,t).wrappedType;return this.#t.set(a.name,a),a}case"list":{let a=this.#u(s,t);return this.#y(Ae,\`list<\${a}>\`,a)}case"map":{let a=Xe(s);if(a.length!==2)throw new Error(\`Invalid map type: \${e}\`);let u=this.#u(a[0],t),h=this.#u(a[1],t);return this.#y(ke,\`map<\${u}, \${h}>\`,u,h)}case"optional":{let a=this.#u(s,t);return this.#y(et,\`optional<\${a}>\`,a)}}}#y(e,t,...r){return this.#t.get(t)||this.#t.set(t,e(...r)).get(t)}findMacro(e,t,r){return this.functionCandidates(t,e,r).macro}findUnaryOverload(e,t){return this.operatorCandidates(e).findUnaryOverload(t)}findBinaryOverload(e,t,r){return this.operatorCandidates(e).findBinaryOverload(t,r)}#O(e){return typeof e=="string"?{type:e}:e.id?jt(e):e}#A(e,t,r,i=!1){try{let s=this.#O(t[r]);if(typeof s?.type!="string")throw new Error("unsupported declaration");return this.#u(s.type,i)}catch(s){throw s.message=\`Field '\${r}' in type '\${e}' has unsupported declaration: \${JSON.stringify(t[r])}\`,s}}#v(e,t){if(!t)return;let r=Object.create(null);for(let i of A(t))r[i]=this.#A(e,t,i);return r}#k(e,t){let r=A(t),i=Object.create(null);for(let a of r){let u=t[a],h=u.kind==="message"&&this.objectTypes.get(u.name);h===!1?i[a]=!1:i[a]=h.convert?h:!1}let s={[e]:class extends Map{#d;constructor(a){super(),this.#d=a}[Symbol.iterator](){if(this.size!==r.length)for(let a of r)this.get(a);return super[Symbol.iterator]()}get(a){let u=super.get(a);if(u!==void 0||this.has(a))return u;let h=i[a];if(h!==void 0){if(u=this.#d instanceof Map?this.#d.get(a):this.#d?.[a],h&&u&&typeof u=="object")switch(u.constructor){case void 0:case Object:case Map:u=h.convert(u)}return super.set(a,u),u}}}}[e];return{ctor:s,convert(a){if(a)return a.constructor===s?a:new s(a)}}}clone(e){return this.#p=!0,new n({parent:this,unlistedVariablesAreDyn:e.unlistedVariablesAreDyn,enableOptionalTypes:e.enableOptionalTypes})}getDefinitions(){let e=[],t=[];for(let[,r]of this.variables)r&&e.push({name:r.name,description:r.description||null,type:r.type.name});for(let r of this.#w())t.push({signature:r.signature,name:r.name,description:r.description,receiverType:r.receiverType?r.receiverType.name:null,returnType:r.returnType.name,params:r.params.map(i=>({name:i.name,type:i.type.name,description:i.description}))});return{variables:e,functions:t}}#I(e){if(typeof e!="string")throw new Error("Invalid signature: must be a string");let t=e.match(/^(?:([a-zA-Z0-9.<>]+)\\.)?(\\w+)\\(([^)]*)\\):(.*)$/);if(!t)throw new Error(\`Invalid signature: \${e}\`);let r=t[4].trim();if(!r)throw new Error(\`Invalid signature: \${e}\`);return{receiverType:t[1]||null,name:t[2],argTypes:Xe(t[3]),returnType:r}}#x(e,t){return e.name!==t.name||e.argTypes.length!==t.argTypes.length||(e.receiverType||t.receiverType)&&(!e.receiverType||!t.receiverType)?!1:!(e.receiverType!==t.receiverType&&e.receiverType!==k&&t.receiverType!==k)&&(t.macro||e.macro||t.argTypes.every((i,s)=>{let a=e.argTypes[s];return i===a||i===k||a===k}))}#N(e){for(let t of this.#m(e.partitionKey))if(this.#x(t,e))throw new Error(\`Function signature '\${e.signature}' overlaps with existing overload '\${t.signature}'.\`)}#M(e,t,r){if(!r)return{type:this.getFunctionType(t),name:\`arg\${e}\`,description:null};let i=r.type||t;if(!i)throw new Error(\`params[\${e}].type is required\`);if(t&&i!==t)throw new Error(\`params[\${e}].type not equal to signature type\`);return{name:r.name||\`arg\${e}\`,type:this.getFunctionType(i),description:r.description??null}}registerFunctionOverload(e,t,r){if(this.#p)throw new Error("Cannot modify frozen registry");typeof e=="object"?r=e:typeof t=="object"?r=t:r||(r={});let i=typeof e=="string"?e:r.signature??void 0,s=i!==void 0?this.#I(i):void 0,a=s?.name||r.name,u=s?.receiverType||r.receiverType,h=s?.argTypes,f=s?.returnType||r.returnType,g=r.params;t=typeof t=="function"?t:r.handler;let l;try{if(!a)throw new Error("signature or name are required");if(!f)throw new Error("must have a returnType");if(g){if(h&&g.length!==h.length)throw new Error("mismatched length in params and args in signature")}else if(!h)throw new Error("signature or params are required");l=new Ee({name:a,async:r?.async,receiverType:u?this.getType(u):null,returnType:this.getType(f),handler:t,description:r.description,params:(h||g).map((c,y)=>this.#M(y,h?.[y],g?.[y]))})}catch(c){throw typeof i=="string"?c.message=\`Invalid function declaration '\${i}': \${c.message}\`:a?c.message=\`Invalid function declaration '\${a}': \${c.message}\`:c.message=\`Invalid function declaration: \${c.message}\`,c}this.#N(l),this.#E(l)}registerOperatorOverload(e,t,r){let i=e.match(/^([-!])([\\w.<>]+)(?::\\s*([\\w.<>]+))?$/);if(i){let[,g,l,c]=i;return this.unaryOverload(g,l,t,c,r?.async)}let s=e.match(/^([\\w.<>]+) ([-+*%/]|==|!=|<|<=|>|>=|in) ([\\w.<>]+)(?::\\s*([\\w.<>]+))?$/);if(!s)throw new Error(\`Operator overload invalid: \${e}\`);let[,a,u,h,f]=s;return this.binaryOverload(a,u,h,t,f)}unaryOverload(e,t,r,i,s){if(this.#p)throw new Error("Cannot modify frozen registry");let a=this.assertType(t,"type",\`\${e}\${t}\`),u=this.assertType(i||t,"return type",\`\${e}\${t}: \${i||t}\`),h=new U({op:\`\${e}_\`,leftType:a,returnType:u,handler:r,async:s});this.#g(this.#T(h))}#C(e){for(let t of this.operatorCandidates(e.operator))if(e.equals(t))return!0;return!1}#T(e){if(!this.#C(e))return e;throw new Error(\`Operator overload already registered: \${e.signature}\`)}binaryOverload(e,t,r,i,s,a){if(this.#p)throw new Error("Cannot modify frozen registry");s??=Je.has(t)?"bool":e;let u=\`\${e} \${t} \${r}: \${s}\`,h=this.assertType(e,"left type",u),f=this.assertType(r,"right type",u),g=this.assertType(s,"return type",u);if(h.kind==="dyn"&&h.valueType?f=f.wrappedType:f.kind==="dyn"&&f.valueType&&(h=h.wrappedType),Je.has(t)&&g.type!=="bool")throw new Error(\`Comparison operator '\${t}' must return 'bool', got '\${g.type}'\`);let l=new U({op:t,leftType:h,rightType:f,returnType:g,handler:i,async:a});if(l.hasPlaceholderType&&!(f.hasPlaceholderType&&h.hasPlaceholderType))throw new Error(\`Operator overload with placeholders must use them in both left and right types: \${u}\`);if(this.#T(l),t==="=="){let c=[new U({op:"!=",leftType:h,rightType:f,handler(y,b,o,p){return!i(y,b,o,p)},returnType:g,async:a})];h!==f&&c.push(new U({op:"==",leftType:f,rightType:h,handler(y,b,o,p){return i(b,y,o,p)},returnType:g,async:a}),new U({op:"!=",leftType:f,rightType:h,handler(y,b,o,p){return!i(b,y,o,p)},returnType:g,async:a}));for(let y of c)this.#T(y);for(let y of c)this.#g(y)}this.#g(l)}},Je=new Set(["<","<=",">",">=","==","!=","in"]);function nt(n){return new $e(n)}var q=class{#e;#t;#n;#i;constructor(e,t){if(this.#e=e.variables,t!=null){if(typeof t!="object")throw w("invalid_context","Context must be an object");t instanceof Map?this.#n=t:this.#t=t}}getValue(e){return this.#i?.get(e)||(this.#t?this.#t[e]:this.#n?.get(e))}getVariable(e){return this.#e.get(e)??(this.#e.dyn&&!z.has(e)?new ee(e,k):void 0)}getCheckedValue(e,t){let r=this.getValue(t.args);if(r===void 0)throw e.createError("unknown_variable",\`Unknown variable: \${t.args}\`,t);if(t.checkedType.matchesValueType(r,e))return r;let i=t.checkedType,s=e.debugType(r);if(i.kind==="message"&&s.kind==="map"){let a=e.objectTypes.get(i.name)?.convert?.(r);if(a)return(this.#i??=new Map).set(t.args,a),a}throw e.createError("variable_type_mismatch",\`Variable '\${t.args}' is not of type '\${i}', got '\${s}'\`,t)}forkWithVariable(e,t){return new Oe(this,e,t)}},Oe=class n{#e;accuType;accuValue;iterValue;constructor(e,t,r){this.#e=e,this.iterVar=t,this.iterType=r}forkWithVariable(e,t){return new n(this,e,t)}reuse(e){if(!this.async)return this.#e=e,this;let t=new n(e,this.iterVar,this.iterType);return t.accuType=this.accuType,t}setIterValue(e,t){if(this.iterType.matchesValueType(e,t))return this.iterValue=e,this;let r=this.iterType,i=t.debugType(e);if(r.kind==="message"&&i.kind==="map"){let s=t.objectTypes.get(r.name)?.convert?.(e);if(s)return this.iterValue=s,this}throw t.createError("variable_type_mismatch",\`Variable '\${this.iterVar}' is not of type '\${r}', got '\${i}'\`)}setAccuType(e){return this.accuType=e,this}setAccuValue(e){return this.accuValue=e,this}getValue(e){return this.iterVar===e?this.iterValue:this.#e.getValue(e)}getCheckedValue(e,t){return this.iterVar===t.args?this.iterValue:this.#e.getCheckedValue(e,t)}getVariable(e){return this.iterVar===e?new ee(e,this.iterType):this.#e.getVariable(e)}};function jt(n){let e;if(n.map){let t=ve(n.keyType,n.resolvedKeyType),r=ve(n.type,n.resolvedType);e=\`map<\${t}, \${r}>\`}else e=ve(n.type,n.resolvedType);return{type:n.repeated?\`list<\${e}>\`:e}}function ve(n,e){switch(n){case"string":return"string";case"bytes":return"bytes";case"bool":return"bool";case"double":case"float":case"int32":case"int64":case"sint32":case"sint64":case"sfixed32":case"sfixed64":case"uint32":case"uint64":case"fixed32":case"fixed64":return"double";default:switch(e?.constructor.name){case"Type":return e.fullName.slice(1);case"Enum":return"int"}return n?.includes(".")?n:"dyn"}}var yt=v.dyn,G=class{dynType=v.dyn;optionalType=v.optional;stringType=v.string;intType=v.int;doubleType=v.double;boolType=v.bool;nullType=v.null;listType=v.list;mapType=v.map;constructor(e){this.opts=e.opts,this.registry=e.registry,this.objectTypes=this.registry.objectTypes,this.objectTypesByConstructor=this.registry.objectTypesByConstructor}getType(e){return this.registry.getType(e)}debugType(e){switch(typeof e){case"string":return this.stringType;case"bigint":return this.intType;case"number":return this.doubleType;case"boolean":return this.boolType;case"object":if(e===null)return this.nullType;switch(e.constructor){case void 0:case Object:case Map:return this.mapType;case Array:case Set:return this.listType;default:return this.objectTypesByConstructor.get(e.constructor)?.type||xe(this,e.constructor?.name||typeof e)}default:xe(this,typeof e)}}};function xe(n,e){throw n.createError("unsupported_type",\`Unsupported type: \${e}\`)}var it=n=>Array.isArray(n)?n.some(e=>e.maybeAsync):!1;function M(n,e,t){return e===!0||e&&(e?.maybeAsync||it(e))?Ft(t):n===!0||n&&(n?.maybeAsync||it(n))?zt(t):t}function Ft(n){return n.__asyncBoth??=function(t,r,i,s){return t instanceof Promise||r instanceof Promise?r instanceof Promise?t instanceof Promise?Promise.all([t,r]).then(a=>n(a[0],a[1],i,s)):r.then(a=>n(t,a,i,s)):t.then(a=>n(a,r,i,s)):n(t,r,i,s)}}function zt(n){return n.__asyncFirst??=function(t,r,i,s){return t instanceof Promise?t.then(a=>n(a,r,i,s)):n(t,r,i,s)}}function st(n,e,t){e.right=e.args[1];let r=n.check(e.left=e.args[0],t);return e.op==="[]"&&n.check(e.right,t),e.handle=M(e.left,e.op==="[]"?e.right:!1,r!==yt?sr:ar),r.kind!=="optional"?n.checkAccessOnType(e,t,r):n.registry.getOptionalType(n.checkAccessOnType(e,t,r.valueType,!0))}function ot(n,e,t){e.right=e.args[1];let r=n.check(e.left=e.args[0],t);e.op==="[?]"&&n.check(e.right,t),e.handle=M(e.left,e.op==="[?]"?e.right:!1,ir);let i=r.kind==="optional"?r.valueType:r;return n.registry.getOptionalType(n.checkAccessOnType(e,t,i,!0))}var Kt={heterogeneous_list_element:"List elements must have the same type,",heterogeneous_map_key:"Map key uses wrong type,",heterogeneous_map_value:"Map value uses wrong type,"};function at(n,e,t,r,i){let s=n.check(r,e);if(s===t||t.isEmpty())return s;if(s.isEmpty())return t;throw n.createError(i,\`\${Kt[i]} expected type '\${n.formatType(t)}' but found '\${n.formatType(s)}'\`,r)}function ut(n,e,t,r){return t.unify(n.registry,n.check(r,e))||yt}function Ht(n,e,t){let r=n.debugRuntimeType(e);return n.createError("invalid_condition_type",\`\${t.meta.label||"Ternary condition must be bool"}, got '\${r}'\`,t)}function qt(n,e,t,r){if(n===!0)return e.run(t.left,r);if(n===!1)return e.run(t.right,r);throw Ht(e,n,t.condition)}function Me(n,e,t){let r=n.debugRuntimeType(e);return n.createError("invalid_logical_operand",\`Logical operator requires bool operands, got '\${r}'\`,t)}function dt(n,e,t){return e instanceof Error?e:Me(n,e,t)}function Y(n,e,t,r,i){if(i===n)return n;if(i===!n){if(r===i)return i;throw dt(e,r,t.left)}if(i instanceof Promise)return i.then(s=>Yt(n,e,t,r,s));throw Me(e,i,t.left)}function Yt(n,e,t,r,i){if(i===n)return n;if(typeof i!="boolean")throw Me(e,i,t.right);if(typeof r!="boolean")throw dt(e,r,t.left);return!n}function ct(n,e,t){let r=n.check(e.left=e.args[0],t),i=n.check(e.right=e.args[1],t);if(!r.isDynOrBool())throw n.createError("invalid_logical_operand",\`Logical operator requires bool operands, got '\${n.formatType(r)}'\`,e);if(!i.isDynOrBool())throw n.createError("invalid_logical_operand",\`Logical operator requires bool operands, got '\${n.formatType(i)}'\`,e);return n.boolType}function lt(n,e,t){let r=e.op,i=n.check(e.args,t);if(e.candidates=n.registry.operatorCandidates(r),i.kind==="dyn")return e.handle=M(e.args,!1,Gt),e.candidates.returnType;let s=e.candidates.findUnaryOverload(i);if(!s)throw n.createError("no_such_overload",\`no such overload: \${r[0]}\${n.formatType(i)}\`,e);return e.handle=M(e.args,!1,s.handler),s.returnType}function Gt(n,e,t){let r=t.debugRuntimeType(n,e.args.checkedType),i=e.candidates.findUnaryOverload(r);if(i)return i.handler(n);throw t.createError("no_such_overload",\`no such overload: \${e.op[0]}\${r}\`,e)}function ht(n,e,t){return e.handle(n.run(e.args,t),e,n)}function Qt(n,e,t){let r=e.op,i=n.check(e.left=e.args[0],t),s=n.check(e.right=e.args[1],t);e.candidates=n.registry.operatorCandidates(r);let a=i.hasDynType||s.hasDynType?void 0:e.candidates.findBinaryOverload(i,s);if(e.handle=M(e.left,e.right,a?.handler||Wt),a)return a.returnType;let u=e.candidates.checkBinaryOverload(i,s);if(i.hasDynType||(e.leftStaticType=i),s.hasDynType||(e.rightStaticType=s),u)return u;throw n.createError("no_such_overload",\`no such overload: \${n.formatType(i)} \${r} \${n.formatType(s)}\`,e)}function Ne(n,e,t){return e.handle(n.run(e.left,t),n.run(e.right,t),e,n)}function pt(n,e,t){return e.handle(n.run(e.left,t),e.right,e,n)}function Wt(n,e,t,r){let i=t.leftStaticType||r.debugTypeDeep(n).wrappedType,s=t.rightStaticType||r.debugTypeDeep(e).wrappedType,a=t.candidates.findBinaryOverload(i,s);if(a)return a.handler(n,e,t,r);throw r.createError("no_such_overload",\`no such overload: \${i} \${t.op} \${s}\`,t)}function he(n,e,t,r){try{let i=n.apply(e,t);return i instanceof Promise?i.catch(s=>{throw X(s,r)}):i}catch(i){throw X(i,r)}}function Xt(n,e,t){let r=e.args[1],i=e.argTypes,s=r.length;for(;s--;)i[s]=t.debugRuntimeType(n[s],r[s].checkedType);let a=e.candidates.findFunction(i);if(a)return he(a.handler,t,n,e);throw t.createError("no_matching_overload",\`found no matching overload for '\${e.args[0]}(\${i.map(u=>u.unwrappedType).join(", ")})'\`,e)}function Jt(n,e,t){let[,r,i]=t.args,s=t.argTypes;for(let h=0;h<s.length;h++)s[h]=e.debugRuntimeType(n[h+1],i[h].checkedType);let a=e.debugRuntimeType(n[0],r.checkedType),u=t.candidates.findFunction(s,a);if(u)return he(u.handler,e,n,t);throw e.createError("no_matching_overload",\`found no matching overload for '\${a.type}.\${t.args[0]}(\${s.map(h=>h.unwrappedType).join(", ")})'\`,t)}function Ie(n,e,t,r=e.length){if(r===0)return[];let i,s=new Array(r);for(;r--;)(s[r]=n.run(e[r],t))instanceof Promise&&(i??=!0);return i?Promise.all(s):s}function ft(n){let e={};for(let t=0;t<n.length;t++){let[r,i]=n[t];r==="__proto__"||r==="constructor"||r==="prototype"||(e[r]=i)}return e}function Zt(n,e,t){let r=n.check(e,t);if(r.kind==="dyn")return r;if(r.kind==="list")return r.valueType;if(r.kind==="map")return r.keyType;throw n.createError("invalid_comprehension_range",\`Expression of type '\${n.formatType(r)}' cannot be range of a comprehension (must be list, map, or dynamic).\`,e)}function gt(n,e,t){if(t instanceof Set)return[...t];if(t instanceof Map)return[...t.keys()];if(t&&typeof t=="object")return A(t);throw n.createError("invalid_comprehension_range",\`Expression of type '\${n.debugType(t)}' cannot be range of a comprehension (must be list, map, or dynamic).\`,e.iterable)}function er(n,e,t,r){R(n)||(n=gt(t,e,n));let i=t.run(e.init,r=e.iterCtx.reuse(r));return r.accuValue=i,r===e.iterCtx?nr(t,r,e,n,i,0):Tt(t,r,e,n,i,0)}function tr(n,e,t,r){R(n)||(n=gt(t,e,n));let i=t.run(e.init,r=e.iterCtx.reuse(r));return r.accuValue=i,r===e.iterCtx?rr(t,r,e,n,i,0):mt(t,r,e,n,i,0)}function rr(n,e,t,r,i,s){let a=t.condition,u=t.step,h=r.length;for(;s<h&&!(a&&!a(i));)if(i=n.run(u,e.setIterValue(r[s++],n)),i instanceof Promise)return mt(n,e,t,r,i,s);return t.result(i)}async function mt(n,e,t,r,i,s){e===t.iterCtx&&(e.async=!0);let a=t.condition,u=t.step,h=r.length;for(i=await i;s<h;){if(a&&!a(i))return t.result(i);i=n.run(u,e.setIterValue(r[s++],n)),i instanceof Promise&&(i=await i)}return t.result(i)}function nr(n,e,t,r,i,s,a,u){let h=t.condition,f=t.step,g=r.length;for(;s<g;){if(!h(i))return t.result(i);if(u=n.tryEval(f,e.setIterValue(r[s++],n)),u instanceof Promise)return Tt(n,e,t,r,i,s,a,u);u instanceof Error&&(a??=u)||(i=u)}if(a&&h(i))throw a;return t.result(i)}async function Tt(n,e,t,r,i,s,a,u){e===t.iterCtx&&(e.async=!0);let h=t.condition,f=t.step,g=r.length;for(u=await u,u instanceof Error?a??=u:i=u;s<g;){if(!h(i))return t.result(i);u=n.tryEval(f,e.setIterValue(r[s++],n)),u instanceof Promise&&(u=await u),!(u instanceof Error&&(a??=u))&&(i=u)}if(a&&h(i))throw a;return t.result(i)}function ir(n,e,t,r){return r.optionalType.field(n,e,t,r)}function sr(n,e,t,r){return t.left.checkedType.field(n,e,t,r)}var or=Object.create(null);function ar(n,e,t,r){switch(n?.constructor){case void 0:case Object:{let s=F(n||or,e)?n[e]:void 0;if(s!==void 0)return r.debugType(s),s;break}case Map:{let s=n.get(e);if(s!==void 0)return r.debugType(s),s;break}case Array:case Set:return r.listType.field(n,e,t,r);default:let i=r.objectTypesByConstructor.get(n.constructor);if(i)return i.type.field(n,e,t,r);typeof n=="object"&&xe(r,n.constructor.name)}throw r.createError("no_such_key",\`No such key: \${e}\`,t)}var ur=()=>[],cr=()=>({}),T={value:{check(n,e){return n.debugType(e.args)},evaluate(n,e){return e.args}},id:{check(n,e,t){let r=t.getVariable(e.args);if(!r)throw n.createError("unknown_variable",\`Unknown variable: \${e.args}\`,e);if(r.constant){let i=e.clone(T.value,r.value);return e.setMeta("alternate",i),n.check(i,t)}return r.type},evaluate(n,e,t){return t.getCheckedValue(n,e)}},".":{alias:"fieldAccess",check:st,evaluate:pt},".?":{alias:"optionalFieldAccess",check:ot,evaluate:pt},"[]":{alias:"bracketAccess",check:st,evaluate:Ne},"[?]":{alias:"optionalBracketAccess",check:ot,evaluate:Ne},call:{check(n,e,t){let[r,i]=e.args,s=e.candidates=n.registry.functionCandidates(!1,r,i.length),a=e.argTypes=i.map(f=>n.check(f,t)),u=s.findFunction(a);if(!u)throw n.createError("no_matching_overload",\`found no matching overload for '\${r}(\${n.formatTypeList(a)})'\`,e);let h=a.some(f=>f.hasDynType)?Xt:u.handler.__handle??=(f,g,l)=>he(u.handler,l,f,g);return e.handle=M(i,!1,h),u.returnType},evaluate(n,e,t){return e.handle(Ie(n,e.args[1],t),e,n)}},rcall:{check(n,e,t){let[r,i,s]=e.args,a=n.check(i,t),u=e.candidates=n.registry.functionCandidates(!0,r,s.length),h=e.argTypes=s.map(g=>n.check(g,t));if(e.receiverWithArgs=[i,...s],e.handle=M(e.receiverWithArgs,!1,Jt),a.kind==="dyn"&&u.returnType)return u.returnType;let f=u.findFunction(h,a);if(!f)throw n.createError("no_matching_overload",\`found no matching overload for '\${a.type}.\${r}(\${n.formatTypeList(h)})'\`,e);if(!a.hasPlaceholderType&&!h.some(g=>g.hasDynType)){let g=f.handler,l=g.__handle??=(c,y,b)=>he(g,y,c,b);e.handle=M(e.receiverWithArgs,!1,l)}return f.returnType},evaluate(n,e,t){return e.handle(Ie(n,e.receiverWithArgs,t),n,e)}},list:{check(n,e,t){let r=e.args,i=r.length;if(i===0)return e.setMeta("evaluate",ur)&&n.getType("list<T>");let s=n.check(r[0],t),a=n.opts.homogeneousAggregateLiterals?at:ut;for(let u=1;u<i;u++)s=a(n,t,s,r[u],"heterogeneous_list_element");return n.registry.getListType(s)},evaluate(n,e,t){return Ie(n,e.args,t)}},map:{check(n,e,t){let r=e.args,i=r.length;if(i===0)return e.setMeta("evaluate",cr)&&n.getType("map<K, V>");let s=n.opts.homogeneousAggregateLiterals?at:ut,a=n.check(r[0][0],t),u=n.check(r[0][1],t);for(let h=1;h<i;h++){let f=r[h];a=s(n,t,a,f[0],"heterogeneous_map_key"),u=s(n,t,u,f[1],"heterogeneous_map_value")}return n.registry.getMapType(a,u)},evaluate(n,e,t){let r=e.args,i=r.length,s=new Array(i),a;for(let u=0;u<i;u++){let h=r[u],f=n.run(h[0],t),g=n.run(h[1],t);f instanceof Promise||g instanceof Promise?(s[u]=Promise.all([f,g]),a??=!0):s[u]=[f,g]}return a?Promise.all(s).then(ft):ft(s)}},comprehension:{check(n,e,t){let r=e.args;r.iterCtx=t.forkWithVariable(r.iterVarName,Zt(n,r.iterable,t)).setAccuType(n.check(r.init,t));let i=n.check(r.step,r.iterCtx),s=r.errorsAreFatal?tr:er;return e.handle=M(r.iterable,!1,s),r.kind==="quantifier"?n.boolType:i},evaluate(n,e,t){return e.handle(n.run(e.args.iterable,t),e.args,n,t)}},accuValue:{check(n,e,t){return t.accuType},evaluate(n,e,t){return t.accuValue}},accuInc:{check(n,e,t){return t.accuType},evaluate(n,e,t){return t.accuValue+=1}},accuPush:{check(n,e,t){let r=t.accuType,i=n.check(e.args,t);return e.args.maybeAsync||e.setMeta("evaluate",T.accuPush.evaluateSync),r.kind==="list"&&r.valueType.kind!=="param"?r:n.registry.getListType(i)},evaluateSync(n,e,t){return t.accuValue.push(n.run(e.args,t)),t.accuValue},evaluate(n,e,t){let r=t.accuValue,i=n.run(e.args,t);return i instanceof Promise?i.then(s=>r.push(s)&&r):(r.push(i),r)}},"?:":{alias:"ternary",check(n,e,t){let r=e.condition=e.args[0],i=e.left=e.args[1],s=e.right=e.args[2],a=n.check(r,t);if(!a.isDynOrBool())throw n.createError("invalid_condition_type",\`\${r.meta.label||"Ternary condition must be bool"}, got '\${n.formatType(a)}'\`,r);let u=n.check(i,t),h=n.check(s,t),f=u.unify(n.registry,h);if(e.handle=M(r,!1,qt),f)return f;throw n.createError("incompatible_ternary_branches",\`Ternary branches must have the same type, got '\${n.formatType(u)}' and '\${n.formatType(h)}'\`,e)},evaluate(n,e,t){return e.handle(n.run(e.condition,t),n,e,t)}},"||":{check:ct,evaluate(n,e,t){let r=n.tryEval(e.left,t);if(r===!0)return!0;if(r===!1){let i=n.run(e.right,t);return typeof i=="boolean"?i:Y(!0,n,e,r,i)}return r instanceof Promise?r.then(i=>i===!0?i:Y(!0,n,e,i,n.run(e.right,t))):Y(!0,n,e,r,n.run(e.right,t))}},"&&":{check:ct,evaluate(n,e,t){let r=n.tryEval(e.left,t);if(r===!1)return!1;if(r===!0){let i=n.run(e.right,t);return typeof i=="boolean"?i:Y(!1,n,e,r,i)}return r instanceof Promise?r.then(i=>i===!1?i:Y(!1,n,e,i,n.run(e.right,t))):Y(!1,n,e,r,n.run(e.right,t))}},"!_":{alias:"unaryNot",check:lt,evaluate:ht},"-_":{alias:"unaryMinus",check:lt,evaluate:ht}},lr=["!=","==","in","+","-","*","/","%","<","<=",">",">="];for(let n of lr)T[n]={check:Qt,evaluate:Ne};for(let n of A(T)){let e=T[n];e.name=n,e.alias&&(T[e.alias]=e)}var pe=n=>n;function fe(n,e){if(n.op==="id")return n.args;throw O("invalid_macro_argument",e,n)}function bt(n){let e=n?"map(var, filter, transform)":"map(var, transform)",t=\`\${e} invalid predicate iteration variable\`,r=\`\${e} filter predicate must return bool\`;return({args:i,receiver:s,ast:a})=>{let[u,h,f]=n?i:[i[0],null,i[1]],g=f.clone(T.accuPush,f);if(h){let l=h.clone(T.accuValue);g=h.clone(T.ternary,[h.setMeta("label",r),g,l])}return{callAst:a.clone(T.comprehension,{errorsAreFatal:!0,iterable:s,iterVarName:fe(u,t),init:a.clone(T.list,[]),step:g,result:pe})}}}function hr(){let n="filter(var, predicate)",e=\`\${n} invalid predicate iteration variable\`,t=\`\${n} predicate must return bool\`;return({args:r,receiver:i,ast:s})=>{let a=fe(r[0],e),u=s.clone(T.accuValue),h=r[1].setMeta("label",t),f=s.clone(T.accuPush,s.clone(T.id,a)),g=h.clone(T.ternary,[h,f,u]);return{callAst:s.clone(T.comprehension,{errorsAreFatal:!0,iterable:i,iterVarName:a,init:s.clone(T.list,[]),step:g,result:pe})}}}function Ce(n){let e=\`\${n.name}(var, predicate) invalid predicate iteration variable\`,t=\`\${n.name}(var, predicate) predicate must return bool\`;return({args:r,receiver:i,ast:s})=>{let a=r[1].setMeta("label",t),u=n.transform({args:r,ast:s,predicate:a,opts:n});return{callAst:s.clone(T.comprehension,{kind:"quantifier",errorsAreFatal:n.errorsAreFatal||!1,iterable:i,iterVarName:fe(r[0],e),init:u.init,condition:u.condition,step:u.step,result:u.result||pe})}}}function pr(){let n="has() invalid argument";function e(r,i,s){let a=i.macroHasProps,u=a.length,h=r.run(a[--u],s),f;for(;u--;){let g=a[u];if(g.op===".?"&&(f??=!0),h=r.debugType(h).fieldLazy(h,g.args[1],g,r),h===void 0){if(!(!f&&u&&g.op==="."))break;throw w("no_such_key",\`No such key: \${g.args[1]}\`,g)}}return h!==void 0}function t(r,i,s){let a=i.args[0];if(a.op!==".")throw r.createError("invalid_macro_argument",n,a);if(!i.macroHasProps){let u=[];for(;a.op==="."||a.op===".?";)a=u.push(a)&&a.args[0];if(a.op!=="id")throw r.createError("invalid_macro_argument",n,a);r.check(a,s),u.push(a),i.macroHasProps=u}return r.getType("bool")}return function({args:r}){return{args:r,evaluate:e,typeCheck:t,async:!1}}}function wt(n){let e=(h,f)=>n.registerFunctionOverload(h,f);e("has(ast): bool",pr()),e("list.all(ast, ast): bool",Ce({name:"all",transform({ast:h,predicate:f,opts:g}){return{init:h.clone(T.value,!0),condition:pe,step:f.clone(T.ternary,[f,f.clone(T.value,!0),f.clone(T.value,!1)])}}})),e("list.exists(ast, ast): bool",Ce({name:"exists",condition(h){return!h},transform({ast:h,predicate:f,opts:g}){return{init:h.clone(T.value,!1),condition:g.condition,step:f.clone(T.ternary,[f,f.clone(T.value,!0),f.clone(T.value,!1)])}}})),e("list.exists_one(ast, ast): bool",Ce({name:"exists_one",errorsAreFatal:!0,result(h){return h===1},transform({ast:h,predicate:f,opts:g}){let l=h.clone(T.accuValue);return{init:h.clone(T.value,0),step:f.clone(T.ternary,[f,h.clone(T.accuInc),l]),result:g.result}}})),e("list.map(ast, ast): list<dyn>",bt(!1)),e("list.map(ast, ast, ast): list<dyn>",bt(!0)),e("list.filter(ast, ast): list<dyn>",hr());class t{}let r=new t;n.registerType("CelNamespace",t),n.registerConstant("cel","CelNamespace",r);function i(h,f,g){f.bindCtx=g.forkWithVariable(f.var,h.check(f.val,g));let l=h.check(f.exp,f.bindCtx);return f.val.maybeAsync||f.exp.maybeAsync||(f.ast.setMeta("async",!1),f.evaluate=u),l}function s(h,f,g,l,c){let y=h.run(f,l=g.reuse(l).setIterValue(c,h));return y instanceof Promise&&l===g&&(l.async=!0),y}function a(h,{val:f,exp:g,bindCtx:l},c){let y=h.run(f,c);return y instanceof Promise?y.then(b=>s(h,g,l,c,b)):s(h,g,l,c,y)}function u(h,{val:f,exp:g,bindCtx:l},c){return h.run(g,l.reuse(c).setIterValue(h.run(f,c),h))}e("CelNamespace.bind(ast, dyn, ast): dyn",({ast:h,args:f})=>({ast:h,var:fe(f[0],"invalid variable argument"),val:f[1],exp:f[2],bindCtx:void 0,typeCheck:i,evaluate:a}))}function vt(n){let e=(l,c,y,b)=>n.unaryOverload(l,c,y,b,!1),t=(l,c,y,b,o)=>n.binaryOverload(l,c,y,b,o,!1);function r(l,c){if(l<=oe&&l>=ae)return l;throw w("numeric_overflow",\`integer overflow: \${l}\`,c)}function i(l){throw w("division_by_zero","division by zero",l)}function s(l){throw w("modulo_by_zero","modulo by zero",l)}e("!","bool",l=>!l),e("-","int",l=>-l),t("dyn<int>","==","double",(l,c)=>l==c),t("dyn<int>","==","uint",(l,c)=>l==c.valueOf()),t("int","*","int",(l,c,y)=>r(l*c,y)),t("int","+","int",(l,c,y)=>r(l+c,y)),t("int","-","int",(l,c,y)=>r(l-c,y)),t("int","/","int",(l,c,y)=>c===L?i(y):l/c),t("int","%","int",(l,c,y)=>c===L?s(y):l%c),e("-","double",l=>-l),t("double","*","double",(l,c)=>l*c),t("double","+","double",(l,c)=>l+c),t("double","-","double",(l,c)=>l-c),t("double","/","double",(l,c)=>l/c),t("string","+","string",(l,c)=>l+c),t("list<V>","+","list<V>",(l,c)=>[...l,...c]),t("bytes","+","bytes",(l,c)=>{if(!l.length)return c;if(!c.length)return l;let y=new Uint8Array(l.length+c.length);return y.set(l,0),y.set(c,l.length),y});let a="google.protobuf.Duration";t(a,"+",a,(l,c)=>l.addDuration(c)),t(a,"-",a,(l,c)=>l.subtractDuration(c)),t(a,"==",a,(l,c)=>l.seconds===c.seconds&&l.nanos===c.nanos);let u="google.protobuf.Timestamp";t(u,"==",u,(l,c)=>l.getTime()===c.getTime()),t(u,"-",u,(l,c)=>P.fromMilliseconds(l.getTime()-c.getTime()),a),t(u,"-",a,(l,c)=>c.subtractTimestamp(l)),t(u,"+",a,(l,c)=>c.extendTimestamp(l)),t(a,"+",u,(l,c)=>l.extendTimestamp(c));function h(l,c,y,b){if(c instanceof Set&&c.has(l))return!0;for(let o of c)if(te(l,o,y,b))return!0;return!1}function f(l,c){return c instanceof Map?c.get(l)!==void 0:F(c,l)?c[l]!==void 0:!1}function g(l,c,y,b){return h(l,c,y,b)}t("V","in","list<V>",g),t("K","in","map<K, V>",f);for(let l of["type","null","bool","string","int","double"])t(l,"==",l,(c,y)=>c===y);t("bytes","==","bytes",(l,c)=>{if(l===c)return!0;let y=l.length;if(y!==c.length)return!1;for(;y--;)if(l[y]!==c[y])return!1;return!0}),t("list<V>","==","list<V>",(l,c,y,b)=>{if(l===c)return!0;if(R(l)&&R(c)){let m=l.length;if(m!==c.length)return!1;for(let E=0;E<m;E++)if(!te(l[E],c[E],y,b))return!1;return!0}if(l instanceof Set&&c instanceof Set){if(l.size!==c.size)return!1;for(let m of l)if(!c.has(m))return!1;return!0}let o=l instanceof Set?c:l,p=l instanceof Set?l:c;if(!R(o)||o.length!==p?.size)return!1;for(let m=0;m<o.length;m++)if(!p.has(o[m]))return!1;return!0}),t("map<K, V>","==","map<K, V>",(l,c,y,b)=>{if(l===c)return!0;if(l instanceof Map&&c instanceof Map){if(l.size!==c.size)return!1;for(let[m,E]of l)if(!(c.has(m)&&te(E,c.get(m),y,b)))return!1;return!0}if(l instanceof Map||c instanceof Map){let m=l instanceof Map?c:l,E=l instanceof Map?l:c,C=A(m);if(E.size!==C.length)return!1;for(let[S,ie]of E)if(!(S in m&&te(ie,m[S],y,b)))return!1;return!0}let o=A(l),p=A(c);if(o.length!==p.length)return!1;for(let m=0;m<o.length;m++){let E=o[m];if(!(E in c&&te(l[E],c[E],y,b)))return!1}return!0}),t("uint","==","uint",(l,c)=>l.valueOf()===c.valueOf()),t("dyn<uint>","==","double",(l,c)=>l.valueOf()==c),t("uint","+","uint",(l,c)=>new _(l.valueOf()+c.valueOf())),t("uint","-","uint",(l,c)=>new _(l.valueOf()-c.valueOf())),t("uint","*","uint",(l,c)=>new _(l.valueOf()*c.valueOf())),t("uint","/","uint",(l,c,y)=>c.valueOf()===L?i(y):new _(l.valueOf()/c.valueOf())),t("uint","%","uint",(l,c,y)=>c.valueOf()===L?s(y):new _(l.valueOf()%c.valueOf()));for(let[l,c]of[["bool","bool"],["int","int"],["uint","uint"],["double","double"],["string","string"],["google.protobuf.Timestamp","google.protobuf.Timestamp"],["google.protobuf.Duration","google.protobuf.Duration"],["int","uint"],["int","double"],["double","int"],["double","uint"],["uint","int"],["uint","double"]])t(l,"<",c,(y,b)=>y<b),t(l,"<=",c,(y,b)=>y<=b),t(l,">",c,(y,b)=>y>b),t(l,">=",c,(y,b)=>y>=b)}function te(n,e,t,r){if(n===e)return!0;switch(typeof n){case"undefined":case"string":case"boolean":return!1;case"bigint":return typeof e=="number"?n==e:!1;case"number":return typeof e=="bigint"?n==e:!1;case"object":if(typeof e!="object")return!1;let i=r.debugType(n),s=r.debugType(e);if(i!==s)return!1;let a=r.registry.findBinaryOverload("==",i,s);return a?a.handler(n,e,t,r):!1}throw w("invalid_comparison_type",\`Cannot compare values of type \${typeof n}\`,t)}var fr=new Map().set("A","dyn").set("T","dyn").set("K","dyn").set("V","dyn"),re=class extends G{constructor(e,t){super(e),this.createError=t?w:je}check(e,t){try{return e.checkedType??=e.check(this,e,t)}catch(r){throw X(r,e)}}checkAccessOnType(e,t,r,i=!1){if(r===this.dynType)return r;let s=(e.op==="[]"||e.op==="[?]"?this.check(e.args[1],t):this.stringType).type;if(r.kind==="list"){if(s==="int"||s==="dyn")return r.valueType;throw this.createError("invalid_index_type",\`List index must be int, got '\${s}'\`,e)}if(r.kind==="map")return r.valueType;let a=this.objectTypes.get(r.name);if(a){if(!(s==="string"||s==="dyn"))throw this.createError("invalid_index_type",\`Cannot index type '\${r.name}' with type '\${s}'\`,e);if(a.fields){let u;if(e.op==="."||e.op===".?"?u=e.args[1]:e.args[1].op==="value"&&(u=e.args[1].args),typeof u=="string"){let h=a.fields[u];if(h)return h;if(i)return this.dynType;throw this.createError("no_such_key",\`No such key: \${u}\`,e)}}return this.dynType}throw this.createError("cannot_index_type",\`Cannot index type '\${this.formatType(r)}'\`,e)}formatType(e){return e.hasPlaceholderType?e.templated(this.registry,fr).name:e.name}formatTypeList(e){return e.map(t=>this.formatType(t)).join(", ")}};var d={EOF:0,NUMBER:1,STRING:2,BOOLEAN:3,NULL:4,IDENTIFIER:5,PLUS:6,MINUS:7,MULTIPLY:8,DIVIDE:9,MODULO:10,EQ:11,NE:12,LT:13,LE:14,GT:15,GE:16,AND:17,OR:18,NOT:19,IN:20,LPAREN:21,RPAREN:22,LBRACKET:23,RBRACKET:24,LBRACE:25,RBRACE:26,DOT:27,COMMA:28,COLON:29,QUESTION:30,BYTES:31},ye={[d.EQ]:T["=="],[d.PLUS]:T["+"],[d.MINUS]:T["-"],[d.MULTIPLY]:T["*"],[d.DIVIDE]:T["/"],[d.MODULO]:T["%"],[d.LE]:T["<="],[d.LT]:T["<"],[d.GE]:T[">="],[d.GT]:T[">"],[d.NE]:T["!="],[d.IN]:T.in},de={};for(let n in d)de[d[n]]=n;var _t=new Uint8Array(128);for(let n of"0123456789abcdefABCDEF")_t[n.charCodeAt(0)]=1;var yr={bytes_unicode_escape:n=>\`\\\\\${n} not allowed in bytes literals\`,invalid_unicode_escape:n=>\`Invalid Unicode escape: \\\\\${n}\`,invalid_unicode_surrogate:n=>\`Invalid Unicode surrogate: \\\\\${n}\`,invalid_hex_escape:n=>\`Invalid hex escape: \\\\\${n}\`,invalid_octal_escape:()=>"Octal escape must be 3 digits",octal_escape_out_of_range:n=>\`Octal escape out of range: \\\\\${n}\`,invalid_escape_sequence:n=>\`Invalid escape sequence: \\\\\${n}\`},Et={"\\\\":"\\\\","?":"?",'"':'"',"'":"'","\`":"\`",a:"\\x07",b:"\\b",f:"\\f",n:\`
\`,r:"\\r",t:"	",v:"\\v"},De=class n{#e;#t;constructor(e,t,r,i,s,a){this.#e={check:s.check,evaluate:s.evaluate},this.#t=e,this.op=s.name,this.args=a,this.pos=t,this.start=r,this.end=i}clone(e,t){return new n(this.#t,this.pos,this.start,this.end,e,t)}get meta(){return this.#e}get input(){return this.#t}#n(){let e=this.#e.alternate??this;switch(e.op){case"value":case"id":case"accuValue":case"accuInc":return!1;case"accuPush":return e.args.maybeAsync;case"!_":case"-_":return e.candidates?.async!==!1?!0:e.args.maybeAsync;case"!=":case"==":case"in":case"+":case"-":case"*":case"/":case"%":case"<":case"<=":case">":case">=":return e.candidates?.async!==!1?!0:e.args.some(t=>t.maybeAsync);case"call":case"rcall":return e.candidates?.async!==!1?!0:(e.receiverWithArgs||e.args[1]).some(t=>t.maybeAsync);case"comprehension":return e.args.iterable.maybeAsync||e.args.step.maybeAsync;case".":case".?":return e.args[0].maybeAsync;case"?:":case"list":case"[]":case"[?]":return e.args.some(t=>t.maybeAsync);case"||":case"&&":return e.args.some(t=>t.maybeAsync);case"map":return e.args.some(t=>t[0].maybeAsync||t[1].maybeAsync);default:return!0}}get maybeAsync(){return this.#e.async??=this.#n()}check(e,t,r){let i=this.#e;return i.alternate?e.check(i.alternate,r):i.macro?i.macro.typeCheck(e,i.macro,r):i.check(e,t,r)}evaluate(e,t,r){let i=this.#e;return i.alternate?this.evaluate=this.#i:i.macro?this.evaluate=this.#s:this.evaluate=i.evaluate,this.evaluate(e,t,r)}#i(e,t,r){return(t=this.#e.alternate).evaluate(e,t,r)}#s(e,t,r){return(t=this.#e.macro).evaluate(e,t,r)}setMeta(e,t){return this.#e[e]=t,this}get range(){return{start:this.start,end:this.end}}toOldStructure(){let e=Array.isArray(this.args)?this.args:[this.args];return[this.op,...e.map(t=>t instanceof n?t.toOldStructure():t)]}},Be=class{input;pos;length;tokenPos;tokenType;tokenValue;reset(e){return this.pos=0,this.input=e,this.length=e.length,e}token(e,t,r){return this.tokenPos=e,this.tokenType=t,this.tokenValue=r,this}nextToken(){for(;;){let{pos:e,input:t,length:r}=this;if(e>=r)return this.token(e,d.EOF);let i=t[e];switch(i){case" ":case"	":case\`
\`:case"\\r":this.pos++;continue;case"=":if(t[e+1]!=="=")break;return this.token((this.pos+=2)-2,d.EQ);case"&":if(t[e+1]!=="&")break;return this.token((this.pos+=2)-2,d.AND);case"|":if(t[e+1]!=="|")break;return this.token((this.pos+=2)-2,d.OR);case"+":return this.token(this.pos++,d.PLUS);case"-":return this.token(this.pos++,d.MINUS);case"*":return this.token(this.pos++,d.MULTIPLY);case"/":if(t[e+1]==="/"){for(;this.pos<r&&this.input[this.pos]!==\`
\`;)this.pos++;continue}return this.token(this.pos++,d.DIVIDE);case"%":return this.token(this.pos++,d.MODULO);case"<":return t[e+1]==="="?this.token((this.pos+=2)-2,d.LE):this.token(this.pos++,d.LT);case">":return t[e+1]==="="?this.token((this.pos+=2)-2,d.GE):this.token(this.pos++,d.GT);case"!":return t[e+1]==="="?this.token((this.pos+=2)-2,d.NE):this.token(this.pos++,d.NOT);case"(":return this.token(this.pos++,d.LPAREN);case")":return this.token(this.pos++,d.RPAREN);case"[":return this.token(this.pos++,d.LBRACKET);case"]":return this.token(this.pos++,d.RBRACKET);case"{":return this.token(this.pos++,d.LBRACE);case"}":return this.token(this.pos++,d.RBRACE);case".":return this.token(this.pos++,d.DOT);case",":return this.token(this.pos++,d.COMMA);case":":return this.token(this.pos++,d.COLON);case"?":return this.token(this.pos++,d.QUESTION);case'"':case"'":return this.readString(i);case"b":case"B":case"r":case"R":{let s=t[e+1];return s==='"'||s==="'"?++this.pos&&this.readString(s,i):this.readIdentifier()}default:{let s=i.charCodeAt(0);if(s<=57&&s>=48)return this.readNumber();if(this._isIdentifierCharCode(s))return this.readIdentifier()}}throw O("unexpected_character",\`Unexpected character: \${i}\`,{pos:e,start:e,end:e+1,input:t})}}_isIdentifierCharCode(e){return e<48||e>122?!1:e>=97||e>=65&&e<=90||e<=57||e===95}_parseAsDouble(e,t){let r=Number(this.input.substring(e,t));if(Number.isFinite(r))return this.token(e,d.NUMBER,r);throw O("invalid_number",\`Invalid number: \${r}\`,{pos:e,start:e,end:t,input:this.input})}_parseAsBigInt(e,t,r,i){let s=this.input.substring(e,t);if(i==="u"||i==="U"){this.pos++;try{return this.token(e,d.NUMBER,new _(s))}catch{}}else try{return this.token(e,d.NUMBER,BigInt(s))}catch{}throw O(r?"invalid_hex_integer":"invalid_integer",r?\`Invalid hex integer: \${s}\`:\`Invalid integer: \${s}\`,{pos:e,start:e,end:this.pos,input:this.input})}_readDigits(e,t,r,i){for(;r<t&&(i=e.charCodeAt(r))&&!(i>57||i<48);)r++;return r}_readExponent(e,t,r){let i=r<t&&e[r];if(i==="e"||i==="E"){i=++r<t&&e[r],(i==="-"||i==="+")&&r++;let s=r;if(r=this._readDigits(e,t,r),s===r)throw O("invalid_exponent","Invalid exponent",{pos:r,start:r,end:Math.min(r+1,e.length),input:e})}return r}readNumber(){let{input:e,length:t,pos:r}=this,i=r;if(e[i]==="0"&&(e[i+1]==="x"||e[i+1]==="X")){for(i+=2;i<t&&_t[e[i].charCodeAt(0)];)i++;return this._parseAsBigInt(r,this.pos=i,!0,e[i])}if(i=this._readDigits(e,t,i),i+1<t){let s=!1,a=e[i]==="."?this._readDigits(e,t,i+1):i+1;if(a!==i+1&&(s=!0)&&(i=a),a=this._readExponent(e,t,i),a!==i&&(s=!0)&&(i=a),s)return this._parseAsDouble(r,this.pos=i)}return this._parseAsBigInt(r,this.pos=i,!1,e[i])}readString(e,t){let{input:r,pos:i}=this;return r[i+1]===e&&r[i+2]===e?this.readTripleQuotedString(e,t):this.readSingleQuotedString(e,t)}_closeQuotedString(e,t,r,i){switch(r){case"b":case"B":{let s=this.processEscapes(e,t,!0),a=new Uint8Array(s.length);for(let u=0;u<s.length;u++)a[u]=s.charCodeAt(u)&255;return this.token(i-1,d.BYTES,a)}case"r":case"R":return this.token(i-1,d.STRING,t);default:{let s=this.processEscapes(e,t,!1);return this.token(i,d.STRING,s)}}}readSingleQuotedString(e,t){let{input:r,length:i,pos:s}=this,a,u=this.pos+1;for(;u<i&&(a=r[u]);){switch(a){case e:let h=s+1,f=r.slice(h,u);return this.pos=++u,this._closeQuotedString(h,f,t,s);case\`
\`:case"\\r":throw O("newline_in_string","Newlines not allowed in single-quoted strings",{pos:u,start:u,end:u+1,input:r});case"\\\\":u++}u++}throw O("unterminated_string","Unterminated string",{pos:s,start:s,end:r.length,input:r})}readTripleQuotedString(e,t){let{input:r,length:i,pos:s}=this,a,u=this.pos+3;for(;u<i&&(a=r[u]);){switch(a){case e:if(r[u+1]===e&&r[u+2]===e){let h=s+3,f=r.slice(h,u);return this.pos=u+3,this._closeQuotedString(h,f,t,s)}break;case"\\\\":u++}u++}throw O("unterminated_triple_quoted_string","Unterminated triple-quoted string",{pos:s,start:s,end:r.length,input:r})}#e(e,t,r,i,s,a){let u=t+i;return O(e,yr[e](a),{input:this.input,pos:u,start:u,end:Math.min(u+s,t+r)})}processEscapes(e,t,r){if(!t.includes("\\\\"))return t;let i=t.length,s="",a=0;for(;a<i;){if(t[a]!=="\\\\"||a+1>=i){s+=t[a++];continue}let u=t[a+1];if(Et[u])s+=Et[u],a+=2;else if(u==="u"||u==="U"){if(r)throw this.#e("bytes_unicode_escape",e,i,a,2,u);let h=u==="u"?4:8,f=t.substring(a+2,a+2+h),g=Number.parseInt(f,16);if(f.length!==h||!/^[0-9a-fA-F]+$/.test(f)||g>1114111)throw this.#e("invalid_unicode_escape",e,i,a,2+h,u+f);if(g>=55296&&g<=57343)throw this.#e("invalid_unicode_surrogate",e,i,a,2+h,u+f);s+=String.fromCodePoint(g),a+=2+h}else if(u==="x"||u==="X"){let h=t.substring(a+2,a+4);if(!/^[0-9a-fA-F]{2}$/.test(h))throw this.#e("invalid_hex_escape",e,i,a,4,u+h);s+=String.fromCharCode(Number.parseInt(h,16)),a+=4}else if(u>="0"&&u<="7"){let h=t.substring(a+1,a+4);if(!/^[0-7]{3}$/.test(h))throw this.#e("invalid_octal_escape",e,i,a,4);let f=Number.parseInt(h,8);if(f>255)throw this.#e("octal_escape_out_of_range",e,i,a,4,h);s+=String.fromCharCode(f),a+=4}else throw this.#e("invalid_escape_sequence",e,i,a,2,u)}return s}readIdentifier(){let{pos:e,input:t,length:r}=this,i=e;for(;i<r&&this._isIdentifierCharCode(t[i].charCodeAt(0));)i++;let s=t.substring(e,this.pos=i);switch(s){case"true":return this.token(e,d.BOOLEAN,!0);case"false":return this.token(e,d.BOOLEAN,!1);case"null":return this.token(e,d.NULL,null);case"in":return this.token(e,d.IN);default:return this.token(e,d.IDENTIFIER,s)}}},dr=new Be,ge=class{lexer=dr;input=null;maxDepthRemaining=null;astNodesRemaining=null;type=null;pos=null;constructor(e,t){this.limits=e,this.registry=t}#e(e,t=this.pos){throw O("limit_exceeded",\`Exceeded \${e} (\${this.limits[e]})\`,{pos:t,start:t,end:t,input:this.input})}#t(e,t,r,i,s=e){let a=new De(this.input,s,e,t,r,i);return this.astNodesRemaining--||this.#e("maxAstNodes",s),a}#n(e,t,r){return this.#t(t.start,r.end,e,[t,r])}#i(e,t,r){return this.#t(e.start,r.end,T.ternary,[e,t,r])}#s(e,t,r){return this.#t(e,r.end,t,r)}#o(e,t,r,i,s=t.start){return this.#t(t.start,i,e,[t,r],s)}#r(e=this.pos){let t=this.lexer.nextToken();return this.pos=t.tokenPos,this.type=t.tokenType,e}get value(){return this.lexer.tokenValue}consume(e){if(this.type===e)return this.#r();throw O("expected_token",\`Expected \${de[e]}, got \${de[this.type]}\`,{pos:this.pos,start:this.pos,end:this.lexer.pos,input:this.input})}match(e){return this.type===e}parse(e){if(typeof e!="string")throw O("expression_must_be_string","Expression must be a string");this.input=this.lexer.reset(e),this.#r(),this.maxDepthRemaining=this.limits.maxDepth,this.astNodesRemaining=this.limits.maxAstNodes;let t=this.parseExpression();if(this.match(d.EOF))return t;throw O("unexpected_character",\`Unexpected character: '\${this.input[this.lexer.pos-1]}'\`,{pos:this.pos,start:this.pos,end:this.lexer.pos,input:this.input})}#a(e,t,r,i){let s=i[0],a=r===T.rcall?i[1]:null,u=r===T.rcall?i[2]:i[1],h=this.registry.findMacro(s,!!a,u.length),f=this.#t(e,t,r,i);if(!h)return f;let g=h.handler({ast:f,args:u,receiver:a,methodName:s,parser:this});return g.callAst?f.setMeta("alternate",g.callAst):f.setMeta("macro",g).setMeta("async",Z(g.evaluate,g.async))}parseExpression(){this.maxDepthRemaining--||this.#e("maxDepth");let e=this.parseLogicalOr();if(!this.match(d.QUESTION))return++this.maxDepthRemaining&&e;this.#r();let t=this.parseExpression();this.consume(d.COLON);let r=this.parseExpression();return this.maxDepthRemaining++,this.#i(e,t,r)}parseLogicalOr(){let e=this.parseLogicalAnd();for(;this.match(d.OR);)this.#r(),e=this.#n(T["||"],e,this.parseLogicalAnd());return e}parseLogicalAnd(){let e=this.parseEquality();for(;this.match(d.AND);)this.#r(),e=this.#n(T["&&"],e,this.parseEquality());return e}parseEquality(){let e=this.parseRelational();for(;this.match(d.EQ)||this.match(d.NE);){let t=ye[this.type];this.#r(),e=this.#n(t,e,this.parseRelational())}return e}parseRelational(){let e=this.parseAdditive();for(;this.match(d.LT)||this.match(d.LE)||this.match(d.GT)||this.match(d.GE)||this.match(d.IN);){let t=ye[this.type];this.#r(),e=this.#n(t,e,this.parseAdditive())}return e}parseAdditive(){let e=this.parseMultiplicative();for(;this.match(d.PLUS)||this.match(d.MINUS);){let t=ye[this.type];this.#r(),e=this.#n(t,e,this.parseMultiplicative())}return e}parseMultiplicative(){let e=this.parseUnary();for(;this.match(d.MULTIPLY)||this.match(d.DIVIDE)||this.match(d.MODULO);){let t=ye[this.type];this.#r(),e=this.#n(t,e,this.parseUnary())}return e}parseUnary(){return this.type===d.NOT?this.#s(this.#r(),T.unaryNot,this.parseUnary()):this.type===d.MINUS?this.#s(this.#r(),T.unaryMinus,this.parseUnary()):this.parsePostfix()}parsePostfix(){let e=this.parsePrimary(),t=this.maxDepthRemaining;for(;;){if(this.match(d.DOT)){let r=this.#r();this.maxDepthRemaining--||this.#e("maxDepth",r);let i=this.match(d.QUESTION)&&this.registry.enableOptionalTypes&&this.#r()?T.optionalFieldAccess:T.fieldAccess,s=this.value,a=this.pos,u=this.lexer.pos;if(this.consume(d.IDENTIFIER),i===T.fieldAccess&&this.match(d.LPAREN)&&this.#r()){let h=this.parseArgumentList(),f=this.lexer.pos;this.consume(d.RPAREN),e=this.#a(e.start,f,T.rcall,[s,e,h])}else e=this.#o(i,e,s,u,a);continue}if(this.match(d.LBRACKET)){let r=this.#r();this.maxDepthRemaining--||this.#e("maxDepth",r);let i=this.match(d.QUESTION)&&this.registry.enableOptionalTypes&&this.#r()?T.optionalBracketAccess:T.bracketAccess,s=this.parseExpression(),a=this.lexer.pos;this.consume(d.RBRACKET),e=this.#o(i,e,s,a);continue}break}return this.maxDepthRemaining=t,e}parsePrimary(){switch(this.type){case d.NUMBER:case d.STRING:case d.BYTES:case d.BOOLEAN:case d.NULL:return this.#h();case d.IDENTIFIER:return this.#c();case d.LPAREN:return this.#l();case d.LBRACKET:return this.parseList();case d.LBRACE:return this.parseMap()}throw O("unexpected_token",\`Unexpected token: \${de[this.type]}\`,{pos:this.pos,start:this.pos,end:this.lexer.pos,input:this.input})}#h(){return this.#r(this.#t(this.pos,this.lexer.pos,T.value,this.value))}#c(){let e=this.value,t=this.lexer.pos,r=this.consume(d.IDENTIFIER);if(z.has(e))throw O("reserved_identifier",\`Reserved identifier: \${e}\`,{pos:r,start:r,end:t,input:this.input});if(!this.match(d.LPAREN))return this.#t(r,t,T.id,e);this.#r();let i=this.parseArgumentList(),s=this.lexer.pos;return this.consume(d.RPAREN),this.#a(r,s,T.call,[e,i])}#l(){this.consume(d.LPAREN);let e=this.parseExpression();return this.consume(d.RPAREN),e}parseList(){let e=this.consume(d.LBRACKET),t=[],r=this.limits.maxListElements;if(!this.match(d.RBRACKET))for(t.push(this.parseExpression()),r--||this.#e("maxListElements",t.at(-1).pos);this.match(d.COMMA)&&(this.#r(),!this.match(d.RBRACKET));)t.push(this.parseExpression()),r--||this.#e("maxListElements",t.at(-1).pos);let i=this.lexer.pos;return this.consume(d.RBRACKET),this.#t(e,i,T.list,t)}parseMap(){let e=this.consume(d.LBRACE),t=[],r=this.limits.maxMapEntries;if(!this.match(d.RBRACE))for(t.push(this.parseProperty()),r--||this.#e("maxMapEntries",t.at(-1)[0].pos);this.match(d.COMMA)&&(this.#r(),!this.match(d.RBRACE));)t.push(this.parseProperty()),r--||this.#e("maxMapEntries",t.at(-1)[0].pos);let i=this.lexer.pos;return this.consume(d.RBRACE),this.#t(e,i,T.map,t)}parseProperty(){return[this.parseExpression(),(this.consume(d.COLON),this.parseExpression())]}parseArgumentList(){let e=[],t=this.limits.maxCallArguments;if(!this.match(d.RPAREN))for(e.push(this.parseExpression()),t--||this.#e("maxCallArguments",e.at(-1).pos);this.match(d.COMMA)&&(this.#r(),!this.match(d.RPAREN));)e.push(this.parseExpression()),t--||this.#e("maxCallArguments",e.at(-1).pos);return e}};var Pe=x({maxAstNodes:1e5,maxDepth:250,maxListElements:1e3,maxMapEntries:1e3,maxCallArguments:32}),gr=new Set(A(Pe));function mr(n,e=Pe){let t=n?A(n):void 0;if(!t?.length)return e;let r={...e};for(let i of t){if(!gr.has(i))throw new TypeError(\`Unknown limits option: \${i}\`);let s=n[i];typeof s=="number"&&(r[i]=s)}return x(r)}var Tr=x({unlistedVariablesAreDyn:!1,homogeneousAggregateLiterals:!0,enableOptionalTypes:!1,limits:Pe});function Se(n,e,t){let r=n?.[t]??e?.[t];if(typeof r!="boolean")throw new TypeError(\`Invalid option: \${t}\`);return r}function $t(n,e=Tr){return n?x({unlistedVariablesAreDyn:Se(n,e,"unlistedVariablesAreDyn"),homogeneousAggregateLiterals:Se(n,e,"homogeneousAggregateLiterals"),enableOptionalTypes:Se(n,e,"enableOptionalTypes"),limits:mr(n.limits,e.limits)}):e}var me=nt({enableOptionalTypes:!1});Ge(me);vt(me);wt(me);var ne=class n{#e;#t;#n;#i;#s;constructor(e,t){this.opts=$t(e,t?.opts),this.#e=(t instanceof n?t.#e:me).clone(this.opts);let r={registry:this.#e,opts:this.opts};this.#n=new re(r),this.#i=new re(r,!0),this.#t=new Ve(r),this.#s=new ge(this.opts.limits,this.#e),Object.freeze(this)}clone(e){return new n(e,this)}registerFunction(e,t,r){return this.#e.registerFunctionOverload(e,t,r),this}registerOperator(e,t,r){return this.#e.registerOperatorOverload(e,t,r),this}registerType(e,t){return this.#e.registerType(e,t),this}registerVariable(e,t,r){return this.#e.registerVariable(e,t,r),this}registerConstant(e,t,r){return this.#e.registerConstant(e,t,r),this}hasVariable(e){return this.#e.variables.has(e)}getDefinitions(){return this.#e.getDefinitions()}check(e){try{return this.#o(this.#s.parse(e))}catch(t){return{valid:!1,error:t}}}#o(e){try{let t=this.#n.check(e,new q(this.#e));return{valid:!0,type:this.#r(t)}}catch(t){return{valid:!1,error:t}}}#r(e){return e.name==="list<dyn>"?"list":e.name==="map<dyn, dyn>"?"map":e.name}parse(e){let t=this.#s.parse(e),r=this.#a.bind(this,t);return r.check=this.#o.bind(this,t),r.ast=t,r}evaluate(e,t){return this.#a(this.#s.parse(e),t)}#a(e,t){return e.checkedType?e.evaluate(this.#t,e,new q(this.#e,t)):(this.#i.check(e,t=new q(this.#e,t)),e.evaluate(this.#t,e,t))}},Ve=class extends G{constructor(e){super(e),this.createError=w}#e(e){if(e instanceof Map)return e.entries().next().value;for(let t in e)return[t,e[t]]}debugRuntimeType(e,t){return t?.hasDynType===!1?t:this.debugTypeDeep(e)}debugTypeDeep(e){let t=this.debugType(e);switch(t.kind){case"list":{let r=e instanceof Array?e[0]:e.values().next().value;return r===void 0?t:this.registry.getListType(this.debugTypeDeep(r))}case"map":{let r=this.#e(e);return r?this.registry.getMapType(t.keyType.hasDynType?this.debugTypeDeep(r[0]):t.keyType,t.valueType.hasDynType?this.debugTypeDeep(r[1]):t.valueType):t}default:return t}}tryEval(e,t){try{let r=this.run(e,t);return r instanceof Promise?r.catch(i=>i):r}catch(r){return r}}run(e,t){return e.evaluate(this,e,t)}},Re=new ne({unlistedVariablesAreDyn:!0});function Ot(n){return Re.parse(n)}function At(n,e){return Re.evaluate(n,e)}function kt(n){return Re.check(n)}export{ne as Environment,kt as check,At as evaluate,Ot as parse};
`, "@tomlarkworthy/brain-kernel/atcute.js": `
var Es=Object.defineProperty;var As=(e)=>e;function Ss(e,t){this[e]=As.bind(null,t)}var Rs=(e,t)=>{for(var r in t)Es(e,r,{get:t[r],enumerable:!0,configurable:!0,set:Ss.bind(t,r)})};var Dr="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";var Z=(e=21)=>{let t="",r=crypto.getRandomValues(new Uint8Array(e|=0));while(e--)t+=Dr[r[e]&63];return t};var Cr=(e)=>e.toHex();var Ps=new TextEncoder,To=new TextDecoder("utf-8",{fatal:!0,ignoreBOM:!0}),Is=crypto.subtle,et=(e)=>new Uint8Array(e),Mt=et;var Ur=(e,t)=>{let r=0,n=e.length,s;if(t===void 0)for(s=t=0;s<n;s++){let o=e[s];t+=o.length}let i=new Uint8Array(t);for(s=0;s<n;s++){let o=e[s],a=t-r;if(o.length>a){i.set(o.subarray(0,a),r);break}i.set(o,r),r+=o.length}return i},be=(e)=>Ps.encode(e);var Bo=String.fromCharCode;var tt=async(e)=>new Uint8Array(await Is.digest("SHA-256",e));var rt=(e,t,r)=>(n)=>{let s=(1<<t)-1,i="",o=0,a=0;for(let u=0;u<n.length;++u){a=a<<8|n[u],o+=8;while(o>t)o-=t,i+=e[s&a>>o]}if(o!==0)i+=e[s&a<<t-o];if(r)while((i.length*t&7)!==0)i+="=";return i};var jr=(e)=>{if(e.length>=255)throw RangeError("alphabet too long");let t=e.length,r=e.charAt(0),n=Math.log(256)/Math.log(t);return(s)=>{if(s.length===0)return"";let i=0,o=0,a=0,u=s.length;while(a!==u&&s[a]===0)a++,i++;let c=u-a,p=c*n+1>>>0,f=et(p);{let _=c%3,E=u-_;while(a<E){let k=s[a]<<16|s[a+1]<<8|s[a+2],x=0;for(let b=p-1;(k!==0||x<o)&&b!==-1;b--,x++){k=k+16777216*f[b];let pe=k/t|0;f[b]=k-pe*t,k=pe}o=x,a+=3}}while(a!==u){let _=s[a],E=0;for(let k=p-1;(_!==0||E<o)&&k!==-1;k--,E++){_=_+256*f[k];let x=_/t|0;f[k]=_-x*t,_=x}o=E,a++}let v=p-o;while(v!==p&&f[v]===0)v++;let g=r.repeat(i);for(;v<p;++v)g+=e.charAt(f[v]);return g}},Or=(e)=>{if(e.length>=255)throw RangeError("alphabet too long");let t=new Uint8Array(128).fill(255);for(let o=0;o<e.length;o++){let a=e.charCodeAt(o);if(a>=128)throw RangeError("non-ASCII character in alphabet");if(t[a]!==255)throw RangeError(\`\${e[o]} is ambiguous\`);t[a]=o}let r=e.length,n=r*r,s=e.charAt(0),i=Math.log(r)/Math.log(256);return(o)=>{if(o.length===0)return Mt(0);let a=0,u=0,c=0;while(o[a]===s)u++,a++;let p=o.length-a,f=p*i+1>>>0,v=et(f);{let E=p&1,k=o.length-E;while(a<k){let x=o.charCodeAt(a),b=o.charCodeAt(a+1);if((x|b)&-128)throw Error("invalid string");let pe=t[x],Qe=t[b];if(pe===255||Qe===255)throw Error("invalid string");let J=pe*r+Qe,fe=0;for(let X=f-1;(J!==0||fe<c)&&X!==-1;X--,fe++)J+=n*v[X],v[X]=J,J>>>=8;if(J!==0)throw Error("non-zero carry");c=fe,a+=2}}if(a<o.length){let E=o.charCodeAt(a);if(E&-128)throw Error("invalid string");let k=t[E];if(k===255)throw Error("invalid string");let x=0;for(let b=f-1;(k!==0||x<c)&&b!==-1;b--,x++)k+=r*v[b],v[b]=k,k>>>=8;if(k!==0)throw Error("non-zero carry");c=x}let g=f-c;while(g!==f&&v[g]===0)g++;if(g===u)return v;let _=Mt(u+(f-g));return _.fill(0,0,u),_.set(v.subarray(g),u),_}};var Cs="0123456789abcdef";var Mr=rt(Cs,4,!1);var Us="fromHex"in Uint8Array;var Ee=!Us?Mr:Cr;var Tr=(e)=>e.toBase64({alphabet:"base64url",omitPadding:!0});var js="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";var Br=rt(js,6,!1);var Os="fromBase64"in Uint8Array;var N=!Os?Br:Tr;var $r="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",Tt=Or($r),Bt=jr($r);var Ts={ES256:"SHA-256",ES384:"SHA-384",ES512:"SHA-512",PS256:"SHA-256",PS384:"SHA-384",PS512:"SHA-512",RS256:"SHA-256",RS384:"SHA-384",RS512:"SHA-512"},Bs={ES256:"P-256",ES384:"P-384",ES512:"P-521",PS256:null,PS384:null,PS512:null,RS256:null,RS384:null,RS512:null},he=(e)=>Ts[e],Lr=(e)=>Bs[e],Nr=(e)=>{if(e.startsWith("ES"))return{name:"ECDSA",hash:{name:he(e)}};if(e.startsWith("PS"))return{name:"RSA-PSS",hash:{name:he(e)},saltLength:$s(he(e))};return{name:"RSASSA-PKCS1-v1_5"}},Fr=(e,t)=>{if(e.startsWith("ES")){let r=t??Lr(e);if(!r)throw Error(\`unable to determine curve for \${e}\`);return{name:"ECDSA",namedCurve:r}}if(e.startsWith("PS"))return{name:"RSA-PSS",hash:{name:he(e)}};return{name:"RSASSA-PKCS1-v1_5",hash:{name:he(e)}}},nt=(e)=>{let t=Lr(e);if(t)return{name:"ECDSA",namedCurve:t};let r={name:he(e)};return{name:e.startsWith("PS")?"RSA-PSS":"RSASSA-PKCS1-v1_5",hash:r,modulusLength:2048,publicExponent:new Uint8Array([1,0,1])}},$s=(e)=>{switch(e){case"SHA-256":return 32;case"SHA-384":return 48;case"SHA-512":return 64}};var Ls=["ES256","ES384","ES512","PS256","PS384","PS512","RS256","RS384","RS512"];var Kr=(e)=>Ls.includes(e);var ye=(e,t,r)=>{if(e.kty==="EC"){let{crv:n,x:s,y:i}=e;return{kty:"EC",crv:n,x:s,y:i,kid:t,alg:r,use:"sig"}}if(e.kty==="RSA"){let{n,e:s}=e;return{kty:"RSA",n,e:s,kid:t,alg:r,use:"sig"}}throw Error("unsupported key type")},qr=async(e,t)=>{if(!("d"in e)||!e.d)throw Error("expected a private key (missing 'd' parameter)");if(e.kty==="EC"&&!t.startsWith("ES"))throw Error(\`algorithm \${t} does not match ec key\`);if(e.kty==="RSA"&&t.startsWith("ES"))throw Error(\`algorithm \${t} does not match rsa key\`);let r=Fr(t,e.kty==="EC"?e.crv:void 0),n=await crypto.subtle.importKey("jwk",e,r,!0,["sign"]);if(!(n instanceof CryptoKey))throw Error("expected asymmetric key, got symmetric");return n},st=async(e,t,r)=>{let n=await crypto.subtle.exportKey("jwk",e);if(n.alg=t,r)n.kid=r;return n};var $t=new WeakMap,it=async(e)=>{let t=$t.get(e);if(t)return t;let{alg:r}=e,n=await qr(e,r),s=ye(e,e.kid,r),i={cryptoKey:n,publicJwk:s};return $t.set(e,i),i},ot=(e,t)=>{let r=ye(e,e.kid,e.alg);$t.set(e,{cryptoKey:t,publicJwk:r})};var at=async(e)=>{let{header:t,payload:r,key:n,alg:s}=e,i={...t,alg:s},o=zr(i),a=zr(r),u=\`\${o}.\${a}\`,c=await crypto.subtle.sign(Nr(s),n,be(u)),p=N(new Uint8Array(c));return\`\${u}.\${p}\`};var zr=(e)=>N(be(JSON.stringify(e)));var Lt=async(e)=>{let{client_id:t,aud:r,jkt:n,key:s}=e,{kid:i,alg:o}=s,{cryptoKey:a}=await it(s),u=Math.floor(Date.now()/1000),c=n?{jkt:n}:void 0;return at({header:{alg:o,kid:i},payload:{iss:t,sub:t,aud:r,jti:Z(24),iat:u,exp:u+60,cnf:c},key:a,alg:o})};var Nt=async(e,t="ES256")=>{let r=await crypto.subtle.generateKey(nt(t),!0,["sign","verify"]),n=await st(r.privateKey,t,e);return ot(n,r.privateKey),n};var ut=async(e)=>{let t=be(e),r=await tt(t);return N(r)};var Hr=(e)=>{let t=e.alg,r;return async(n,s,i,o)=>{r||=it(e);let{cryptoKey:a,publicJwk:u}=await r,c=Math.floor(Date.now()/1000);return at({header:{typ:"dpop+jwt",jwk:u},payload:{htm:n,htu:s,iat:c,jti:Z(24),nonce:i,ath:o},key:a,alg:t})}};var Ae=(e)=>{let{key:t,nonces:r,supportedAlgs:n,isAuthServer:s,fetch:i=globalThis.fetch}=e;Fs(t,n);let o=Hr(t);return async(a,u)=>{let c=u==null&&a instanceof Request?a:new Request(a,u),p=c.headers.get("Authorization"),f=p?.startsWith("DPoP ")?await ut(p.slice(5)):void 0,{origin:v}=new URL(c.url),g=c.method,_=Ns(c.url),E;try{E=await r.get(v)}catch{}let k=await o(g,_,E,f);c.headers.set("DPoP",k);let x=await i(c),b=x.headers.get("DPoP-Nonce");if(!b||b===E)return x;try{await r.set(v,b)}catch{}if(!await Ks(x,s))return x;if(a===c||u?.body instanceof ReadableStream)return x;await x.body?.cancel();let Qe=await o(g,_,b,f),J=new Request(a,u);J.headers.set("DPoP",Qe);let fe=await i(J),X=fe.headers.get("DPoP-Nonce");if(X&&X!==b)try{await r.set(v,X)}catch{}return fe}},Ns=(e)=>{let t=e.indexOf("#"),r=e.indexOf("?"),n=t===-1?r:r===-1?t:Math.min(t,r);return n===-1?e:e.slice(0,n)},Fs=(e,t)=>{let r=e.alg;if(t?.length){if(t.includes(r))return r;throw Error(\`DPoP key algorithm \${r} not supported by server: \${t.join(", ")}\`)}return r},Ks=async(e,t)=>{if(t===void 0||t===!1){if(e.status===401){let r=e.headers.get("WWW-Authenticate");if(r?.startsWith("DPoP"))return r.includes('error="use_dpop_nonce"')}}if(t===void 0||t===!0){if(e.status===400)try{let r=await e.clone().json();return typeof r==="object"&&r?.error==="use_dpop_nonce"}catch{return!1}}return!1};var Gr=["ES256","ES384","ES512","PS256","PS384","PS512","RS256","RS384","RS512"],qs=(e)=>e.toSorted((t,r)=>{let n=Gr.indexOf(t),s=Gr.indexOf(r);if(n===-1&&s===-1)return 0;if(n===-1)return 1;if(s===-1)return-1;return n-s}),Ft=async(e)=>{let t=e?.filter(Kr)??[];if(e?.length&&t.length===0)throw Error("no supported algorithms provided");let r=t.length?qs(t):["ES256"],n=[];for(let s of r)try{let i=await crypto.subtle.generateKey(nt(s),!0,["sign","verify"]),o=await st(i.privateKey,s);return ot(o,i.privateKey),o}catch(i){n.push(i)}throw AggregateError(n,\`failed to generate DPoP key for any of: \${r.join(", ")}\`)};var ct,zs={lang:void 0,message:void 0,abortEarly:void 0,abortPipeEarly:void 0};function Wr(e){if(!e&&!ct)return zs;return{lang:e?.lang??ct?.lang,message:e?.message,abortEarly:e?.abortEarly??ct?.abortEarly,abortPipeEarly:e?.abortPipeEarly??ct?.abortPipeEarly}}var Hs;function Gs(e){return Hs?.get(e)}var Vs;function Ws(e){return Vs?.get(e)}var Js;function Xs(e,t){return Js?.get(e)?.get(t)}function Kt(e){let t=typeof e;if(t==="string")return\`"\${e}"\`;if(t==="number"||t==="bigint"||t==="boolean")return\`\${e}\`;if(t==="object"||t==="function")return(e&&Object.getPrototypeOf(e)?.constructor?.name)??"null";return t}function P(e,t,r,n,s){let i=s&&"input"in s?s.input:r.value,o=s?.expected??e.expects??null,a=s?.received??Kt(i),u={kind:e.kind,type:e.type,input:i,expected:o,received:a,message:\`Invalid \${t}: \${o?\`Expected \${o} but r\`:"R"}eceived \${a}\`,requirement:e.requirement,path:s?.path,issues:s?.issues,lang:n.lang,abortEarly:n.abortEarly,abortPipeEarly:n.abortPipeEarly},c=e.kind==="schema",p=s?.message??e.message??Xs(e.reference,u.lang)??(c?Ws(u.lang):null)??n.message??Gs(u.lang);if(p!==void 0)u.message=typeof p==="function"?p(u):p;if(c)r.typed=!1;if(r.issues)r.issues.push(u);else r.issues=[u]}function Zs(e,t){return e===t||Number.isNaN(e)&&Number.isNaN(t)}function Jr(e,t){return Object.prototype.hasOwnProperty.call(e,t)&&t!=="__proto__"&&t!=="prototype"&&t!=="constructor"}function Xr(e,t){let r=[...new Set(e)];if(r.length>1)return\`(\${r.join(\` \${t} \`)})\`;return r[0]??"never"}function U(e){return e["~standard"]={version:1,vendor:"valibot",validate:(t)=>e["~run"]({value:t},Wr())},e}var Ys=class extends Error{constructor(e){super(e[0].message);this.name="ValiError",this.issues=e}};function w(e,t){return{kind:"validation",type:"check",reference:w,async:!1,expects:null,requirement:e,message:t,"~run"(r,n){if(r.typed&&!this.requirement(r.value))P(this,"input",r,n);return r}}}function Y(e,t){return{kind:"validation",type:"check_items",reference:Y,async:!1,expects:null,requirement:e,message:t,"~run"(r,n){if(r.typed)for(let s=0;s<r.value.length;s++){let i=r.value[s];if(!this.requirement(i,s,r.value))P(this,"item",r,n,{input:i,path:[{type:"array",origin:"value",input:r.value,key:s,value:i}]})}return r}}}function Se(e,t){return{kind:"validation",type:"min_length",reference:Se,async:!1,expects:\`>=\${e}\`,requirement:e,message:t,"~run"(r,n){if(r.typed&&r.value.length<this.requirement)P(this,"length",r,n,{received:\`\${r.value.length}\`});return r}}}function qt(e){return{kind:"validation",type:"non_empty",reference:qt,async:!1,expects:"!0",message:e,"~run"(t,r){if(t.typed&&t.value.length===0)P(this,"length",t,r,{received:"0"});return t}}}function H(e){return{kind:"validation",type:"raw_check",reference:H,async:!1,expects:null,"~run"(t,r){return e({dataset:t,config:r,addIssue:(n)=>P(this,n?.label??"input",t,r,n)}),t}}}function Re(e,t){return{kind:"validation",type:"regex",reference:Re,async:!1,expects:\`\${e}\`,requirement:e,message:t,"~run"(r,n){if(r.typed&&!this.requirement.test(r.value))P(this,"format",r,n);return r}}}function F(e){return{kind:"transformation",type:"transform",reference:F,async:!1,operation:e,"~run"(t){return t.value=this.operation(t.value),t}}}var Qs={abortEarly:!0};function ei(e,t,r){return typeof e.fallback==="function"?e.fallback(t,r):e.fallback}function I(e,t){return{...e,"~run"(r,n){let s=r.issues&&[...r.issues];if(r=e["~run"](r,n),r.issues){for(let i of r.issues)if(!s?.includes(i)){let o=r.value;for(let a of t){let u=o[a],c={type:"unknown",origin:"value",input:o,key:a,value:u};if(i.path)i.path.push(c);else i.path=[c];if(!u)break;o=u}}}return r}}}function Zr(e,t,r){return typeof e.default==="function"?e.default(t,r):e.default}function Yr(e,t){return!e["~run"]({value:t},Qs).issues}function y(e,t){return U({kind:"schema",type:"array",reference:y,expects:"Array",async:!1,item:e,message:t,"~run"(r,n){let s=r.value;if(Array.isArray(s)){r.typed=!0,r.value=[];for(let i=0;i<s.length;i++){let o=s[i],a=this.item["~run"]({value:o},n);if(a.issues){let u={type:"array",origin:"value",input:s,key:i,value:o};for(let c of a.issues){if(c.path)c.path.unshift(u);else c.path=[u];r.issues?.push(c)}if(!r.issues)r.issues=a.issues;if(n.abortEarly){r.typed=!1;break}}if(!a.typed)r.typed=!1;r.value.push(a.value)}}else P(this,"type",r,n);return r}})}function j(e){return U({kind:"schema",type:"boolean",reference:j,expects:"boolean",async:!1,message:e,"~run"(t,r){if(typeof t.value==="boolean")t.typed=!0;else P(this,"type",t,r);return t}})}function Pe(e,t){return U({kind:"schema",type:"custom",reference:Pe,expects:"unknown",async:!1,check:e,message:t,"~run"(r,n){if(this.check(r.value))r.typed=!0;else P(this,"type",r,n);return r}})}function Ie(e,t){return U({kind:"schema",type:"literal",reference:Ie,expects:Kt(e),async:!1,literal:e,message:t,"~run"(r,n){if(Zs(r.value,this.literal))r.typed=!0;else P(this,"type",r,n);return r}})}function A(e,t){return U({kind:"schema",type:"loose_object",reference:A,expects:"Object",async:!1,entries:e,message:t,"~run"(r,n){let s=r.value;if(s&&typeof s==="object"){r.typed=!0,r.value={};for(let i in this.entries){let o=this.entries[i];if(i in s||(o.type==="exact_optional"||o.type==="optional"||o.type==="nullish")&&o.default!==void 0){let a=i in s?s[i]:Zr(o),u=o["~run"]({value:a},n);if(u.issues){let c={type:"object",origin:"value",input:s,key:i,value:a};for(let p of u.issues){if(p.path)p.path.unshift(c);else p.path=[c];r.issues?.push(p)}if(!r.issues)r.issues=u.issues;if(n.abortEarly){r.typed=!1;break}}if(!u.typed)r.typed=!1;r.value[i]=u.value}else if(o.fallback!==void 0)r.value[i]=ei(o);else if(o.type!=="exact_optional"&&o.type!=="optional"&&o.type!=="nullish"){if(P(this,"key",r,n,{input:void 0,expected:\`"\${i}"\`,path:[{type:"object",origin:"key",input:s,key:i,value:s[i]}]}),n.abortEarly)break}}if(!r.issues||!n.abortEarly){for(let i in s)if(Jr(s,i)&&!Object.prototype.hasOwnProperty.call(this.entries,i))r.value[i]=s[i]}}else P(this,"type",r,n);return r}})}function re(e){return U({kind:"schema",type:"number",reference:re,expects:"number",async:!1,message:e,"~run"(t,r){if(typeof t.value==="number"&&!isNaN(t.value))t.typed=!0;else P(this,"type",t,r);return t}})}function l(e,t){return U({kind:"schema",type:"optional",reference:l,expects:\`(\${e.expects} | undefined)\`,async:!1,wrapped:e,default:t,"~run"(r,n){if(r.value===void 0){if(this.default!==void 0)r.value=Zr(this,r,n);if(r.value===void 0)return r.typed=!0,r}return this.wrapped["~run"](r,n)}})}function G(e,t){return U({kind:"schema",type:"picklist",reference:G,expects:Xr(e.map(Kt),"|"),async:!1,options:e,message:t,"~run"(r,n){if(this.options.includes(r.value))r.typed=!0;else P(this,"type",r,n);return r}})}function De(e,t,r){return U({kind:"schema",type:"record",reference:De,expects:"Object",async:!1,key:e,value:t,message:r,"~run"(n,s){let i=n.value;if(i&&typeof i==="object"){n.typed=!0,n.value={};for(let o in i)if(Jr(i,o)){let a=i[o],u=this.key["~run"]({value:o},s);if(u.issues){let p={type:"object",origin:"key",input:i,key:o,value:a};for(let f of u.issues)f.path=[p],n.issues?.push(f);if(!n.issues)n.issues=u.issues;if(s.abortEarly){n.typed=!1;break}}let c=this.value["~run"]({value:a},s);if(c.issues){let p={type:"object",origin:"value",input:i,key:o,value:a};for(let f of c.issues){if(f.path)f.path.unshift(p);else f.path=[p];n.issues?.push(f)}if(!n.issues)n.issues=c.issues;if(s.abortEarly){n.typed=!1;break}}if(!u.typed||!c.typed)n.typed=!1;if(u.typed)n.value[u.value]=c.value}}else P(this,"type",n,s);return n}})}function h(e){return U({kind:"schema",type:"string",reference:h,expects:"string",async:!1,message:e,"~run"(t,r){if(typeof t.value==="string")t.typed=!0;else P(this,"type",t,r);return t}})}function zt(e,t){return U({kind:"schema",type:"tuple",reference:zt,expects:"Array",async:!1,items:e,message:t,"~run"(r,n){let s=r.value;if(Array.isArray(s)){r.typed=!0,r.value=[];for(let i=0;i<this.items.length;i++){let o=s[i],a=this.items[i]["~run"]({value:o},n);if(a.issues){let u={type:"array",origin:"value",input:s,key:i,value:o};for(let c of a.issues){if(c.path)c.path.unshift(u);else c.path=[u];r.issues?.push(c)}if(!r.issues)r.issues=a.issues;if(n.abortEarly){r.typed=!1;break}}if(!a.typed)r.typed=!1;r.value.push(a.value)}}else P(this,"type",r,n);return r}})}function Ht(e){return U({kind:"schema",type:"undefined",reference:Ht,expects:"undefined",async:!1,message:e,"~run"(t,r){if(t.value===void 0)t.typed=!0;else P(this,"type",t,r);return t}})}function Vr(e){let t;if(e)for(let r of e)if(t)for(let n of r.issues)t.push(n);else t=r.issues;return t}function D(e,t){return U({kind:"schema",type:"union",reference:D,expects:Xr(e.map((r)=>r.expects),"|"),async:!1,options:e,message:t,"~run"(r,n){let s,i,o;for(let a of this.options){let u=a["~run"]({value:r.value},n);if(u.typed)if(u.issues)if(i)i.push(u);else i=[u];else{s=u;break}else if(o)o.push(u);else o=[u]}if(s)return s;if(i){if(i.length===1)return i[0];P(this,"type",r,n,{issues:Vr(i)}),r.typed=!0}else if(o?.length===1)return o[0];else P(this,"type",r,n,{issues:Vr(o)});return r}})}function Gt(){return U({kind:"schema",type:"unknown",reference:Gt,expects:"unknown",async:!1,"~run"(e){return e.typed=!0,e}})}function ne(e,t,r){let n=e["~run"]({value:t},Wr(r));if(n.issues)throw new Ys(n.issues);return n.value}function m(...e){return U({...e[0],pipe:e,"~run"(t,r){for(let n of e)if(n.kind!=="metadata"){if(t.issues&&(n.kind==="schema"||n.kind==="transformation")){t.typed=!1;break}if(!t.issues||!r.abortEarly&&!r.abortPipeEarly)t=n["~run"](t,r)}return t}})}var Vt=async(e=64)=>{let t=Z(e),r=await ut(t);return{verifier:t,challenge:r,method:"S256"}};var lt=["ES256","ES384","ES512","PS256","PS384","PS512","RS256","RS384","RS512"];class pt{keys;_publicJwks;constructor(e){if(e.length===0)throw Error("keyset must contain at least one key");let t=new Set;for(let r of e){if(t.has(r.kid))throw Error(\`duplicate key ID: \${r.kid}\`);t.add(r.kid)}this.keys=Object.freeze([...e])}get size(){return this.keys.length}get publicJwks(){return this._publicJwks||={keys:this.keys.map((e)=>ye(e,e.kid,e.alg))},this._publicJwks}find(e){for(let t of this.list(e))return t;return}get(e){let t=this.find(e);if(!t){let r=e?.kid??e?.alg??"any";throw Error(\`no key found matching: \${r}\`)}return t}*list(e){let{kid:t,alg:r}=e??{},n=r==null?null:new Set(Array.isArray(r)?r:[r]),s=this.keys.toSorted((i,o)=>{let a=lt.indexOf(i.alg),u=lt.indexOf(o.alg),c=a!==-1?a:lt.length,p=u!==-1?u:lt.length;return c-p});for(let i of s){if(t!=null&&i.kid!==t)continue;if(n!=null&&!n.has(i.alg))continue;yield i}}findForSigning(e){let t=e??["ES256"],r=this.find({alg:t});if(!r)throw Error(\`no key found compatible with server algorithms: \${t.join(", ")}\`);return{key:r,alg:r.alg}}[Symbol.iterator](){return this.keys[Symbol.iterator]()}}var K="ES256",Wt="urn:ietf:params:oauth:client-assertion-type:jwt-bearer";var ti=/^[\\x21\\x23-\\x5B\\x5D-\\x7E]+(?: [\\x21\\x23-\\x5B\\x5D-\\x7E]+)*$/,Jt=(e)=>ti.test(e),Ru=m(h(),w(Jt,"invalid OAuth scope"));var Xt=(e)=>e==="localhost"||e==="127.0.0.1"||e==="[::1]",ft=(e)=>{if(/^\\d+\\.\\d+\\.\\d+\\.\\d+$/.test(e))return!0;if(e.startsWith("[")&&e.endsWith("]"))return!0;return!1},se=(e)=>{let t=e.split(".");if(t.length<2)return!0;let r=t.at(-1).toLowerCase();return r==="test"||r==="local"||r==="localhost"||r==="invalid"||r==="example"},Qr=(e)=>{let t=e.startsWith("https://")?8:e.startsWith("http://")?7:-1;if(t===-1)throw TypeError("url must use https: or http: protocol");let r=e.indexOf("#",t),n=e.indexOf("?",t),s=n!==-1&&(r===-1||n<r)?n:-1,i=r===-1?s===-1?e.length:s:s===-1?r:Math.min(r,s),o=e.indexOf("/",t),a=o===-1||o>i?i:o;if(t===a)throw TypeError("url must contain a host");return e.substring(a,i)||"/"},Zt=(e,t,r)=>r.lastIndexOf(e)===t,en=(e,t)=>{let r=t.length,n=e.length;if(r<n)return!1;let s=t.indexOf(e),i;while(s!==-1){if(i=s+n,(s===0||t.charCodeAt(s-1)===32)&&(i===r||t.charCodeAt(i)===32))return!0;s=t.indexOf(e,i+1)}return!1};var tn="atproto",ri=(e)=>Jt(e)&&en(tn,e),ht=m(h(),w(ri,"invalid atproto OAuth scope")),rn=tn;var ni=/^[\\x21\\x23-\\x5B\\x5D-\\x7E]+$/,si=m(h(),Re(ni,"invalid OAuth scope")),Ce=D([m(ht,w((e)=>e.split(/\\s+/).every(Zt),"duplicate scope")),m(y(si),F((e)=>e.includes("atproto")?e:["atproto",...e]),Y(Zt,"duplicate scope"))]);var nn=m(h(),qt("must not be empty"));var Ue=m(h(),w((e)=>e.includes(":")&&URL.canParse(e),"must be a valid url")),Yt=m(Ue,H(({dataset:e,addIssue:t})=>{if(!e.typed)return;let r=e.value;if(!r.startsWith("http://")){t({message:"loopback url must use http: protocol"});return}if(!Xt(new URL(r).hostname))t({message:"loopback url must use localhost, 127.0.0.1, or [::1] as hostname"})})),Q=m(Ue,H(({dataset:e,addIssue:t})=>{if(!e.typed)return;let r=e.value;if(!r.startsWith("https://")){t({message:"url must use https: protocol"});return}let n=new URL(r);if(Xt(n.hostname)){t({message:"https url must not use a loopback host"});return}if(!ft(n.hostname)){if(!n.hostname.includes(".")){t({message:"domain name must contain at least two segments"});return}if(n.hostname.endsWith(".local"))t({message:"domain name must not end with .local"})}})),R=D([Yt,Q],"url must use http: or https: protocol"),ee=m(R,w((e)=>!se(new URL(e).hostname),"hostname is invalid")),sn=m(Ue,H(({dataset:e,addIssue:t})=>{if(!e.typed)return;let r=e.value,n=r.indexOf("."),s=r.indexOf(":");if(n===-1||s===-1||n>s){t({message:"private-use uri scheme must contain a dot in the protocol"});return}let i=new URL(r),a=i.protocol.slice(0,-1).split(".").reverse().join(".");if(se(a)){t({message:"private-use uri scheme must not be a local hostname"});return}if(i.href.startsWith(\`\${i.protocol}//\`)||i.username||i.password||i.hostname||i.port)t({message:"private-use uri must be in the form scheme:/<path>"})}));var yt=m(nn,Q,H(({dataset:e,addIssue:t})=>{if(!e.typed)return;let r=e.value,n=new URL(r);if(n.username||n.password){t({message:"client ID must not contain credentials"});return}if(n.hash){t({message:"client ID must not contain a fragment"});return}if(n.pathname==="/"){t({message:'client ID must contain a path component (e.g. "/client-metadata.json")'});return}if(n.pathname.endsWith("/")){t({message:"client ID path must not end with a trailing slash"});return}if(ft(n.hostname)){t({message:"client ID hostname must not be an IP address"});return}if(Qr(r)!==n.pathname)t({message:\`client ID must be in canonical form ("\${n.href}", got "\${r}")\`})}));var on=m(A({client_id:yt,redirect_uris:m(y(Q),Se(1,"must have at least one redirect URI"),Y((e)=>{let t=new URL(e);return!t.username&&!t.password},"redirect URI must not contain credentials")),scope:Ce,client_uri:l(R),client_name:l(h()),policy_uri:l(ee),tos_uri:l(ee),logo_uri:l(ee),jwks_uri:l(Q)}),I(w((e)=>!se(new URL(e.client_id).hostname),"client_id hostname is invalid"),["client_id"]),I(w((e)=>{if(!e.jwks_uri)return!0;let t=new URL(e.jwks_uri);return!(t.username||t.password)},"jwks_uri must not contain credentials"),["jwks_uri"]),I(w((e)=>{if(!e.jwks_uri)return!0;return!se(new URL(e.jwks_uri).hostname)},"jwks_uri hostname is invalid"),["jwks_uri"]),I(w((e)=>{if(!e.client_uri)return!0;return!se(new URL(e.client_uri).hostname)},"client_uri hostname is invalid"),["client_uri"]),I(w((e)=>{if(!e.client_uri)return!0;let t=new URL(e.client_uri),r=new URL(e.client_id);return t.origin===r.origin},"client_uri must have the same origin as the client_id"),["client_uri"]),I(w((e)=>{if(!e.client_uri)return!0;let t=new URL(e.client_uri),r=new URL(e.client_id);if(r.pathname===t.pathname)return!0;let n=t.pathname.endsWith("/")?t.pathname:\`\${t.pathname}/\`;return r.pathname.startsWith(n)},"client_uri must be a parent URL of the client_id"),["client_uri"]));var Qt=m(Yt,w((e)=>!e.startsWith("http://localhost"),'use of "localhost" hostname is not allowed (RFC 8252), use a loopback IP such as "127.0.0.1" instead')),an=D([Qt,Q,sn],"url must use http: loopback, https:, or a private-use scheme");var un=m(y(an),Se(1,"must have at least one redirect URI"),Y((e)=>{if(!e.includes("://"))return!0;let t=new URL(e);return!t.username&&!t.password},"redirect URI must not contain credentials")),ii=m(un,Y((e)=>Yr(Qt,e),"loopback clients require loopback redirect URIs (127.0.0.1 or [::1])")),oi=A({client_id:l(Ht()),redirect_uris:ii,scope:Ce}),ai=A({client_id:yt,redirect_uris:un,scope:Ce,application_type:l(G(["web","native"])),client_uri:l(R),client_name:l(h()),policy_uri:l(ee),tos_uri:l(ee),logo_uri:l(ee)}),cn=D([oi,ai]);var er=(e,t)=>{let r=ne(on,e),n={client_id:r.client_id,client_name:r.client_name,client_uri:r.client_uri,policy_uri:r.policy_uri,tos_uri:r.tos_uri,logo_uri:r.logo_uri,redirect_uris:r.redirect_uris,scope:Array.isArray(r.scope)?r.scope.join(" "):r.scope,application_type:"web",subject_type:"public",response_types:["code"],grant_types:["authorization_code","refresh_token"],token_endpoint_auth_method:"private_key_jwt",token_endpoint_auth_signing_alg:K,dpop_bound_access_tokens:!0,jwks_uri:r.jwks_uri,jwks:r.jwks_uri?void 0:t.publicJwks},s=Array.from(t);if(!s.some((i)=>i.alg===K))throw TypeError(\`"private_key_jwt" requires at least one "\${K}" signing key\`);if(n.jwks){let i=new Set(n.jwks.keys.filter((o)=>!o.revoked).map((o)=>o.kid).filter(Boolean));for(let o of s)if(!i.has(o.kid))throw TypeError(\`signing key "\${o.kid}" not found in jwks\`)}return n},ui=(e,t)=>{let r=new URLSearchParams;if(t!==rn)r.set("scope",t);for(let n of e)r.append("redirect_uri",n);if(r.size>0)return\`http://localhost?\${r.toString()}\`;return"http://localhost"},tr=(e)=>{let t=ne(cn,e),r=Array.isArray(t.scope)?t.scope.join(" "):t.scope;if(t.client_id===void 0)return{client_id:ui(t.redirect_uris,r),redirect_uris:t.redirect_uris,scope:r,application_type:"native",response_types:["code"],grant_types:["authorization_code","refresh_token"],token_endpoint_auth_method:"none",dpop_bound_access_tokens:!0};return{client_id:t.client_id,client_name:t.client_name,client_uri:t.client_uri,policy_uri:t.policy_uri,tos_uri:t.tos_uri,logo_uri:t.logo_uri,redirect_uris:t.redirect_uris,scope:r,application_type:t.application_type??"web",subject_type:"public",response_types:["code"],grant_types:["authorization_code","refresh_token"],token_endpoint_auth_method:"none",dpop_bound_access_tokens:!0}};var gt={};Rs(gt,{didDocument:()=>hi,didRelativeUri:()=>vt,didString:()=>je,multibaseString:()=>pn,rfc3968UriSchema:()=>ie,service:()=>fn,verificationMethod:()=>sr});var ci=/^did:([a-z]+):([a-zA-Z0-9._:%-]*[a-zA-Z0-9._-])$/,dt=(e)=>typeof e==="string"&&e.length>=7&&e.length<=2048&&ci.test(e);var rr=(e)=>e>=65&&e<=90||e>=97&&e<=122,mt=(e)=>rr(e)||e>=48&&e<=57;var li=(e,t,r)=>{let n=r-t;if(n===0||n>63)return!1;let s=e.charCodeAt(t);if(!mt(s))return!1;if(n>1){if(!mt(e.charCodeAt(r-1)))return!1;for(let i=t+1;i<r-1;i++){let o=e.charCodeAt(i);if(!mt(o)&&o!==45)return!1}}return!0},ln=(e)=>{if(typeof e!=="string")return!1;let t=e.length;if(t<3||t>253)return!1;let r=0,n=0,s=0;for(let i=0;i<=t;i++)if(i===t||e.charCodeAt(i)===46){if(!li(e,r,i))return!1;s=r,r=i+1,n++}if(n<2)return!1;return rr(e.charCodeAt(s))};var pi=/^#[^#]+$/,fi=/^z[a-km-zA-HJ-NP-Z1-9]+$/,ie=m(h(),w((e)=>URL.canParse(e),"must be a url")),vt=m(h(),w((e)=>pi.test(e)||URL.canParse(e),"must be a did relative uri")),pn=m(h(),Re(fi,"must be a base58 multibase")),je=Pe(dt,"must be a did"),sr=m(A({id:vt,type:h(),controller:je,publicKeyMultibase:l(pn),publicKeyJwk:l(De(h(),Gt()))}),I(w((e)=>{switch(e.type){case"Multikey":case"EcdsaSecp256k1VerificationKey2019":case"EcdsaSecp256r1VerificationKey2019":return e.publicKeyMultibase!==void 0}return!0},"missing public key multibase"),["publicKeyMultibase"])),fn=A({id:vt,type:D([h(),y(h())]),serviceEndpoint:D([ie,De(h(),ie),y(D([ie,De(h(),ie)]))])}),nr=(e,t=(r)=>r)=>{let r=new Set;for(let n of e){let s=t(n);if(r.has(s))return!0;r.add(s)}return!1},hi=m(A({"@context":l(y(ie)),id:je,alsoKnownAs:l(m(y(ie),w((e)=>!nr(e),"duplicate aka entries"))),verificationMethod:l(m(y(sr),w((e)=>!nr(e,(t)=>t.id),"duplicate verification method ids"))),service:l(y(fn)),controller:l(D([je,y(je)])),authentication:l(y(D([vt,sr])))}),w((e)=>{let t=e.service;if(!t?.length)return!0;let r=e.id,n=t.map((s)=>s.id[0]==="#"?r+s.id:s.id);return!nr(n)},"duplicate service ids"));var yi="parse"in URL,di=(e)=>{let t=null;if(yi)t=URL.parse(e);else try{t=new URL(e)}catch{}return t!==null&&(t.protocol==="https:"||t.protocol==="http:")&&t.pathname==="/"&&t.search===""&&t.hash===""};var ir=(e)=>{let t=e.alsoKnownAs;if(!t)return null;let r="at://";for(let n=0,s=t.length;n<s;n++){let i=t[n];if(!i.startsWith(r))continue;let o=i.slice(r.length);if(!ln(o))return;return o}return null},mi=(e,t)=>{let r=e.service;if(!r)return;for(let n=0,s=r.length;n<s;n++){let{id:i,type:o,serviceEndpoint:a}=r[n];if(i!==t.id&&i!==e.id+t.id)continue;if(t.type!==void 0){if(Array.isArray(o)){if(!o.includes(t.type))continue}else if(o!==t.type)continue}if(typeof a!=="string"||!di(a))continue;return a}},hn=(e)=>mi(e,{id:"#atproto_pds",type:"AtprotoPersonalDataServer"});var vi=/^did:plc:([a-z2-7]{24})$/,yn=(e)=>typeof e==="string"&&e.length===32&&vi.test(e);var gi=/^did:web:([a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*(?:\\.[a-zA-Z]{2,})|localhost(?:%3[aA]\\d+)?)$/;var dn=(e)=>typeof e==="string"&&e.length>=12&&gi.test(e);var mn=(e)=>{let[t,...r]=e.slice(8).split(":").map(decodeURIComponent),n="/"+r.join("/");if(n==="/")n="/.well-known/did.json";else n+="/did.json";let s=new URL(\`https://\${t}\${n}\`);if(s.hostname==="localhost")s.protocol="http:";return s};var de=(e)=>yn(e)||dn(e);var vn=(e)=>{let t=e.indexOf(":",4);return e.slice(4,t)};var wi=A({type:h(),locations:l(y(Ue)),actions:l(y(h())),datatypes:l(y(h())),identifier:l(h()),privileges:l(y(h()))}),gn=y(wi);var or=A({access_token:h(),token_type:Ie("DPoP"),sub:Pe(de,"must be a did:plc or did:web"),scope:ht,refresh_token:l(h()),expires_in:l(re()),authorization_details:l(gn)});var xi=(e)=>Number.isInteger(e)&&e>0,ar=A({request_uri:h(),expires_in:m(re(),w(xi,"must be a positive integer"))});var oe=m(R,H(({dataset:e,addIssue:t})=>{if(!e.typed)return;let r=e.value;if(r.endsWith("/")){t({message:"issuer URL must not end with a slash"});return}let n=new URL(r);if(n.username||n.password){t({message:"issuer URL must not contain a username or password"});return}if(n.hash||n.search){t({message:"issuer URL must not contain a query or fragment"});return}let s=n.pathname==="/"?n.origin:n.href;if(r!==s)t({message:"issuer URL must be in the canonical form"})}));var wn=G(["S256","plain"]);var xn=G(["none","login","consent","select_account","create"]);var _i=A({issuer:oe,claims_supported:l(y(h())),claims_locales_supported:l(y(h())),claims_parameter_supported:l(j()),request_parameter_supported:l(j()),request_uri_parameter_supported:l(j()),require_request_uri_registration:l(j()),scopes_supported:l(y(h())),subject_types_supported:l(y(h())),response_types_supported:l(y(h())),response_modes_supported:l(y(h())),grant_types_supported:l(y(h())),code_challenge_methods_supported:l(y(wn)),ui_locales_supported:l(y(h())),id_token_signing_alg_values_supported:l(y(h())),display_values_supported:l(y(h())),prompt_values_supported:l(y(xn)),request_object_signing_alg_values_supported:l(y(h())),authorization_response_iss_parameter_supported:l(j()),authorization_details_types_supported:l(y(h())),request_object_encryption_alg_values_supported:l(y(h())),request_object_encryption_enc_values_supported:l(y(h())),jwks_uri:l(R),authorization_endpoint:R,token_endpoint:R,token_endpoint_auth_methods_supported:l(y(h())),token_endpoint_auth_signing_alg_values_supported:l(y(h())),revocation_endpoint:l(R),revocation_endpoint_auth_methods_supported:l(y(h())),revocation_endpoint_auth_signing_alg_values_supported:l(y(h())),introspection_endpoint:l(R),introspection_endpoint_auth_methods_supported:l(y(h())),introspection_endpoint_auth_signing_alg_values_supported:l(y(h())),pushed_authorization_request_endpoint:l(R),pushed_authorization_request_endpoint_auth_methods_supported:l(y(h())),pushed_authorization_request_endpoint_auth_signing_alg_values_supported:l(y(h())),require_pushed_authorization_requests:l(j()),userinfo_endpoint:l(R),end_session_endpoint:l(R),registration_endpoint:l(R),dpop_signing_alg_values_supported:l(y(h())),protected_resources:l(y(R)),client_id_metadata_document_supported:l(j())}),_n=m(_i,I(w((e)=>!e.require_pushed_authorization_requests||!!e.pushed_authorization_request_endpoint,'"pushed_authorization_request_endpoint" required when "require_pushed_authorization_requests" is true'),["pushed_authorization_request_endpoint"]),I(w((e)=>!e.response_types_supported||e.response_types_supported.includes("code"),'response type "code" is required'),["response_types_supported"]),I(w((e)=>!e.token_endpoint_auth_signing_alg_values_supported?.includes("none"),'client authentication method "none" is not allowed'),["token_endpoint_auth_signing_alg_values_supported"]));var ur=m(_n,I(w((e)=>e.client_id_metadata_document_supported===!0,"atproto requires client_id_metadata_document_supported to be true"),["client_id_metadata_document_supported"]),I(w((e)=>!!e.pushed_authorization_request_endpoint,"atproto requires pushed_authorization_request_endpoint to be true"),["pushed_authorization_request_endpoint"]),F((e)=>e));var ki=G(["header","body","query"]),bi=A({resource:R,authorization_servers:l(y(oe)),jwks_uri:l(R),scopes_supported:l(y(h())),bearer_methods_supported:l(y(ki)),resource_signing_alg_values_supported:l(y(h())),resource_documentation:l(R),resource_policy_uri:l(R),resource_tos_uri:l(R)}),kn=m(bi,I(w((e)=>{let t=new URL(e.resource);return!t.search&&!t.hash},"resource URL must not contain query parameters or a fragment"),["resource"]));var cr=m(kn,I(w((e)=>e.authorization_servers?.length===1,"atproto requires exactly one authorization server"),["authorization_servers"]),F((e)=>e));class wt extends Error{name="AuthMethodUnsatisfiableError"}class Oe extends Error{name="TokenInvalidError";sub;constructor(e,t=\`session for "\${e}" is invalid\`,r){super(t,r);this.sub=e}}class q extends Error{name="TokenRefreshError";sub;constructor(e,t,r){super(t,r);this.sub=e}}class ae extends Error{name="TokenRevokedError";sub;constructor(e,t=\`session for "\${e}" was revoked\`,r){super(t,r);this.sub=e}}class Me extends Error{name="OAuthResponseError";response;error;errorDescription;constructor(e,t,r){super(r??t);this.response=e,this.error=t,this.errorDescription=r}get status(){return this.response.status}}class V extends Error{name="OAuthCallbackError";error;errorDescription;state;constructor(e,t,r){super(t??e);this.error=e,this.errorDescription=t,this.state=r}}class C extends Error{name="OAuthResolverError"}function M(...e){return e.reduce(Ei)}var Ei=(e,t)=>(r)=>e(r).then(t);class Te extends Error{name="FetchResponseError"}class W extends Te{name="FailedResponseError";response;constructor(e){super(\`got http \${e.status}\`);this.response=e}get status(){return this.response.status}}class xt extends Te{name="ImproperContentTypeError";contentType;constructor(e,t){super(t);this.contentType=e}}class me extends Te{name="ImproperContentLengthError";expectedSize;actualSize;constructor(e,t,r){super(r);this.expectedSize=e,this.actualSize=t}}class lr extends Te{name="ImproperResponseError"}class pr extends TransformStream{constructor(e){let t=0;super({transform(r,n){if(t+=r.length,t>e){n.error(new me(e,t,"response content-length too large"));return}n.enqueue(r)}})}}var ve=async(e)=>{if(e.ok)return e;throw new W(e)},En=(e)=>async(t)=>{let r=await An(t,e);return{response:t,text:r}},T=(e,t)=>async(r)=>{await Ai(r,e);let n=await An(r,t);try{let s=JSON.parse(n);return{response:r,json:s}}catch(s){throw new lr("unexpected json data",{cause:s})}},B=(e)=>async(t)=>{let r=ne(e,t.json);return{response:t.response,json:r}},Ai=async(e,t)=>{let r=e.headers.get("content-type")?.split(";",1)[0].trim().toLowerCase();if(r===void 0){if(e.body)await e.body.cancel();throw new xt(null,"missing response content-type")}if(!t.test(r)){if(e.body)await e.body.cancel();throw new xt(r,"unexpected response content-type")}},An=async(e,t)=>{let r=e.headers.get("content-length");if(r!==null){let i=Number(r);if(!/^\\d+$/.test(r)||!Number.isSafeInteger(i))throw e.body?.cancel(),new me(t,null,"invalid response content-length");if(i>t)throw e.body?.cancel(),new me(t,i,"response content-length too large")}if(e.body===null)return"";let n=e.body.pipeThrough(new pr(t)).pipeThrough(new TextDecoderStream),s="";for await(let i of Si(n))s+=i;return s},Si=Symbol.asyncIterator in ReadableStream.prototype?(e)=>e[Symbol.asyncIterator]():(e)=>{let t=e.getReader();return{[Symbol.asyncIterator](){return this},next(){return t.read()},async return(){return await t.cancel(),{done:!0,value:void 0}},async throw(r){return await t.cancel(r),{done:!0,value:void 0}}}};var Be=m(re(),w((e)=>Number.isInteger(e)&&e>=0&&e<=4294967295)),Ri=A({name:h(),type:Ie(16)}),Pi=A({name:h(),type:Be,TTL:Be,data:m(h(),F((e)=>e.replace(/^"|"$/g,"").replace(/\\\\"/g,'"')))}),Ii=A({name:h(),type:Be,TTL:Be,data:h()}),Di=A({Status:Be,TC:j(),RD:j(),RA:j(),AD:j(),CD:j(),Question:zt([Ri]),Answer:l(m(y(Pi),F((e)=>e.filter((t)=>t.type===16))),()=>[]),Authority:l(y(Ii)),Comment:l(D([h(),y(h())]))}),Sn=M(ve,T(/^application\\/(dns-)?json$/,16384),B(Di));var ue=/^application\\/json(;|$)/,Rn=8192,Pn=1024,In=8192,Dn=1024;var Cn=(e,t)=>{let r=e.token_endpoint_auth_methods_supported;if(t===void 0){if(r&&!r.includes("none"))throw Error(\`server does not support "none" authentication for public clients. supported methods: \${r.join(", ")}\`);return{method:"none"}}if(r&&!r.includes("private_key_jwt"))throw Error(\`server does not support "private_key_jwt" authentication. supported methods: \${r.join(", ")}\`);let n=e.token_endpoint_auth_signing_alg_values_supported??[K],s=t.find({alg:n});if(!s)throw Error(\`no key found compatible with server's signing algorithms: \${n.join(", ")}\`);return{method:"private_key_jwt",kid:s.kid}},Un=(e)=>{let{authMethod:t,serverMetadata:r,clientId:n,keyset:s}=e;if(t.method==="none")return async()=>{return};if(s===void 0)throw Error("keyset is required for confidential clients");let i=r.token_endpoint_auth_signing_alg_values_supported??[K],o=s.find({kid:t.kid,alg:i});if(!o)throw Error(\`key "\${t.kid}" no longer available or compatible\`);return()=>Ci(o,n,r.issuer)},Ci=async(e,t,r)=>{let n=await Lt({client_id:t,aud:r,key:e});return{client_id:t,client_assertion_type:Wt,client_assertion:n}};var Ui=()=>!0,ji=()=>!1;class ce{#e=new Map;getter;store;options;constructor(e,t,r={}){this.getter=e,this.store=t,this.options=r}async get(e,t={}){let{signal:r,allowStale:n=!1,noCache:s=!1}=t,{isStale:i,deleteOnError:o}=this.options;r?.throwIfAborted();let a=s?ji:n||i==null?Ui:async(p)=>!await i(e,p),u;while((u=this.#e.get(e))!==void 0){try{let{value:p,fresh:f}=await u;if(f)return p;if(await a(p))return p}catch{}r?.throwIfAborted()}u=(async()=>{try{let p=await this.getStored(e,{signal:r});if(p!==void 0&&await a(p))return{fresh:!1,value:p};let f;try{let v={signal:r,noCache:s};f=await(0,this.getter)(e,v,p)}catch(v){if(p!==void 0&&o!==void 0)try{if(await o(v,e,p))await this.deleteStored(e,v)}catch(g){throw AggregateError([v,g],"error while deleting stored value")}throw v}return await this.setStored(e,f),{fresh:!0,value:f}}finally{this.#e.delete(e)}})(),this.#e.set(e,u);let{value:c}=await u;return c}async getStored(e,t){try{return await this.store.get(e,t)}catch{return}}async setStored(e,t){try{await this.store.set(e,t)}catch(r){let n=this.options?.onStoreError;await n?.(r,e,t)}}async deleteStored(e,t){await this.store.delete(e)}}var Oi=M(T(ue,Rn),B(ur));class fr extends ce{allowHttp;fetch;constructor(e){super((t,r)=>this.fetchMetadata(t,r),e.cache);this.allowHttp=e.allowHttp??!1,this.fetch=e.fetch??globalThis.fetch}async resolve(e,t){let r=ne(oe,e);if(r.startsWith("http:")&&!this.allowHttp)throw new C("http issuer not allowed (set allowHttp for development)");return this.get(r,t)}async fetchMetadata(e,t){let r=new URL("/.well-known/oauth-authorization-server",e),n=await(0,this.fetch)(r,{headers:{accept:"application/json"},signal:t.signal,redirect:"manual"});if(n.status!==200)throw new C(\`unexpected status \${n.status} from \${r}\`);let{json:s}=await Oi(n);if(s.issuer!==e)throw new C(\`issuer mismatch: expected \${e}, got \${s.issuer}\`);return s}}var Mi=M(T(ue,Pn),B(cr));class hr extends ce{allowHttp;fetch;constructor(e){super((t,r)=>this.fetchMetadata(t,r),e.cache);this.allowHttp=e.allowHttp??!1,this.fetch=e.fetch??globalThis.fetch}async resolve(e,t){let r=new URL(e);if(r.protocol!=="https:"&&r.protocol!=="http:")throw new C(\`invalid resource protocol: \${r.protocol}\`);if(r.protocol==="http:"&&!this.allowHttp)throw new C("http resource not allowed (set allowHttp for development)");return this.get(r.origin,t)}async fetchMetadata(e,t){let r=new URL("/.well-known/oauth-protected-resource",e),n=await(0,this.fetch)(r,{headers:{accept:"application/json"},signal:t.signal,redirect:"manual"});if(n.status!==200)throw new C(\`unexpected status \${n.status} from \${r}\`);let{json:s}=await Mi(n);if(s.resource!==e)throw new C(\`resource mismatch: expected \${e}, got \${s.resource}\`);return s}}class yr{actorResolver;protectedResourceResolver;authorizationServerResolver;constructor(e,t,r){this.actorResolver=e,this.protectedResourceResolver=t,this.authorizationServerResolver=r}async resolveFromService(e,t){try{return{metadata:await this.getResourceServerMetadata(e,t)}}catch(r){if(t?.signal?.aborted)throw r;if(r instanceof C)try{return{metadata:await this.authorizationServerResolver.resolve(e,t)}}catch{}throw r}}async resolveFromIdentity(e,t){let r;try{r=await this.actorResolver.resolve(e,t)}catch(s){throw new C(\`failed to resolve identity: \${e}\`,{cause:s})}t?.signal?.throwIfAborted();let n=await this.getResourceServerMetadata(r.pds,t);return{identity:r,metadata:n}}async getResourceServerMetadata(e,t){let r;try{r=await this.protectedResourceResolver.resolve(e,t)}catch(i){throw new C(\`failed to resolve protected resource metadata: \${e}\`,{cause:i})}let n=r.authorization_servers[0];t?.signal?.throwIfAborted();let s;try{s=await this.authorizationServerResolver.resolve(n,t)}catch(i){throw new C(\`failed to resolve AS metadata for issuer: \${n}\`,{cause:i})}if(s.protected_resources){if(!s.protected_resources.includes(r.resource))throw new C(\`PDS "\${e}" not listed in AS "\${n}" protected_resources\`)}return s}}var Ti=M(T(ue,In),B(or)),Bi=M(T(ue,Dn),B(ar));class dr{authMethod;dpopKey;serverMetadata;clientMetadata;oauthResolver;keyset;dpopNonces;dpopFetch;clientCredentialsFactory;constructor(e){this.authMethod=e.authMethod,this.dpopKey=e.dpopKey,this.serverMetadata=e.serverMetadata,this.clientMetadata=e.clientMetadata,this.oauthResolver=e.oauthResolver,this.keyset=e.keyset,this.dpopNonces=e.dpopNonces,this.clientCredentialsFactory=Un({authMethod:e.authMethod,serverMetadata:e.serverMetadata,clientId:e.clientMetadata.client_id,keyset:e.keyset}),this.dpopFetch=Ae({key:e.dpopKey,nonces:e.dpopNonces,supportedAlgs:e.serverMetadata.dpop_signing_alg_values_supported,isAuthServer:!0,fetch:e.fetch})}get issuer(){return this.serverMetadata.issuer}async revoke(e){let t=this.serverMetadata.revocation_endpoint;if(!t)return;try{await this.request(t,{token:e})}catch{}}async exchangeCode(e,t,r){let n=Date.now(),s=await this.requestToken({grant_type:"authorization_code",redirect_uri:r,code:e,code_verifier:t});try{let i=await this.verifyIssuer(s.sub);return{iss:this.issuer,sub:s.sub,aud:i,scope:s.scope,access_token:s.access_token,refresh_token:s.refresh_token,token_type:s.token_type,expires_at:typeof s.expires_in==="number"?n+s.expires_in*1000:void 0}}catch(i){throw await this.revoke(s.access_token),i}}async refresh(e){if(!e.refresh_token)throw new q(e.sub,"no refresh token available");let t=await this.verifyIssuer(e.sub),r=Date.now(),n=await this.requestToken({grant_type:"refresh_token",refresh_token:e.refresh_token});return{iss:this.issuer,sub:e.sub,aud:t,scope:n.scope,access_token:n.access_token,refresh_token:n.refresh_token,token_type:n.token_type,expires_at:typeof n.expires_in==="number"?r+n.expires_in*1000:void 0}}async pushAuthorizationRequest(e){let t=this.serverMetadata.pushed_authorization_request_endpoint,{json:r}=await this.request(t,e,Bi);return r}async verifyIssuer(e){let t=await this.oauthResolver.resolveFromIdentity(e,{noCache:!0,signal:AbortSignal.timeout(1e4)});if(this.issuer!==t.metadata.issuer)throw TypeError(\`issuer mismatch: token issued by \${this.issuer}, but identity resolves to \${t.metadata.issuer}\`);return t.identity.pds}async requestToken(e){let t=this.serverMetadata.token_endpoint,{json:r}=await this.request(t,e,Ti);return r}async request(e,t,r){let n=await this.clientCredentialsFactory(),s=new URLSearchParams;for(let[o,a]of Object.entries(t))if(a!==void 0)s.set(o,a);if(s.set("client_id",this.clientMetadata.client_id),n)s.set("client_assertion_type",n.client_assertion_type),s.set("client_assertion",n.client_assertion);let i=await this.dpopFetch(e,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:s.toString()});if(!i.ok){let o="unknown_error",a;try{let u=await i.clone().json();if(typeof u==="object"&&u!==null)o=u.error??o,a=u.error_description}catch{}throw new Me(i,o,a)}if(r)return r(i);return{response:i,json:void 0}}}class mr{clientMetadata;resolver;keyset;dpopNonces;fetch;constructor(e){this.clientMetadata=e.clientMetadata,this.resolver=e.resolver,this.keyset=e.keyset,this.dpopNonces=e.dpopNonces,this.fetch=e.fetch}async fromIssuer(e,t,r,n){let s=await this.resolver.authorizationServerResolver.resolve(e,n);return this.fromMetadata(s,t,r)}fromMetadata(e,t,r){return new dr({authMethod:t,dpopKey:r,serverMetadata:e,clientMetadata:this.clientMetadata,dpopNonces:this.dpopNonces,oauthResolver:this.resolver,keyset:this.keyset,fetch:this.fetch})}fromMetadataNewSession(e,t){let r=Cn(e,this.keyset);return this.fromMetadata(e,r,t)}}class vr{dpopFetch;server;sub;sessionGetter;constructor(e,t,r,n=globalThis.fetch){this.server=e,this.sub=t,this.sessionGetter=r,this.dpopFetch=Ae({key:e.dpopKey,nonces:e.dpopNonces,supportedAlgs:e.serverMetadata.dpop_signing_alg_values_supported,isAuthServer:!1,fetch:n})}get did(){return this.sub}async getTokenSet(e){let{tokenSet:t}=await this.sessionGetter.getSession(this.sub,e);return t}async getTokenInfo(e="auto"){let t=await this.getTokenSet(e),r=t.expires_at!=null?new Date(t.expires_at):void 0;return{expiresAt:r,get expired(){return r!=null?r.getTime()<Date.now()-5000:void 0},scope:t.scope,iss:t.iss,aud:t.aud,sub:t.sub}}async signOut(){try{let e=await this.getTokenSet(!1);await this.server.revoke(e.access_token)}finally{await this.sessionGetter.deleteStored(this.sub,new ae(this.sub))}}async handle(e,t){let r=await this.getTokenSet("auto"),n=new URL(e,r.aud),s=\`\${r.token_type} \${r.access_token}\`,i=new Headers(t?.headers);i.set("Authorization",s);let o=await this.dpopFetch(n,{...t,headers:i});if(!jn(o))return o;let a;try{a=await this.getTokenSet(!0)}catch{return o}if(t?.body instanceof ReadableStream)return o;let u=new URL(e,a.aud),c=\`\${a.token_type} \${a.access_token}\`;i.set("Authorization",c);let p=await this.dpopFetch(u,{...t,headers:i});if(jn(p))await this.sessionGetter.deleteStored(this.sub,new Oe(this.sub));return p}}var jn=(e)=>{if(e.status!==401)return!1;let t=e.headers.get("WWW-Authenticate");if(t==null)return!1;return(t.startsWith("Bearer ")||t.startsWith("DPoP "))&&t.includes('error="invalid_token"')};class gr extends ce{listeners=new Set;requestLock;constructor(e){let{sessionStore:t,serverFactory:r,requestLock:n}=e;super(async(s,i,o)=>{if(o===void 0){let f=new q(s,"session was deleted by another process");throw this.dispatchEvent({type:"deleted",sub:s,cause:f}),f}let{dpopKey:a,authMethod:u,tokenSet:c}=o;if(s!==c.sub)throw new q(s,"stored session sub mismatch");if(!c.refresh_token)throw new q(s,"no refresh token available");let p=await r.fromIssuer(c.iss,u,a);i.signal?.throwIfAborted();try{let f=await p.refresh(c);if(s!==f.sub)throw new q(s,"token set sub mismatch after refresh");return{dpopKey:a,authMethod:p.authMethod,tokenSet:f}}catch(f){if(f instanceof Me&&f.status===400&&f.error==="invalid_grant"){let v=f.errorDescription??"session was revoked";throw new q(s,v,{cause:f})}throw f}},t,{isStale(s,{tokenSet:i}){if(i.expires_at==null)return!1;let o=1e4+30000*Math.random();return i.expires_at<Date.now()+o},async onStoreError(s,i,{tokenSet:o,dpopKey:a,authMethod:u}){if(!(s instanceof wt))try{await(await r.fromIssuer(o.iss,u,a)).revoke(o.refresh_token??o.access_token)}catch{}throw s},deleteOnError(s){return s instanceof q||s instanceof ae||s instanceof Oe||s instanceof wt}});this.requestLock=n}addEventListener(e){this.listeners.add(e)}removeEventListener(e){this.listeners.delete(e)}dispatchEvent(e){for(let t of this.listeners)try{t(e)}catch{}}async setStored(e,t){if(e!==t.tokenSet.sub)throw TypeError("token set does not match the expected sub");await super.setStored(e,t),this.dispatchEvent({type:"updated",sub:e,session:t})}async deleteStored(e,t){await super.deleteStored(e,t),this.dispatchEvent({type:"deleted",sub:e,cause:t})}async getSession(e,t="auto"){return this.get(e,{noCache:t===!0,allowStale:t===!1})}async get(e,t){let r=t?.signal??AbortSignal.timeout(30000),n;if(this.requestLock)n=await this.requestLock(\`oauth-session-\${e}\`,async()=>await super.get(e,{...t,signal:r}));else n=await super.get(e,{...t,signal:r});if(e!==n.tokenSet.sub)throw Error("token set does not match the expected sub");return n}}class wr{#e;#n=0;#r=new Map;#t=null;#s=null;constructor(e){this.#e=e}get size(){return this.#e}peek(e){let t=this.#r.get(e);if(t===void 0)return;return t.value}get(e){let t=this.#r.get(e);if(t===void 0)return;return this.#i(t),t.value}set(e,t){{let r=this.#r.get(e);if(r!==void 0){r.value=t,this.#i(r);return}}{let r={key:e,value:t,prev:null,next:null};this.#r.set(e,r),this.#o(r),this.#n++}this.#u()}delete(e){let t=this.#r.get(e);if(t===void 0)return!1;return this.#r.delete(e),this.#a(t),this.#n--,!0}clear(){this.#r.clear(),this.#t=null,this.#s=null,this.#n=0}has(e){return this.#r.has(e)}*keys(){let e=this.#t;while(e!==null)yield e.key,e=e.next}*values(){let e=this.#t;while(e!==null)yield e.value,e=e.next}*entries(){let e=this.#t;while(e!==null)yield[e.key,e.value],e=e.next}[Symbol.iterator](){return this.entries()}#i(e){if(this.#t===e)return;if(e.prev!==null)e.prev.next=e.next;if(e.next!==null)e.next.prev=e.prev;else this.#s=e.prev;e.prev=null,e.next=this.#t,this.#t.prev=e,this.#t=e}#o(e){if(e.next=this.#t,e.prev=null,this.#t!==null)this.#t.prev=e;else this.#s=e;this.#t=e}#a(e){if(e.prev!==null)e.prev.next=e.next;else this.#t=e.next;if(e.next!==null)e.next.prev=e.prev;else this.#s=e.prev}#u(){let e=this.#n-this.#e;if(e<=0)return;let t=this.#s;for(let r=0;r<e;r++)this.#r.delete(t.key),t=t.prev;t.next=null,this.#s=t,this.#n-=e}}class $e{#e;#n;#r;#t;constructor(e={}){this.#e=e.maxSize!==void 0?new wr(e.maxSize):new Map,this.#n=e.ttl??0,this.#r=e.ttlAutopurge??!1}get(e){let t=this.#e.get(e);if(t===void 0)return;if(this.#n>0&&Date.now()>t.expiresAt){this.#e.delete(e);return}return t.value}set(e,t){if(this.#e.set(e,{value:t,expiresAt:Date.now()+this.#n}),this.#r&&this.#t===void 0)this.#t=setTimeout(()=>this.#s(),this.#n)}delete(e){this.#e.delete(e)}clear(){this.#e.clear()}dispose(){if(this.#t!==void 0)clearTimeout(this.#t),this.#t=void 0}[Symbol.dispose](){this.dispose()}#s(){this.#t=void 0;let e=Date.now(),t=1/0;for(let[r,{expiresAt:n}]of this.#e)if(e>n)this.#e.delete(r);else if(n<t)t=n;if(t<1/0)this.#t=setTimeout(()=>this.#s(),t-e)}}class xr{metadata;keyset;responseMode;resolver;serverFactory;sessionGetter;stateStore;fetch;constructor(e){let{stores:t}=e,r,n;if("keyset"in e&&e.keyset!==void 0)n=Array.isArray(e.keyset)?new pt(e.keyset):e.keyset,r=er(e.metadata,n);else n=void 0,r=tr(e.metadata);this.metadata=r,this.keyset=n,this.responseMode=e.responseMode??"query",this.fetch=e.fetch??globalThis.fetch;let s=t.prMetadata??new $e({maxSize:100,ttl:60000,ttlAutopurge:!0}),i=t.asMetadata??new $e({maxSize:100,ttl:60000,ttlAutopurge:!0}),o=t.dpopNonces??new $e({maxSize:100,ttl:60000,ttlAutopurge:!0});this.resolver=new yr(e.actorResolver,new hr({cache:s,fetch:this.fetch}),new fr({cache:i,fetch:this.fetch})),this.serverFactory=new mr({clientMetadata:this.metadata,resolver:this.resolver,keyset:n,dpopNonces:o,fetch:this.fetch}),this.sessionGetter=new gr({sessionStore:t.sessions,serverFactory:this.serverFactory,requestLock:e.requestLock}),this.stateStore=t.states}get jwks(){return this.keyset?.publicJwks}addEventListener(e){this.sessionGetter.addEventListener(e)}removeEventListener(e){this.sessionGetter.removeEventListener(e)}async authorize(e){let{target:t,scope:r,state:n,redirectUri:s,prompt:i,signal:o}=e;if(r!==void 0)r=Li(r,this.metadata.scope);else r=this.metadata.scope;if(s!==void 0){if(!this.metadata.redirect_uris.includes(s))throw TypeError(\`specified redirect_uri not in client metadata: \${s}\`)}else s=this.metadata.redirect_uris[0];let a;if(t.type==="account")a=await this.resolver.resolveFromIdentity(t.identifier,{signal:o});else a=await this.resolver.resolveFromService(t.serviceUrl,{signal:o});let{identity:u,metadata:c}=a;o?.throwIfAborted();let p=$i(i,c.prompt_values_supported),f=await Vt(),v=await Ft(c.dpop_signing_alg_values_supported??[K]),g=this.serverFactory.fromMetadataNewSession(c,v),_=Z(24),E={dpopKey:v,authMethod:g.authMethod,pkceVerifier:f.verifier,issuer:c.issuer,redirectUri:s,sub:u?.did,userState:n,expiresAt:Date.now()+600000};await this.stateStore.set(_,E);let k={client_id:this.metadata.client_id,redirect_uri:s,response_type:"code",response_mode:this.responseMode,scope:r,state:_,code_challenge:f.challenge,code_challenge_method:f.method};if(u)k.login_hint=u.handle!=="handle.invalid"?u.handle:u.did;if(p)k.prompt=p;let x=await g.pushAuthorizationRequest(k),b=new URL(c.authorization_endpoint);return b.searchParams.set("client_id",this.metadata.client_id),b.searchParams.set("request_uri",x.request_uri),{url:b,stateId:_}}async callback(e,t){let r=e.get("state"),n=e.get("error"),s=e.get("code"),i=e.get("iss");if(!r)throw new V("invalid_request","missing state parameter");let o=await this.stateStore.get(r);if(!o)throw new V("invalid_request","unknown state",r);if(await this.stateStore.delete(r),n)throw new V(n,e.get("error_description")??void 0,r);if(!s)throw new V("invalid_request","missing code parameter",r);let a=await this.serverFactory.fromIssuer(o.issuer,o.authMethod,o.dpopKey);if(i!=null){if(a.issuer!==i)throw new V("invalid_request","issuer mismatch",r)}else if(a.serverMetadata.authorization_response_iss_parameter_supported)throw new V("invalid_request","missing iss parameter",r);let u=t?.redirectUri??o.redirectUri,c=await a.exchangeCode(s,o.pkceVerifier,u);if(o.sub&&c.sub!==o.sub)throw await a.revoke(c.access_token),new V("invalid_request","sub mismatch",r);try{await this.sessionGetter.setStored(c.sub,{dpopKey:o.dpopKey,authMethod:a.authMethod,tokenSet:c})}catch(f){throw await a.revoke(c.access_token),f}return{session:this.createSession(a,c.sub),state:o.userState}}async restore(e,t){let r=t?.refresh??"auto",{dpopKey:n,authMethod:s,tokenSet:i}=await this.sessionGetter.getSession(e,r),o=await this.serverFactory.fromIssuer(i.iss,s,n,{noCache:r===!0});return this.createSession(o,e)}async revoke(e){let{dpopKey:t,authMethod:r,tokenSet:n}=await this.sessionGetter.getSession(e,!1);try{await(await this.serverFactory.fromIssuer(n.iss,r,t)).revoke(n.access_token)}finally{await this.sessionGetter.deleteStored(e,new ae(e))}}createSession(e,t){return new vr(e,t,this.sessionGetter,this.fetch)}}var $i=(e,t)=>{if(!e)return;let r=Array.isArray(e)?e:[e];if(r.length===0)return;if(!t)return r[0];for(let n=0,s=r.length;n<s;n++){let i=r[n];if(t.includes(i))return i}throw TypeError(\`prompt not supported by server (provided: \${r.join(", ")}, supported: \${t.join(", ")})\`)},On=(e)=>e.trim().split(/\\s+/),Li=(e,t)=>{let r=On(e);if(r.length===0)throw TypeError("missing scope");for(let s=0,i=r.length;s<i;s++){let o=r[s];for(let a=0;a<s;a++)if(o===r[a])throw TypeError(\`duplicate "\${o}" scope\`)}let n=On(t);for(let s=0,i=r.length;s<i;s++){let o=r[s],a=!1;for(let u=0,c=n.length;u<c;u++)if(o===n[u]){a=!0;break}if(!a)throw Error(\`requested "\${o}" scope is not within client metadata's scope\`)}return r.join(" ")};class _t extends Error{name="DidResolutionError"}class le extends _t{name="UnsupportedDidMethodError";did;constructor(e){super(\`unsupported did method; did=\${e}\`);this.did=e}}class Le extends _t{name="DocumentNotFoundError";did;constructor(e){super(\`did document not found; did=\${e}\`);this.did=e}}class Ne extends _t{name="FailedDocumentResolutionError";did;constructor(e,t){super(\`failed to resolve did document; did=\${e}\`,t);this.did=e}}class Fe extends Error{name="HandleResolutionError"}class ge extends Fe{name="DidNotFoundError";handle;constructor(e){super(\`handle returned no did; handle=\${e}\`);this.handle=e}}class we extends Fe{name="FailedHandleResolutionError";handle;constructor(e,t){super(\`failed to resolve handle; handle=\${e}\`,t);this.handle=e}}class Ke extends Fe{name="InvalidResolvedHandleError";handle;did;constructor(e,t){super(\`handle returned invalid did; handle=\${e}; did=\${t}\`);this.handle=e,this.did=t}}class qe extends Fe{name="AmbiguousHandleError";constructor(e){super(\`handle returned multiple did values; handle=\${e}\`)}}class ze extends Error{name="ActorResolutionError"}class Mn{handleResolver;didDocumentResolver;constructor(e){this.handleResolver=e.handleResolver,this.didDocumentResolver=e.didDocumentResolver}async resolve(e,t){let r=dt(e),n;if(r)n=e;else try{n=await this.handleResolver.resolve(e,t)}catch(a){throw new ze("failed to resolve handle",{cause:a})}let s;try{s=await this.didDocumentResolver.resolve(n,t)}catch(a){throw new ze("failed to resolve did document",{cause:a})}let i=hn(s);if(!i)throw new ze("missing pds endpoint");let o="handle.invalid";if(r){let a=ir(s);if(a)try{if(await this.handleResolver.resolve(a,t)===n)o=a}catch{}}else if(ir(s)===e)o=e;return{did:n,handle:o,pds:new URL(i).href}}}class Tn{#e;constructor({methods:e}){this.#e=new Map(Object.entries(e))}async resolve(e,t){let r=vn(e),n=this.#e.get(r);if(n===void 0)throw new le(e);return await n.resolve(e,t)}}var kt=M(ve,T(/^application\\/(?:did\\+json|did\\+ld\\+json|json)$/,20480),B(gt.didDocument));class Bn{apiUrl;#e;constructor({apiUrl:e="https://plc.directory",fetch:t=fetch}={}){this.apiUrl=e,this.#e=t}async resolve(e,t){if(!e.startsWith("did:plc:"))throw new le(e);let r;try{let n=new URL(\`/\${encodeURIComponent(e)}\`,this.apiUrl),s=await(0,this.#e)(n,{signal:t?.signal,cache:t?.noCache?"no-cache":void 0,redirect:"manual",headers:{accept:"application/did+ld+json,application/did+json,application/json"}});if(s.status>=300&&s.status<400)throw TypeError("unexpected redirect");r=(await kt(s)).json}catch(n){if(n instanceof W&&n.status===404)throw new Le(e);throw new Ne(e,{cause:n})}return r}}class $n{#e;constructor({fetch:e=fetch}={}){this.#e=e}async resolve(e,t){if(!e.startsWith("did:web:"))throw new le(e);let r;try{let n=mn(e),s=await(0,this.#e)(n,{signal:t?.signal,cache:t?.noCache?"no-cache":void 0,redirect:"manual",headers:{accept:"application/did+ld+json,application/did+json,application/json"}});if(s.status>=300&&s.status<400)throw TypeError("unexpected redirect");r=(await kt(s)).json}catch(n){if(n instanceof W&&n.status===404)throw new Le(e);throw new Ne(e,{cause:n})}return r}}class Ln{#e;strategy;constructor({methods:e,strategy:t="race"}){this.#e=e,this.strategy=t}async resolve(e,t){let{http:r,dns:n}=this.#e,s=t?.signal,i=new AbortController;if(s)s.addEventListener("abort",()=>i.abort(),{signal:i.signal});let o=n.resolve(e,{...t,signal:i.signal}),a=r.resolve(e,{...t,signal:i.signal});switch(this.strategy){case"race":return new Promise((u)=>{o.then((c)=>{i.abort(),u(c)},()=>u(a)),a.then((c)=>{i.abort(),u(c)},()=>u(o))});case"dns-first":{a.catch(bt);let u=await o.catch(bt);if(u)return i.abort(),u;return a}case"http-first":{o.catch(bt);let u=await a.catch(bt);if(u)return i.abort(),u;return o}case"both":{let[u,c]=await Promise.allSettled([o,a]),p=u.status==="fulfilled"?u.value:void 0,f=c.status==="fulfilled"?c.value:void 0;if(p&&f&&p!==f)throw new qe(e);return p||f||o}}}}var bt=()=>{};var Ni="_atproto",_r="did=";class Nn{dohUrl;#e;constructor({dohUrl:e,fetch:t=fetch}){this.dohUrl=e,this.#e=t}async resolve(e,t){let r;try{let i=new URL(this.dohUrl);i.searchParams.set("name",\`\${Ni}.\${e}\`),i.searchParams.set("type","TXT");let o=await(0,this.#e)(i,{signal:t?.signal,cache:t?.noCache?"no-cache":void 0,headers:{accept:"application/dns-json"}});r=(await Sn(o)).json}catch(i){throw new we(e,{cause:i})}let{Status:n,Answer:s}=r;if(n!==0){if(n===3)throw new ge(e);throw new we(e,{cause:TypeError(\`dns returned \${n}\`)})}for(let i=0,o=s.length;i<o;i++){let u=s[i].data;if(!u.startsWith(_r))continue;for(let p=i+1;p<o;p++)if(s[p].data.startsWith(_r))throw new qe(e);let c=u.slice(_r.length);if(!de(c))throw new Ke(e,c);return c}throw new ge(e)}}var Fi=M(ve,En(2064));class Fn{#e;constructor({fetch:e=fetch}={}){this.#e=e}async resolve(e,t){let r;try{let s=new URL("/.well-known/atproto-did",\`https://\${e}\`),i=await(0,this.#e)(s,{signal:t?.signal,cache:t?.noCache?"no-cache":void 0,redirect:"manual"});if(i.status>=300&&i.status<400)throw TypeError("unexpected redirect");r=(await Fi(i)).text}catch(s){if(s instanceof W&&s.status===404)throw new ge(e);throw new we(e,{cause:s})}let n=r.split(\`
\`)[0].trim();if(!de(n))throw new Ke(e,n);return n}}var Kn=!1;var Ki=(e)=>({ok:!0,value:e}),qi=0;var zi=2,Hi=(e,t)=>{let{ok:r,msg:n,...s}=e;return{...s,path:t}},kr=(e,t=[],r=[])=>{for(;;)switch(e.code){case"join":{kr(e.left,t.slice(),r),e=e.right;continue}case"prepend":{t.push(e.key),e=e.tree;continue}default:return r.push(Hi(e,t)),r}},qn=(e)=>{let t=0;for(;;)switch(e.code){case"join":{t+=qn(e.left),e=e.right;continue}case"prepend":{e=e.tree;continue}default:return t+1}};var zn=(e)=>{let t="",r=0;for(;;){switch(e.code){case"join":{r+=qn(e.right),e=e.left;continue}case"prepend":{t+=\`.\${e.key}\`,e=e.tree;continue}}break}let n=e.msg(),s=\`\${e.code} at \${t||"."} (\${n})\`;if(r>0)s+=\` (+\${r} other issue(s))\`;return s};class Hn extends Error{name="ValidationError";#e;constructor(e){super();this.#e=e}get message(){return zn(this.#e)}get issues(){return kr(this.#e)}}class Gn{ok=!1;#e;constructor(e){this.#e=e}get message(){return zn(this.#e)}get issues(){return kr(this.#e)}throw(){throw new Hn(this.#e)}}var Et=(e,t,r)=>{let n=qi;if(r?.strict)n|=zi;let s=e["~run"](t,n);if(s===void 0)return Ki(t);if(s.ok)return s;return new Gn(s)};var Vn=(e)=>{if(typeof e==="object")return e.handle.bind(e);return e};var Wn=/\\bapplication\\/json\\b/;class br{constructor({handler:e,proxy:t=null}){this.handler=Vn(e),this.proxy=t}clone({handler:e=this.handler,proxy:t=this.proxy}={}){return new br({handler:e,proxy:t})}get(e,t={}){return this.#e("get",e,t)}post(e,t={}){return this.#e("post",e,t)}async call(e,t={}){if(!Kn)return;if("mainSchema"in e)e=e.mainSchema;if(e.params!==null){let o=Et(e.params,t.params);if(!o.ok)throw new At("params",o)}if(e.type==="xrpc_procedure"&&e.input?.type==="lex"){let o=Et(e.input.schema,t.input);if(!o.ok)throw new At("input",o)}let r=e.type==="xrpc_query",n=r?"get":"post";if(t.as===void 0&&e.output?.type==="blob")throw TypeError("\`as\` option is required for endpoints returning blobs");let s=t.as!==void 0?t.as:e.output?.type==="lex"?"json":null,i=await this.#e(n,e.nsid,{params:t.params,input:r?void 0:t.input,as:s,signal:t.signal,headers:t.headers});if(s==="json"&&i.ok&&e.output?.type==="lex"){let o=Et(e.output.schema,i.data);if(!o.ok)throw new At("output",o);return{ok:!0,status:i.status,headers:i.headers,data:o.value}}return i}async#e(e,t,{signal:r,as:n="json",headers:s,input:i,params:o}){let a=i&&(i instanceof Blob||ArrayBuffer.isView(i)||i instanceof ArrayBuffer||i instanceof ReadableStream),u=\`/xrpc/\${t}\`+Vi(o),c=await this.handler(u,{method:e,signal:r,body:i&&!a?JSON.stringify(i):i,headers:Wi(s,{"content-type":i&&!a?"application/json":null,"atproto-proxy":this.proxy}),duplex:i instanceof ReadableStream?"half":void 0});{let{status:p,headers:f}=c,v=f.get("content-type");if(p!==200){let g;if(v!=null&&Wn.test(v))try{let _=await c.json();if(Ji(_))g=_}catch{}else await c.body?.cancel();return{ok:!1,status:p,headers:f,data:g??{error:"UnknownXRPCError",message:\`Request failed with status code \${p}\`}}}{let g;switch(n){case"json":{if(v!=null&&Wn.test(v))g=await c.json();else throw await c.body?.cancel(),TypeError(\`Invalid response content-type (got \${v})\`);break}case null:{g=null,await c.body?.cancel();break}case"blob":{g=await c.blob();break}case"bytes":{g=new Uint8Array(await c.arrayBuffer());break}case"stream":{g=c.body;break}}return{ok:!0,status:p,headers:f,data:g}}}}}var Vi=(e)=>{let t;for(let r in e){let n=e[r];if(n!==void 0)if(t??=new URLSearchParams,Array.isArray(n))for(let s=0,i=n.length;s<i;s++){let o=n[s];t.append(r,""+o)}else t.set(r,""+n)}return t?"?"+t.toString():""},Wi=(e,t)=>{let r;for(let n in t){let s=t[n];if(s!==null){if(r??=new Headers(e),!r.has(n))r.set(n,s)}}return r??e},Ji=(e)=>{let t=e;if(typeof t!=="object"||t==null)return!1;let r=typeof t.error,n=typeof t.message;return r==="string"&&(n==="undefined"||n==="string")};class At extends Error{constructor(e,t){super(\`validation failed for \${e}: \${t.message}\`);this.name="ClientValidationError",this.target=e,this.result=t}}/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */var Sr=Object.freeze,te=0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn,Je=0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,rs=0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,ns=0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n,Xi=Sr({p:te,n:Je,h:1n,a:0n,b:7n,Gx:rs,Gy:ns});var Jn=(e)=>e instanceof Uint8Array||ArrayBuffer.isView(e)&&e.constructor.name==="Uint8Array"&&e.BYTES_PER_ELEMENT===1,z=(e,t,r="")=>{if(Jn(e)&&(t===void 0||e.length===t))return e;let n=Jn(e),s=t!==void 0?\` of length \${t}\`:"",i=n?\`length=\${e.length}\`:\`type=\${typeof e}\`,o=(r?\`"\${r}" \`:"")+"expected Uint8Array"+s+", got "+i;if(!n)throw TypeError(o);throw RangeError(o)},Zi=(e)=>Uint8Array.from(e),Yi=(e,t,r)=>Zi(z(e,r,t)),ss=(e,t)=>e.toString(16).padStart(t,"0"),is=(e)=>{let t="";for(let r of z(e))t+=ss(r,2);return t},os=(e)=>{if(typeof e!=="string")throw TypeError("hex invalid");if(e.length%2||!/^[\\da-f]*$/i.test(e))throw RangeError("hex invalid");let r=new Uint8Array(e.length/2);for(let n=0,s=0;n<r.length;n++,s+=2){let i=e.charCodeAt(s),o=e.charCodeAt(s+1);r[n]=((i&15)+(i>>6)*9)*16+(o&15)+(o>>6)*9}return r},Xn=()=>{let e=globalThis?.crypto?.subtle;if(e)return e;throw Error("crypto.subtle must be defined, consider polyfill")},Pt=(...e)=>{let t=0;for(let s of e)t+=z(s).length;let r=new Uint8Array(t),n=0;for(let s of e)r.set(s,n),n+=s.length;return r};var as=BigInt,Ct=(e,t,r,n="bad number: out of range")=>{if(typeof e!=="bigint")throw TypeError(n);if(t<=e&&e<r)return e;throw RangeError(n)},d=(e,t=te)=>(e%=t)>=0n?e:t+e,St=(e)=>d(e,Je),us=(e,t)=>{if(e===0n)throw Error("invert: expected non-zero number");if(t<=1n)throw Error("invert: expected modulus > 1, got "+t);let r=d(e,t),n=t,s=0n,i=1n;while(r!==0n){let a=n/r,u=n-r*a,c=s-i*a;n=r,r=u,s=i,i=c}if(n!==1n)throw Error("invert: does not exist");return d(s,t)},cs=(e)=>{let t=lo[e];if(typeof t!=="function")throw Error("hashes."+e+" not set");return t},Qi=(e,t,r)=>z(cs(e)(t,r),32,"digest"),eo=async(e,t,r)=>z(await cs(e)(t,r),32,"digest");var Er=(e)=>{if(e instanceof O)return e;throw TypeError("Point expected")};var ls=(e)=>d(d(e*e)*e+7n),Zn=(e)=>Ct(e,0n,te),Rt=(e)=>Ct(e,1n,te),Ar=(e)=>Ct(e,1n,Je),ps=(e)=>!(e&1n),to=(e)=>Uint8Array.of(ps(e)?2:3),ro=(e)=>{let t=ls(Rt(e)),r=1n;for(let n=t,s=(te+1n)/4n;s>0n;s>>=1n){if(s&1n)r=r*n%te;n=n*n%te}if(d(r*r)!==t)throw Error("sqrt invalid");return new O(e,ps(r)?r:d(-r),1n)};class O{static BASE;static ZERO;X;Y;Z;constructor(e,t,r){this.X=Zn(e),this.Y=Rt(t),this.Z=Zn(r),Sr(this)}static CURVE(){return Xi}static fromAffine(e){let{x:t,y:r}=e;return t===0n&&r===0n?He:new O(t,r,1n)}static fromBytes(e){z(e);let t=e.length,r=e[0],n=It(e,1,33);try{if(t===33&&(r===2||r===3)){let s=ro(n);return r===3?s.negate():s}if(t===65&&r===4)return new O(n,It(e,33,65),1n).assertValidity()}catch(s){throw Error("bad point: not on curve")}throw Error("bad point: not on curve")}static fromHex(e){return O.fromBytes(os(e))}get x(){return this.toAffine().x}get y(){return this.toAffine().y}equals(e){let{X:t,Y:r,Z:n}=this,{X:s,Y:i,Z:o}=Er(e);return d(t*o)===d(s*n)&&d(r*o)===d(i*n)}is0(){return this.Z===0n}negate(){return new O(this.X,d(-this.Y),this.Z)}double(){return this.add(this)}add(e){let{X:t,Y:r,Z:n}=this,{X:s,Y:i,Z:o}=Er(e),a=0n,u=7n,c=0n,p=0n,f=0n,v=d(u*3n),g=d(t*s),_=d(r*i),E=d(n*o),k=d(t+r),x=d(s+i);k=d(k*x),x=d(g+_),k=d(k-x),x=d(t+n);let b=d(s+o);return x=d(x*b),b=d(g+E),x=d(x-b),b=d(r+n),c=d(i+o),b=d(b*c),c=d(_+E),b=d(b-c),f=d(a*x),c=d(v*E),f=d(c+f),c=d(_-f),f=d(_+f),p=d(c*f),_=d(g+g),_=d(_+g),E=d(a*E),x=d(v*x),_=d(_+E),E=d(g-E),E=d(a*E),x=d(x+E),g=d(_*x),p=d(p+g),g=d(b*x),c=d(k*c),c=d(c-g),g=d(k*_),f=d(b*f),f=d(f+g),new O(c,p,f)}subtract(e){return this.add(Er(e).negate())}multiply(e,t=!0){if(!t&&e===0n)return He;if(Ar(e),e===1n)return this;if(this.equals(_e))return mo(e).p;let r=He,n=_e,s=this;for(let i=0;t?i<256:e>0n;i++){if(e&1n)r=r.add(s);else if(t)n=n.add(s);s=s.double(),e>>=1n}return r}multiplyUnsafe(e){return this.multiply(e,!1)}toAffine(){let{X:e,Y:t,Z:r}=this;if(r===0n)return{x:0n,y:0n};if(r===1n)return{x:e,y:t};let n=us(r,te);if(d(r*n)!==1n)throw Error("inverse invalid");return{x:d(e*n),y:d(t*n)}}assertValidity(){let{x:e,y:t}=this.toAffine();if(Rt(e),Rt(t),d(t*t)!==ls(e))throw Error("bad point: not on curve");return this}toBytes(e=!0){let{x:t,y:r}=this.assertValidity().toAffine(),n=Dt(t);if(e)return Pt(to(r),n);return Pt(Uint8Array.of(4),n,Dt(r))}toHex(e){return is(this.toBytes(e))}}var _e=new O(rs,ns,1n),He=new O(0n,1n,0n);O.BASE=_e;O.ZERO=He;var no=(e,t,r)=>_e.multiply(t,!1).add(e.multiply(r,!1)).assertValidity(),fs=(e)=>as("0x"+(is(e)||"0")),It=(e,t,r)=>fs(e.subarray(t,r)),Dt=(e)=>os(ss(Ct(e,0n,2n**256n),64));var hs=(e)=>e>Je>>1n,so=(e,t,r)=>(e===r?0:2)|Number(t&1n);var Yn=(e)=>{if(e!=null&&[0,1,2,3].includes(e))return e;throw Error("invalid recovery id")},ys=(e)=>{if(e==="der")throw Error('Signature format "der" is not supported: switch to noble-curves');if(e!=null&&e!==Ve&&e!==We)throw Error("Signature format must be one of: compact, recovered, der")},ds=(e,t=Ve)=>{ys(t);let r=z(e,void 0,"signature"),n=64+Number(t===We);if(r.length!==n)throw Error(\`Signature format "\${t}" expects Uint8Array with length \${n}\`);return r};class Ge{r;s;recovery;constructor(e,t,r){if(this.r=Ar(e),this.s=Ar(t),r!=null)this.recovery=Yn(r);Sr(this)}static fromBytes(e,t=Ve){e=ds(e,t);let r;if(t===We)r=e[0],e=e.subarray(1);let n=It(e,0,32),s=It(e,32,64);return new Ge(n,s,r)}addRecoveryBit(e){return new Ge(this.r,this.s,e)}hasHighS(){return hs(this.s)}toBytes(e=Ve){ys(e);let{r:t,s:r,recovery:n}=this,s=Pt(Dt(t),Dt(r));if(e===We)return Pt(Uint8Array.of(Yn(n)),s);return s}}var io=8192,oo="input is too large",ao=(e,t)=>!t&&e.length>io,uo=(e)=>{if(ao(e))throw Error(oo);let t=e.length*8-256,r=fs(e);return t>0?r>>as(t):r},co=(e)=>St(uo(z(e)));var Ve="compact",We="recovered",Qn="SHA-256",lo={hmacSha256Async:async(e,t)=>{let r=Xn(),n=await r.importKey("raw",e,{name:"HMAC",hash:Qn},!1,["sign"]);return new Uint8Array(await r.sign("HMAC",n,t))},hmacSha256:void 0,sha256Async:async(e)=>new Uint8Array(await Xn().digest(Qn,e)),sha256:void 0},po=(e,t,r)=>{let n=z(e,void 0,"message");if(!t)return n;return r?eo("sha256Async",n):Qi("sha256",n)};var fo=(e,t,r,n)=>{let[s,,i]=n;if(e instanceof Ge)throw Error("Signature must be in Uint8Array, use .toBytes()");ds(e,i),z(r,void 0,"publicKey");try{let{r:o,s:a,recovery:u}=Ge.fromBytes(e,i),c=co(t),p=O.fromBytes(r);if(s&&hs(a))return!1;let f=us(a,Je),{x:v,y:g}=no(p,St(c*f),St(o*f)).toAffine();if(St(v)!==o)return!1;return i!==We||u===so(v,g,o)}catch(o){return!1}},ho=(e,t=!1)=>{let r=e.extraEntropy;return[e.lowS??!0,e.prehash??!0,e.format??Ve,t&&r!=null&&typeof r!=="boolean"?Yi(r,"extraEntropy"):r]};var ms=(e,t,r,n={})=>{let s=ho(n),i=po(t,s[1],!1);return fo(e,i,r,s)};var yo=()=>{let e=[],t=_e,r=t;for(let n=0;n<33;n++){r=t,e.push(r);for(let s=1;s<128;s++)r=r.add(t),e.push(r);t=r.double()}return e},es=void 0,ts=(e,t)=>{let r=t.negate();return e?r:t},mo=(e)=>{let t=es||(es=yo()),r=He,n=_e;for(let s=0;s<33;s++){let i=Number(e&255n);if(e>>=8n,i>128)i-=256,e+=1n;let o=s*128,a=o+Math.abs(i)-1,u=s%2!==0,c=i<0;if(i===0)n=n.add(ts(u,t[o]));else r=r.add(ts(c,t[a]))}if(e!==0n)throw Error("invalid wnaf");return{p:r,f:n}};var vo=(e)=>{let t,r=0n;for(let n=1;n<=(t=e.length)>>1;n++)r|=BigInt(e[t-n])<<BigInt(8*(n-1));return r};var vs=(e,t)=>vo(e)<=t>>1n;var gs=(e)=>e[0]===2||e[0]===3,Rr=(e)=>e[0]===4,ws=(e)=>{L(Rr(e),"not an uncompressed point");let t=e.length-1,r=t>>1,n=e.slice(0,r+1);return n[0]=2+(e[t]&1),n};var Eh=new Uint8Array([98,110,117,121,32,114,32,113,116,32,58,51]);var ke=(e,t)=>\`z\${Bt(Ur([e,t]))}\`,L=(e,t)=>{if(!e)throw TypeError(t)},Pr=(e,t)=>{if(!e)throw SyntaxError(t)},Ut=(e,t)=>{throw Error(t)};var xs=Uint8Array.from([231,1]),jh=Uint8Array.from([129,38]),wo=(e,t)=>{let r=O.fromBytes(e).toBytes(!1),n={kty:"EC",crv:"secp256k1",alg:"ES256K",x:N(r.subarray(1,33)),y:N(r.subarray(33,65)),key_ops:["verify","sign"]};if(t)Object.assign(n,{d:N(t)});return n};class jt{type="secp256k1";jwtAlg="ES256K";_publicKey;constructor(e){this._publicKey=e}static async importRaw(e){return new jt(e)}async verify(e,t,r){if(e.length!==64)return!1;let n=r?.allowMalleableSig??!1,s=await tt(t);return ms(e,s,this._publicKey,{lowS:!n,prehash:!1})}async exportPublicKey(e){let t=this._publicKey;if(e==="jwk")return wo(t);switch(e){case"did":return\`did:key:\${ke(xs,t)}\`;case"multikey":return ke(xs,t);case"raw":return t;case"rawHex":return Ee(t)}Ut(e,\`unknown "\${e}" export format\`)}}var Xe=0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn,xo=0xffffffff00000001000000000000000000000000fffffffffffffffffffffffcn,_o=0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604bn,ks=0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n,ko=(Xe+1n)/4n,bo=(e)=>e.reduce((t,r,n)=>t+(BigInt(r)<<BigInt(8*(e.length-n-1))),0n),_s=(e,t)=>Uint8Array.from(Array.from({length:t},(r,n)=>Number(BigInt.asUintN(8,e>>BigInt((t-n-1)*8))))),Eo=(e,t)=>(e=e*e%t,e=e*e%t,e=e*e%t,e=e*e%t,e),Ao=(e,t,r)=>{let n=[1n];for(let s=0;s<15;s++)n.push(n[s]*e%r);return Array.from(t.toString(16)).reduce((s,i)=>Eo(s,r)*n[parseInt(i,16)]%r,1n)},Ir=(e)=>{L(gs(e),"not a compressed point"),L(e.length===33,"invalid compressed point length");let t=bo(e.subarray(1)),r=(t**3n+xo*t+_o)%Xe,n=Ao(r,ko,Xe);if(L(n*n%Xe===r,"invalid curve point"),(e[0]^Number(BigInt.asUintN(1,n)))&1)n=Xe-n;let s=new Uint8Array(65);return s[0]=4,s.set(_s(t,32),1),s.set(_s(n,32),33),s};var bs=Uint8Array.from([128,36]),qh=Uint8Array.from([134,38]),Ze={name:"ECDSA",namedCurve:"P-256",hash:"SHA-256"},Ot,So=async(e,t,r)=>{if(Ot===!0||Rr(e))return crypto.subtle.importKey("raw",e,Ze,t,r);if(Ot===!1)return crypto.subtle.importKey("raw",Ir(e),Ze,t,r);try{let n=await crypto.subtle.importKey("raw",e,Ze,t,r);return Ot=!0,n}catch{let n=await crypto.subtle.importKey("raw",Ir(e),Ze,t,r);return Ot=!1,n}},Ro=Uint8Array.from([48,19,6,7,42,134,72,206,61,2,1,6,8,42,134,72,206,61,3,1,7]),zh=Uint8Array.from([48,65,2,1,0,...Ro,4,39,48,37,2,1,1,4,32]);class Ye{type="p256";jwtAlg="ES256";_publicKey;constructor(e){this._publicKey=e}static async importRaw(e){let t=await So(e,!0,["verify"]);return new Ye(t)}static async importCryptoKey(e){return L(e.algorithm.namedCurve==="P-256","not an ECDSA P-256 key"),L(e.type==="public","not a public key"),L(e.extractable,"key must be extractable"),new Ye(e)}async verify(e,t,r){if(e.length!==64)return!1;if(!r?.allowMalleableSig&&!vs(e,ks))return!1;return await crypto.subtle.verify(Ze,this._publicKey,e,t)}async exportPublicKey(e){if(e==="jwk")return await crypto.subtle.exportKey("jwk",this._publicKey);let t=await crypto.subtle.exportKey("raw",this._publicKey),r=ws(new Uint8Array(t));switch(e){case"did":return\`did:key:\${ke(bs,r)}\`;case"multikey":return ke(bs,r);case"raw":return r;case"rawHex":return Ee(r)}Ut(e,\`unknown "\${e}" export format\`)}}var Po=(e)=>(Pr(e.length>=2&&e[0]==="z","not a multibase base58btc string"),Tt(e.slice(1)));var Io=(e)=>{let t=Po(e);Pr(t.length>=3,"multikey too short");let r=t[0]<<8|t[1],n=t.subarray(2);switch(r){case 32804:return{type:"p256",jwtAlg:"ES256",publicKeyBytes:n};case 59137:return{type:"secp256k1",jwtAlg:"ES256K",publicKeyBytes:n}}L(!1,\`unsupported key type (0x\${r.toString(16).padStart(4,"0")})\`)};var Do=async(e,t,r,n)=>{switch(e.type){case"p256":return await(await Ye.importRaw(e.publicKeyBytes)).verify(t,r,n);case"secp256k1":return await(await jt.importRaw(e.publicKeyBytes)).verify(t,r,n)}};export{br as Client,Tn as CompositeDidDocumentResolver,Ln as CompositeHandleResolver,Nn as DohJsonHandleResolver,Mn as LocalActorResolver,xr as OAuthClient,Bn as PlcDidDocumentResolver,$n as WebDidDocumentResolver,Fn as WellKnownHandleResolver,Nt as generateClientAssertionKey,Io as parsePublicMultikey,Do as verifySig};
` },
  sources: {},
  services: { core: { module: "@tomlarkworthy/brain-core", cell: "core_service", hash: "c4d75d23e7b0f0360cfd5748f9fde602c36146470cf45537dda2678913d947b4", source: `
const _braincore_anon_695c74d22f = function _anonymous(md) {return (md\`# brain-core

The Worker every other Worker is bound to. It routes a method or a path to the Worker that declared it, and keeps what must last: the notebook-side rows, the route table and the rules the owner sets.

It answers bindings only. A caller is who the kernel says it is, and the kernel is known by its key; any other Worker is \\\`worker:NAME\\\`, whatever it claims.\`);};
const _braincore_core_service = function _core_service(cloudflare,coreApp) {return (cloudflare.Worker("core", coreApp, { role: "core" }));};
const _braincore_core_announce = function _core_announce(plugins,core_service,invalidation) {
  plugins.add("workers", core_service, { invalidation });
  return "announced core_service";
};
const _braincore_coreApp = function _coreApp(hono,sha256,rows,config,settings,workers,Request,guard,ruleExpression,checkedRule,decide,callerOf) {
  const app = new hono.Hono();
  const NS = "/xrpc/com.lopecode.brain.";
  const fail = (c, status, error, message) => c.json({ error, message }, status);
  const keys = new Map();
  // What the core forwards to: recipes, and system Workers such as the database.
  const routed = (r) => r.role === "recipe" || r.role === "system";
  const identify = async (request) => {
    const url = new URL(request.url);
    // From the internet only the guard gets this far, and the wrapper has named it.
    if (!url.hostname.endsWith(".internal")) return { caller: request.headers.get("x-brain-caller") === "guard" ? "guard" : "anonymous" };
    const key = request.headers.get("x-brain-key");
    if (!key) return { caller: "anonymous" };
    const hash = await sha256(key);
    if (!keys.has(hash)) {
      const known = await rows.get("key/" + hash);
      if (known) keys.set(hash, known);
    }
    const known = keys.get(hash);
    if (!known) return { caller: "anonymous" };
    if (known.role !== "kernel") return { caller: "worker:" + known.worker };
    return { caller: request.headers.get("x-brain-caller") || "anonymous", via: request.headers.get("x-brain-via") || "" };
  };
  // Every call the core answers or forwards is counted here. The counts are handed, in batches, to whichever
  // Worker declares metrics.record; with none they are dropped. A fault (500 and above, except 501) is sent at once, the rest every 10 s.
  const RECORD = "com.lopecode.brain.metrics.record";
  const tele = { from: 0, buckets: new Map(), errors: [], route: null, routeAt: 0 };
  const flush = async () => {
    const batch = {
      from: tele.from,
      to: Date.now(),
      buckets: [...tele.buckets].map(([k, v]) => {
        const [worker, version, method, caller, status] = k.split("|");
        return { worker, version, method, caller, status: Number(status), ...v };
      }),
      errors: tele.errors
    };
    Object.assign(tele, { from: 0, buckets: new Map(), errors: [] });
    if (Date.now() - tele.routeAt >= (config.metricsRouteMs ?? 60000)) {
      tele.route = (await settings.list("route/")).map((r) => r.value).find((r) => r.methods && r.methods[RECORD]) || null;
      tele.routeAt = Date.now();
    }
    const short = tele.route && tele.route.worker.replace(/^brain-(x-)?/, "");
    if (!short || !workers.has(short)) return;
    await workers.fetch(short, new Request(\`https://\${short}.internal/xrpc/\${RECORD}\`, { method: "POST", headers: { "content-type": "application/json", "x-brain-caller": "worker:brain-core" }, body: JSON.stringify(batch) }));
  };
  const observe = async (c, started) => {
    const url = new URL(c.req.url), target = c.get("target"), status = c.res.status, ms = Date.now() - started;
    const nsid = url.pathname.startsWith(NS) ? url.pathname.slice(NS.length) : null;
    if (nsid && nsid.startsWith("metrics.")) return;
    // Names nobody declared are counted as one, so a stranger cannot grow the table.
    const method = !target && [404, 501].includes(status) ? "(unknown)" : nsid || c.get("path") || url.pathname;
    const who = c.get("who").caller, caller = /^(token|did):/.test(who) ? who.split(":")[0] : who;
    // The version that answered: the forwarded Worker's own header, or this core's.
    const by = (c.res.headers.get("x-brain-served-by") || "").split(",")[0].trim();
    const version = target ? (by.startsWith(target + "@") ? by.slice(target.length + 1) : "") : String((c.env && c.env.BRAIN_INFO && c.env.BRAIN_INFO.hash) || "").slice(0, 12);
    const key = [target || "brain-core", version, method, caller, status].join("|");
    const b = tele.buckets.get(key) || { n: 0, ms: 0, max: 0 };
    tele.buckets.set(key, { n: b.n + 1, ms: b.ms + ms, max: Math.max(b.max, ms) });
    // 501 is the answer to a name nobody declares: the caller's mistake, not a fault.
    if (status >= 500 && status !== 501) tele.errors.push({ t: started, worker: target || "brain-core", version, method, caller, status, ms });
    if (!tele.from) tele.from = started;
    if (tele.errors.length || Date.now() - tele.from >= (config.metricsFlushMs ?? 10000)) await flush();
  };
  app.use("*", async (c, next) => {
    const started = Date.now();
    c.set("who", await identify(c.req.raw));
    await next();
    const done = observe(c, started).catch(() => null);
    try {
      c.executionCtx.waitUntil(done);
    } catch {}
  });
  app.onError((e, c) => fail(c, 500, "InternalServerError", String((e && e.message) || e)));
  // The kernel has already checked a token or a granted DID against the method it named.
  const allowed = (who) => who.caller === "owner" || /^(token|did):/.test(who.caller);
  const owner = async (c, next) => (allowed(c.get("who")) ? next() : fail(c, 401, "AuthRequired", "the owner"));
  const session = async (c, next) =>
    c.get("who").caller === "owner" && c.get("who").via === "session" ? next() : fail(c, 401, "AuthRequired", "the owner's own session");
  const guardOnly = async (c, next) => (c.get("who").caller === "guard" ? next() : fail(c, 401, "AuthRequired", "the guard"));

  const toGuard = async (verdict) => {
    const r = await guard.fetch(new Request("https://guard.internal/xrpc/com.lopecode.brain.infra.verdict", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(verdict) }));
    return r.ok ? r.json() : null;
  };
  // Routes and keys: written by the guard when it deploys or removes a Worker.
  app.post(NS + "service.register", guardOnly, async (c) => {
    const r = await c.req.json();
    const was = await rows.get("route/" + r.worker);
    // A deploy is unverified until a page has loaded its module from the Worker and run its tests.
    // The version before keeps its verdict, so a deploy that is put back returns to a version already verified.
    const same = was && r.hash && was.hash === r.hash, back = was && r.hash && was.before && was.before.hash === r.hash;
    const verified = same ? was.verified || null : back ? was.before.verified : null;
    const before = same ? was.before || null : was && was.hash && !back ? { hash: was.hash, verified: was.verified && was.verified.ok ? was.verified : null } : null;
    await settings.put("route/" + r.worker, { worker: r.worker, role: r.role, module: r.module || null, hash: r.hash || null, verified, before, methods: r.methods || {}, paths: r.paths || [], secrets: r.secrets || [] });
    await rows.put("key/" + r.keyHash, { worker: r.worker, role: r.role });
    return c.json({ ok: true });
  });
  app.post(NS + "service.unregister", guardOnly, async (c) => {
    const { worker } = await c.req.json();
    await settings.delete("route/" + worker);
    for (const { key, value } of await rows.list("key/")) if (value.worker === worker) await rows.delete(key);
    keys.clear();
    return c.json({ ok: true });
  });
  app.get(NS + "service.list", async (c) => c.json({ services: (await rows.list("route/")).map((r) => r.value) }));
  // The page's verdict on a deploy, after it ran the module's tests. A pass marks the hash verified. A fail while
  // the hash is still unverified has the guard put the version before back; a fail after that is only recorded.
  app.post(NS + "deploy.report", owner, async (c) => {
    const { worker, hash, ok, tests = [], reason = "" } = await c.req.json();
    const route = await rows.get("route/" + worker);
    if (!route || !route.hash || route.hash !== hash) return fail(c, 409, "Stale", \`\${worker} is not running \${String(hash).slice(0, 12)}\`);
    const was = route.verified;
    const failed = tests.filter((t) => !t.ok).map((t) => t.name);
    const verdict = { ok: !!ok, at: Date.now(), tests: tests.length, failed, reason: String(reason).slice(0, 300) };
    if (ok) {
      await settings.put("route/" + worker, { ...route, verified: verdict });
      // Every pass is passed on: the same hash deployed again is on probation again, and only the guard knows.
      await toGuard({ worker, hash, ok: true });
      return c.json({ worker, hash, state: "verified" });
    }
    if (was && was.ok) {
      await settings.put("route/" + worker, { ...route, failing: verdict });
      return c.json({ worker, hash, state: "failing" });
    }
    await settings.put("route/" + worker, { ...route, verified: verdict });
    const out = await toGuard({ worker, hash, ok: false, reason: verdict.reason || "failed: " + failed.join(", ") });
    return c.json({ worker, hash, state: out && out.state === "put-back" ? "put-back" : "failed", previous: out ? out.previous || null : null });
  });

  // Rules the owner sets without a deploy. The target is a method's NSID or a path as its service declared it.
  // Only for what a Worker declared, and not for a method its service marked fixed (secret.*). The core's own
  // methods (rule.*, service.*) are decided in this file.
  const declared = async (target) => {
    for (const { value: r } of await rows.list("route/")) {
      if (!routed(r)) continue;
      if (r.methods[target]) return { worker: r.worker, rule: r.methods[target] };
      const p = r.paths.find((x) => x.path === target);
      if (p) return { worker: r.worker, rule: p };
    }
    return null;
  };
  app.get(NS + "rule.list", owner, async (c) => {
    const set = new Map((await rows.list("rule/")).map(({ key, value }) => [key.slice("rule/".length), value]));
    const out = [];
    for (const { value: r } of await rows.list("route/")) {
      if (!routed(r)) continue;
      for (const [target, rule] of [...Object.entries(r.methods), ...r.paths.map((p) => [p.path, p])])
        out.push({ target, worker: r.worker, declared: ruleExpression(rule), set: set.has(target) ? set.get(target).allow : null, setAt: set.has(target) ? set.get(target).setAt : null });
    }
    return c.json({ rules: out.sort((a, b) => (a.target < b.target ? -1 : 1)), ttl: settings.ttl });
  });
  app.post(NS + "rule.put", session, async (c) => {
    const { target, allow } = await c.req.json();
    if (typeof allow !== "string" || !allow.trim()) return fail(c, 400, "InvalidRequest", "allow is a CEL expression");
    const found = await declared(target);
    if (!found) return fail(c, 404, "NotFound", \`no Worker declares \${target}\`);
    if (found.rule.fixed) return fail(c, 403, "Forbidden", \`\${found.worker} fixed the rule for \${target}\`);
    // A rule that does not parse is refused here, not found on the next call.
    try {
      checkedRule(target, allow);
    } catch (e) {
      return fail(c, 400, "InvalidRequest", e.message);
    }
    await settings.put("rule/" + target, { allow, setAt: Date.now() });
    return c.json({ target, allow });
  });
  app.post(NS + "rule.delete", session, async (c) => {
    const { target } = await c.req.json();
    return c.json({ deleted: !!(await settings.delete("rule/" + target)) });
  });

  // The notebook side of the rows platform cell, one table per Worker name.
  const rowKey = (c, q) => "rows/" + (q.worker || "") + "/" + (q.key ?? q.prefix ?? "");
  app.get(NS + "rows.get", owner, async (c) => c.json({ value: await rows.get(rowKey(c, c.req.query())) }));
  app.get(NS + "rows.list", owner, async (c) => {
    const q = c.req.query(), base = "rows/" + (q.worker || "") + "/";
    return c.json({ rows: (await rows.list(base + (q.prefix || ""))).map(({ key, value }) => ({ key: key.slice(base.length), value })) });
  });
  app.post(NS + "rows.put", owner, async (c) => {
    const q = await c.req.json();
    return c.json({ ok: await rows.put(rowKey(c, q), q.value) });
  });
  app.post(NS + "rows.delete", owner, async (c) => c.json({ deleted: await rows.delete(rowKey(c, await c.req.json())) }));

  // getInfo for a named Worker, then everything a Worker declared.
  const forward = (route, c, path) => {
    const url = new URL(c.req.url), who = c.get("who");
    const short = route.worker.replace(/^brain-(x-)?/, "");
    c.set("target", route.worker);
    if (!workers.has(short)) return fail(c, 502, "UpstreamUnavailable", \`\${route.worker} is not bound to the core\`);
    const headers = new Headers(c.req.raw.headers);
    for (const name of [...headers.keys()]) if (name.startsWith("x-brain-")) headers.delete(name);
    headers.set("x-brain-caller", who.caller);
    if (who.via) headers.set("x-brain-via", who.via);
    const bodied = !["GET", "HEAD"].includes(c.req.method);
    return workers.fetch(short, new Request("https://" + short + ".internal" + (path || url.pathname + url.search), { method: c.req.method, headers, body: bodied ? c.req.raw.body : undefined, duplex: bodied ? "half" : undefined, redirect: "manual" }));
  };
  // A Worker's manifest and source, for anyone. The wrapper has already answered for the core itself.
  for (const what of ["getInfo", "getSource"])
    app.get(NS + what, async (c) => {
      const name = c.req.query("worker") || "brain-core";
      const route = await settings.get("route/" + name);
      if (!route || !routed(route)) return fail(c, 404, "NotFound", name);
      return forward(route, c, NS + what + "?worker=" + encodeURIComponent(name));
    });
  app.all("*", async (c) => {
    const url = new URL(c.req.url), who = c.get("who");
    // The route table and the owner's rules are read through a few seconds of memory, not from storage on every call.
    const routes = (await settings.list("route/")).map((r) => r.value).filter(routed);
    const nsid = url.pathname.startsWith("/xrpc/") ? url.pathname.slice("/xrpc/".length) : null;
    for (const route of routes) {
      const method = nsid && route.methods[nsid];
      const path = !nsid && route.paths.find((p) => p.path === url.pathname || (p.path.endsWith("/*") && url.pathname.startsWith(p.path.slice(0, -1))));
      const rule = method || path;
      if (!rule) continue;
      if (path) c.set("path", path.path);
      if (method && (method.type === "query") !== (c.req.method === "GET")) return fail(c, 405, "InvalidRequest", \`\${nsid} is a \${method.type}\`);
      // The rule is one CEL expression over the caller and the request. Anything but true is a refusal.
      // A rule the owner has set for this method or path stands in for the one the service declared.
      const set = (await settings.list("rule/")).find((r) => r.key === "rule/" + (nsid || path.path))?.value;
      const verdict = decide(set ? { allow: set.allow } : rule, { caller: callerOf(who), request: { method: nsid || "", path: url.pathname, verb: c.req.method, params: Object.fromEntries(url.searchParams) } });
      if (verdict.allow) return forward(route, c);
      return verdict.error ? fail(c, 403, "Forbidden", "the rule for this could not be decided") : fail(c, 401, "AuthRequired", "not allowed by the rule for this");
    }
    return nsid ? fail(c, 501, "MethodNotImplemented", nsid) : c.text("not found", 404);
  });
  return app;
};
const _braincore_anon_e58c28a924 = function _anonymous(md) {return (md\`## Tests

The core runs under \\\`simulate\\\`. \\\`coreRig\\\` registers a kernel and one recipe the way the guard would, then calls as each kind of caller.\`);};
const _braincore_coreRig = function _coreRig(simulate,core_service,Response,sha256) {return (async ({ config = {}, workers: more = {} } = {}) => {
  const seen = [], toGuard = [];
  const sim = await simulate(core_service, {
    secrets: { BRAIN_KEY: "core-key" },
    config,
    guard: async (request) => {
      const body = await request.json();
      toGuard.push({ path: new URL(request.url).pathname, key: request.headers.get("x-brain-key"), body });
      return Response.json(body.ok ? { state: "kept" } : { state: "put-back", previous: "h0" });
    },
    workers: {
      echo: async (request) => {
        const body = ["GET", "HEAD"].includes(request.method) ? null : new TextDecoder().decode(await request.arrayBuffer());
        seen.push({ url: request.url, method: request.method, caller: request.headers.get("x-brain-caller"), cookie: request.headers.get("cookie"), key: request.headers.get("x-brain-key"), body });
        return request.url.includes("/redirect") ? new Response(null, { status: 302, headers: { location: "https://example.com/" } }) : Response.json({ echoed: new URL(request.url).pathname });
      },
      ...more
    }
  });
  const X = "/xrpc/com.lopecode.brain.";
  const send = (base, headers) => async (path, body, extra = {}) => {
    const r = await sim.fetch(base + (path.startsWith("/") ? path : X + path), {
      method: body === undefined ? "GET" : "POST",
      headers: { ...headers, ...extra, ...(body === undefined ? {} : { "content-type": "application/json" }) },
      body: body === undefined ? undefined : typeof body === "string" || body instanceof Uint8Array ? body : JSON.stringify(body),
      redirect: "manual"
    });
    const text = await r.text();
    let data = text;
    try { data = JSON.parse(text); } catch {}
    return { status: r.status, data, headers: r.headers };
  };
  const guard = send("https://cb-core.sub.workers.dev", { "x-brain-guard": "core-key" });
  const as = (caller, via = "session") => send("https://core.internal", { "x-brain-key": "kernel-key", "x-brain-caller": caller, "x-brain-via": via });
  const worker = send("https://core.internal", { "x-brain-key": "echo-key", "x-brain-caller": "owner" });
  await guard("service.register", { worker: "brain", role: "kernel", methods: {}, paths: [], secrets: [], keyHash: await sha256("kernel-key") });
  await guard("service.register", {
    worker: "brain-x-echo",
    role: "recipe",
    methods: { "com.lopecode.brain.echo.say": { type: "procedure", who: "owner" }, "com.lopecode.brain.echo.read": { type: "query", who: "anyone" }, "com.lopecode.brain.echo.key": { type: "query", who: "owner", fixed: true } },
    paths: [{ path: "/hooks/echo", who: "anyone" }, { path: "/redirect", who: "anyone" }, { path: "/private", who: "owner" }],
    secrets: ["ECHO_KEY"],
    hash: "h1",
    module: "@tomlarkworthy/echo",
    keyHash: await sha256("echo-key")
  });
  return { sim, seen, toGuard, guard, as, worker, owner: as("owner"), anonymous: as("anonymous", ""), nobody: send("https://core.internal", {}) };
});};
const _braincore_test_calls_are_counted_and_handed_to_the_metrics_service = async function _test_calls_are_counted_and_handed_to_the_metrics_service(Response,coreRig,expect) {
  const batches = [];
  const workers = {
    metrics: async (request) => (batches.push({ caller: request.headers.get("x-brain-caller"), ...(await request.json()) }), Response.json({ stored: 1 })),
    broken: async () => new Response("boom", { status: 500 })
  };
  const settle = () => new Promise((r) => setTimeout(r, 20));
  // The counter is the Worker's own state and outlives a rig, so both waits are set to nothing here.
  const rig = await coreRig({ config: { metricsFlushMs: 0, metricsRouteMs: 0 }, workers });
  const reg = (worker, methods) => rig.guard("service.register", { worker, role: "recipe", methods, paths: [], secrets: [], keyHash: worker });
  await reg("brain-x-metrics", { "com.lopecode.brain.metrics.record": { type: "procedure", who: "worker:brain-core" }, "com.lopecode.brain.metrics.query": { type: "query", who: "owner" } });
  await reg("brain-x-broken", { "com.lopecode.brain.broken.go": { type: "procedure", who: "owner" } });
  await settle();
  batches.length = 0;
  await rig.owner("echo.say", { text: "hi" });
  await rig.anonymous("/hooks/echo");
  await rig.anonymous("made.up.name");
  await rig.owner("broken.go", {});
  // Its own traffic is not counted.
  await rig.owner("metrics.query");
  await settle();
  expect(batches.every((b) => b.caller === "worker:brain-core")).toBe(true);
  const got = batches.flatMap((b) => b.buckets).map((b) => [b.worker, b.method, b.caller, b.status, b.n]);
  // The broken Worker here is a bare function with no wrapper, so it names no version; the core names its own.
  expect(batches.flatMap((b) => b.buckets).map((b) => b.version)).toEqual(["", "", rig.sim.emitted.hash.slice(0, 12), ""]);
  expect(got).toEqual([
    ["brain-x-echo", "echo.say", "owner", 200, 1],
    ["brain-x-echo", "/hooks/echo", "anonymous", 200, 1],
    ["brain-core", "(unknown)", "anonymous", 501, 1],
    ["brain-x-broken", "broken.go", "owner", 500, 1]
  ]);
  expect(batches.flatMap((b) => b.errors)).toMatchObject([{ worker: "brain-x-broken", method: "broken.go", status: 500 }]);
  return got.length + " counted";
};
const _braincore_test_routes_by_method_and_path = async function _test_routes_by_method_and_path(coreRig,expect) {
  const rig = await coreRig();
  expect((await rig.owner("echo.say", { text: "hi" })).data).toEqual({ echoed: "/xrpc/com.lopecode.brain.echo.say" });
  expect(rig.seen[0]).toMatchObject({ method: "POST", caller: "owner", body: '{"text":"hi"}', key: null });
  expect((await rig.anonymous("/hooks/echo?hub.challenge=7")).status).toBe(200);
  expect(rig.seen[1]).toMatchObject({ caller: "anonymous", url: "https://echo.internal/hooks/echo?hub.challenge=7" });
  // A redirect from a recipe reaches the caller as a redirect.
  expect((await rig.anonymous("/redirect")).status).toBe(302);
  expect((await rig.owner("nothing.here")).data).toEqual({ error: "MethodNotImplemented", message: "com.lopecode.brain.nothing.here" });
  expect((await rig.owner("/nowhere")).status).toBe(404);
  return rig.seen.length + " forwarded";
};
const _braincore_test_a_deploy_is_unverified_until_its_tests_are_reported = async function _test_a_deploy_is_unverified_until_its_tests_are_reported(coreRig,expect,sha256) {
  const rig = await coreRig();
  const echo = async () => (await rig.owner("service.list")).data.services.find((s) => s.worker === "brain-x-echo");
  expect(await echo()).toMatchObject({ hash: "h1", module: "@tomlarkworthy/echo", verified: null });
  // Not the owner, or not the hash that is running: nothing changes.
  expect((await rig.anonymous("deploy.report", { worker: "brain-x-echo", hash: "h1", ok: true })).status).toBe(401);
  expect((await rig.owner("deploy.report", { worker: "brain-x-echo", hash: "old", ok: false })).data.error).toBe("Stale");
  expect(rig.toGuard).toEqual([]);
  // A fail while unverified goes to the guard, which puts the version before back.
  const failed = await rig.owner("deploy.report", { worker: "brain-x-echo", hash: "h1", ok: false, tests: [{ name: "test_a", ok: true }, { name: "test_b", ok: false }] });
  expect(failed.data).toEqual({ worker: "brain-x-echo", hash: "h1", state: "put-back", previous: "h0" });
  expect(rig.toGuard[0]).toMatchObject({ path: "/xrpc/com.lopecode.brain.infra.verdict", key: "core-key", body: { worker: "brain-x-echo", hash: "h1", ok: false, reason: "failed: test_b" } });
  expect((await echo()).verified).toMatchObject({ ok: false, failed: ["test_b"] });
  // A pass marks it verified and tells the guard, each time.
  expect((await rig.owner("deploy.report", { worker: "brain-x-echo", hash: "h1", ok: true, tests: [{ name: "test_a", ok: true }] })).data.state).toBe("verified");
  expect((await rig.owner("deploy.report", { worker: "brain-x-echo", hash: "h1", ok: true })).data.state).toBe("verified");
  expect(rig.toGuard.map((g) => g.body.ok)).toEqual([false, true, true]);
  // A fail after that is recorded and nothing is put back.
  expect((await rig.owner("deploy.report", { worker: "brain-x-echo", hash: "h1", ok: false, tests: [{ name: "test_a", ok: false }] })).data.state).toBe("failing");
  expect(rig.toGuard.length).toBe(3);
  expect(await echo()).toMatchObject({ verified: { ok: true }, failing: { failed: ["test_a"] } });
  // The same hash registered again stays verified; a new hash starts unverified.
  const again = { worker: "brain-x-echo", role: "recipe", methods: {}, paths: [], secrets: [], keyHash: await sha256("echo-key") };
  await rig.guard("service.register", { ...again, hash: "h1" });
  expect((await echo()).verified.ok).toBe(true);
  await rig.guard("service.register", { ...again, hash: "h2" });
  expect((await echo()).verified).toBe(null);
  // Put back to h1: the verdict it had comes back with it.
  await rig.guard("service.register", { ...again, hash: "h1" });
  expect((await echo()).verified.ok).toBe(true);
  return "unverified, put back, verified, failing";
};
const _braincore_test_a_worker_calls_a_method_not_a_worker = async function _test_a_worker_calls_a_method_not_a_worker(coreRig,sha256,expect) {
  const rig = await coreRig();
  await rig.guard("service.register", {
    worker: "brain-x-other", role: "recipe", keyHash: await sha256("other-key"), paths: [], secrets: [],
    methods: { "com.lopecode.brain.other.forWorkers": { type: "procedure", who: "workers" }, "com.lopecode.brain.other.forEcho": { type: "procedure", who: "worker:brain-x-echo" }, "com.lopecode.brain.other.forOwner": { type: "procedure", who: "owner" } }
  });
  // No binding to brain-x-other in this rig: 502 means the core let the call through and tried to forward it.
  const status = async (method) => (await rig.worker(method, {})).status;
  expect([await status("other.forWorkers"), await status("other.forEcho"), await status("other.forOwner")]).toEqual([502, 502, 401]);
  expect((await rig.anonymous("other.forWorkers", {})).status).toBe(401);
  // The guard is let through where any Worker is, and nowhere else.
  const asGuard = async (method) => (await rig.guard(method, {})).status;
  expect([await asGuard("other.forWorkers"), await asGuard("other.forEcho"), await asGuard("other.forOwner")]).toEqual([502, 401, 401]);
  // Anyone may read a Worker's manifest and source: the core passes the question on.
  expect((await rig.anonymous("getSource?worker=brain-x-echo")).status).toBe(200);
  expect(rig.seen.at(-1)).toMatchObject({ url: "https://echo.internal/xrpc/com.lopecode.brain.getSource?worker=brain-x-echo" });
  expect((await rig.anonymous("getSource?worker=brain-x-nobody")).status).toBe(404);
  return "by method";
};
const _braincore_test_a_rule_can_be_an_expression = async function _test_a_rule_can_be_an_expression(coreRig,sha256,expect) {
  const rig = await coreRig();
  const X = "com.lopecode.brain.other.";
  await rig.guard("service.register", {
    worker: "brain-x-other", role: "recipe", keyHash: await sha256("other-key"), secrets: [],
    methods: {
      [X + "friends"]: { type: "procedure", who: "owner", allow: 'caller.did in ["did:plc:friend"]' },
      [X + "read"]: { type: "query", who: "owner", allow: 'caller.trusted || request.params.name.startsWith("pub/")' },
      [X + "broken"]: { type: "procedure", who: "anyone", allow: "caller.nothing == 1" }
    },
    paths: [{ path: "/open/*", allow: 'request.verb == "GET"' }]
  });
  // No binding to brain-x-other in this rig: 502 means the core let the call through and tried to forward it.
  expect((await rig.as("did:plc:friend", "jwt")("other.friends", {})).status).toBe(502);
  expect((await rig.as("did:plc:stranger", "jwt")("other.friends", {})).status).toBe(401);
  // The expression is the whole decision: this one does not name the owner.
  expect((await rig.owner("other.friends", {})).status).toBe(401);
  expect((await rig.anonymous("other.read?name=pub/a")).status).toBe(502);
  expect((await rig.anonymous("other.read?name=private/a")).status).toBe(401);
  expect((await rig.owner("other.read?name=private/a")).status).toBe(502);
  // A rule that cannot be decided refuses, and says so without the expression.
  const none = await rig.anonymous("other.read");
  expect([none.status, none.data.error]).toEqual([403, "Forbidden"]);
  expect((await rig.owner("other.broken", {})).status).toBe(403);
  expect((await rig.anonymous("/open/a")).status).toBe(502);
  expect((await rig.anonymous("/open/a", {})).status).toBe(401);
  return "by DID, by parameter, by verb";
};
const _braincore_test_the_owner_sets_a_rule_without_a_deploy = async function _test_the_owner_sets_a_rule_without_a_deploy(coreRig,expect) {
  const rig = await coreRig();
  // echo.say is declared for the owner. 200 is the echo recipe answering.
  expect((await rig.anonymous("echo.say", {})).status).toBe(401);
  const put = await rig.owner("rule.put", { target: "com.lopecode.brain.echo.say", allow: 'caller.kind == "anonymous" || caller.session' });
  expect([put.status, put.data.target]).toEqual([200, "com.lopecode.brain.echo.say"]);
  expect((await rig.anonymous("echo.say", {})).status).toBe(200);
  // The set rule stands in for the declared one: a token passed the declared rule and does not pass this.
  expect((await rig.as("token:laptop", "token")("echo.say", {})).status).toBe(401);
  const listed = (await rig.owner("rule.list")).data.rules.find((r) => r.target === "com.lopecode.brain.echo.say");
  expect(listed).toMatchObject({ worker: "brain-x-echo", declared: "caller.trusted", set: 'caller.kind == "anonymous" || caller.session' });
  // Only the owner's own session sets one; it must parse; it must name something a Worker declared.
  expect((await rig.as("token:laptop", "token")("rule.put", { target: "com.lopecode.brain.echo.say", allow: "true" })).status).toBe(401);
  expect((await rig.worker("rule.put", { target: "com.lopecode.brain.echo.say", allow: "true" })).status).toBe(401);
  expect((await rig.owner("rule.put", { target: "com.lopecode.brain.echo.say", allow: "caller.kind ==" })).status).toBe(400);
  expect((await rig.owner("rule.put", { target: "com.lopecode.brain.rule.put", allow: "true" })).status).toBe(404);
  // A method its service marked fixed keeps the declared rule.
  expect((await rig.owner("rule.put", { target: "com.lopecode.brain.echo.key", allow: "true" })).status).toBe(403);
  expect((await rig.anonymous("echo.key")).status).toBe(401);
  expect((await rig.owner("rule.delete", { target: "com.lopecode.brain.echo.say" })).data).toEqual({ deleted: true });
  expect((await rig.anonymous("echo.say", {})).status).toBe(401);
  expect((await rig.as("token:laptop", "token")("echo.say", {})).status).toBe(200);
  return "set, listed, refused 4 ways, deleted";
};
const _braincore_test_owner_methods_refuse_other_callers = async function _test_owner_methods_refuse_other_callers(coreRig,expect) {
  const rig = await coreRig();
  expect((await rig.anonymous("echo.say", {})).status).toBe(401);
  expect((await rig.anonymous("/private")).status).toBe(401);
  expect((await rig.anonymous("echo.read")).status).toBe(200);
  expect((await rig.anonymous("rule.list")).status).toBe(401);
  // A token or a granted DID has been checked against the method by the kernel.
  expect((await rig.as("token:laptop", "token")("echo.say", {})).status).toBe(200);
  // No key, or a recipe claiming to be the owner, is not the owner.
  expect((await rig.nobody("rule.list", undefined, { "x-brain-caller": "owner" })).status).toBe(401);
  expect((await rig.worker("rule.list")).status).toBe(401);
  expect((await rig.worker("service.register", { worker: "brain-x-echo", role: "kernel", keyHash: "x" })).status).toBe(401);
  expect(rig.seen.length).toBe(2);
  return "401 for anonymous, keyless and a recipe naming itself owner";
};
const _braincore_test_notebook_rows_per_worker = async function _test_notebook_rows_per_worker(coreRig,expect) {
  const rig = await coreRig();
  await rig.owner("rows.put", { worker: "whatsapp", key: "linked", value: "+4915" });
  await rig.owner("rows.put", { worker: "digest", key: "linked", value: "other" });
  expect((await rig.owner("rows.get?worker=whatsapp&key=linked")).data).toEqual({ value: "+4915" });
  expect((await rig.owner("rows.list?worker=whatsapp")).data.rows).toEqual([{ key: "linked", value: "+4915" }]);
  expect((await rig.anonymous("rows.get?worker=whatsapp&key=linked")).status).toBe(401);
  return "two tables";
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_braincore_anon_695c74d22f", null, ["md"], _braincore_anon_695c74d22f);  
  $def("_braincore_core_service", "core_service", ["cloudflare","coreApp"], _braincore_core_service);  
  $def("_braincore_core_announce", "core_announce", ["plugins","core_service","invalidation"], _braincore_core_announce);  
  $def("_braincore_coreApp", "coreApp", ["hono","sha256","rows","config","settings","workers","Request","guard","ruleExpression","checkedRule","decide","callerOf"], _braincore_coreApp);  
  $def("_braincore_anon_e58c28a924", null, ["md"], _braincore_anon_e58c28a924);  
  $def("_braincore_coreRig", "coreRig", ["simulate","core_service","Response","sha256"], _braincore_coreRig);  
  $def("_braincore_test_calls_are_counted_and_handed_to_the_metrics_service", "test_calls_are_counted_and_handed_to_the_metrics_service", ["Response","coreRig","expect"], _braincore_test_calls_are_counted_and_handed_to_the_metrics_service);  
  $def("_braincore_test_routes_by_method_and_path", "test_routes_by_method_and_path", ["coreRig","expect"], _braincore_test_routes_by_method_and_path);  
  $def("_braincore_test_a_deploy_is_unverified_until_its_tests_are_reported", "test_a_deploy_is_unverified_until_its_tests_are_reported", ["coreRig","expect","sha256"], _braincore_test_a_deploy_is_unverified_until_its_tests_are_reported);  
  $def("_braincore_test_a_worker_calls_a_method_not_a_worker", "test_a_worker_calls_a_method_not_a_worker", ["coreRig","sha256","expect"], _braincore_test_a_worker_calls_a_method_not_a_worker);  
  $def("_braincore_test_a_rule_can_be_an_expression", "test_a_rule_can_be_an_expression", ["coreRig","sha256","expect"], _braincore_test_a_rule_can_be_an_expression);  
  $def("_braincore_test_the_owner_sets_a_rule_without_a_deploy", "test_the_owner_sets_a_rule_without_a_deploy", ["coreRig","expect"], _braincore_test_the_owner_sets_a_rule_without_a_deploy);  
  $def("_braincore_test_owner_methods_refuse_other_callers", "test_owner_methods_refuse_other_callers", ["coreRig","expect"], _braincore_test_owner_methods_refuse_other_callers);  
  $def("_braincore_test_notebook_rows_per_worker", "test_notebook_rows_per_worker", ["coreRig","expect"], _braincore_test_notebook_rows_per_worker);  
  main.define("module @tomlarkworthy/cloudflare-iac", async () => runtime.module((await import("/@tomlarkworthy/cloudflare-iac.js?v=4")).default));  
  main.define("cloudflare", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("cloudflare", _));  
  main.define("rows", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("rows", _));  
  main.define("workers", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("workers", _));  
  main.define("guard", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("guard", _));  
  main.define("config", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("config", _));  
  main.define("hono", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("hono", _));  
  main.define("decide", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("decide", _));  
  main.define("callerOf", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("callerOf", _));  
  main.define("ruleExpression", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("ruleExpression", _));  
  main.define("checkedRule", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("checkedRule", _));  
  main.define("settings", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("settings", _));  
  main.define("simulate", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("simulate", _));  
  main.define("sha256", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("sha256", _));  
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));  
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));  
  main.define("module @tomlarkworthy/plugin-registry", async () => runtime.module((await import("/@tomlarkworthy/plugin-registry.js?v=4")).default));  
  main.define("plugins", ["module @tomlarkworthy/plugin-registry", "@variable"], (_, v) => v.import("plugins", _));
  return main;
}` }, db: { module: "@tomlarkworthy/brain-db", cell: "db_service", hash: "77112fade37b19db147f3e4c1d6111f6dcb25fd96db7a3ced3a6b112b97a59d4", source: `
const _braindb_anon_7385d65d30 = function _anonymous(md) {return (md\`# brain-db

Key-value tables kept by a Cloud Brain, each behind a rule.

| | |
|---|---|
| Worker | \\\`brain-db\\\`, a system Worker: the core routes to it, and it is deployed under probation like the core |
| \\\`db.get\\\` | query. \\\`?db=&table=&key=\\\`. \\\`{ value }\\\`, \\\`null\\\` when absent. |
| \\\`db.list\\\` | query. \\\`?db=&table=&prefix=&limit=100\\\`. \\\`{ rows: [{ key, value }] }\\\`, in key order. |
| \\\`db.put\\\` | procedure. \\\`{ db, table, key, value, ifAbsent }\\\`. \\\`{ put }\\\`; with \\\`ifAbsent\\\`, \\\`put\\\` is false when the key exists. |
| \\\`db.delete\\\` | procedure. \\\`{ db, table, key }\\\`. \\\`{ deleted }\\\` |
| \\\`db.increment\\\` | procedure. \\\`{ db, table, key }\\\`. \\\`{ value }\\\`: the number at the key plus one, in one step. |
| \\\`db.tables\\\` | query, owner. \\\`?db=\\\`. \\\`{ tables: [{ db, table, rule, declared }] }\\\`; without \\\`db\\\`, every database. |
| \\\`db.setRule\\\` | procedure, the owner's own session. \\\`{ db, table, allow }\\\`. \\\`allow: null\\\` removes the rule. |
| Storage | \\\`rows\\\`, which is the Brain's D1 database: \\\`d/<db>/<table>/<key>\\\`, \\\`table/<db>/<table>\\\`, \\\`rule/<db>/<table>\\\` |

A database and a table are named with \\\`A-Z a-z 0-9 _ . -\\\`, at most 60 characters. A key is at most 400 characters and a value at most 100,000 bytes of JSON.

## Rules

The core lets a signed-in caller or a Worker call any of these methods, and lets anyone call \\\`db.get\\\` and \\\`db.list\\\`. This Worker then decides per table, with the same expressions as a method's rule (*Access rules* in \\\`@tomlarkworthy/cloudflare-iac\\\`).

| | |
|---|---|
| no rule | the owner, or a token of theirs |
| \\\`setRule { db, table: "notes", allow }\\\` | that table |
| \\\`setRule { db, table: "*", allow }\\\` | every table of the database with no rule of its own |

An expression reads \\\`caller\\\` as a method's rule does, and:

| | |
|---|---|
| \\\`resource.db\\\`, \\\`resource.table\\\` | the names |
| \\\`resource.op\\\` | \\\`read\\\` for \\\`get\\\` and \\\`list\\\`, \\\`write\\\` for \\\`put\\\`, \\\`delete\\\` and \\\`increment\\\` |
| \\\`resource.key\\\` | the key; for \\\`list\\\`, the prefix |

\\\`\\\`\\\`js
await client.procedure("db.setRule", { db: "site", table: "posts", allow: 'resource.op == "read" || caller.session' })
await client.procedure("db.setRule", { db: "site", table: "drafts", allow: 'caller.worker == "brain-x-library"' })
// each account reads and writes only keys that start with its own DID
await client.procedure("db.setRule", { db: "site", table: "profiles", allow: 'caller.kind == "did" && resource.key.startsWith(caller.did + "/")' })
\\\`\\\`\\\`

A rule set here is read through 5 s of memory, so another instance of the Worker follows a change within that.\`);};
const _braindb_dbView = function _dbView(dbPanel,client,session) {return (dbPanel({ client, owner: !!(session && session.owner) }));};
const _braindb_db_service = function _db_service(cloudflare,dbApp) {return (cloudflare.Worker("db", dbApp, {
  role: "system",
  methods: {
    "com.lopecode.brain.db.get": { type: "query", who: "anyone" },
    "com.lopecode.brain.db.list": { type: "query", who: "anyone" },
    "com.lopecode.brain.db.put": { type: "procedure", who: "workers" },
    "com.lopecode.brain.db.delete": { type: "procedure", who: "workers" },
    "com.lopecode.brain.db.increment": { type: "procedure", who: "workers" },
    "com.lopecode.brain.db.tables": { type: "query", who: "owner" },
    "com.lopecode.brain.db.setRule": { type: "procedure", who: "owner" },
    // Secrets. Their rules at the core are fixed: rule.put cannot open them.
    "com.lopecode.brain.secret.list": { type: "query", who: "owner", fixed: true },
    "com.lopecode.brain.secret.get": { type: "query", who: "owner", allow: 'caller.session || caller.kind == "worker"', fixed: true },
    "com.lopecode.brain.secret.put": { type: "procedure", who: "owner", allow: "caller.session", fixed: true },
    "com.lopecode.brain.secret.delete": { type: "procedure", who: "owner", allow: "caller.session", fixed: true },
    "com.lopecode.brain.secret.setRule": { type: "procedure", who: "owner", allow: "caller.session", fixed: true }
  }
}));};
const _braindb_db_announce = function _db_announce(plugins,db_service,invalidation) {
  plugins.add("workers", db_service, { invalidation });
  return "announced db_service";
};
const _braindb_dbApp = function _dbApp(hono,settings,decide,callerOf,rows,checkedRule) {
  const app = new hono.Hono();
  const NS = "/xrpc/com.lopecode.brain.db.";
  const MAX = 100000;
  const fail = (c, status, error, message) => c.json({ error, message }, status);
  const named = (s) => typeof s === "string" && /^[A-Za-z0-9_.-]{1,60}$/.test(s);
  const who = (c) => ({ caller: c.req.header("x-brain-caller") || "anonymous", via: c.req.header("x-brain-via") || "" });
  // The table's rule, else the database's "*", else the owner and their tokens.
  const OWNER = { allow: 'caller.kind in ["owner", "token"]' };
  const ruleFor = async (db, table) => (await settings.get(\`rule/\${db}/\${table}\`)) || (await settings.get(\`rule/\${db}/*\`)) || OWNER;
  // null when the call may go ahead, else the refusal.
  const refused = async (c, { db, table, key = "" }, op) => {
    if (!named(db) || !named(table)) return fail(c, 400, "InvalidRequest", "db and table are 1 to 60 of A-Z a-z 0-9 _ . -");
    if (typeof key !== "string" || key.length > 400) return fail(c, 400, "InvalidRequest", "key is a string of at most 400 characters");
    const verdict = decide(await ruleFor(db, table), { caller: callerOf(who(c)), resource: { db, table, op, key } });
    return verdict.allow ? null : fail(c, who(c).caller === "anonymous" ? 401 : 403, who(c).caller === "anonymous" ? "AuthRequired" : "Forbidden", \`\${db}/\${table} is not open to this caller for \${op}\`);
  };
  const at = (q, key = q.key || "") => \`d/\${q.db}/\${q.table}/\${key}\`;
  // A table is known from its first write, so it can be listed without reading every key.
  const note = async (db, table) => {
    if (await settings.get(\`table/\${db}/\${table}\`)) return;
    await settings.put(\`table/\${db}/\${table}\`, { createdAt: Date.now() });
  };
  app.get(NS + "get", async (c) => {
    const q = c.req.query();
    const no = await refused(c, q, "read");
    if (no) return no;
    return c.json({ value: (await rows.get(at(q))) ?? null });
  });
  app.get(NS + "list", async (c) => {
    const q = c.req.query(), prefix = q.prefix || "";
    const no = await refused(c, { db: q.db, table: q.table, key: prefix }, "read");
    if (no) return no;
    const base = at(q, "");
    const limit = Math.max(1, Math.min(1000, Number(q.limit) || 100));
    const found = await rows.list(base + prefix);
    return c.json({ rows: found.slice(0, limit).map(({ key, value }) => ({ key: key.slice(base.length), value })), more: found.length > limit });
  });
  app.post(NS + "put", async (c) => {
    const q = await c.req.json().catch(() => ({}));
    const no = await refused(c, q, "write");
    if (no) return no;
    if (q.value === undefined) return fail(c, 400, "InvalidRequest", "value");
    if (JSON.stringify(q.value).length > MAX) return fail(c, 413, "TooLarge", \`a value is at most \${MAX} bytes of JSON\`);
    await note(q.db, q.table);
    return c.json({ put: q.ifAbsent ? await rows.putIfAbsent(at(q), q.value) : await rows.put(at(q), q.value) });
  });
  app.post(NS + "delete", async (c) => {
    const q = await c.req.json().catch(() => ({}));
    const no = await refused(c, q, "write");
    if (no) return no;
    return c.json({ deleted: !!(await rows.delete(at(q))) });
  });
  app.post(NS + "increment", async (c) => {
    const q = await c.req.json().catch(() => ({}));
    const no = await refused(c, q, "write");
    if (no) return no;
    await note(q.db, q.table);
    return c.json({ value: await rows.increment(at(q)) });
  });
  const owner = (c) => who(c).caller === "owner";
  app.get(NS + "tables", async (c) => {
    if (!owner(c)) return fail(c, 401, "AuthRequired", "the owner");
    const only = c.req.query("db") || "";
    const seen = new Map();
    const add = (key, more) => {
      const [db, ...rest] = key.split("/"), table = rest.join("/");
      if (only && db !== only) return;
      seen.set(db + "/" + table, { db, table, rule: null, declared: false, ...(seen.get(db + "/" + table) || {}), ...more });
    };
    for (const { key } of await rows.list("table/")) add(key.slice("table/".length), { declared: true });
    for (const { key, value } of await rows.list("rule/")) add(key.slice("rule/".length), { rule: value.allow });
    return c.json({ tables: [...seen.values()].sort((a, b) => (a.db + "/" + a.table < b.db + "/" + b.table ? -1 : 1)), ttl: settings.ttl });
  });
  app.post(NS + "setRule", async (c) => {
    const me = who(c);
    if (me.caller !== "owner" || me.via !== "session") return fail(c, 401, "AuthRequired", "the owner's own session");
    const { db, table, allow = null } = await c.req.json().catch(() => ({}));
    if (!named(db) || !(table === "*" || named(table))) return fail(c, 400, "InvalidRequest", "db, and a table or *");
    if (allow === null) return c.json({ db, table, allow: null, deleted: !!(await settings.delete(\`rule/\${db}/\${table}\`)) });
    try {
      checkedRule(\`\${db}/\${table}\`, allow);
    } catch (e) {
      return fail(c, 400, "InvalidRequest", e.message);
    }
    await settings.put(\`rule/\${db}/\${table}\`, { allow, setAt: Date.now() });
    return c.json({ db, table, allow });
  });
  // Secrets: secret/<NAME> in this Worker's rows, apart from the tables, so no db.* method reaches one. The guard
  // reads them from the database itself when it deploys a Worker that names one.
  const S = "/xrpc/com.lopecode.brain.secret.";
  const secretName = (n) => typeof n === "string" && /^[A-Z][A-Z0-9_]*$/.test(n) && !/^(BRAIN_|CF_)/.test(n);
  const own = (c) => callerOf(who(c)).session;
  const sessionOnly = async (c, next) => (own(c) ? next() : fail(c, 401, "AuthRequired", "the owner's own session"));
  app.get(S + "list", async (c) => {
    if (!callerOf(who(c)).trusted) return fail(c, 401, "AuthRequired", "the owner");
    const rules = new Map((await rows.list("secretrule/")).map(({ key, value }) => [key.slice("secretrule/".length), value.allow]));
    return c.json({ secrets: (await rows.list("secret/")).map(({ key, value }) => ({ name: key.slice("secret/".length), setAt: value.setAt, rule: rules.get(key.slice("secret/".length)) || null })) });
  });
  // The owner's own session reads any secret. A Worker reads one only where the owner set a rule that allows it.
  // Nobody else does, whatever the rule says: not a token, not a granted account, not an anonymous caller.
  app.get(S + "get", async (c) => {
    const name = c.req.query("name"), me = callerOf(who(c));
    if (!me.session && me.kind !== "worker") return fail(c, 401, "AuthRequired", "the owner's own session, or a Worker a rule allows");
    if (!me.session) {
      const rule = await settings.get("secretrule/" + name);
      if (!rule || !decide(rule, { caller: me, resource: { name, op: "read" } }).allow) return fail(c, 403, "Forbidden", \`\${name} is not open to \${me.id}\`);
    }
    const s = await rows.get("secret/" + name);
    return s ? c.json({ name, value: s.value }) : fail(c, 404, "NotFound", "no such secret");
  });
  app.post(S + "put", sessionOnly, async (c) => {
    const { name, value } = await c.req.json().catch(() => ({}));
    if (!secretName(name)) return fail(c, 400, "InvalidRequest", "a secret name is capitals, digits and _, and does not start with BRAIN_ or CF_");
    if (typeof value !== "string") return fail(c, 400, "InvalidRequest", "value must be a string");
    await rows.put("secret/" + name, { value, setAt: Date.now() });
    return c.json({ name });
  });
  app.post(S + "delete", sessionOnly, async (c) => {
    const { name } = await c.req.json().catch(() => ({}));
    await settings.delete("secretrule/" + name);
    return c.json({ deleted: !!(await rows.delete("secret/" + name)) });
  });
  app.post(S + "setRule", sessionOnly, async (c) => {
    const { name, allow = null } = await c.req.json().catch(() => ({}));
    if (!secretName(name)) return fail(c, 400, "InvalidRequest", "name");
    if (allow === null) return c.json({ name, allow: null, deleted: !!(await settings.delete("secretrule/" + name)) });
    try {
      checkedRule(name, allow);
    } catch (e) {
      return fail(c, 400, "InvalidRequest", e.message);
    }
    await settings.put("secretrule/" + name, { allow, setAt: Date.now() });
    return c.json({ name, allow });
  });
  return app;
};
const _braindb_dbPanel = function _dbPanel(htl,Inputs) {return (({ client, owner = false } = {}) => {
  const muted = "color:var(--theme-foreground-muted)";
  if (!client || !owner) return htl.html\`<i style=\${muted}>Sign in as the owner to see the databases.</i>\`;
  const out = htl.html\`<div></div>\`, note = htl.html\`<span style=\${muted}></span>\`;
  const db = Inputs.text({ placeholder: "database", width: 130 });
  const table = Inputs.text({ placeholder: "table, or *", width: 130 });
  const allow = Inputs.text({ placeholder: 'rule, e.g. resource.op == "read" || caller.session', width: 380 });
  const draw = async () => {
    try {
      const { tables } = await client.query("db.tables");
      const data = tables.map((t) => ({ database: t.db, table: t.table, rule: t.rule || (t.table === "*" ? "" : "the owner"), written: t.declared ? "yes" : "" }));
      out.replaceChildren(data.length ? Inputs.table(data, { select: false, layout: "auto" }) : htl.html\`<i style=\${muted}>No tables yet.</i>\`);
    } catch (e) {
      note.textContent = "db.tables failed: " + e.message;
    }
  };
  const act = (label, input) =>
    Inputs.button(label, {
      reduce: async () => {
        try {
          const done = await client.procedure("db.setRule", input());
          note.textContent = done.allow === null ? \`\${done.db}/\${done.table}: rule removed.\` : \`\${done.db}/\${done.table}: \${done.allow}\`;
          await draw();
        } catch (e) {
          note.textContent = "Not set: " + e.message;
        }
      }
    });
  const set = act("Set rule", () => ({ db: db.value.trim(), table: table.value.trim(), allow: allow.value.trim() }));
  const clear = act("Remove rule", () => ({ db: db.value.trim(), table: table.value.trim(), allow: null }));
  draw();
  return htl.html\`<div>\${out}<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center">\${db}\${table}\${allow}\${set}\${clear}\${Inputs.button("Refresh", { reduce: draw })}</div><div style="margin-top:6px">\${note}</div></div>\`;
});};
const _braindb_anon_be3d699220 = function _anonymous(md) {return (md\`## Tests\`);};
const _braindb_dbRig = function _dbRig(simulate,db_service) {return (async () => {
  const sim = await simulate(db_service, {});
  const X = "/xrpc/com.lopecode.brain.db.";
  const as = (who, via = "") => async (path, body) => {
    const r = await sim.fetch("https://db.internal" + (path.startsWith("/") ? path : X + path), {
      method: body === undefined ? "GET" : "POST",
      headers: { "x-brain-caller": who, "x-brain-via": via, ...(body === undefined ? {} : { "content-type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: r.status, data: await r.json() };
  };
  return { sim, as, owner: as("owner", "session"), token: as("token:laptop", "token"), library: as("worker:brain-x-library"), friend: as("did:plc:friend", "jwt"), stranger: as("did:plc:stranger", "jwt"), anonymous: as("anonymous") };
});};
const _braindb_test_db_put_get_list_delete_increment = async function _test_db_put_get_list_delete_increment(dbRig,expect) {
  const rig = await dbRig();
  expect((await rig.owner("put", { db: "site", table: "posts", key: "b", value: { title: "second" } })).data).toEqual({ put: true });
  await rig.owner("put", { db: "site", table: "posts", key: "a", value: { title: "first" } });
  await rig.owner("put", { db: "site", table: "drafts", key: "a", value: "draft" });
  expect((await rig.owner("get?db=site&table=posts&key=a")).data).toEqual({ value: { title: "first" } });
  expect((await rig.owner("get?db=site&table=posts&key=zz")).data).toEqual({ value: null });
  expect((await rig.owner("list?db=site&table=posts")).data).toEqual({ rows: [{ key: "a", value: { title: "first" } }, { key: "b", value: { title: "second" } }], more: false });
  expect((await rig.owner("list?db=site&table=posts&prefix=b")).data.rows.map((r) => r.key)).toEqual(["b"]);
  expect((await rig.owner("list?db=site&table=posts&limit=1")).data).toMatchObject({ more: true });
  // ifAbsent keeps the first value; increment counts in one step.
  expect((await rig.owner("put", { db: "site", table: "posts", key: "a", value: "again", ifAbsent: true })).data).toEqual({ put: false });
  expect([(await rig.owner("increment", { db: "site", table: "n", key: "seq" })).data.value, (await rig.owner("increment", { db: "site", table: "n", key: "seq" })).data.value]).toEqual([1, 2]);
  expect((await rig.owner("delete", { db: "site", table: "posts", key: "a" })).data).toEqual({ deleted: true });
  expect((await rig.owner("get?db=site&table=posts&key=a")).data).toEqual({ value: null });
  // The same table and key in another database is another row.
  await rig.owner("put", { db: "other", table: "posts", key: "b", value: "elsewhere" });
  expect(rig.sim.rows.get("d/other/posts/b")).toBe("elsewhere");
  expect((await rig.owner("get?db=site&table=posts&key=b")).data.value).toEqual({ title: "second" });
  expect((await rig.owner("put", { db: "si/te", table: "posts", key: "a", value: 1 })).status).toBe(400);
  expect((await rig.owner("put", { db: "site", table: "posts", key: "big", value: "x".repeat(100001) })).status).toBe(413);
  return "2 databases, 3 tables";
};
const _braindb_test_db_a_table_is_open_to_whom_its_rule_says = async function _test_db_a_table_is_open_to_whom_its_rule_says(dbRig,expect) {
  const rig = await dbRig();
  await rig.owner("put", { db: "site", table: "posts", key: "a", value: "hello" });
  // No rule: the owner and their tokens. Not a Worker, not a granted account.
  expect([(await rig.anonymous("get?db=site&table=posts&key=a")).status, (await rig.library("get?db=site&table=posts&key=a")).status, (await rig.friend("get?db=site&table=posts&key=a")).status]).toEqual([401, 403, 403]);
  expect((await rig.token("get?db=site&table=posts&key=a")).status).toBe(200);
  // Read by anyone, written by the owner's own session.
  expect((await rig.owner("setRule", { db: "site", table: "posts", allow: 'resource.op == "read" || caller.session' })).status).toBe(200);
  expect((await rig.anonymous("get?db=site&table=posts&key=a")).data).toEqual({ value: "hello" });
  expect((await rig.anonymous("list?db=site&table=posts")).data.rows.length).toBe(1);
  expect((await rig.anonymous("put", { db: "site", table: "posts", key: "a", value: "defaced" })).status).toBe(401);
  expect((await rig.token("put", { db: "site", table: "posts", key: "a", value: "by token" })).status).toBe(403);
  expect((await rig.owner("put", { db: "site", table: "posts", key: "a", value: "edited" })).status).toBe(200);
  // The rule is the table's: the next table is still the owner's only.
  expect((await rig.anonymous("get?db=site&table=drafts&key=a")).status).toBe(401);
  // One Worker's table.
  await rig.owner("setRule", { db: "site", table: "index", allow: 'caller.worker == "brain-x-library"' });
  expect((await rig.library("put", { db: "site", table: "index", key: "n", value: 1 })).status).toBe(200);
  expect((await rig.owner("get?db=site&table=index&key=n")).status).toBe(403);
  // By key: each account has the rows under its own DID, for get, put and list.
  await rig.owner("setRule", { db: "site", table: "profiles", allow: 'caller.kind == "did" && resource.key.startsWith(caller.did + "/")' });
  expect((await rig.friend("put", { db: "site", table: "profiles", key: "did:plc:friend/bio", value: "hi" })).status).toBe(200);
  expect((await rig.stranger("get?db=site&table=profiles&key=did:plc:friend/bio")).status).toBe(403);
  expect((await rig.stranger("put", { db: "site", table: "profiles", key: "did:plc:friend/bio", value: "x" })).status).toBe(403);
  expect((await rig.friend("list?db=site&table=profiles&prefix=did:plc:friend/")).data.rows.map((r) => r.value)).toEqual(["hi"]);
  expect((await rig.friend("list?db=site&table=profiles")).status).toBe(403);
  // "*" is every table of the database that has no rule of its own.
  await rig.owner("setRule", { db: "pub", table: "*", allow: 'resource.op == "read" || caller.kind == "owner"' });
  await rig.owner("put", { db: "pub", table: "anything", key: "k", value: 1 });
  expect((await rig.anonymous("get?db=pub&table=anything&key=k")).data).toEqual({ value: 1 });
  expect((await rig.anonymous("get?db=site&table=drafts&key=a")).status).toBe(401);
  return "owner only, public read, one Worker, by key, whole database";
};
const _braindb_test_db_only_the_owners_session_sets_a_rule = async function _test_db_only_the_owners_session_sets_a_rule(dbRig,expect) {
  const rig = await dbRig();
  const rule = { db: "site", table: "posts", allow: "true" };
  expect([(await rig.token("setRule", rule)).status, (await rig.library("setRule", rule)).status, (await rig.friend("setRule", rule)).status, (await rig.anonymous("setRule", rule)).status]).toEqual([401, 401, 401, 401]);
  const bad = await rig.owner("setRule", { ...rule, allow: "caller.kind ==" });
  expect([bad.status, bad.data.message.startsWith("site/posts: the rule does not parse")]).toEqual([400, true]);
  // A rule that errors when it is decided refuses.
  await rig.owner("setRule", { ...rule, allow: "caller.nothing == 1" });
  expect((await rig.owner("get?db=site&table=posts&key=a")).status).toBe(403);
  await rig.owner("setRule", rule);
  await rig.owner("put", { db: "site", table: "posts", key: "a", value: 1 });
  expect((await rig.owner("tables")).data.tables).toEqual([{ db: "site", table: "posts", rule: "true", declared: true }]);
  expect((await rig.library("tables")).status).toBe(401);
  // Removing the rule returns the table to the owner.
  expect((await rig.owner("setRule", { db: "site", table: "posts", allow: null })).data).toMatchObject({ allow: null, deleted: true });
  expect((await rig.anonymous("get?db=site&table=posts&key=a")).status).toBe(401);
  return "4 refusals, 1 bad rule, set and removed";
};
const _braindb_test_secrets_are_read_by_the_owners_session_and_by_a_worker_a_rule_names = async function _test_secrets_are_read_by_the_owners_session_and_by_a_worker_a_rule_names(dbRig,expect) {
  const rig = await dbRig();
  const whatsapp = rig.as("worker:brain-x-whatsapp");
  expect((await rig.owner("/xrpc/com.lopecode.brain.secret.put", { name: "WA_TOKEN", value: "v1" })).status).toBe(200);
  expect((await rig.owner("/xrpc/com.lopecode.brain.secret.put", { name: "OTHER", value: "v2" })).status).toBe(200);
  expect((await rig.owner("/xrpc/com.lopecode.brain.secret.put", { name: "BRAIN_KEY", value: "x" })).status).toBe(400);
  expect((await rig.owner("/xrpc/com.lopecode.brain.secret.get?name=WA_TOKEN")).data).toEqual({ name: "WA_TOKEN", value: "v1" });
  // Not a token, not the owner through a service JWT, not a granted account, not anonymous; and no Worker without a rule.
  const get = "/xrpc/com.lopecode.brain.secret.get?name=WA_TOKEN";
  expect([(await rig.token(get)).status, (await rig.as("owner", "jwt")(get)).status, (await rig.friend(get)).status, (await rig.anonymous(get)).status, (await whatsapp(get)).status, (await rig.library(get)).status]).toEqual([401, 401, 401, 401, 403, 403]);
  expect((await rig.as("owner", "jwt")("/xrpc/com.lopecode.brain.secret.put", { name: "WA_TOKEN", value: "v9" })).status).toBe(401);
  // A rule opens one secret to one Worker.
  expect((await rig.owner("/xrpc/com.lopecode.brain.secret.setRule", { name: "WA_TOKEN", allow: 'caller.worker == "brain-x-whatsapp"' })).status).toBe(200);
  expect((await whatsapp(get)).data).toEqual({ name: "WA_TOKEN", value: "v1" });
  expect([(await rig.library(get)).status, (await whatsapp("/xrpc/com.lopecode.brain.secret.get?name=OTHER")).status]).toEqual([403, 403]);
  // A rule that is true for everyone still opens it to Workers only.
  await rig.owner("/xrpc/com.lopecode.brain.secret.setRule", { name: "WA_TOKEN", allow: "true" });
  expect([(await rig.library(get)).status, (await rig.anonymous(get)).status, (await rig.token(get)).status, (await rig.friend(get)).status]).toEqual([200, 401, 401, 401]);
  expect([(await whatsapp("/xrpc/com.lopecode.brain.secret.setRule", { name: "OTHER", allow: "true" })).status, (await rig.token("/xrpc/com.lopecode.brain.secret.setRule", { name: "OTHER", allow: "true" })).status]).toEqual([401, 401]);
  // The list has names and rules, no values. No db.* method reaches a secret.
  const list = await rig.as("owner", "jwt")("/xrpc/com.lopecode.brain.secret.list");
  expect(list.data.secrets.map((s) => [s.name, s.rule])).toEqual([["OTHER", null], ["WA_TOKEN", "true"]]);
  expect(JSON.stringify(list.data)).not.toContain("v1");
  expect((await whatsapp("/xrpc/com.lopecode.brain.secret.list")).status).toBe(401);
  expect((await rig.owner("list?db=secret&table=WA_TOKEN")).data.rows).toEqual([]);
  // Deleting a secret deletes its rule.
  expect((await rig.owner("/xrpc/com.lopecode.brain.secret.delete", { name: "WA_TOKEN" })).data).toEqual({ deleted: true });
  await rig.owner("/xrpc/com.lopecode.brain.secret.put", { name: "WA_TOKEN", value: "v3" });
  expect((await whatsapp(get)).status).toBe(403);
  return "6 refusals without a rule, 1 Worker with one";
};
const _braindb_test_db_declares_what_it_needs = async function _test_db_declares_what_it_needs(db_service,expect) {
  const { meta } = await db_service.emit();
  expect(meta).toMatchObject({ worker: "brain-db", role: "system", module: "@tomlarkworthy/brain-db", resources: ["rows"], secrets: [] });
  expect(Object.entries(meta.access).filter(([m]) => m.includes(".db.")).map(([m, r]) => m.replace("com.lopecode.brain.db.", "") + " " + r.who).sort()).toEqual(["delete workers", "get anyone", "increment workers", "list anyone", "put workers", "setRule owner", "tables owner"]);
  // Every secret method is fixed at the core.
  expect(Object.entries(meta.access).filter(([, r]) => r.fixed).map(([m]) => m.replace("com.lopecode.brain.", "")).sort()).toEqual(["secret.delete", "secret.get", "secret.list", "secret.put", "secret.setRule"]);
  return Object.keys(meta.access).length + " methods";
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_braindb_anon_7385d65d30", null, ["md"], _braindb_anon_7385d65d30);  
  $def("_braindb_dbView", "dbView", ["dbPanel","client","session"], _braindb_dbView);  
  $def("_braindb_db_service", "db_service", ["cloudflare","dbApp"], _braindb_db_service);  
  $def("_braindb_db_announce", "db_announce", ["plugins","db_service","invalidation"], _braindb_db_announce);  
  $def("_braindb_dbApp", "dbApp", ["hono","settings","decide","callerOf","rows","checkedRule"], _braindb_dbApp);  
  $def("_braindb_dbPanel", "dbPanel", ["htl","Inputs"], _braindb_dbPanel);  
  $def("_braindb_anon_be3d699220", null, ["md"], _braindb_anon_be3d699220);  
  $def("_braindb_dbRig", "dbRig", ["simulate","db_service"], _braindb_dbRig);  
  $def("_braindb_test_db_put_get_list_delete_increment", "test_db_put_get_list_delete_increment", ["dbRig","expect"], _braindb_test_db_put_get_list_delete_increment);  
  $def("_braindb_test_db_a_table_is_open_to_whom_its_rule_says", "test_db_a_table_is_open_to_whom_its_rule_says", ["dbRig","expect"], _braindb_test_db_a_table_is_open_to_whom_its_rule_says);  
  $def("_braindb_test_db_only_the_owners_session_sets_a_rule", "test_db_only_the_owners_session_sets_a_rule", ["dbRig","expect"], _braindb_test_db_only_the_owners_session_sets_a_rule);  
  $def("_braindb_test_secrets_are_read_by_the_owners_session_and_by_a_worker_a_rule_names", "test_secrets_are_read_by_the_owners_session_and_by_a_worker_a_rule_names", ["dbRig","expect"], _braindb_test_secrets_are_read_by_the_owners_session_and_by_a_worker_a_rule_names);  
  $def("_braindb_test_db_declares_what_it_needs", "test_db_declares_what_it_needs", ["db_service","expect"], _braindb_test_db_declares_what_it_needs);  
  main.define("module @tomlarkworthy/cloudflare-iac", async () => runtime.module((await import("/@tomlarkworthy/cloudflare-iac.js?v=4")).default));  
  main.define("cloudflare", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("cloudflare", _));  
  main.define("rows", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("rows", _));  
  main.define("hono", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("hono", _));  
  main.define("settings", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("settings", _));  
  main.define("decide", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("decide", _));  
  main.define("callerOf", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("callerOf", _));  
  main.define("checkedRule", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("checkedRule", _));  
  main.define("simulate", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("simulate", _));  
  main.define("module @tomlarkworthy/cloud-brain", async () => runtime.module((await import("/@tomlarkworthy/cloud-brain.js?v=4")).default));  
  main.define("client", ["module @tomlarkworthy/cloud-brain", "@variable"], (_, v) => v.import("client", _));  
  main.define("session", ["module @tomlarkworthy/cloud-brain", "@variable"], (_, v) => v.import("session", _));  
  main.define("module @tomlarkworthy/plugin-registry", async () => runtime.module((await import("/@tomlarkworthy/plugin-registry.js?v=4")).default));  
  main.define("plugins", ["module @tomlarkworthy/plugin-registry", "@variable"], (_, v) => v.import("plugins", _));  
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));  
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));
  return main;
}` }, whatsapp: { module: "@tomlarkworthy/brain-whatsapp", cell: "whatsapp_service", hash: "46b558febaf10c5a547115141ff265f11e7f430bb6fb6cd86042a1779c240170", source: `
const _brainwhatsapp_anon_6b1898e7d8 = function _anonymous(md) {return (md\`# brain-whatsapp

A Cloud Brain recipe: the owner's WhatsApp messages arrive in the Brain's inbox, and the assistant answers with \\\`whatsapp.send\\\`. It uses Meta's [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api).\`);};
const _brainwhatsapp_whatsapp_setup = function _whatsapp_setup(md) {return (md\`## Setting up

In Meta's developer console, make an app with the WhatsApp product and a phone number. Then, in the Cloud Brain notebook:

1. Set four secrets: \\\`WHATSAPP_APP_SECRET\\\` (App settings → Basic), \\\`WHATSAPP_ACCESS_TOKEN\\\` and \\\`WHATSAPP_PHONE_ID\\\` (WhatsApp → API setup), and \\\`WHATSAPP_VERIFY_TOKEN\\\`, any string you choose.
2. Apply, so \\\`brain-x-whatsapp\\\` is deployed with them.
3. In Meta's console set the webhook's callback URL to \\\`https://YOUR-BRAIN/hooks/whatsapp\\\` and its verify token to the string from step 1, and subscribe to \\\`messages\\\`.
4. Press **Link my number** below and send the code it shows from your WhatsApp to the Brain's number. Messages from any other number are dropped.

Meta allows a free-form reply for 24 hours after your last message. After that \\\`whatsapp.send\\\` fails until you write again.\`);};
const _brainwhatsapp_whatsappSignature = function _whatsappSignature() {return (async (secret, body) => {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  return "sha256=" + [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
});};
const _brainwhatsapp_whatsappMessages = function _whatsappMessages() {return ((payload) =>
  ((payload && payload.entry) || []).flatMap((e) => e.changes || []).flatMap((c) => (c.value && c.value.messages) || [])
    .map((m) => ({ id: m.id, from: m.from, at: Number(m.timestamp) * 1000, type: m.type, text: m.type === "text" ? m.text.body : \`[\${m.type}]\` })));};
const _brainwhatsapp_whatsappApp = function _whatsappApp(hono,secrets,whatsappSignature,rows,whatsappMessages,inbox,xrpc,config) {
  const app = new hono.Hono();
  const NS = "/xrpc/com.lopecode.brain.whatsapp.";
  const fail = (c, status, error, message) => c.json({ error, message }, status);
  app.onError((e, c) => fail(c, 500, "InternalServerError", String((e && e.message) || e)));
  const sendText = async (to, text) => {
    const r = await fetch(\`https://graph.facebook.com/v25.0/\${await secrets.WHATSAPP_PHONE_ID}/messages\`, {
      method: "POST",
      headers: { authorization: "Bearer " + (await secrets.WHATSAPP_ACCESS_TOKEN), "content-type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } })
    });
    return { ok: r.ok, status: r.status, body: await r.json().catch(() => null) };
  };

  app.get("/hooks/whatsapp", async (c) => {
    const token = await secrets.WHATSAPP_VERIFY_TOKEN;
    return token && c.req.query("hub.mode") === "subscribe" && c.req.query("hub.verify_token") === token ? c.text(c.req.query("hub.challenge") || "") : c.text("forbidden", 403);
  });

  app.post("/hooks/whatsapp", async (c) => {
    const body = await c.req.text(), secret = await secrets.WHATSAPP_APP_SECRET;
    if (!secret || c.req.header("x-hub-signature-256") !== (await whatsappSignature(secret, body))) return c.text("bad signature", 401);
    let owner = await rows.get("owner"), taken = 0;
    for (const m of whatsappMessages(JSON.parse(body))) {
      if (!owner) {
        // The first number to send the code shown in the owner's notebook becomes the owner's.
        const link = await rows.get("link");
        if (!link || link.exp < Date.now() || m.text.trim() !== link.code) continue;
        await rows.put("owner", (owner = m.from));
        await rows.delete("link");
        await sendText(owner, "This number is linked to your Cloud Brain.");
        continue;
      }
      if (m.from !== owner) continue;
      await inbox.append({ source: "whatsapp", key: m.id, body: { text: m.text, from: m.from, at: m.at } });
      taken++;
    }
    if (taken) {
      // No tab is answering: say so, at most once an hour.
      const { held } = await xrpc.query("com.lopecode.brain.lease.get", {});
      const last = (await rows.get("linkSentAt")) || 0;
      if (!held && Date.now() - last > 3600000) {
        await rows.put("linkSentAt", Date.now());
        await sendText(owner, \`No Brain tab is open. Open https://\${config.host}/ to continue.\`);
      }
    }
    return c.text("ok");
  });

  app.post(NS + "send", async (c) => {
    const { text, to } = await c.req.json();
    const owner = await rows.get("owner");
    if (!text) return fail(c, 400, "InvalidRequest", "text");
    if (!owner) return fail(c, 400, "NotLinked", "no number is linked");
    // Only ever to the owner's number: a prompt-injected assistant cannot message anyone else.
    if (to && to !== owner) return fail(c, 403, "Forbidden", "whatsapp.send writes to the linked number only");
    const sent = await sendText(owner, String(text).slice(0, 4096));
    return sent.ok ? c.json({ sent: true }) : fail(c, 502, "UpstreamError", JSON.stringify(sent.body).slice(0, 300));
  });

  app.post(NS + "link", async (c) => {
    const { unlink } = await c.req.json().catch(() => ({}));
    if (unlink) await rows.delete("owner");
    const code = "link-" + [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, "0")).join("");
    await rows.put("link", { code, exp: Date.now() + 600000 });
    return c.json({ code, expiresInSeconds: 600, linked: !unlink && !!(await rows.get("owner")) });
  });

  app.get(NS + "status", async (c) => c.json({ linked: !!(await rows.get("owner")), linkSentAt: (await rows.get("linkSentAt")) || null }));
  return app;
};
const _brainwhatsapp_whatsapp_service = function _whatsapp_service(cloudflare,whatsappApp) {return (cloudflare.Worker("whatsapp", whatsappApp, {
  paths: [{ path: "/hooks/whatsapp", who: "anyone" }],
  methods: {
    "com.lopecode.brain.whatsapp.send": { type: "procedure", who: "owner" },
    "com.lopecode.brain.whatsapp.link": { type: "procedure", who: "owner" },
    "com.lopecode.brain.whatsapp.status": { type: "query", who: "owner" }
  }
}));};
const _brainwhatsapp_whatsapp_announce = function _whatsapp_announce(plugins,whatsapp_service,invalidation) {
  plugins.add("workers", whatsapp_service, { invalidation });
  return "announced whatsapp_service";
};
const _brainwhatsapp_anon_8286180aa6 = function _anonymous(md) {return (md\`## Tests

Requests in the shape Meta sends, signed with a test secret, against the emitted Worker under \\\`simulate\\\`.\`);};
const _brainwhatsapp_whatsappRig = function _whatsappRig(simulate,whatsapp_service,Response,whatsappSignature) {return (async ({ held = false, owner = "4915100000001" } = {}) => {
  const rows = new Map(owner ? [["owner", owner]] : []);
  const sent = [];
  const state = { held };
  const sim = await simulate(whatsapp_service, {
    rows,
    secrets: { WHATSAPP_APP_SECRET: "app-secret", WHATSAPP_ACCESS_TOKEN: "tok", WHATSAPP_PHONE_ID: "555", WHATSAPP_VERIFY_TOKEN: "verify-me", BRAIN_KEY: "k" },
    config: { host: "brain.example" },
    fetch: async (request) => {
      sent.push({ url: request.url, authorization: request.headers.get("authorization"), body: await request.json() });
      return Response.json({ messages: [{ id: "wamid.out" }] });
    },
    core: async (request) => {
      const nsid = new URL(request.url).pathname.replace("/xrpc/com.lopecode.brain.", "");
      if (nsid === "lease.get") return Response.json({ held: state.held });
      const data = await request.json();
      const seen = sim.inbox.find((e) => e.key === data.key);
      if (!seen) sim.inbox.push({ id: sim.inbox.length + 1, ...data });
      return Response.json({ id: seen ? seen.id : sim.inbox.length, duplicate: !!seen });
    }
  });
  const message = (id, from, text) => ({ id, from, timestamp: "1791230000", type: "text", text: { body: text } });
  const deliver = async (messages, { secret = "app-secret" } = {}) => {
    const body = JSON.stringify({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { messages } }] }] });
    return sim.fetch("https://brain.internal/hooks/whatsapp", { method: "POST", body, headers: { "content-type": "application/json", "x-hub-signature-256": await whatsappSignature(secret, body) } });
  };
  const owned = (path, body) => sim.fetch("https://brain.internal/xrpc/com.lopecode.brain.whatsapp." + path, { method: body ? "POST" : "GET", body: body ? JSON.stringify(body) : undefined, headers: { "content-type": "application/json", "x-brain-caller": "owner" } });
  return { sim, rows, sent, state, message, deliver, owned };
});};
const _brainwhatsapp_test_whatsapp_verification = async function _test_whatsapp_verification(whatsappRig,expect) {
  const { sim } = await whatsappRig();
  const get = (q) => sim.fetch("https://brain.internal/hooks/whatsapp?" + q);
  const ok = await get("hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=1158201444");
  expect([ok.status, await ok.text()]).toEqual([200, "1158201444"]);
  expect((await get("hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1")).status).toBe(403);
  return "challenge echoed; wrong token 403";
};
const _brainwhatsapp_test_whatsapp_accepts_only_signed_messages_from_the_owner = async function _test_whatsapp_accepts_only_signed_messages_from_the_owner(whatsappRig,expect) {
  const rig = await whatsappRig({ held: true });
  expect((await rig.deliver([rig.message("wamid.1", "4915100000001", "hello")], { secret: "wrong" })).status).toBe(401);
  expect(rig.sim.inbox.length).toBe(0);
  expect((await rig.deliver([rig.message("wamid.2", "4915100009999", "let me in")])).status).toBe(200);
  expect(rig.sim.inbox.length).toBe(0);
  await rig.deliver([rig.message("wamid.3", "4915100000001", "hello"), rig.message("wamid.4", "4915100000001", "again")]);
  await rig.deliver([rig.message("wamid.3", "4915100000001", "hello")]);
  expect(rig.sim.inbox.map((e) => [e.source, e.key, e.body.text])).toEqual([["whatsapp", "wamid.3", "hello"], ["whatsapp", "wamid.4", "again"]]);
  // A tab holds the lease, so nothing was sent back.
  expect(rig.sent.length).toBe(0);
  return "2 entries from 4 deliveries";
};
const _brainwhatsapp_test_whatsapp_link_reply_once_an_hour = async function _test_whatsapp_link_reply_once_an_hour(whatsappRig,expect) {
  const rig = await whatsappRig({ held: false });
  await rig.deliver([rig.message("wamid.1", "4915100000001", "anyone there?")]);
  await rig.deliver([rig.message("wamid.2", "4915100000001", "hello?")]);
  expect(rig.sent.map((s) => s.body.text.body)).toEqual(["No Brain tab is open. Open https://brain.example/ to continue."]);
  expect(rig.sent[0]).toMatchObject({ url: "https://graph.facebook.com/v25.0/555/messages", authorization: "Bearer tok", body: { to: "4915100000001", messaging_product: "whatsapp" } });
  rig.rows.set("linkSentAt", Date.now() - 3600001);
  await rig.deliver([rig.message("wamid.3", "4915100000001", "now?")]);
  expect(rig.sent.length).toBe(2);
  expect(rig.sim.inbox.length).toBe(3);
  return "1 link for 2 messages, another after an hour";
};
const _brainwhatsapp_test_whatsapp_linking_a_number = async function _test_whatsapp_linking_a_number(whatsappRig,expect) {
  const rig = await whatsappRig({ owner: null, held: true });
  await rig.deliver([rig.message("wamid.0", "4915100000001", "hello")]);
  expect(rig.rows.has("owner")).toBe(false);
  const { code } = await (await rig.owned("link", {})).json();
  expect(code).toMatch(/^link-[0-9a-f]{8}$/);
  await rig.deliver([rig.message("wamid.1", "4915100009999", "link-00000000")]);
  expect(rig.rows.has("owner")).toBe(false);
  await rig.deliver([rig.message("wamid.2", "4915100000001", code)]);
  expect(rig.rows.get("owner")).toBe("4915100000001");
  expect(rig.rows.has("link")).toBe(false);
  // The code itself is not a message for the assistant.
  expect(rig.sim.inbox.length).toBe(0);
  expect(rig.sent.map((s) => s.body.text.body)).toEqual(["This number is linked to your Cloud Brain."]);
  return "linked by the code, not by the first sender";
};
const _brainwhatsapp_test_whatsapp_send_goes_to_the_owner_only = async function _test_whatsapp_send_goes_to_the_owner_only(whatsappRig,expect) {
  const rig = await whatsappRig();
  expect(await (await rig.owned("send", { text: "done" })).json()).toEqual({ sent: true });
  expect(rig.sent[0].body).toEqual({ messaging_product: "whatsapp", to: "4915100000001", type: "text", text: { body: "done" } });
  expect((await rig.owned("send", { text: "hi", to: "4915100009999" })).status).toBe(403);
  expect(rig.sent.length).toBe(1);
  const unlinked = await whatsappRig({ owner: null });
  expect((await (await unlinked.owned("send", { text: "x" })).json()).error).toBe("NotLinked");
  return "1 sent, 1 refused";
};
const _brainwhatsapp_test_whatsapp_declares_what_it_needs = async function _test_whatsapp_declares_what_it_needs(whatsapp_service,expect) {
  const { meta } = await whatsapp_service.emit();
  expect(meta.worker).toBe("brain-x-whatsapp");
  expect(meta.secrets).toEqual(["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_APP_SECRET", "WHATSAPP_PHONE_ID", "WHATSAPP_VERIFY_TOKEN"]);
  expect(meta.paths).toEqual([{ path: "/hooks/whatsapp", who: "anyone" }]);
  expect(meta.resources).toEqual(["inbox", "rows", "xrpc"]);
  return meta.resources.join(", ");
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_brainwhatsapp_anon_6b1898e7d8", null, ["md"], _brainwhatsapp_anon_6b1898e7d8);  
  $def("_brainwhatsapp_whatsapp_setup", "whatsapp_setup", ["md"], _brainwhatsapp_whatsapp_setup);  
  $def("_brainwhatsapp_whatsappSignature", "whatsappSignature", [], _brainwhatsapp_whatsappSignature);  
  $def("_brainwhatsapp_whatsappMessages", "whatsappMessages", [], _brainwhatsapp_whatsappMessages);  
  $def("_brainwhatsapp_whatsappApp", "whatsappApp", ["hono","secrets","whatsappSignature","rows","whatsappMessages","inbox","xrpc","config"], _brainwhatsapp_whatsappApp);  
  $def("_brainwhatsapp_whatsapp_service", "whatsapp_service", ["cloudflare","whatsappApp"], _brainwhatsapp_whatsapp_service);  
  $def("_brainwhatsapp_whatsapp_announce", "whatsapp_announce", ["plugins","whatsapp_service","invalidation"], _brainwhatsapp_whatsapp_announce);  
  $def("_brainwhatsapp_anon_8286180aa6", null, ["md"], _brainwhatsapp_anon_8286180aa6);  
  $def("_brainwhatsapp_whatsappRig", "whatsappRig", ["simulate","whatsapp_service","Response","whatsappSignature"], _brainwhatsapp_whatsappRig);  
  $def("_brainwhatsapp_test_whatsapp_verification", "test_whatsapp_verification", ["whatsappRig","expect"], _brainwhatsapp_test_whatsapp_verification);  
  $def("_brainwhatsapp_test_whatsapp_accepts_only_signed_messages_from_the_owner", "test_whatsapp_accepts_only_signed_messages_from_the_owner", ["whatsappRig","expect"], _brainwhatsapp_test_whatsapp_accepts_only_signed_messages_from_the_owner);  
  $def("_brainwhatsapp_test_whatsapp_link_reply_once_an_hour", "test_whatsapp_link_reply_once_an_hour", ["whatsappRig","expect"], _brainwhatsapp_test_whatsapp_link_reply_once_an_hour);  
  $def("_brainwhatsapp_test_whatsapp_linking_a_number", "test_whatsapp_linking_a_number", ["whatsappRig","expect"], _brainwhatsapp_test_whatsapp_linking_a_number);  
  $def("_brainwhatsapp_test_whatsapp_send_goes_to_the_owner_only", "test_whatsapp_send_goes_to_the_owner_only", ["whatsappRig","expect"], _brainwhatsapp_test_whatsapp_send_goes_to_the_owner_only);  
  $def("_brainwhatsapp_test_whatsapp_declares_what_it_needs", "test_whatsapp_declares_what_it_needs", ["whatsapp_service","expect"], _brainwhatsapp_test_whatsapp_declares_what_it_needs);  
  main.define("module @tomlarkworthy/cloudflare-iac", async () => runtime.module((await import("/@tomlarkworthy/cloudflare-iac.js?v=4")).default));  
  main.define("cloudflare", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("cloudflare", _));  
  main.define("secrets", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("secrets", _));  
  main.define("rows", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("rows", _));  
  main.define("inbox", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("inbox", _));  
  main.define("xrpc", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("xrpc", _));  
  main.define("config", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("config", _));  
  main.define("hono", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("hono", _));  
  main.define("simulate", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("simulate", _));  
  main.define("module @tomlarkworthy/plugin-registry", async () => runtime.module((await import("/@tomlarkworthy/plugin-registry.js?v=4")).default));  
  main.define("plugins", ["module @tomlarkworthy/plugin-registry", "@variable"], (_, v) => v.import("plugins", _));  
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));  
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));
  return main;
}` }, kernel: { module: "@tomlarkworthy/brain-kernel", cell: "kernel_service", hash: "cbd12043ab55ebe2235dfbc7018a00dd1132eb86731c42ba5b4d0ebbfbe66ee2", source: `
const _brainkernel_anon_1f3b6cb291 = function _anonymous(md) {return (md\`# brain-kernel

The Worker at the Brain's address. It serves the notebook, signs people in with atproto, works out who is calling, and forwards everything else to the core with that answer attached.

It holds no application logic. The caller it names is one of \\\`owner\\\`, \\\`token:NAME\\\`, a DID, or \\\`anonymous\\\`, and nothing a caller sends can set it.\`);};
const _brainkernel_kernel_service = function _kernel_service(cloudflare,kernelApp) {return (cloudflare.Worker("kernel", kernelApp, { role: "kernel" }));};
const _brainkernel_kernel_announce = function _kernel_announce(plugins,kernel_service,invalidation) {
  plugins.add("workers", kernel_service, { invalidation });
  return "announced kernel_service";
};
const _brainkernel_atcute = function _atcute(library,FileAttachment) {return (library("atcute", FileAttachment("atcute.js")));};
const _brainkernel_sessionCookie = function _sessionCookie() {
  const enc = new TextEncoder();
  const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
  const sign = async (key, text) => {
    const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return b64u(new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(text))));
  };
  return {
    make: async (key, did, { ttl = 30 * 24 * 3600 * 1000, epoch = 0 } = {}) => {
      const payload = b64u(enc.encode(JSON.stringify({ did, exp: Date.now() + ttl, epoch })));
      return \`v1.\${payload}.\${await sign(key, payload)}\`;
    },
    read: async (key, cookie, epoch = 0) => {
      const [v, payload, sig] = String(cookie || "").split(".");
      if (v !== "v1" || !key || !payload || sig !== (await sign(key, payload))) return null;
      try {
        const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
        return claims.exp > Date.now() && (claims.epoch || 0) === epoch ? claims.did : null;
      } catch {
        return null;
      }
    }
  };
};
const _brainkernel_verifyServiceJwt = function _verifyServiceJwt(atcute) {return (async (bearer, nsid, audience) => {
  const b64u = (t) => Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(t.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
  const [h, p, s] = bearer.split(".");
  let claims;
  try {
    claims = JSON.parse(new TextDecoder().decode(b64u(p)));
  } catch {
    return { error: "BadJwt", message: "not a JWT" };
  }
  if (claims.aud !== audience && claims.aud !== audience + "#brain") return { error: "BadJwtAudience", message: "aud " + claims.aud };
  if (!(claims.exp > Date.now() / 1000)) return { error: "JwtExpired", message: "exp " + claims.exp };
  if (claims.lxm !== nsid) return { error: "BadJwtLexiconMethod", message: "lxm " + claims.lxm };
  if (typeof claims.iss !== "string" || !claims.iss.startsWith("did:")) return { error: "BadJwtIssuer", message: "iss" };
  const resolver = new atcute.CompositeDidDocumentResolver({ methods: { plc: new atcute.PlcDidDocumentResolver(), web: new atcute.WebDidDocumentResolver() } });
  const doc = await resolver.resolve(claims.iss.split("#")[0]);
  const vm = (doc.verificationMethod || []).find((m) => m.id.endsWith("#atproto"));
  if (!vm) return { error: "BadJwtIssuer", message: "no #atproto key" };
  const ok = await atcute.verifySig(atcute.parsePublicMultikey(vm.publicKeyMultibase), b64u(s), new TextEncoder().encode(h + "." + p), { allowMalleableSig: true });
  return ok ? { iss: claims.iss.split("#")[0] } : { error: "BadJwtSignature", message: "signature does not verify" };
});};
const _brainkernel_kernelApp = function _kernelApp(hono,Response,sessionCookie,secrets,rows,config,verifyServiceJwt,sha256,atcute,guard,Request,core) {
  const app = new hono.Hono();
  const NS = "/xrpc/com.lopecode.brain.";
  const fail = (c, status, error, message) => c.json({ error, message }, status);
  app.onError((e, c) => fail(c, 500, "InternalServerError", String((e && e.message) || e)));
  const cookieFor = (value, maxAge) => \`brain_session=\${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=\${maxAge}\`;

  // A page on another origin calls with a token in a header. The cookie is never sent to it: no credentials are allowed.
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type", "access-control-allow-methods": "GET, POST", "access-control-expose-headers": "x-proxy-upstream", "access-control-max-age": "600" };
  app.use("/xrpc/*", async (c, next) => {
    if (c.req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    await next();
    if (!c.req.header("authorization")) return;
    const headers = new Headers(c.res.headers);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
    c.res = new Response(c.res.body, { status: c.res.status, headers });
  });

  const identify = async (request, nsid) => {
    const cookie = /(?:^|;\\s*)brain_session=([^;]+)/.exec(request.headers.get("cookie") || "");
    if (cookie) {
      const did = await sessionCookie.read(await secrets.COOKIE_KEY, cookie[1], (await rows.get("epoch")) || 0);
      if (did) return { caller: did === config.owner ? "owner" : did, via: "session", did };
    }
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) return { caller: "anonymous", via: "" };
    const bearer = auth.slice(7);
    if (bearer.split(".").length === 3) {
      const v = await verifyServiceJwt(bearer, nsid, "did:web:" + config.host);
      return v.error ? { refused: v } : { caller: v.iss === config.owner ? "owner" : v.iss, via: "jwt", did: v.iss };
    }
    const token = await rows.get("token/" + (await sha256(bearer)));
    return token ? { caller: "token:" + token.name, via: "token", methods: token.methods } : { refused: { error: "AuthRequired", message: "unknown token" } };
  };
  app.use("*", async (c, next) => {
    const path = new URL(c.req.url).pathname;
    const nsid = path.startsWith("/xrpc/") ? path.slice("/xrpc/".length) : null;
    const who = await identify(c.req.raw, nsid);
    if (who.refused) return fail(c, 401, who.refused.error, who.refused.message);
    // A token or another DID reaches only the methods it was given, and no path that is not a method.
    if (who.via === "token" && !(nsid && who.methods.includes(nsid))) return fail(c, 403, "Forbidden", "this token does not name " + (nsid || path));
    if (who.caller.startsWith("did:")) {
      const grant = nsid ? await rows.get("grant/" + who.caller) : null;
      if (nsid && !(grant && grant.methods.includes(nsid))) return fail(c, 403, "Forbidden", \`\${who.caller} has no grant for \${nsid}\`);
      if (!nsid) who.caller = "anonymous";
    }
    c.set("who", who);
    c.set("nsid", nsid);
    await next();
  });
  const session = async (c, next) =>
    c.get("who").caller === "owner" && c.get("who").via === "session" ? next() : fail(c, 401, "AuthRequired", "the owner's own session");
  const owner = async (c, next) => (c.get("who").caller === "owner" ? next() : fail(c, 401, "AuthRequired", "the owner"));

  app.get("/.well-known/did.json", (c) =>
    c.json({ "@context": ["https://www.w3.org/ns/did/v1"], id: "did:web:" + config.host, service: [{ id: "#brain", type: "CloudBrain", serviceEndpoint: "https://" + config.host }] })
  );

  // atproto sign-in, as a confidential client whose key this kernel made.
  const store = (ns) => ({
    get: async (k) => (await rows.get(\`oauth/\${ns}/\${k}\`)) ?? undefined,
    set: async (k, v) => void (await rows.put(\`oauth/\${ns}/\${k}\`, v)),
    delete: async (k) => void (await rows.delete(\`oauth/\${ns}/\${k}\`)),
    clear: async () => {
      for (const r of await rows.list(\`oauth/\${ns}/\`)) await rows.delete(r.key);
    }
  });
  let client = null;
  const oauth = async () => {
    if (client) return client;
    let jwk = await rows.get("oauth/key/main");
    if (!jwk) {
      jwk = await atcute.generateClientAssertionKey("main", "ES256");
      await rows.put("oauth/key/main", jwk);
    }
    const origin = "https://" + config.host + "/auth";
    return (client = new atcute.OAuthClient({
      metadata: { client_id: origin + "/client-metadata.json", redirect_uris: [origin + "/callback"], scope: "atproto transition:generic", jwks_uri: origin + "/jwks.json", client_name: "Cloud Brain " + config.host },
      keyset: [jwk],
      stores: { sessions: store("session"), states: store("state") },
      actorResolver: new atcute.LocalActorResolver({
        handleResolver: new atcute.CompositeHandleResolver({ methods: { dns: new atcute.DohJsonHandleResolver({ dohUrl: "https://mozilla.cloudflare-dns.com/dns-query" }), http: new atcute.WellKnownHandleResolver() } }),
        didDocumentResolver: new atcute.CompositeDidDocumentResolver({ methods: { plc: new atcute.PlcDidDocumentResolver(), web: new atcute.WebDidDocumentResolver() } })
      })
    }));
  };
  app.get("/auth/client-metadata.json", async (c) => c.json((await oauth()).metadata));
  app.get("/auth/jwks.json", async (c) => c.json((await oauth()).jwks));
  app.get("/auth/login", async (c) => {
    const handle = (c.req.query("handle") || "").trim().replace(/^@/, "");
    if (!handle) return c.text("handle", 400);
    const { url } = await (await oauth()).authorize({ target: { type: "account", identifier: handle }, state: { at: Date.now() } });
    return c.redirect(url.toString(), 302);
  });
  app.get("/auth/callback", async (c) => {
    const client = await oauth();
    const { session } = await client.callback(new URL(c.req.url).searchParams);
    const did = session.did;
    let handle = null;
    try {
      const r = await new atcute.Client({ handler: session }).get("com.atproto.server.getSession");
      handle = r.ok ? r.data.handle : null;
    } catch {}
    await rows.put("handle/" + did, handle);
    // Only the owner's atproto session is kept. Anyone else is remembered by DID alone.
    if (did !== config.owner) await client.revoke(did).catch(() => null);
    const cookie = await sessionCookie.make(await secrets.COOKIE_KEY, did, { epoch: (await rows.get("epoch")) || 0 });
    return new Response(null, { status: 302, headers: { location: "/", "set-cookie": cookieFor(cookie, 30 * 24 * 3600) } });
  });
  app.post("/auth/logout", async (c) => {
    // everywhere=true ends every browser's session, by making every cookie issued so far stale.
    if (c.req.query("everywhere") === "true" && c.get("who").caller === "owner" && c.get("who").via === "session") await rows.increment("epoch");
    return new Response(null, { status: 204, headers: { "set-cookie": cookieFor("", 0) } });
  });
  app.get("/auth/session", async (c) => {
    const who = c.get("who");
    if (who.via !== "session") return c.json({ signedIn: false, ownerSet: !!config.owner });
    return c.json({ signedIn: true, did: who.did, handle: await rows.get("handle/" + who.did), owner: who.caller === "owner" });
  });

  // Tokens for callers with no session, and grants for other DIDs. Each names the methods it may call.
  const full = (m) => (m.startsWith("com.") ? m : "com.lopecode.brain." + m);
  const never = (m) => /^com\\.lopecode\\.brain\\.(infra|secret|token|grant)\\./.test(m);
  app.get(NS + "token.list", session, async (c) => c.json({ tokens: (await rows.list("token/")).map((r) => r.value) }));
  app.post(NS + "token.create", session, async (c) => {
    const { name, methods = [] } = await c.req.json();
    const named = methods.map(full);
    if (!/^[a-z0-9-]{1,40}$/.test(name || "")) return fail(c, 400, "InvalidRequest", "name is lower case letters, digits and -");
    if (named.some(never)) return fail(c, 400, "InvalidRequest", "a token cannot name infra, secret, token or grant methods");
    const token = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
    await rows.put("token/" + (await sha256(token)), { name, methods: named, created: Date.now() });
    return c.json({ name, token });
  });
  app.post(NS + "token.revoke", session, async (c) => {
    const { name } = await c.req.json();
    let revoked = 0;
    for (const r of await rows.list("token/")) if (r.value.name === name) revoked += (await rows.delete(r.key)) ? 1 : 0;
    return c.json({ revoked });
  });
  app.get(NS + "grant.list", session, async (c) => c.json({ grants: (await rows.list("grant/")).map((r) => r.value) }));
  app.post(NS + "grant.put", session, async (c) => {
    const { did, methods = [] } = await c.req.json();
    const named = methods.map(full);
    if (!/^did:(plc|web):[A-Za-z0-9.:%-]+$/.test(did || "")) return fail(c, 400, "InvalidRequest", "did");
    if (named.some(never)) return fail(c, 400, "InvalidRequest", "a grant cannot name infra, secret, token or grant methods");
    await rows.put("grant/" + did, { did, methods: named, granted: Date.now() });
    return c.json({ did, methods: named });
  });
  app.post(NS + "grant.delete", session, async (c) => c.json({ deleted: await rows.delete("grant/" + (await c.req.json()).did) }));

  // Deploys go to the guard, for the owner's own session and nobody else.
  app.all(NS + "infra.*", session, async (c) => {
    const url = new URL(c.req.url), bodied = c.req.method === "POST";
    return guard.fetch(new Request("https://guard.internal" + url.pathname + url.search, { method: c.req.method, headers: { "content-type": "application/json", "x-brain-caller": "owner" }, body: bodied ? c.req.raw.body : undefined, duplex: bodied ? "half" : undefined }));
  });
  // Everything else: who is calling, then the core. Nothing the caller sent says who they are.
  app.all("*", async (c) => {
    const url = new URL(c.req.url), who = c.get("who");
    const headers = new Headers(c.req.raw.headers);
    for (const name of [...headers.keys()]) if (name === "cookie" || name === "authorization" || name.startsWith("x-brain-")) headers.delete(name);
    headers.set("x-brain-caller", who.caller);
    headers.set("x-brain-via", who.via);
    const bodied = !["GET", "HEAD"].includes(c.req.method);
    return core.fetch(new Request("https://core.internal" + url.pathname + url.search, { method: c.req.method, headers, body: bodied ? c.req.raw.body : undefined, duplex: bodied ? "half" : undefined, redirect: "manual" }));
  });
  return app;
};
const _brainkernel_anon_45f932eba7 = function _anonymous(md) {return (md\`## Tests

The kernel runs under \\\`simulate\\\` with the core and the guard replaced by recorders. Sign-in itself needs a PDS and is checked on a deployed kernel.\`);};
const _brainkernel_kernelRig = function _kernelRig(Response,simulate,kernel_service,sessionCookie) {return (async ({ core } = {}) => {
  const seen = [], toGuard = [];
  const record = (list) => async (request) => {
    const body = ["GET", "HEAD"].includes(request.method) ? null : new TextDecoder().decode(await request.arrayBuffer());
    list.push({ url: request.url, method: request.method, headers: Object.fromEntries(request.headers), body });
    return request.url.endsWith("/go") ? new Response(null, { status: 302, headers: { location: "https://example.com/" } }) : Response.json({ ok: true });
  };
  const sim = await simulate(kernel_service, {
    secrets: { COOKIE_KEY: "cookie-key", BRAIN_KEY: "kernel-key" },
    config: { host: "cb.sub.workers.dev", owner: "did:plc:owner" },
    core: core || record(seen),
    guard: record(toGuard)
  });
  const B = "https://cb.sub.workers.dev";
  const call = async (path, { cookie, bearer, body, headers = {}, method } = {}) => {
    const r = await sim.fetch(B + (path.startsWith("/") ? path : "/xrpc/com.lopecode.brain." + path), {
      method: method || (body === undefined ? "GET" : "POST"),
      headers: { ...headers, ...(cookie ? { cookie: "theme=dark; brain_session=" + cookie } : {}), ...(bearer ? { authorization: "Bearer " + bearer } : {}), ...(body === undefined ? {} : { "content-type": "application/json" }) },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
      redirect: "manual"
    });
    const text = await r.text();
    let data = text;
    try { data = JSON.parse(text); } catch {}
    return { status: r.status, data, headers: r.headers };
  };
  return { sim, seen, toGuard, call, owner: await sessionCookie.make("cookie-key", "did:plc:owner"), other: await sessionCookie.make("cookie-key", "did:plc:other") };
});};
const _brainkernel_test_session_cookie = async function _test_session_cookie(sessionCookie,expect,kernelRig) {
  const good = await sessionCookie.make("k", "did:plc:a");
  expect(await sessionCookie.read("k", good)).toBe("did:plc:a");
  expect(await sessionCookie.read("other", good)).toBe(null);
  expect(await sessionCookie.read("k", good.slice(0, -2) + "xx")).toBe(null);
  expect(await sessionCookie.read("k", await sessionCookie.make("k", "did:plc:a", { ttl: -1 }))).toBe(null);
  expect(await sessionCookie.read("k", good, 1)).toBe(null);
  const [, payload] = good.split(".");
  const forged = "v1." + btoa(JSON.stringify({ did: "did:plc:owner", exp: Date.now() + 1e6 })) + "." + good.split(".")[2];
  expect(await sessionCookie.read("k", forged)).toBe(null);
  const rig = await kernelRig();
  expect((await rig.call("/auth/session")).data).toEqual({ signedIn: false, ownerSet: true });
  expect((await rig.call("/auth/session", { cookie: rig.owner })).data).toEqual({ signedIn: true, did: "did:plc:owner", handle: null, owner: true });
  expect((await rig.call("/auth/session", { cookie: rig.other })).data.owner).toBe(false);
  return "signed, expiring, tied to an epoch";
};
const _brainkernel_test_forged_caller_is_dropped = async function _test_forged_caller_is_dropped(kernelRig,expect) {
  const rig = await kernelRig();
  await rig.call("inbox.list", { headers: { "x-brain-caller": "owner", "x-brain-via": "session", "x-brain-key": "kernel-key" } });
  expect(rig.seen[0].headers["x-brain-caller"]).toBe("anonymous");
  expect(rig.seen[0].headers["x-brain-via"]).toBe("");
  await rig.call("inbox.list", { cookie: rig.owner });
  expect(rig.seen[1].headers["x-brain-caller"]).toBe("owner");
  expect(rig.seen[1].headers["x-brain-via"]).toBe("session");
  // The kernel proves itself to the core with its own key, not one the caller sent.
  expect(rig.seen[0].headers["x-brain-key"]).toBe("kernel-key");
  return "anonymous without a session";
};
const _brainkernel_test_cookie_not_forwarded = async function _test_cookie_not_forwarded(kernelRig,expect) {
  const rig = await kernelRig();
  await rig.call("/hooks/whatsapp", { cookie: rig.owner, body: '{"raw":  "bytes"}', headers: { "x-hub-signature-256": "sha256=abc" } });
  const got = rig.seen[0];
  expect(got.headers.cookie).toBeUndefined();
  expect(got.headers.authorization).toBeUndefined();
  expect(got.headers["x-hub-signature-256"]).toBe("sha256=abc");
  expect(got.url).toBe("https://core.internal/hooks/whatsapp");
  // The body reaches the core byte for byte: a webhook's signature is over the raw bytes.
  expect(got.body).toBe('{"raw":  "bytes"}');
  return "cookie and authorization removed, body untouched";
};
const _brainkernel_test_redirect_from_a_recipe_reaches_the_client = async function _test_redirect_from_a_recipe_reaches_the_client(kernelRig,expect) {
  const rig = await kernelRig();
  const r = await rig.call("/go");
  expect(r.status).toBe(302);
  expect(r.headers.get("location")).toBe("https://example.com/");
  return "302";
};
const _brainkernel_test_tokens_reach_only_their_methods = async function _test_tokens_reach_only_their_methods(kernelRig,expect) {
  const rig = await kernelRig();
  expect((await rig.call("token.create", { body: { name: "laptop", methods: ["proxy.fetch"] } })).status).toBe(401);
  const made = await rig.call("token.create", { cookie: rig.owner, body: { name: "laptop", methods: ["proxy.fetch"] } });
  expect(made.data.token).toMatch(/^[0-9a-f]{64}$/);
  expect(JSON.stringify([...rig.sim.rows])).not.toContain(made.data.token);
  expect((await rig.call("proxy.fetch", { bearer: made.data.token, body: {} })).status).toBe(200);
  expect(rig.seen[0].headers["x-brain-caller"]).toBe("token:laptop");
  // Another origin can read the answer to a token call, and never one made with the cookie.
  expect((await rig.call("proxy.fetch", { bearer: made.data.token, body: {} })).headers.get("access-control-allow-origin")).toBe("*");
  expect((await rig.call("auth.nothing", { cookie: rig.owner })).headers.get("access-control-allow-origin")).toBe(null);
  expect((await rig.call("inbox.list", { bearer: made.data.token })).status).toBe(403);
  expect((await rig.call("/notebooks/private", { bearer: made.data.token })).status).toBe(403);
  expect((await rig.call("infra.getState", { bearer: made.data.token })).status).toBe(403);
  expect((await rig.call("token.create", { bearer: made.data.token, body: { name: "more", methods: [] } })).status).toBe(403);
  expect((await rig.call("inbox.list", { bearer: "f".repeat(64) })).status).toBe(401);
  // A token cannot be given the methods that deploy, read secrets or mint access.
  for (const m of ["infra.apply", "secret.get", "token.create", "grant.put"])
    expect((await rig.call("token.create", { cookie: rig.owner, body: { name: "bad", methods: [m] } })).status).toBe(400);
  expect((await rig.call("token.revoke", { cookie: rig.owner, body: { name: "laptop" } })).data).toEqual({ revoked: 1 });
  expect((await rig.call("proxy.fetch", { bearer: made.data.token, body: {} })).status).toBe(401);
  return "one method, then revoked";
};
const _brainkernel_test_another_did_needs_a_grant = async function _test_another_did_needs_a_grant(kernelRig,expect) {
  const rig = await kernelRig();
  expect((await rig.call("index.search", { cookie: rig.other })).status).toBe(403);
  await rig.call("grant.put", { cookie: rig.owner, body: { did: "did:plc:other", methods: ["index.search"] } });
  expect((await rig.call("index.search", { cookie: rig.other })).status).toBe(200);
  expect(rig.seen[0].headers["x-brain-caller"]).toBe("did:plc:other");
  expect((await rig.call("inbox.list", { cookie: rig.other })).status).toBe(403);
  // A page is not a method: a signed-in visitor is anonymous there.
  await rig.call("/notebooks/x", { cookie: rig.other });
  expect(rig.seen[1].headers["x-brain-caller"]).toBe("anonymous");
  expect((await rig.call("grant.put", { cookie: rig.other, body: { did: "did:plc:other", methods: ["inbox.list"] } })).status).toBe(403);
  return "403 until granted";
};
const _brainkernel_test_infra_is_for_the_owner_session_only = async function _test_infra_is_for_the_owner_session_only(kernelRig,expect) {
  const rig = await kernelRig();
  expect((await rig.call("infra.getState")).status).toBe(401);
  expect((await rig.call("infra.apply", { cookie: rig.other, body: {} })).status).toBe(403);
  expect(rig.toGuard.length).toBe(0);
  expect((await rig.call("infra.apply", { cookie: rig.owner, body: { workers: [] } })).status).toBe(200);
  expect(rig.toGuard[0]).toMatchObject({ url: "https://guard.internal/xrpc/com.lopecode.brain.infra.apply", body: '{"workers":[]}' });
  expect(rig.toGuard[0].headers["x-brain-caller"]).toBe("owner");
  expect(rig.toGuard[0].headers["x-brain-key"]).toBe("kernel-key");
  expect(rig.toGuard[0].headers.cookie).toBeUndefined();
  return "401, 403, then forwarded with the kernel's key";
};
const _brainkernel_test_service_jwt_claims_are_checked_first = async function _test_service_jwt_claims_are_checked_first(kernelRig,expect) {
  const rig = await kernelRig();
  const b64 = (o) => btoa(JSON.stringify(o)).replace(/=+$/, "");
  const jwt = (claims) => \`\${b64({ alg: "ES256K" })}.\${b64({ iss: "did:plc:owner", aud: "did:web:cb.sub.workers.dev", exp: Date.now() / 1000 + 60, lxm: "com.lopecode.brain.secret.list", ...claims })}.AAAA\`;
  expect((await rig.call("secret.list", { bearer: jwt({ aud: "did:web:other.example" }) })).data.error).toBe("BadJwtAudience");
  expect((await rig.call("secret.list", { bearer: jwt({ exp: 1 }) })).data.error).toBe("JwtExpired");
  expect((await rig.call("secret.list", { bearer: jwt({ lxm: "com.lopecode.brain.inbox.list" }) })).data.error).toBe("BadJwtLexiconMethod");
  expect((await rig.call("inbox.list", { bearer: jwt({}) })).data.error).toBe("BadJwtLexiconMethod");
  expect(rig.seen.length).toBe(0);
  return "aud, exp and lxm";
};
const _brainkernel_test_did_document_and_page = async function _test_did_document_and_page(kernelRig,expect) {
  const rig = await kernelRig();
  const doc = (await rig.call("/.well-known/did.json")).data;
  expect(doc.id).toBe("did:web:cb.sub.workers.dev");
  expect(doc.service).toEqual([{ id: "#brain", type: "CloudBrain", serviceEndpoint: "https://cb.sub.workers.dev" }]);
  // The page is a service like any other: the kernel passes "/" to the core as anonymous or as whoever asked.
  await rig.call("/");
  expect(rig.seen.at(-1)).toMatchObject({ url: "https://core.internal/" });
  rig.seen.length = 0;
  // The kernel's manifest and source are answered to anyone; a question about another Worker goes to the core.
  expect((await rig.call("getInfo")).data).toMatchObject({ name: "brain", role: "kernel" });
  expect((await rig.call("getSource?worker=brain")).data.module).toBe("@tomlarkworthy/brain-kernel");
  await rig.call("getSource?worker=brain-x-echo");
  expect(rig.seen.at(-1).url).toBe("https://core.internal/xrpc/com.lopecode.brain.getSource?worker=brain-x-echo");
  return "did:web, the installed page, its own source";
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["atcute.js"].map((name) => {
    const module_name = "@tomlarkworthy/brain-kernel";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  $def("_brainkernel_anon_1f3b6cb291", null, ["md"], _brainkernel_anon_1f3b6cb291);  
  $def("_brainkernel_kernel_service", "kernel_service", ["cloudflare","kernelApp"], _brainkernel_kernel_service);  
  $def("_brainkernel_kernel_announce", "kernel_announce", ["plugins","kernel_service","invalidation"], _brainkernel_kernel_announce);  
  $def("_brainkernel_atcute", "atcute", ["library","FileAttachment"], _brainkernel_atcute);  
  $def("_brainkernel_sessionCookie", "sessionCookie", [], _brainkernel_sessionCookie);  
  $def("_brainkernel_verifyServiceJwt", "verifyServiceJwt", ["atcute"], _brainkernel_verifyServiceJwt);  
  $def("_brainkernel_kernelApp", "kernelApp", ["hono","Response","sessionCookie","secrets","rows","config","verifyServiceJwt","sha256","atcute","guard","Request","core"], _brainkernel_kernelApp);  
  $def("_brainkernel_anon_45f932eba7", null, ["md"], _brainkernel_anon_45f932eba7);  
  $def("_brainkernel_kernelRig", "kernelRig", ["Response","simulate","kernel_service","sessionCookie"], _brainkernel_kernelRig);  
  $def("_brainkernel_test_session_cookie", "test_session_cookie", ["sessionCookie","expect","kernelRig"], _brainkernel_test_session_cookie);  
  $def("_brainkernel_test_forged_caller_is_dropped", "test_forged_caller_is_dropped", ["kernelRig","expect"], _brainkernel_test_forged_caller_is_dropped);  
  $def("_brainkernel_test_cookie_not_forwarded", "test_cookie_not_forwarded", ["kernelRig","expect"], _brainkernel_test_cookie_not_forwarded);  
  $def("_brainkernel_test_redirect_from_a_recipe_reaches_the_client", "test_redirect_from_a_recipe_reaches_the_client", ["kernelRig","expect"], _brainkernel_test_redirect_from_a_recipe_reaches_the_client);  
  $def("_brainkernel_test_tokens_reach_only_their_methods", "test_tokens_reach_only_their_methods", ["kernelRig","expect"], _brainkernel_test_tokens_reach_only_their_methods);  
  $def("_brainkernel_test_another_did_needs_a_grant", "test_another_did_needs_a_grant", ["kernelRig","expect"], _brainkernel_test_another_did_needs_a_grant);  
  $def("_brainkernel_test_infra_is_for_the_owner_session_only", "test_infra_is_for_the_owner_session_only", ["kernelRig","expect"], _brainkernel_test_infra_is_for_the_owner_session_only);  
  $def("_brainkernel_test_service_jwt_claims_are_checked_first", "test_service_jwt_claims_are_checked_first", ["kernelRig","expect"], _brainkernel_test_service_jwt_claims_are_checked_first);  
  $def("_brainkernel_test_did_document_and_page", "test_did_document_and_page", ["kernelRig","expect"], _brainkernel_test_did_document_and_page);  
  main.define("module @tomlarkworthy/cloudflare-iac", async () => runtime.module((await import("/@tomlarkworthy/cloudflare-iac.js?v=4")).default));  
  main.define("cloudflare", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("cloudflare", _));  
  main.define("secrets", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("secrets", _));  
  main.define("rows", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("rows", _));  
  main.define("config", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("config", _));  
  main.define("core", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("core", _));  
  main.define("guard", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("guard", _));  
  main.define("hono", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("hono", _));  
  main.define("library", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("library", _));  
  main.define("simulate", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("simulate", _));  
  main.define("sha256", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("sha256", _));  
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));  
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));  
  main.define("module @tomlarkworthy/plugin-registry", async () => runtime.module((await import("/@tomlarkworthy/plugin-registry.js?v=4")).default));  
  main.define("plugins", ["module @tomlarkworthy/plugin-registry", "@variable"], (_, v) => v.import("plugins", _));
  return main;
}` }, guard: { module: "@tomlarkworthy/brain-guard", cell: "guard_service", hash: "04a84eae571fe7816d85164cce18111bb4b5a78e6ef27d25f0f84bc02d9c94ff", source: `
const _brainguard_anon_8949db5842 = function _anonymous(md) {return (md\`# brain-guard

The one Worker that holds a Cloudflare API token. It does every deploy, checks each one, puts back what fails, keeps a new kernel or core on probation until the owner confirms it, and serves a plain page that works when nothing else does.

\\\`guard_service\\\` is deployed once, by the installer. Nothing on the Brain can change it afterwards: \\\`guardAllows\\\` and the role check in \\\`guardOps\\\` refuse any apply that names it.\`);};
const _brainguard_guard_service = function _guard_service(cloudflare,guardFn,guardOps) {return (cloudflare.Worker("guard", guardFn, {
  role: "guard",
  crons: ["* * * * *"],
  flags: ["global_fetch_strictly_public"],
  scheduled: () => guardOps.tick()
}));};
const _brainguard_anon_9137c93017 = function _anonymous(md) {return (md\`## What an apply may touch

\\\`guardAllows\\\` is the rule for a recipe. The kernel and the core do not pass through it: they are deployed by role, under probation.\`);};
const _brainguard_guardAllows = function _guardAllows() {return ((row) => {
  const reserved = new Set(["brain", "brain-guard", "brain-core"]);
  const kinds = new Set(["worker", "r2_bucket", "vectorize_index"]);
  if (row.op === "unchanged") return null;
  const [kind, name] = row.key.split("/");
  if (reserved.has(name)) return \`resource name "\${name}" is reserved\`;
  if (!kinds.has(kind)) return \`unknown resource kind "\${kind}"\`;
  if (!/^brain-x-[a-z0-9-]{1,40}$/.test(name)) return \`resource name "\${name}" must match brain-x-[a-z0-9-]\`;
  if (kind === "r2_bucket" && row.op === "delete" && row.objects > 0) return \`bucket "\${name}" holds \${row.objects} objects\`;
  return null;
});};
const _brainguard_anon_d51970bd07 = function _anonymous(md) {return (md\`## Probation

One transition function for a kernel or core update, driven by the guard's one-minute cron and by \\\`infra.confirm\\\`. Times are milliseconds.\`);};
const _brainguard_nextKernelState = function _nextKernelState() {return ((s, event) => {
  // 10 minutes unless the guard's config sets probationMs, which a test Brain does.
  const PROBATION_MS = event.probationMs ?? 10 * 60 * 1000;
  const span = PROBATION_MS % 60000 ? PROBATION_MS / 1000 + " seconds" : PROBATION_MS / 60000 + " minutes";
  if (s.state !== "probation") return s;
  if (event.type === "confirm") return { state: "confirmed", version: s.version, lastGood: s.version };
  if (event.type === "tick") {
    const fails = event.healthy ? 0 : s.fails + 1;
    if (fails >= 2) return { state: "rolled-back", version: s.lastGood, lastGood: s.lastGood, reason: "health check failed twice" };
    if (event.now - s.since >= PROBATION_MS) return { state: "rolled-back", version: s.lastGood, lastGood: s.lastGood, reason: "not confirmed in " + span };
    return { ...s, fails };
  }
  return s;
});};
const _brainguard_anon_46bd9dba3e = function _anonymous(md) {return (md\`## Deploying

\\\`guardOps\\\` is everything the guard does to Cloudflare. A Worker's name in an apply is its logical name (\\\`brain\\\`, \\\`brain-core\\\`, \\\`brain-x-NAME\\\`); the script name on Cloudflare replaces \\\`brain\\\` with this Brain's base name, so two Brains can share an account.

Each Worker gets a key when it is first deployed. The guard presents it to reach that Worker from the internet, and the Worker presents it to the core to say which Worker it is.\`);};
const _brainguard_guardOps = function _guardOps(config,secrets,rows,sha256,FormData,partsHash,guardAllows,nextKernelState) {
  const text = (v) => JSON.stringify(v);
  const jsonType = { "content-type": "application/json" };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const actual = (logical) => config.base + logical.slice("brain".length);
  const script = (logical) => "/workers/scripts/" + actual(logical);
  const urlOf = (logical) => \`https://\${actual(logical)}.\${config.subdomain}.workers.dev\`;
  const randomKey = () => [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const api = async (method, path, body, headers = {}) => {
    const r = await fetch("https://api.cloudflare.com/client/v4/accounts/" + config.account + path, {
      method,
      headers: { authorization: "Bearer " + (await secrets.CF_API_TOKEN), ...headers },
      body
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.success === false) throw new Error(\`\${method} \${path} \${r.status} \${text(j.errors || []).slice(0, 300)}\`);
    return j.result;
  };
  const call = (logical, key, path, init = {}, version) => {
    const headers = { "x-brain-guard": key, ...(init.headers || {}) };
    if (version) headers["Cloudflare-Workers-Version-Overrides"] = \`\${actual(logical)}="\${version}"\`;
    return fetch(urlOf(logical) + path, { ...init, headers, redirect: "manual" });
  };
  const healthy = async (logical, key, hash, version) => {
    try {
      const r = await call(logical, key, "/xrpc/_health", {}, version);
      if (!r.ok) return false;
      const j = await r.json();
      return j.ok === true && (!hash || j.hash === hash);
    } catch {
      return false;
    }
  };
  const waitHealthy = async (logical, key, hash, version) => {
    // 60 s. At 30 s two deploys of one Worker were put back while Cloudflare still answered with the version
    // before (2026-10-06 09:30 and 09:33); the third took 25 s.
    for (let i = 0; i < (config.pollTries || 40); i++) {
      if (await healthy(logical, key, hash, version)) return true;
      await sleep(config.pollMs ?? 1500);
    }
    return false;
  };
  const toCore = async (nsid, input) => {
    const core = await rows.get("worker/brain-core");
    if (!core || !core.hash) return null;
    const r = await call("brain-core", core.key, "/xrpc/com.lopecode.brain." + nsid, { method: "POST", headers: jsonType, body: text(input) });
    return r.ok ? r.json() : null;
  };
  const note = (key, body) => toCore("inbox.append", { source: "guard", key, body }).catch(() => null);
  const currentVersion = async (logical) => {
    const d = (await api("GET", script(logical) + "/deployments")).deployments[0];
    return (d.versions.find((v) => v.percentage === 100) || d.versions[0]).version_id;
  };
  const setVersions = (logical, versions) =>
    api("POST", script(logical) + "/deployments", text({ strategy: "percentage", versions }), jsonType);
  const settings = async () => (await rows.get("settings")) || { approval: true };

  const uploadAsset = async (logical, html) => {
    const bytes = new TextEncoder().encode(html);
    const hash = (await sha256(html)).slice(0, 32);
    const session = await api("POST", script(logical) + "/assets-upload-session", text({ manifest: { "/index.html": { hash, size: bytes.length } } }), jsonType);
    if (!session.buckets || !session.buckets.length) return { jwt: session.jwt, hash };
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    const form = new FormData();
    form.append(hash, new File([btoa(binary)], hash, { type: "text/html" }));
    const r = await fetch(\`https://api.cloudflare.com/client/v4/accounts/\${config.account}/workers/assets/upload?base64=true\`, {
      method: "POST",
      headers: { authorization: "Bearer " + session.jwt },
      body: form
    });
    const j = await r.json().catch(() => ({}));
    if (!j.success || !j.result || !j.result.jwt) throw new Error("asset upload " + r.status + " " + text(j.errors || []).slice(0, 200));
    return { jwt: j.result.jwt, hash };
  };

  const sqlDatabase = async () => {
    const known = await rows.get("sql");
    if (known) return known;
    const name = actual("brain-sql");
    const found = ((await api("GET", "/d1/database?name=" + encodeURIComponent(name))) || []).find((d) => d.name === name);
    const id = found ? found.uuid : (await api("POST", "/d1/database", text({ name }), jsonType)).uuid;
    await rows.put("sql", id);
    return id;
  };

  // Bindings are built here from the resources a Worker declares. Nothing the tab sends is bound as given.
  const bindingsFor = async (w, key, existing, given) => {
    const m = w.meta, tier = m.role === "kernel" || m.role === "core";
    const out = [];
    // Only the kernel's and the core's own keys are bound, from the installer or made here. A secret the owner set
    // is never bound: a Worker asks secret.get for it while it runs, and the secret's rule decides.
    for (const name of tier ? m.secrets : []) {
      if (typeof given[name] === "string") out.push({ type: "secret_text", name, text: given[name] });
      else if (existing.has(name)) out.push({ type: "inherit", name });
      else out.push({ type: "secret_text", name, text: randomKey() });
    }
    const uses = (r) => m.resources.includes(r);
    // Every Worker's rows are in one D1 database of the Brain, made on first use. Only the guard has a Durable Object.
    if (uses("rows")) out.push(existing.has("SQL") ? { type: "inherit", name: "SQL" } : { type: "d1", name: "SQL", id: await sqlDatabase() });
    if (uses("blobs")) {
      const bucket = actual("brain-blobs");
      if (!existing.has("BLOBS")) await api("POST", "/r2/buckets", text({ name: bucket }), jsonType).catch((e) => { if (!/exist|10004/i.test(e.message)) throw e; });
      out.push({ type: "r2_bucket", name: "BLOBS", bucket_name: bucket });
    }
    if (uses("inbox") || uses("xrpc") || uses("core") || (m.secrets.length && !tier)) out.push({ type: "service", name: "CORE", service: actual("brain-core") });
    if (uses("guard")) out.push({ type: "service", name: "GUARD", service: actual("brain-guard") });
    if (uses("assets")) out.push({ type: "assets", name: "ASSETS" });
    for (const name of existing) if (name.startsWith("X_")) out.push({ type: "inherit", name });
    out.push({ type: "secret_text", name: "BRAIN_KEY", text: key });
    out.push({ type: "json", name: "BRAIN_CONFIG", json: { base: config.base, subdomain: config.subdomain, host: \`\${config.base}.\${config.subdomain}.workers.dev\`, owner: config.owner || null } });
    out.push({
      type: "json",
      name: "BRAIN_INFO",
      json: { name: m.worker, hash: w.hash, role: m.role, module: m.module || null, methods: m.methods, access: m.access || {}, calls: m.calls || [], paths: m.paths, secrets: m.secrets, resources: m.resources, deployedAt: new Date().toISOString() }
    });
    return out;
  };

  const refusal = async (w, rec) => {
    const m = w.meta || {};
    const logical = m.worker;
    if (typeof logical !== "string" || !Array.isArray(m.resources) || !Array.isArray(m.secrets)) return "not an emitted Worker";
    if (logical === "brain-guard" || m.role === "guard") return 'resource name "brain-guard" is reserved';
    if (w.parts && (await partsHash(w.parts, m)) !== w.hash) return \`the parts sent for "\${logical}" do not hash to \${String(w.hash).slice(0, 12)}\`;
    const tier = { kernel: "brain", core: "brain-core" }[m.role];
    if (tier) return tier === logical ? null : \`role \${m.role} must be named \${tier}\`;
    // A system Worker: routed by the core like a recipe, deployed like the core. Its name is not a recipe's.
    if (m.role === "system") return /^brain-(?!x-|core$|guard$)[a-z0-9-]+$/.test(logical) ? null : "role system must be named brain-NAME";
    if ((await rows.get("worker/" + logical.replace(/^brain-x-/, "brain-")) || {}).hash) return \`\${logical.replace(/^brain-x-/, "brain-")} is a system Worker\`;
    const reason = guardAllows({ key: "worker/" + logical, op: rec && rec.hash ? "update" : "create" });
    if (reason) return reason;
    // A method or path belongs to one Worker: the core routes to the first Worker that declares it.
    for (const { value: other } of await rows.list("worker/")) {
      if (other.worker === logical || !other.hash) continue;
      const clash = (m.methods || []).find((x) => (other.methods || []).includes(x)) || (m.paths || []).map((x) => x.path).find((x) => (other.paths || []).some((o) => o.path === x));
      if (clash) return \`\${clash} is already served by \${other.worker}\`;
    }
    const bad = m.resources.find((r) => !["rows", "blobs", "inbox", "xrpc", "assets"].includes(r));
    if (bad) return \`a recipe may not use the platform cell "\${bad}"\`;
    return m.secrets.find((s) => s.startsWith("BRAIN_") || s.startsWith("CF_")) ? "a recipe may not name a BRAIN_ or CF_ secret" : null;
  };

  const register = async (rec, access) => {
    if (rec.role === "guard") return;
    await toCore("service.register", {
      worker: rec.worker,
      role: rec.role,
      module: rec.module || null,
      hash: rec.hash,
      methods: access || {},
      paths: rec.paths,
      secrets: rec.secrets,
      keyHash: await sha256(rec.key)
    });
    if (rec.role !== "recipe" && rec.role !== "system") return;
    const core = await rows.get("worker/brain-core");
    if (!core || !core.hash) return;
    const name = "X_" + rec.worker.replace(/^brain-(x-)?/, "").toUpperCase().replace(/[^A-Z0-9]/g, "_");
    const now = (await api("GET", script("brain-core") + "/settings")).bindings;
    if (now.some((b) => b.name === name)) return;
    const form = new FormData();
    form.append("settings", new Blob([text({ bindings: [...now.map((b) => ({ type: "inherit", name: b.name })), { type: "service", name, service: actual(rec.worker) }] })], { type: "application/json" }));
    await api("PATCH", script("brain-core") + "/settings", form);
    // The core now runs a version with one more binding and the same code: that version is the one to keep.
    const version = await currentVersion("brain-core");
    const ks = await rows.get("kernelstate/brain-core");
    if (ks && ks.state !== "probation") await rows.put("kernelstate/brain-core", { ...ks, version, lastGood: version });
    await rows.put("worker/brain-core", { ...core, version });
  };

  const deployOne = async (w, rec, given) => {
    const m = w.meta, logical = m.worker, name = actual(logical);
    const key = (rec && rec.key) || randomKey();
    const live = rec && rec.hash ? await api("GET", script(logical) + "/settings").catch(() => null) : null;
    const existing = new Set(live ? live.bindings.map((b) => b.name) : []);
    const bindings = await bindingsFor(w, key, existing, given);
    const meta = { main_module: "worker.js", compatibility_date: "2026-10-01", compatibility_flags: m.flags || [], bindings };
    let assetHash = rec ? rec.assetHash : undefined;
    if (m.resources.includes("assets")) {
      if (typeof w.asset === "string") {
        const up = await uploadAsset(logical, w.asset);
        meta.assets = { jwt: up.jwt, config: { run_worker_first: true } };
        assetHash = up.hash;
      } else if (existing.has("ASSETS")) meta.keep_assets = true;
      else throw new Error(\`"\${logical}" needs its page and none was sent\`);
    }
    const form = () => {
      const f = new FormData();
      f.append("metadata", new Blob([text(meta)], { type: "application/json" }));
      for (const p of w.parts) f.append(p.path, new File([p.text], p.path, { type: "application/javascript+module" }));
      return f;
    };
    const previous = live ? await currentVersion(logical) : null;
    let version;
    if (!live) {
      // A new script needs the script upload, which goes live at once.
      await api("PUT", script(logical), form());
      await api("POST", script(logical) + "/subdomain", text({ enabled: true }), jsonType);
      if (m.crons.length) await api("PUT", script(logical) + "/schedules", text(m.crons.map((cron) => ({ cron }))), jsonType);
      version = await currentVersion(logical);
      if (!(await waitHealthy(logical, key, w.hash))) {
        if (previous) await setVersions(logical, [{ version_id: previous, percentage: 100 }]);
        else await api("DELETE", script(logical) + "?force=true");
        throw new Error("health check failed after go-live");
      }
    } else {
      version = (await api("POST", script(logical) + "/versions", form())).id;
      await setVersions(logical, [{ version_id: previous, percentage: 100 }, { version_id: version, percentage: 0 }]);
      if (!(await waitHealthy(logical, key, w.hash, version))) {
        await setVersions(logical, [{ version_id: previous, percentage: 100 }]);
        throw new Error("self-test failed before go-live");
      }
      await setVersions(logical, [{ version_id: version, percentage: 100 }]);
      if (!(await waitHealthy(logical, key, w.hash))) {
        await setVersions(logical, [{ version_id: previous, percentage: 100 }]);
        throw new Error("health check failed after go-live");
      }
    }
    // What is needed to put the version before back, routes included.
    const before = rec && rec.hash ? { hash: rec.hash, version: previous, module: rec.module, methods: rec.methods, access: rec.access, paths: rec.paths, secrets: rec.secrets, resources: rec.resources } : null;
    const next = {
      worker: logical, role: m.role, module: m.module || null, hash: w.hash, version, key, state: "deployed", fails: 0, assetHash,
      previous: before,
      methods: m.methods, access: m.access || {}, paths: m.paths, secrets: m.secrets, resources: m.resources, deployedAt: Date.now()
    };
    await rows.put("worker/" + logical, next);
    await register(next, m.access);
    let state = "deployed";
    // The kernel, the core and the Worker the page comes from: a broken one cannot serve the page that would report
    // its tests, so these are also put back when nobody confirms in time.
    if (m.role !== "recipe" || (m.paths || []).some((p) => p.path === "/")) {
      if (previous) {
        await rows.put("kernelstate/" + logical, { state: "probation", version, lastGood: previous, since: Date.now(), fails: 0, hash: w.hash, lastGoodHash: rec.hash });
        state = "probation";
      } else {
        await rows.put("kernelstate/" + logical, { state: "confirmed", version, lastGood: version, hash: w.hash });
        await rows.put("confirmed/" + logical, [{ version, hash: w.hash, at: Date.now() }]);
      }
    }
    await note(\`deploy/\${logical}/\${version}\`, { event: state, worker: logical, hash: w.hash });
    return { state, version };
  };

  const apply = async ({ workers = [], remove = [], dry = false } = {}, { recovery = false } = {}) => {
    const approval = (await settings()).approval;
    const results = [];
    for (const w of workers) {
      const logical = w && w.meta && w.meta.worker;
      const rec = typeof logical === "string" ? await rows.get("worker/" + logical) : null;
      const base = { worker: logical, hash: w && w.hash };
      const reason = await refusal(w || {}, rec);
      if (reason) results.push({ ...base, state: "refused", reason });
      else if (rec && rec.hash === w.hash && rec.state === "deployed" && !w.force && !(typeof w.asset === "string" && (await sha256(w.asset)).slice(0, 32) !== rec.assetHash)) results.push({ ...base, state: "unchanged" });
      else if (approval && !recovery && !(await rows.get("approved/" + w.hash))) {
        const m = w.meta;
        await rows.put("pending/" + w.hash, { worker: logical, hash: w.hash, methods: m.methods, paths: m.paths, secrets: m.secrets, resources: m.resources, at: Date.now() });
        results.push({ ...base, state: "waiting" });
      } else if (dry || !w.parts) results.push({ ...base, state: "ready" });
      else {
        try {
          // Only the installer, holding the recovery key, may hand a Worker a secret's value directly.
          results.push({ ...base, ...(await deployOne(w, rec, recovery && w.secrets ? w.secrets : {})) });
        } catch (e) {
          const reason = String((e && e.message) || e);
          const kept = rec && rec.hash ? { ...rec, lastError: reason, lastErrorAt: Date.now(), failedHash: w.hash } : { worker: logical, role: w.meta.role, hash: null, key: rec && rec.key, state: "removed", lastError: reason, lastErrorAt: Date.now(), failedHash: w.hash };
          await rows.put("worker/" + logical, kept);
          await note(\`put-back/\${logical}/\${w.hash}/\${kept.lastErrorAt}\`, { event: "put-back", worker: logical, hash: w.hash, previous: kept.hash, reason });
          results.push({ ...base, state: "put-back", previous: kept.hash, reason });
        }
      }
    }
    for (const logical of remove) {
      const rec = await rows.get("worker/" + logical);
      const reason = guardAllows({ key: "worker/" + logical, op: "delete" });
      if (reason) results.push({ worker: logical, state: "refused", reason });
      else if (approval && !recovery && !(await rows.get("approved/remove:" + logical))) {
        await rows.put("pending/remove:" + logical, { worker: logical, hash: "remove:" + logical, remove: true, at: Date.now() });
        results.push({ worker: logical, state: "waiting" });
      } else if (!dry) {
        await toCore("service.unregister", { worker: logical });
        const core = await rows.get("worker/brain-core");
        if (core && core.hash) {
          const name = "X_" + logical.slice("brain-x-".length).toUpperCase().replace(/[^A-Z0-9]/g, "_");
          const now = (await api("GET", script("brain-core") + "/settings")).bindings;
          if (now.some((b) => b.name === name)) {
            const form = new FormData();
            form.append("settings", new Blob([text({ bindings: now.filter((b) => b.name !== name).map((b) => ({ type: "inherit", name: b.name })) })], { type: "application/json" }));
            await api("PATCH", script("brain-core") + "/settings", form);
          }
        }
        if (rec && rec.hash) await api("DELETE", script(logical) + "?force=true");
        await rows.delete("worker/" + logical);
        await rows.delete("approved/remove:" + logical);
        results.push({ worker: logical, state: "removed" });
      } else results.push({ worker: logical, state: "ready" });
    }
    return { results };
  };

  const putBack = async (logical, rec, to, reason) => {
    await setVersions(logical, [{ version_id: to.version, percentage: 100 }]);
    const at = Date.now();
    // The routes of the version put back, when they were kept: a deploy may have changed what the Worker answers.
    const old = rec.previous && rec.previous.version === to.version && rec.previous.methods ? rec.previous : {};
    const next = { ...rec, ...old, hash: to.hash, version: to.version, previous: null, fails: 0, state: "deployed", lastError: reason, lastErrorAt: at, failedHash: rec.hash };
    await rows.put("worker/" + logical, next);
    await register(next, next.access).catch(() => null);
    await note(\`put-back/\${logical}/\${rec.hash}/\${at}\`, { event: "put-back", worker: logical, hash: rec.hash, previous: to.hash, reason });
  };

  // The last run of the cron is recorded, so a guard whose cron has stopped, or whose tick throws, can be seen.
  const tick = async () => {
    const at = Date.now(), last = await rows.get("tick");
    // The cron and the alarm may both call within a minute; a check counts once.
    if (last && !last.error && at - last.at < (config.tickGapMs ?? 30000)) return;
    try {
      await runTick();
      await rows.put("tick", { at, ms: Date.now() - at });
    } catch (e) {
      await rows.put("tick", { at, error: String((e && e.message) || e) });
      throw e;
    }
  };
  const runTick = async () => {
    const onProbation = new Set();
    for (const { key, value: s } of await rows.list("kernelstate/")) {
      if (s.state !== "probation") continue;
      const logical = key.slice("kernelstate/".length);
      onProbation.add(logical);
      const rec = await rows.get("worker/" + logical);
      const next = nextKernelState(s, { type: "tick", now: Date.now(), healthy: await healthy(logical, rec.key), probationMs: config.probationMs });
      if (next.state === "rolled-back") await putBack(logical, rec, { version: s.lastGood, hash: s.lastGoodHash }, next.reason);
      await rows.put(key, next.state === "rolled-back" ? { ...next, hash: s.lastGoodHash, failedHash: s.hash, at: Date.now() } : next);
    }
    // Every other Worker: two failed checks in a row puts it back to the version before, when there is one.
    for (const { value: rec } of await rows.list("worker/")) {
      if (rec.state !== "deployed" || !rec.hash || onProbation.has(rec.worker)) continue;
      const fails = (await healthy(rec.worker, rec.key)) ? 0 : (rec.fails || 0) + 1;
      if (fails >= 2 && rec.previous) await putBack(rec.worker, rec, rec.previous, "health check failed twice");
      else if (fails !== (rec.fails || 0)) {
        await rows.put("worker/" + rec.worker, { ...rec, fails });
        if (fails === 2) await note(\`failing/\${rec.worker}/\${rec.hash}\`, { event: "failing", worker: rec.worker, hash: rec.hash });
      }
    }
  };

  const confirm = async (only = null) => {
    const confirmed = [];
    for (const { key, value: s } of await rows.list("kernelstate/")) {
      if (s.state !== "probation") continue;
      const logical = key.slice("kernelstate/".length);
      if (only && logical !== only) continue;
      await rows.put(key, { ...nextKernelState(s, { type: "confirm" }), hash: s.hash });
      const list = (await rows.get("confirmed/" + logical)) || [];
      await rows.put("confirmed/" + logical, [{ version: s.version, hash: s.hash, at: Date.now() }, ...list].slice(0, 5));
      confirmed.push(logical);
    }
    return { confirmed };
  };

  const rollback = async (logical, version) => {
    const to = ((await rows.get("confirmed/" + logical)) || []).find((c) => c.version === version);
    if (!to) throw new Error(\`\${version} is not a confirmed version of \${logical}\`);
    const rec = await rows.get("worker/" + logical);
    await putBack(logical, rec, to, "rolled back from the guard page");
    await rows.put("kernelstate/" + logical, { state: "rolled-back", version, lastGood: version, hash: to.hash, reason: "rolled back from the guard page", at: Date.now() });
  };

  // The core passes on what the page found when it ran a deployed module's tests.
  const verdict = async ({ worker: logical, hash, ok, reason = "" }) => {
    const rec = await rows.get("worker/" + logical);
    if (!rec || rec.hash !== hash) return { state: "stale" };
    const ks = await rows.get("kernelstate/" + logical);
    const probation = ks && ks.state === "probation";
    if (ok) {
      if (probation) await confirm(logical);
      return { state: "kept" };
    }
    const why = "its tests failed: " + String(reason).slice(0, 200);
    if (probation) {
      await putBack(logical, rec, { version: ks.lastGood, hash: ks.lastGoodHash }, why);
      await rows.put("kernelstate/" + logical, { state: "rolled-back", version: ks.lastGood, lastGood: ks.lastGood, hash: ks.lastGoodHash, failedHash: ks.hash, reason: why, at: Date.now() });
      return { state: "put-back", previous: ks.lastGoodHash };
    }
    if (!rec.previous) return { state: "kept", reason: "there is no version before this one" };
    const previous = rec.previous.hash;
    await putBack(logical, rec, rec.previous, why);
    return { state: "put-back", previous };
  };

  const approve = async (hash) => {
    const pending = await rows.get("pending/" + hash);
    if (!pending) return false;
    await rows.put("approved/" + hash, { at: Date.now(), worker: pending.worker });
    await rows.delete("pending/" + hash);
    return true;
  };

  const state = async () => ({
    base: config.base,
    approval: (await settings()).approval,
    tick: await rows.get("tick"),
    workers: (await rows.list("worker/")).map(({ value: { key, ...rest } }) => rest),
    kernel: Object.fromEntries(
      (await rows.list("kernelstate/")).map(({ key, value }) => [
        key.slice("kernelstate/".length),
        value.state === "probation" ? { ...value, deadline: value.since + (config.probationMs ?? 10 * 60 * 1000) } : value
      ])
    ),
    confirmed: Object.fromEntries((await rows.list("confirmed/")).map(({ key, value }) => [key.slice("confirmed/".length), value])),
    pending: (await rows.list("pending/")).map((r) => r.value),
    approved: (await rows.list("approved/")).map((r) => r.key.slice("approved/".length))
  });

  const setApproval = async (on) => rows.put("settings", { ...(await settings()), approval: !!on });

  return { apply, tick, confirm, rollback, approve, state, setApproval, verdict };
};
const _brainguard_anon_263f43f819 = function _anonymous(md) {return (md\`## The page

\\\`https://BASE-guard.SUBDOMAIN.workers.dev/\\\`. One HTML response, no script. The status lines are public; every action needs the recovery key.\`);};
const _brainguard_guardPage = function _guardPage() {return ((s, message = "") => {
  const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const short = (h) => esc(String(h || "none").slice(0, 12));
  const when = (t) => (t ? new Date(t).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "");
  const worker = (w) =>
    \`<tr><td>\${esc(w.worker)}</td><td><code>\${short(w.hash)}</code></td><td>\${esc(w.state)}\${w.fails >= 2 ? ", failing" : ""}</td><td>\${w.lastError ? esc(w.lastError) + " (" + when(w.lastErrorAt) + ")" : ""}</td></tr>\`;
  const kernel = Object.entries(s.kernel).map(([name, k]) =>
    k.state === "probation"
      ? \`<p class="amber">\${esc(name)} <code>\${short(k.hash)}</code> is on probation until \${when(k.deadline)}.</p>\`
      : k.state === "rolled-back"
      ? \`<p class="red">\${esc(name)} was rolled back to <code>\${short(k.hash)}</code> at \${when(k.at)}: \${esc(k.reason)}</p>\`
      : \`<p>\${esc(name)} <code>\${short(k.hash)}</code> is confirmed.</p>\`
  );
  const pending = s.pending.map(
    (p) =>
      \`<li><b>\${esc(p.worker)}</b> <code>\${short(p.hash)}</code>\${p.remove ? " (remove)" : ""} methods: \${esc((p.methods || []).join(", ") || "none")}; paths: \${esc((p.paths || []).map((x) => x.path).join(", ") || "none")}; secrets: \${esc((p.secrets || []).join(", ") || "none")} <button name="action" value="approve:\${esc(p.hash)}">Approve</button></li>\`
  );
  const rollbacks = Object.entries(s.confirmed).flatMap(([name, list]) =>
    list.map((c) => \`<button name="action" value="rollback:\${esc(name)}:\${esc(c.version)}">Roll back \${esc(name)} to \${short(c.hash)} (\${when(c.at)})</button>\`)
  );
  return \`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Cloud Brain guard</title><style>
body{font:15px/1.5 system-ui,sans-serif;max-width:720px;margin:2rem auto;padding:0 1rem;color:#111;background:#fff}
table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:.25rem .5rem;border-bottom:1px solid #ddd;vertical-align:top}
button{font:inherit;margin:.2rem .3rem .2rem 0;padding:.3rem .6rem}input{font:inherit;padding:.3rem;width:100%;box-sizing:border-box}
.amber{color:#8a6300}.red{color:#b3261e}.note{background:#f2f2f2;padding:.5rem .75rem}</style></head><body>
<h1>Cloud Brain guard</h1>
\${message ? \`<p class="note">\${esc(message)}</p>\` : ""}
<p>Brain <code>\${esc(s.base)}</code>. \${s.kernel.brain ? "" : "No kernel is deployed."}</p>
\${kernel.join("\\n")}
<table><tr><th>Worker</th><th>Hash</th><th>State</th><th>Last error</th></tr>\${s.workers.map(worker).join("")}</table>
<form method="post" action="/">
<h2>Waiting for approval</h2>
\${pending.length ? \`<ul>\${pending.join("")}</ul>\` : "<p>Nothing is waiting.</p>"}
<h2>Roll back</h2>
\${rollbacks.length ? rollbacks.join("<br>") : "<p>No confirmed version to roll back to.</p>"}
<h2>Deploys need approval: \${s.approval ? "on" : "off"}</h2>
<button name="action" value="approval:\${s.approval ? "off" : "on"}">Turn \${s.approval ? "off" : "on"}</button>
<h2><label for="key">Recovery key</label></h2>
<input id="key" name="key" type="password" autocomplete="off" required>
</form></body></html>\`;
});};
const _brainguard_guardFn = function _guardFn(Response,guardPage,guardOps,secrets,rows) {return (async (request) => {
  const url = new URL(request.url);
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type, authorization", "access-control-allow-methods": "GET, POST" };
  const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json", ...cors } });
  const page = async (message, status = 200) =>
    new Response(guardPage(await guardOps.state(), message), { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  const inside = url.hostname.endsWith(".internal");
  const recoveryKey = await secrets.RECOVERY_KEY;
  if (url.pathname.startsWith("/xrpc/com.lopecode.brain.infra.")) {
    // Two callers: the kernel over its binding, for the signed-in owner; or the holder of the recovery key.
    const kernel = await rows.get("worker/brain");
    const viaKernel = inside && !!kernel && !!kernel.key && request.headers.get("x-brain-key") === kernel.key && request.headers.get("x-brain-caller") === "owner";
    const recovery = !inside && !!recoveryKey && request.headers.get("authorization") === "Bearer " + recoveryKey;
    const method = url.pathname.slice("/xrpc/com.lopecode.brain.infra.".length);
    // A third caller, for one method: the core, passing on the page's verdict on a deploy.
    const coreRec = await rows.get("worker/brain-core");
    if (method === "verdict" && request.method === "POST" && inside && !!coreRec && !!coreRec.key && request.headers.get("x-brain-key") === coreRec.key) return json(await guardOps.verdict(await request.json()));
    if (!viaKernel && !recovery) return json({ error: "AuthRequired", message: "the owner's session or the recovery key" }, 401);
    if (method === "getState" && request.method === "GET") return json(await guardOps.state());
    if (method === "apply" && request.method === "POST") return json(await guardOps.apply(await request.json(), { recovery }));
    if (method === "confirm" && request.method === "POST") return json(await guardOps.confirm());
    if (method === "verdict") return json({ error: "AuthRequired", message: "the core" }, 401);
    return json({ error: "MethodNotImplemented", message: method }, 501);
  }
  if (inside || url.pathname !== "/") return new Response("not found", { status: 404 });
  if (request.method === "GET") return page();
  if (request.method !== "POST") return new Response("method not allowed", { status: 405 });
  const form = await request.formData();
  if (!recoveryKey || form.get("key") !== recoveryKey) return page("Wrong recovery key. Nothing was changed.", 401);
  const [action, a, b] = String(form.get("action") || "").split(":");
  try {
    if (action === "approve") return page((await guardOps.approve(a === "remove" ? "remove:" + b : a)) ? "Approved. Press Apply in the Brain again." : "Nothing with that hash is waiting.");
    if (action === "rollback") return await guardOps.rollback(a, b), page(\`Rolled \${a} back.\`);
    if (action === "approval") return await guardOps.setApproval(a === "on"), page(\`Deploys need approval: \${a === "on" ? "on" : "off"}.\`);
    return page("Unknown action.", 400);
  } catch (e) {
    return page("Failed: " + String((e && e.message) || e), 500);
  }
});};
const _brainguard_anon_fc189391e5 = function _anonymous(md) {return (md\`## Tests

The guard runs under \\\`simulate\\\` against \\\`fakeCloudflare\\\`, a stand-in for the Cloudflare API and for the Workers it deploys. A hash added to \\\`fake.unhealthy\\\` makes that version fail its health check.\`);};
const _brainguard_fakeCloudflare = function _fakeCloudflare(Response) {return (() => {
  const scripts = new Map(), log = [], calls = [], unhealthy = new Set(), stored = {}, d1 = [];
  let n = 0;
  const ok = (result) => new Response(JSON.stringify({ success: true, result }), { headers: { "content-type": "application/json" } });
  const bad = (status, message) => new Response(JSON.stringify({ success: false, errors: [{ message }] }), { status });
  const bindingOf = (v, name) => v.metadata.bindings.find((b) => b.name === name);
  const live = (s) => s.versions.get(s.deployment.find((d) => d.percentage === 100).version_id);
  const resolve = (s, bindings) =>
    bindings.map((b) => {
      if (b.type !== "inherit") return b;
      const from = s && live(s).metadata.bindings.find((p) => p.name === b.name);
      if (!from) throw new Error("inherit of a binding that does not exist: " + b.name);
      return from;
    });
  const version = async (s, request) => {
    const form = await request.formData();
    const metadata = JSON.parse(await form.get("metadata").text());
    metadata.bindings = resolve(s, metadata.bindings);
    const id = "v" + ++n;
    return { id, metadata, parts: [...form.keys()].filter((k) => k !== "metadata") };
  };
  const fetch = async (request) => {
    const url = new URL(request.url);
    log.push(request.method + " " + url.hostname.split(".")[0] + url.pathname.replace("/client/v4/accounts/acct", ""));
    if (url.hostname.endsWith(".workers.dev")) {
      const s = scripts.get(url.hostname.split(".")[0]);
      if (!s) return new Response("no such script", { status: 404 });
      const over = /="([^"]+)"/.exec(request.headers.get("Cloudflare-Workers-Version-Overrides") || "");
      const v = over && s.deployment.some((d) => d.version_id === over[1]) ? s.versions.get(over[1]) : live(s);
      if (request.headers.get("x-brain-guard") !== bindingOf(v, "BRAIN_KEY").text) return new Response("not found", { status: 404 });
      const info = bindingOf(v, "BRAIN_INFO").json;
      if (url.pathname === "/xrpc/_health")
        return unhealthy.has(info.hash) ? new Response("broken", { status: 500 }) : Response.json({ ok: true, name: info.name, hash: info.hash });
      const body = request.method === "POST" ? await request.json() : null;
      calls.push({ worker: info.name, nsid: url.pathname.replace("/xrpc/com.lopecode.brain.", ""), body });
      return Response.json({});
    }
    if (request.headers.get("authorization") !== "Bearer tok" && !url.pathname.endsWith("/assets/upload")) return bad(403, "bad token");
    const path = url.pathname.replace("/client/v4/accounts/acct", "");
    if (path === "/workers/assets/upload") return ok({ jwt: "asset-done" });
    if (path === "/r2/buckets") return ok({});
    // One D1 database per Brain: found by name, made once.
    if (path.startsWith("/d1/database")) {
      if (request.method === "GET") return ok(d1);
      d1.push({ name: JSON.parse(await request.text()).name, uuid: "d1-" + (d1.length + 1) });
      return ok(d1.at(-1));
    }
    const m = /^\\/workers\\/scripts\\/([^/]+)(\\/.*)?$/.exec(path);
    if (!m) return bad(404, "no route " + path);
    const name = m[1], rest = m[2] || "", s = scripts.get(name);
    if (rest === "/assets-upload-session") return ok({ jwt: "asset-session", buckets: [["h"]] });
    if (rest === "" && request.method === "PUT") {
      const v = await version(s, request);
      const next = s || { versions: new Map(), deployment: [], schedules: [], subdomain: false };
      next.versions.set(v.id, v);
      next.deployment = [{ version_id: v.id, percentage: 100 }];
      scripts.set(name, next);
      return ok({ id: name });
    }
    if (!s) return bad(404, "no script " + name);
    if (rest === "" && request.method === "DELETE") return scripts.delete(name), ok(null);
    if (rest === "/versions") {
      const v = await version(s, request);
      if (v.metadata.migrations) return bad(400, "migrations only on the script upload");
      s.versions.set(v.id, v);
      return ok({ id: v.id });
    }
    if (rest === "/deployments" && request.method === "GET") return ok({ deployments: [{ versions: s.deployment }] });
    if (rest === "/deployments") return (s.deployment = (await request.json()).versions), ok({});
    if (rest === "/settings" && request.method === "GET") return ok({ bindings: live(s).metadata.bindings });
    if (rest === "/settings") {
      const patch = JSON.parse(await (await request.formData()).get("settings").text());
      const v = { id: "v" + ++n, metadata: { ...live(s).metadata, bindings: resolve(s, patch.bindings) }, parts: live(s).parts };
      s.versions.set(v.id, v);
      s.deployment = [{ version_id: v.id, percentage: 100 }];
      return ok({ bindings: v.metadata.bindings });
    }
    if (rest === "/subdomain") return (s.subdomain = true), ok({});
    if (rest === "/schedules") return (s.schedules = await request.json()), ok({});
    return bad(404, "no route " + path);
  };
  const running = (name) => {
    const s = scripts.get(name);
    return s ? bindingOf(live(s), "BRAIN_INFO").json.hash : null;
  };
  return { fetch, scripts, log, calls, unhealthy, stored, d1, running, live: (name) => live(scripts.get(name)) };
});};
const _brainguard_guardRig = function _guardRig(fakeCloudflare,simulate,guard_service,partsHash,URLSearchParams) {return (async () => {
  const fake = fakeCloudflare();
  const sim = await simulate(guard_service, {
    secrets: { CF_API_TOKEN: "tok", RECOVERY_KEY: "rk" },
    config: { base: "cb", account: "acct", subdomain: "sub", owner: "did:plc:owner", pollMs: 0, tickGapMs: 0, pollTries: 2 },
    fetch: fake.fetch
  });
  const G = "https://cb-guard.sub.workers.dev";
  const post = (url, body, headers) => sim.fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  const made = async (worker, role, salt, extra = {}) => {
    const parts = [{ path: "worker.js", text: "export default {} // " + salt }];
    const meta = { worker, role, crons: [], flags: [], methods: [], access: {}, paths: [], secrets: [], resources: [], bindings: [], ...extra };
    return { parts, meta, hash: await partsHash(parts, meta) };
  };
  return {
    fake,
    sim,
    made,
    recover: async (body) => (await post(G + "/xrpc/com.lopecode.brain.infra.apply", body, { authorization: "Bearer rk" })).json(),
    asOwner: async (method, body) => {
      const key = (sim.rows.get("worker/brain") || {}).key;
      const headers = { "x-brain-key": key, "x-brain-caller": "owner" };
      const r = body === undefined
        ? await sim.fetch("https://guard.internal/xrpc/com.lopecode.brain.infra." + method, { headers })
        : await post("https://guard.internal/xrpc/com.lopecode.brain.infra." + method, body, headers);
      return r.json();
    },
    form: (fields) => sim.fetch(G + "/", { method: "POST", body: new URLSearchParams(fields) }),
    state: async () => (await sim.fetch(G + "/xrpc/com.lopecode.brain.infra.getState", { headers: { authorization: "Bearer rk" } })).json()
  };
});};
const _brainguard_guardAllowsExamples = function _guardAllowsExamples() {return ([
  { given: { key: "worker/brain-x-whatsapp", op: "update" }, expect: null },
  { given: { key: "worker/brain-guard", op: "delete" }, expect: 'resource name "brain-guard" is reserved' },
  { given: { key: "worker/brain", op: "update" }, expect: 'resource name "brain" is reserved' },
  { given: { key: "worker/brain-core", op: "update" }, expect: 'resource name "brain-core" is reserved' },
  { given: { key: "queue/brain-x-jobs", op: "create" }, expect: 'unknown resource kind "queue"' },
  { given: { key: "worker/whatsapp", op: "create" }, expect: 'resource name "whatsapp" must match brain-x-[a-z0-9-]' },
  { given: { key: "r2_bucket/brain-x-blobs", op: "delete", objects: 412 }, expect: 'bucket "brain-x-blobs" holds 412 objects' },
  { given: { key: "r2_bucket/brain-x-scratch", op: "delete", objects: 0 }, expect: null },
  { given: { key: "worker/brain-guard", op: "unchanged" }, expect: null }
]);};
const _brainguard_test_guardAllows_examples = function _test_guardAllows_examples(guardAllowsExamples,expect,guardAllows) {
  for (const e of guardAllowsExamples) expect(guardAllows(e.given)).toBe(e.expect);
  return guardAllowsExamples.length + " examples";
};
const _brainguard_test_probation_transitions = function _test_probation_transitions(nextKernelState,expect) {
  const start = { state: "probation", version: "9c03d7e", lastGood: "4f2a91c", since: 0, fails: 0 };
  const run = (events) => events.reduce(nextKernelState, start);
  const min = 60 * 1000;
  expect(run([{ type: "tick", now: min, healthy: true }, { type: "confirm" }]).state).toBe("confirmed");
  expect(run([{ type: "tick", now: min, healthy: false }, { type: "tick", now: 2 * min, healthy: false }]).reason).toBe("health check failed twice");
  expect(run([{ type: "tick", now: min, healthy: false }, { type: "tick", now: 2 * min, healthy: true }]).state).toBe("probation");
  expect(run(Array.from({ length: 10 }, (_, i) => ({ type: "tick", now: (i + 1) * min, healthy: true }))).reason).toBe("not confirmed in 10 minutes");
  expect(nextKernelState({ state: "probation", version: "b", lastGood: "a", since: 0, fails: 0 }, { type: "tick", now: 90000, healthy: true, probationMs: 90000 }).reason).toBe("not confirmed in 90 seconds");
  expect(run([{ type: "tick", now: min, healthy: false }, { type: "tick", now: 2 * min, healthy: false }, { type: "confirm" }]).version).toBe("4f2a91c");
  return "5 cases";
};
const _brainguard_test_only_the_guard_names_the_cloudflare_token = async function _test_only_the_guard_names_the_cloudflare_token(guard_service,expect,guardRig) {
  const e = await guard_service.emit();
  expect(e.meta.worker).toBe("brain-guard");
  expect(e.meta.secrets).toEqual(["CF_API_TOKEN", "RECOVERY_KEY"]);
  expect(e.parts.map((p) => p.path)).toEqual(["worker.js", "source.js"]);
  const rig = await guardRig();
  // A recipe that names the token, or the guard itself, is refused whoever asks.
  const sneaky = await rig.made("brain-x-sneaky", "recipe", "a", { secrets: ["CF_API_TOKEN"] });
  const self = await rig.made("brain-guard", "guard", "a");
  const out = await rig.recover({ workers: [sneaky, self] });
  expect(out.results.map((r) => r.state)).toEqual(["refused", "refused"]);
  expect(out.results[1].reason).toBe('resource name "brain-guard" is reserved');
  expect(rig.fake.scripts.size).toBe(0);
  return out.results[0].reason;
};
const _brainguard_test_apply_refusals = async function _test_apply_refusals(guardRig,expect) {
  const rig = await guardRig();
  const cases = [
    [await rig.made("whatsapp", "recipe", "a"), 'resource name "whatsapp" must match brain-x-[a-z0-9-]'],
    [await rig.made("brain", "recipe", "a"), 'resource name "brain" is reserved'],
    [await rig.made("brain-core", "kernel", "a"), "role kernel must be named brain"],
    [await rig.made("brain-x-a", "recipe", "a", { resources: ["guard"] }), 'a recipe may not use the platform cell "guard"'],
    [{ ...(await rig.made("brain-x-a", "recipe", "a")), hash: "0".repeat(64) }, 'the parts sent for "brain-x-a" do not hash to 000000000000']
  ];
  const out = await rig.recover({ workers: cases.map((c) => c[0]) });
  expect(out.results.map((r) => r.reason)).toEqual(cases.map((c) => c[1]));
  expect(rig.fake.log.filter((l) => l.includes("/workers/")).length).toBe(0);
  return cases.length + " refusals, no Cloudflare call";
};
const _brainguard_test_deploys_a_recipe_and_registers_it = async function _test_deploys_a_recipe_and_registers_it(guardRig,expect) {
  const rig = await guardRig();
  const core = await rig.made("brain-core", "core", "c1", { resources: ["rows", "workers"] });
  expect((await rig.recover({ workers: [core] })).results[0].state).toBe("deployed");
  const recipe = await rig.made("brain-x-wa", "recipe", "r1", { secrets: ["WA", "UNSET"], resources: ["rows", "inbox"], access: { "com.lopecode.brain.wa.send": { type: "procedure", who: "owner" } } });
  const out = await rig.recover({ workers: [recipe] });
  expect(out.results[0].state).toBe("deployed");
  const bindings = Object.fromEntries(rig.fake.live("cb-x-wa").metadata.bindings.map((b) => [b.name, b]));
  expect(Object.keys(bindings).sort()).toEqual(["BRAIN_CONFIG", "BRAIN_INFO", "BRAIN_KEY", "CORE", "SQL"]);
  // The secrets it names are not bound: it reads them through the core while it runs.
  expect(bindings.CORE.service).toBe("cb-core");
  // Rows are the Brain's one D1 database, made by the first Worker that needs it and bound to the rest.
  expect([bindings.SQL.type, bindings.SQL.id, rig.fake.d1]).toEqual(["d1", "d1-1", [{ name: "cb-sql", uuid: "d1-1" }]]);
  expect(bindings.BRAIN_INFO.json.hash).toBe(recipe.hash);
  // The core learns the recipe's methods and key hash, and gains a binding to it without a code upload.
  const registered = rig.fake.calls.filter((c) => c.nsid === "service.register").map((c) => c.body.worker);
  expect(registered).toEqual(["brain-core", "brain-x-wa"]);
  const coreBindings = rig.fake.live("cb-core").metadata.bindings.map((b) => b.name);
  expect(coreBindings).toContain("X_WA");
  expect(coreBindings).toContain("SQL");
  // Applying the same hash again uploads nothing.
  const before = rig.fake.log.length;
  expect((await rig.recover({ workers: [recipe] })).results[0].state).toBe("unchanged");
  expect(rig.fake.log.length).toBe(before);
  return coreBindings.join(" ");
};
const _brainguard_test_the_page_worker_is_on_timed_probation = async function _test_the_page_worker_is_on_timed_probation(guardRig,expect) {
  const rig = await guardRig();
  await rig.recover({ workers: [await rig.made("brain-core", "core", "c1", { resources: ["rows"] })] });
  const page = { resources: ["assets"], paths: [{ path: "/", who: "anyone" }] };
  const v1 = await rig.made("brain-x-page", "recipe", "one", page);
  const v2 = await rig.made("brain-x-page", "recipe", "two", page);
  // The first has nothing before it; the second can be put back, so it waits to be confirmed.
  expect((await rig.recover({ workers: [{ ...v1, asset: "<html>1</html>" }] })).results[0].state).toBe("deployed");
  expect((await rig.recover({ workers: [{ ...v2, asset: "<html>1</html>" }] })).results[0].state).toBe("probation");
  expect((await rig.state()).kernel["brain-x-page"]).toMatchObject({ state: "probation", lastGoodHash: v1.hash });
  // The same Worker with a different notebook file is a change; with the same file, or none, it is not.
  const other = await guardRig();
  await other.recover({ workers: [await other.made("brain-core", "core", "c1", { resources: ["rows"] })] });
  await other.recover({ workers: [{ ...v1, asset: "<html>1</html>" }] });
  const same = async (asset) => (await other.recover({ workers: [{ ...v1, ...(asset ? { asset } : {}) }] })).results[0].state;
  expect(await same("<html>1</html>")).toBe("unchanged");
  expect(await same()).toBe("unchanged");
  expect(await same("<html>2</html>")).toBe("probation");
  return "probation";
};
const _brainguard_test_failed_selftest_is_put_back = async function _test_failed_selftest_is_put_back(guardRig,expect) {
  const rig = await guardRig();
  const core = await rig.made("brain-core", "core", "c1", { resources: ["rows"] });
  await rig.recover({ workers: [core] });
  const v1 = await rig.made("brain-x-a", "recipe", "one");
  const v2 = await rig.made("brain-x-a", "recipe", "two");
  const fresh = await rig.made("brain-x-b", "recipe", "bad");
  await rig.recover({ workers: [v1] });
  rig.fake.unhealthy.add(v2.hash);
  rig.fake.unhealthy.add(fresh.hash);
  const out = await rig.recover({ workers: [v2, fresh] });
  expect(out.results[0]).toMatchObject({ state: "put-back", previous: v1.hash, reason: "self-test failed before go-live" });
  expect(rig.fake.running("cb-x-a")).toBe(v1.hash);
  // A Worker with no version before it is removed.
  expect(out.results[1]).toMatchObject({ state: "put-back", previous: null });
  expect(rig.fake.scripts.has("cb-x-b")).toBe(false);
  const state = await rig.state();
  const a = state.workers.find((w) => w.worker === "brain-x-a");
  expect(a.hash).toBe(v1.hash);
  expect(a.lastError).toBe("self-test failed before go-live");
  expect(a.key).toBeUndefined();
  // The owner hears of it through the inbox.
  const notes = rig.fake.calls.filter((c) => c.nsid === "inbox.append" && c.body.body.event === "put-back").map((c) => c.body.body.worker);
  expect(notes).toEqual(["brain-x-a", "brain-x-b"]);
  return a.lastError;
};
const _brainguard_test_failing_twice_after_go_live_is_put_back = async function _test_failing_twice_after_go_live_is_put_back(guardRig,expect) {
  const rig = await guardRig();
  const v1 = await rig.made("brain-x-a", "recipe", "one");
  const v2 = await rig.made("brain-x-a", "recipe", "two");
  await rig.recover({ workers: [v1] });
  await rig.recover({ workers: [v2] });
  rig.fake.unhealthy.add(v2.hash);
  await rig.sim.scheduled();
  expect(rig.fake.running("cb-x-a")).toBe(v2.hash);
  await rig.sim.scheduled();
  expect(rig.fake.running("cb-x-a")).toBe(v1.hash);
  return (await rig.state()).workers[0].lastError;
};
const _brainguard_test_a_failed_verdict_puts_the_deploy_back = async function _test_a_failed_verdict_puts_the_deploy_back(guardRig,expect) {
  const rig = await guardRig();
  const core = await rig.made("brain-core", "core", "c1");
  await rig.recover({ workers: [core] });
  const coreKey = rig.sim.rows.get("worker/brain-core").key;
  const say = async (body, key = coreKey) =>
    (await rig.sim.fetch("https://guard.internal/xrpc/com.lopecode.brain.infra.verdict", { method: "POST", headers: { "content-type": "application/json", "x-brain-key": key }, body: JSON.stringify(body) })).json();
  const v1 = await rig.made("brain-x-a", "recipe", "one", { methods: ["com.lopecode.brain.a.one"], access: { "com.lopecode.brain.a.one": { type: "query", who: "owner" } } });
  const v2 = await rig.made("brain-x-a", "recipe", "two", { methods: ["com.lopecode.brain.a.two"], access: { "com.lopecode.brain.a.two": { type: "query", who: "owner" } } });
  await rig.recover({ workers: [v1] });
  // The first version has nothing before it: a failed verdict leaves it running.
  expect(await say({ worker: "brain-x-a", hash: v1.hash, ok: false, reason: "test_x" })).toMatchObject({ state: "kept" });
  await rig.recover({ workers: [v2] });
  // Only the core may say so, and only about the hash that is running.
  expect((await say({ worker: "brain-x-a", hash: v2.hash, ok: false }, "not-the-core")).error).toBe("AuthRequired");
  expect(await say({ worker: "brain-x-a", hash: v1.hash, ok: false })).toEqual({ state: "stale" });
  expect(rig.fake.running("cb-x-a")).toBe(v2.hash);
  expect(await say({ worker: "brain-x-a", hash: v2.hash, ok: false, reason: "test_x: expected 1" })).toEqual({ state: "put-back", previous: v1.hash });
  expect(rig.fake.running("cb-x-a")).toBe(v1.hash);
  // The core is told the routes of the version put back, not the ones of the version that failed.
  const told = rig.fake.calls.filter((c) => c.nsid === "service.register" && c.body.worker === "brain-x-a").at(-1).body;
  expect(told).toMatchObject({ hash: v1.hash, methods: { "com.lopecode.brain.a.one": { type: "query", who: "owner" } } });
  // A pass ends a kernel's probation without the owner pressing anything.
  const k1 = await rig.made("brain", "kernel", "k1"), k2 = await rig.made("brain", "kernel", "k2");
  await rig.recover({ workers: [k1] });
  await rig.recover({ workers: [k2] });
  expect((await rig.state()).kernel.brain.state).toBe("probation");
  expect(await say({ worker: "brain", hash: k2.hash, ok: true })).toEqual({ state: "kept" });
  expect((await rig.state()).kernel.brain.state).toBe("confirmed");
  return (await rig.state()).workers.find((w) => w.worker === "brain-x-a").lastError;
};
const _brainguard_test_kernel_probation = async function _test_kernel_probation(guardRig,expect) {
  const rig = await guardRig();
  const k1 = await rig.made("brain", "kernel", "k1");
  const k2 = await rig.made("brain", "kernel", "k2");
  const k3 = await rig.made("brain", "kernel", "k3");
  // The first kernel has nothing to go back to, so it is confirmed as installed.
  expect((await rig.recover({ workers: [k1] })).results[0].state).toBe("deployed");
  expect((await rig.recover({ workers: [k2] })).results[0].state).toBe("probation");
  expect(rig.fake.running("cb")).toBe(k2.hash);
  // Unhealthy on two ticks in a row: back to k1.
  rig.fake.unhealthy.add(k2.hash);
  await rig.sim.scheduled();
  expect(rig.fake.running("cb")).toBe(k2.hash);
  await rig.sim.scheduled();
  expect(rig.fake.running("cb")).toBe(k1.hash);
  expect((await rig.state()).kernel.brain).toMatchObject({ state: "rolled-back", reason: "health check failed twice", hash: k1.hash });
  // Healthy and never confirmed: back to k1 once ten minutes have passed.
  await rig.recover({ workers: [k3] });
  await rig.sim.scheduled();
  expect(rig.fake.running("cb")).toBe(k3.hash);
  const s = rig.sim.rows.get("kernelstate/brain");
  rig.sim.rows.set("kernelstate/brain", { ...s, since: s.since - 10 * 60 * 1000 });
  await rig.sim.scheduled();
  expect(rig.fake.running("cb")).toBe(k1.hash);
  expect((await rig.state()).kernel.brain.reason).toBe("not confirmed in 10 minutes");
  // Confirmed: it stays, and becomes a version the guard page can roll back to.
  await rig.recover({ workers: [k3] });
  expect((await rig.asOwner("confirm", {})).confirmed).toEqual(["brain"]);
  rig.sim.rows.set("kernelstate/brain", { ...rig.sim.rows.get("kernelstate/brain"), since: 0 });
  await rig.sim.scheduled();
  expect(rig.fake.running("cb")).toBe(k3.hash);
  expect((await rig.state()).confirmed.brain.map((c) => c.hash)).toEqual([k3.hash, k1.hash]);
  return "failed twice, not confirmed, confirmed";
};
const _brainguard_test_approval_holds_an_apply = async function _test_approval_holds_an_apply(guardRig,expect) {
  const rig = await guardRig();
  const kernel = await rig.made("brain", "kernel", "k1");
  await rig.recover({ workers: [kernel] });
  const recipe = await rig.made("brain-x-a", "recipe", "one", { secrets: ["A_KEY"] });
  // Approval is on at install. The owner's session alone does not deploy.
  const held = await rig.asOwner("apply", { workers: [recipe] });
  expect(held.results[0].state).toBe("waiting");
  expect(rig.fake.scripts.has("cb-x-a")).toBe(false);
  expect((await rig.asOwner("getState")).pending.map((p) => p.secrets)).toEqual([["A_KEY"]]);
  // No infra method changes the setting or approves; the page needs the recovery key.
  for (const method of ["approve", "setApproval", "rollback"]) expect((await rig.asOwner(method, { hash: recipe.hash, on: false })).error).toBe("MethodNotImplemented");
  expect((await rig.form({ key: "wrong", action: "approve:" + recipe.hash })).status).toBe(401);
  expect((await rig.asOwner("apply", { workers: [recipe] })).results[0].state).toBe("waiting");
  expect((await rig.form({ key: "rk", action: "approve:" + recipe.hash })).status).toBe(200);
  expect((await rig.asOwner("apply", { workers: [recipe] })).results[0].state).toBe("deployed");
  // With the setting off, an apply deploys at once.
  await rig.form({ key: "rk", action: "approval:off" });
  const next = await rig.made("brain-x-a", "recipe", "two");
  expect((await rig.asOwner("apply", { workers: [next] })).results[0].state).toBe("deployed");
  return "held, approved on the guard page, then off";
};
const _brainguard_test_infra_needs_the_kernel_or_the_recovery_key = async function _test_infra_needs_the_kernel_or_the_recovery_key(guardRig,expect) {
  const rig = await guardRig();
  const G = "https://cb-guard.sub.workers.dev/xrpc/com.lopecode.brain.infra.getState";
  expect((await rig.sim.fetch(G)).status).toBe(401);
  expect((await rig.sim.fetch(G, { headers: { authorization: "Bearer wrong" } })).status).toBe(401);
  // A caller on the internet cannot pass as the kernel, and a binding caller needs the kernel's key.
  expect((await rig.sim.fetch(G, { headers: { "x-brain-caller": "owner", "x-brain-key": "x" } })).status).toBe(401);
  expect((await rig.sim.fetch("https://guard.internal/xrpc/com.lopecode.brain.infra.getState", { headers: { "x-brain-caller": "owner" } })).status).toBe(401);
  await rig.recover({ workers: [await rig.made("brain", "kernel", "k1")] });
  const key = rig.sim.rows.get("worker/brain").key;
  expect((await rig.sim.fetch("https://guard.internal/xrpc/com.lopecode.brain.infra.getState", { headers: { "x-brain-caller": "token:laptop", "x-brain-key": key } })).status).toBe(401);
  expect((await rig.sim.fetch("https://guard.internal/xrpc/com.lopecode.brain.infra.getState", { headers: { "x-brain-caller": "owner", "x-brain-key": key } })).status).toBe(200);
  return "401 x5, 200 for the kernel as owner";
};
const _brainguard_test_guard_page_rolls_the_kernel_back = async function _test_guard_page_rolls_the_kernel_back(guardRig,expect) {
  const rig = await guardRig();
  const k1 = await rig.made("brain", "kernel", "k1");
  const k2 = await rig.made("brain", "kernel", "k2");
  await rig.recover({ workers: [k1] });
  await rig.recover({ workers: [k2] });
  await rig.asOwner("confirm", {});
  const page = await (await rig.sim.fetch("https://cb-guard.sub.workers.dev/")).text();
  expect(page).toContain("<title>Cloud Brain guard</title>");
  expect(page).not.toContain("<script");
  expect(page).not.toContain(rig.sim.rows.get("worker/brain").key);
  const v1 = (await rig.state()).confirmed.brain.find((c) => c.hash === k1.hash).version;
  expect((await rig.form({ key: "nope", action: \`rollback:brain:\${v1}\` })).status).toBe(401);
  expect(rig.fake.running("cb")).toBe(k2.hash);
  expect((await rig.form({ key: "rk", action: \`rollback:brain:\${v1}\` })).status).toBe(200);
  expect(rig.fake.running("cb")).toBe(k1.hash);
  return "rolled back to " + k1.hash.slice(0, 12);
};
const _brainguard_test_a_path_or_method_belongs_to_one_worker = async function _test_a_path_or_method_belongs_to_one_worker(guardRig,expect) {
  const rig = await guardRig();
  const core = await rig.made("brain-core", "core", "a");
  const first = await rig.made("brain-x-first", "recipe", "a", { paths: [{ path: "/hooks/shared", who: "anyone" }], methods: ["com.lopecode.brain.first.say"] });
  expect((await rig.recover({ workers: [core, first] })).results.map((r) => r.state)).toEqual(["deployed", "deployed"]);
  const samePath = await rig.made("brain-x-second", "recipe", "a", { paths: [{ path: "/hooks/shared", who: "anyone" }] });
  const sameMethod = await rig.made("brain-x-third", "recipe", "a", { methods: ["com.lopecode.brain.first.say"] });
  const out = await rig.recover({ workers: [samePath, sameMethod] });
  expect(out.results.map((r) => r.reason)).toEqual(["/hooks/shared is already served by brain-x-first", "com.lopecode.brain.first.say is already served by brain-x-first"]);
  // The Worker that has it may be updated.
  const again = await rig.made("brain-x-first", "recipe", "b", { paths: [{ path: "/hooks/shared", who: "anyone" }], methods: ["com.lopecode.brain.first.say"] });
  expect((await rig.recover({ workers: [again] })).results[0].state).toBe("deployed");
  return out.results[0].reason;
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_brainguard_anon_8949db5842", null, ["md"], _brainguard_anon_8949db5842);  
  $def("_brainguard_guard_service", "guard_service", ["cloudflare","guardFn","guardOps"], _brainguard_guard_service);  
  $def("_brainguard_anon_9137c93017", null, ["md"], _brainguard_anon_9137c93017);  
  $def("_brainguard_guardAllows", "guardAllows", [], _brainguard_guardAllows);  
  $def("_brainguard_anon_d51970bd07", null, ["md"], _brainguard_anon_d51970bd07);  
  $def("_brainguard_nextKernelState", "nextKernelState", [], _brainguard_nextKernelState);  
  $def("_brainguard_anon_46bd9dba3e", null, ["md"], _brainguard_anon_46bd9dba3e);  
  $def("_brainguard_guardOps", "guardOps", ["config","secrets","rows","sha256","FormData","partsHash","guardAllows","nextKernelState"], _brainguard_guardOps);  
  $def("_brainguard_anon_263f43f819", null, ["md"], _brainguard_anon_263f43f819);  
  $def("_brainguard_guardPage", "guardPage", [], _brainguard_guardPage);  
  $def("_brainguard_guardFn", "guardFn", ["Response","guardPage","guardOps","secrets","rows"], _brainguard_guardFn);  
  $def("_brainguard_anon_fc189391e5", null, ["md"], _brainguard_anon_fc189391e5);  
  $def("_brainguard_fakeCloudflare", "fakeCloudflare", ["Response"], _brainguard_fakeCloudflare);  
  $def("_brainguard_guardRig", "guardRig", ["fakeCloudflare","simulate","guard_service","partsHash","URLSearchParams"], _brainguard_guardRig);  
  $def("_brainguard_guardAllowsExamples", "guardAllowsExamples", [], _brainguard_guardAllowsExamples);  
  $def("_brainguard_test_guardAllows_examples", "test_guardAllows_examples", ["guardAllowsExamples","expect","guardAllows"], _brainguard_test_guardAllows_examples);  
  $def("_brainguard_test_probation_transitions", "test_probation_transitions", ["nextKernelState","expect"], _brainguard_test_probation_transitions);  
  $def("_brainguard_test_only_the_guard_names_the_cloudflare_token", "test_only_the_guard_names_the_cloudflare_token", ["guard_service","expect","guardRig"], _brainguard_test_only_the_guard_names_the_cloudflare_token);  
  $def("_brainguard_test_apply_refusals", "test_apply_refusals", ["guardRig","expect"], _brainguard_test_apply_refusals);  
  $def("_brainguard_test_deploys_a_recipe_and_registers_it", "test_deploys_a_recipe_and_registers_it", ["guardRig","expect"], _brainguard_test_deploys_a_recipe_and_registers_it);  
  $def("_brainguard_test_the_page_worker_is_on_timed_probation", "test_the_page_worker_is_on_timed_probation", ["guardRig","expect"], _brainguard_test_the_page_worker_is_on_timed_probation);  
  $def("_brainguard_test_failed_selftest_is_put_back", "test_failed_selftest_is_put_back", ["guardRig","expect"], _brainguard_test_failed_selftest_is_put_back);  
  $def("_brainguard_test_failing_twice_after_go_live_is_put_back", "test_failing_twice_after_go_live_is_put_back", ["guardRig","expect"], _brainguard_test_failing_twice_after_go_live_is_put_back);  
  $def("_brainguard_test_a_failed_verdict_puts_the_deploy_back", "test_a_failed_verdict_puts_the_deploy_back", ["guardRig","expect"], _brainguard_test_a_failed_verdict_puts_the_deploy_back);  
  $def("_brainguard_test_kernel_probation", "test_kernel_probation", ["guardRig","expect"], _brainguard_test_kernel_probation);  
  $def("_brainguard_test_approval_holds_an_apply", "test_approval_holds_an_apply", ["guardRig","expect"], _brainguard_test_approval_holds_an_apply);  
  $def("_brainguard_test_infra_needs_the_kernel_or_the_recovery_key", "test_infra_needs_the_kernel_or_the_recovery_key", ["guardRig","expect"], _brainguard_test_infra_needs_the_kernel_or_the_recovery_key);  
  $def("_brainguard_test_guard_page_rolls_the_kernel_back", "test_guard_page_rolls_the_kernel_back", ["guardRig","expect"], _brainguard_test_guard_page_rolls_the_kernel_back);  
  $def("_brainguard_test_a_path_or_method_belongs_to_one_worker", "test_a_path_or_method_belongs_to_one_worker", ["guardRig","expect"], _brainguard_test_a_path_or_method_belongs_to_one_worker);  
  main.define("module @tomlarkworthy/cloudflare-iac", async () => runtime.module((await import("/@tomlarkworthy/cloudflare-iac.js?v=4")).default));  
  main.define("cloudflare", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("cloudflare", _));  
  main.define("secrets", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("secrets", _));  
  main.define("rows", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("rows", _));  
  main.define("config", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("config", _));  
  main.define("simulate", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("simulate", _));  
  main.define("partsHash", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("partsHash", _));  
  main.define("sha256", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("sha256", _));  
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));  
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));
  return main;
}` }, inbox: { module: "@tomlarkworthy/brain-inbox", cell: "inbox_service", hash: "d115207c2d999204edc16d06bda5a61df197958a22da0ec84b9e5216626aad58", source: `
const _braininbox_anon_2bea4984fa = function _anonymous(md) {return (md\`# brain-inbox

What arrives from outside a Cloud Brain, kept in order until a tab has handled it.

| | |
|---|---|
| Worker | \\\`brain-x-inbox\\\` |
| \\\`inbox.append\\\` | procedure. A Worker, the guard or the owner. \\\`{ source, key, body }\\\`. A key is kept once: a second append answers \\\`{ id, duplicate: true }\\\`. |
| \\\`inbox.list\\\` | query, owner. \\\`?after=<id>&limit=50&all=true\\\`. \\\`{ entries, waiting }\\\`; without \\\`all\\\`, only entries not done. |
| \\\`inbox.done\\\` | procedure, owner. \\\`{ id }\\\` |
| \\\`lease.take\\\` | procedure, owner. \\\`{ tab, release }\\\`. \\\`{ held, holder }\\\`. One tab holds it; unrenewed for 30 s it is free. |
| \\\`inbox.poll\\\` | procedure, owner. \\\`{ tab }\\\`. \\\`{ held, holder, entries, waiting }\\\`: \\\`lease.take\\\` and the waiting entries in one call. |
| \\\`lease.get\\\` | query. A Worker or the owner. \\\`{ held }\\\` |
| Storage | \\\`rows\\\`: \\\`inbox/<id>\\\` (waiting), \\\`inboxdone/<id>\\\`, \\\`inboxkey/<key>\\\`, \\\`inboxseq\\\`, \\\`lease\\\` |

An entry is \\\`{ id, source, from, key, received_at, body, done_at }\\\`. \\\`from\\\` is the caller the core named, not what the caller wrote.

A Worker appends with the \\\`inbox\\\` platform cell:

\\\`\\\`\\\`js
await inbox.append({ source: "whatsapp", key: message.id, body: { text: message.text } })
\\\`\\\`\\\`

A tab handles entries by announcing a handler for a source. The page holding the lease calls it, then marks the entry done.

\\\`\\\`\\\`js
plugins.add("inbox", { source: "whatsapp", handle: async (entry) => { /* … */ } }, { invalidation })
\\\`\\\`\\\`\`);};
const _braininbox_inboxView = function _inboxView(inboxPanel,client,session) {return (inboxPanel({ client, owner: !!(session && session.owner) }));};
const _braininbox_inbox_service = function _inbox_service(cloudflare,inboxApp) {return (cloudflare.Worker("inbox", inboxApp, {
  methods: {
    "com.lopecode.brain.inbox.append": { type: "procedure", who: "workers", allow: 'caller.kind in ["worker", "guard", "owner"]' },
    "com.lopecode.brain.inbox.list": { type: "query", who: "owner" },
    "com.lopecode.brain.inbox.done": { type: "procedure", who: "owner" },
    "com.lopecode.brain.inbox.poll": { type: "procedure", who: "owner" },
    "com.lopecode.brain.lease.take": { type: "procedure", who: "owner" },
    "com.lopecode.brain.lease.get": { type: "query", who: "workers" }
  }
}));};
const _braininbox_inbox_announce = function _inbox_announce(plugins,inbox_service,invalidation) {
  plugins.add("workers", inbox_service, { invalidation });
  return "announced inbox_service";
};
const _braininbox_inboxApp = function _inboxApp(hono,rows) {
  const app = new hono.Hono();
  const NS = "/xrpc/com.lopecode.brain.";
  const pad = (n) => String(n).padStart(12, "0");
  const fail = (c, status, error, message) => c.json({ error, message }, status);
  // The core has named the caller and checked it against the method's rule.
  const who = (c) => c.req.header("x-brain-caller") || "anonymous";
  const owner = async (c, next) => (who(c) === "owner" || /^(token|did):/.test(who(c)) ? next() : fail(c, 401, "AuthRequired", "the owner"));
  app.post(NS + "inbox.append", async (c) => {
    const from = who(c);
    // The owner too: a function run in the owner's tab appends as it would on its Worker.
    if (from !== "guard" && from !== "owner" && !from.startsWith("worker:")) return fail(c, 401, "AuthRequired", "a Worker, the guard or the owner");
    const { source, key, body } = await c.req.json();
    if (typeof key !== "string" || !key) return fail(c, 400, "InvalidRequest", "key");
    if (!(await rows.putIfAbsent("inboxkey/" + key, 0))) return c.json({ id: await rows.get("inboxkey/" + key), duplicate: true });
    const id = await rows.increment("inboxseq");
    await rows.put("inbox/" + pad(id), { id, source: String(source || from), from, key, received_at: Date.now(), body: body ?? null, done_at: null });
    await rows.put("inboxkey/" + key, id);
    return c.json({ id });
  });
  app.get(NS + "inbox.list", owner, async (c) => {
    const after = Number(c.req.query("after") || 0), all = c.req.query("all") === "true";
    // Waiting entries are under inbox/, finished ones under inboxdone/: a poll reads only what is waiting.
    const entries = [...(all ? await rows.list("inboxdone/") : []), ...(await rows.list("inbox/"))].map((r) => r.value).filter((e) => e.id > after).sort((a, b) => a.id - b.id);
    return c.json({ entries: entries.slice(0, Number(c.req.query("limit") || 50)), waiting: entries.filter((e) => !e.done_at).length });
  });
  app.post(NS + "inbox.done", owner, async (c) => {
    const { id } = await c.req.json();
    const entry = await rows.get("inbox/" + pad(id));
    if (!entry) return (await rows.get("inboxdone/" + pad(id))) ? c.json({ id }) : fail(c, 404, "NotFound", "no such entry");
    await rows.put("inboxdone/" + pad(id), { ...entry, done_at: Date.now() });
    await rows.delete("inbox/" + pad(id));
    return c.json({ id });
  });
  // One tab answers at a time. A tab that stops renewing loses the lease after 30 s.
  const LEASE = 30000;
  const take = async (tab) => {
    const now = Date.now(), held = await rows.get("lease");
    const free = !held || held.tab === tab || now - held.at > LEASE;
    if (free) await rows.put("lease", { tab, at: now });
    return { held: free, holder: free ? tab : held.tab };
  };
  app.post(NS + "lease.take", owner, async (c) => {
    const { tab, release } = await c.req.json();
    const held = release ? await rows.get("lease") : null;
    if (release) return held && held.tab === tab ? (await rows.delete("lease"), c.json({ held: false, holder: null })) : c.json({ held: false, holder: held ? held.tab : null });
    return c.json(await take(tab));
  });
  // A tab's whole turn in one call: renew the lease and, holding it, read what is waiting.
  app.post(NS + "inbox.poll", owner, async (c) => {
    const { tab } = await c.req.json();
    if (typeof tab !== "string" || !tab) return fail(c, 400, "InvalidRequest", "tab");
    const lease = await take(tab);
    const entries = lease.held ? (await rows.list("inbox/")).map((r) => r.value) : [];
    return c.json({ ...lease, entries: entries.slice(0, 50), waiting: entries.length });
  });
  app.get(NS + "lease.get", async (c) => {
    const from = who(c);
    if (from !== "owner" && !/^(token|did|worker):/.test(from)) return fail(c, 401, "AuthRequired", "the owner or a Worker");
    const held = await rows.get("lease");
    return c.json({ held: !!held && Date.now() - held.at <= LEASE });
  });
  return app;
};
const _braininbox_inboxPanel = function _inboxPanel(htl,Inputs) {return (({ client, owner = false } = {}) => {
  const muted = "color:var(--theme-foreground-muted)";
  if (!client || !owner) return htl.html\`<i style=\${muted}>Sign in as the owner to see the inbox.</i>\`;
  const out = htl.html\`<div></div>\`, note = htl.html\`<span style=\${muted}></span>\`;
  const draw = async () => {
    try {
      const [{ entries, waiting }, lease] = await Promise.all([client.query("inbox.list", { all: "true", limit: 200 }), client.query("lease.get")]);
      note.textContent = \`\${entries.length} entries, \${waiting} waiting. \${lease.held ? "A tab is answering." : "No tab is answering."}\`;
      const data = entries
        .map((e) => ({ id: e.id, received: new Date(e.received_at), source: e.source, from: e.from, state: e.done_at ? "done" : "waiting", body: JSON.stringify(e.body) }))
        .reverse();
      out.replaceChildren(data.length ? Inputs.table(data, { select: false, layout: "auto", format: { received: (d) => d.toLocaleString() } }) : htl.html\`<i style=\${muted}>Nothing has arrived.</i>\`);
    } catch (e) {
      note.textContent = "inbox.list failed: " + e.message;
    }
  };
  draw();
  return htl.html\`<div>\${out}<div style="display:flex;gap:8px;margin-top:8px;align-items:center">\${Inputs.button("Refresh", { reduce: draw })}\${note}</div></div>\`;
});};
const _braininbox_anon_be3d699220 = function _anonymous(md) {return (md\`## Tests\`);};
const _braininbox_inboxRig = function _inboxRig(simulate,inbox_service) {return (async () => {
  const sim = await simulate(inbox_service, {});
  const X = "/xrpc/com.lopecode.brain.";
  const as = (who) => async (path, body) => {
    const r = await sim.fetch("https://inbox.internal" + X + path, {
      method: body === undefined ? "GET" : "POST",
      headers: { "x-brain-caller": who, ...(body === undefined ? {} : { "content-type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: r.status, data: await r.json() };
  };
  return { sim, owner: as("owner"), worker: as("worker:brain-x-echo"), guard: as("guard"), anonymous: as("anonymous"), token: as("token:laptop") };
});};
const _braininbox_test_inbox_once_per_key_in_order = async function _test_inbox_once_per_key_in_order(inboxRig,expect) {
  const rig = await inboxRig();
  const a = await rig.worker("inbox.append", { source: "echo", key: "m1", body: { text: "one" } });
  const again = await rig.worker("inbox.append", { source: "echo", key: "m1", body: { text: "one, retried" } });
  await rig.guard("inbox.append", { source: "guard", key: "deploy/1", body: { event: "deployed" } });
  await rig.worker("inbox.append", { source: "echo", key: "m2", body: { text: "two" } });
  expect(again.data).toEqual({ id: a.data.id, duplicate: true });
  expect((await rig.anonymous("inbox.append", { key: "x" })).status).toBe(401);
  expect((await rig.token("inbox.append", { key: "x" })).status).toBe(401);
  expect((await rig.worker("inbox.list")).status).toBe(401);
  const list = (await rig.owner("inbox.list")).data;
  expect(list.entries.map((e) => [e.id, e.source, e.from])).toEqual([[1, "echo", "worker:brain-x-echo"], [2, "guard", "guard"], [3, "echo", "worker:brain-x-echo"]]);
  expect(list.entries[0].body).toEqual({ text: "one" });
  expect((await rig.owner("inbox.list?after=1")).data.entries.map((e) => e.id)).toEqual([2, 3]);
  // An entry not marked done is listed to the next tab; a done one is not, unless all are asked for.
  await rig.owner("inbox.done", { id: 2 });
  const next = (await rig.owner("inbox.list")).data;
  expect(next.entries.map((e) => e.id)).toEqual([1, 3]);
  expect(next.waiting).toBe(2);
  expect((await rig.owner("inbox.list?all=true")).data.entries.map((e) => e.id)).toEqual([1, 2, 3]);
  return "3 entries from 4 appends";
};
const _braininbox_test_lease_one_tab_at_a_time = async function _test_lease_one_tab_at_a_time(inboxRig,expect) {
  const rig = await inboxRig();
  expect((await rig.owner("lease.take", { tab: "a" })).data).toEqual({ held: true, holder: "a" });
  expect((await rig.owner("lease.take", { tab: "b" })).data).toEqual({ held: false, holder: "a" });
  expect((await rig.worker("lease.get")).data).toEqual({ held: true });
  expect((await rig.anonymous("lease.get")).status).toBe(401);
  expect((await rig.worker("lease.take", { tab: "w" })).status).toBe(401);
  // A tab that stopped renewing 31 s ago has lost it.
  rig.sim.rows.set("lease", { tab: "a", at: Date.now() - 31000 });
  expect((await rig.worker("lease.get")).data).toEqual({ held: false });
  expect((await rig.owner("lease.take", { tab: "b" })).data).toEqual({ held: true, holder: "b" });
  expect((await rig.owner("lease.take", { tab: "b", release: true })).data).toEqual({ held: false, holder: null });
  // poll is the lease and the waiting entries in one call. A tab without the lease is handed nothing.
  await rig.worker("inbox.append", { source: "t", key: "k1", body: 1 });
  expect((await rig.owner("inbox.poll", { tab: "a" })).data).toMatchObject({ held: true, holder: "a", waiting: 1 });
  expect((await rig.owner("inbox.poll", { tab: "b" })).data).toEqual({ held: false, holder: "a", entries: [], waiting: 0 });
  expect((await rig.worker("inbox.poll", { tab: "w" })).status).toBe(401);
  return "a, then b after 31 s, then released, then polled";
};
const _braininbox_test_inbox_declares_what_it_needs = async function _test_inbox_declares_what_it_needs(inbox_service,expect) {
  const { meta } = await inbox_service.emit();
  expect(meta).toMatchObject({ worker: "brain-x-inbox", role: "recipe", module: "@tomlarkworthy/brain-inbox", resources: ["rows"], secrets: [] });
  expect(Object.keys(meta.access).sort().map((m) => m.replace("com.lopecode.brain.", ""))).toEqual(["inbox.append", "inbox.done", "inbox.list", "inbox.poll", "lease.get", "lease.take"]);
  return Object.keys(meta.access).length + " methods";
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_braininbox_anon_2bea4984fa", null, ["md"], _braininbox_anon_2bea4984fa);  
  $def("_braininbox_inboxView", "inboxView", ["inboxPanel","client","session"], _braininbox_inboxView);  
  $def("_braininbox_inbox_service", "inbox_service", ["cloudflare","inboxApp"], _braininbox_inbox_service);  
  $def("_braininbox_inbox_announce", "inbox_announce", ["plugins","inbox_service","invalidation"], _braininbox_inbox_announce);  
  $def("_braininbox_inboxApp", "inboxApp", ["hono","rows"], _braininbox_inboxApp);  
  $def("_braininbox_inboxPanel", "inboxPanel", ["htl","Inputs"], _braininbox_inboxPanel);  
  $def("_braininbox_anon_be3d699220", null, ["md"], _braininbox_anon_be3d699220);  
  $def("_braininbox_inboxRig", "inboxRig", ["simulate","inbox_service"], _braininbox_inboxRig);  
  $def("_braininbox_test_inbox_once_per_key_in_order", "test_inbox_once_per_key_in_order", ["inboxRig","expect"], _braininbox_test_inbox_once_per_key_in_order);  
  $def("_braininbox_test_lease_one_tab_at_a_time", "test_lease_one_tab_at_a_time", ["inboxRig","expect"], _braininbox_test_lease_one_tab_at_a_time);  
  $def("_braininbox_test_inbox_declares_what_it_needs", "test_inbox_declares_what_it_needs", ["inbox_service","expect"], _braininbox_test_inbox_declares_what_it_needs);  
  main.define("module @tomlarkworthy/cloudflare-iac", async () => runtime.module((await import("/@tomlarkworthy/cloudflare-iac.js?v=4")).default));  
  main.define("cloudflare", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("cloudflare", _));  
  main.define("rows", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("rows", _));  
  main.define("hono", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("hono", _));  
  main.define("simulate", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("simulate", _));  
  main.define("module @tomlarkworthy/cloud-brain", async () => runtime.module((await import("/@tomlarkworthy/cloud-brain.js?v=4")).default));  
  main.define("client", ["module @tomlarkworthy/cloud-brain", "@variable"], (_, v) => v.import("client", _));  
  main.define("session", ["module @tomlarkworthy/cloud-brain", "@variable"], (_, v) => v.import("session", _));  
  main.define("module @tomlarkworthy/plugin-registry", async () => runtime.module((await import("/@tomlarkworthy/plugin-registry.js?v=4")).default));  
  main.define("plugins", ["module @tomlarkworthy/plugin-registry", "@variable"], (_, v) => v.import("plugins", _));  
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));  
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));
  return main;
}` }, proxy: { module: "@tomlarkworthy/brain-proxy", cell: "proxy_service", hash: "8eb5be297871c054078b56f3f7efcd5f47c6e119a6f46f7d3c28f589b7f7003b", source: `
const _brainproxy_anon_ecb88c092c = function _anonymous(md) {return (md\`# brain-proxy

A Cloud Brain recipe: \\\`com.lopecode.brain.proxy.fetch\\\` fetches a URL for the owner's tab, or for a caller holding a token that names the method. It is for an API that sends no CORS headers, and for a call that needs a key the page should not hold.

\\\`\\\`\\\`js
import {proxyFetch} from "@tomlarkworthy/brain-proxy"

pfetch = proxyFetch("https://brain.example")                 // the owner's session cookie
r = await pfetch("https://openrouter.ai/api/v1/models", { secret: true })
\\\`\\\`\\\`

With \\\`secret: true\\\` the Worker adds the header listed for that host in \\\`proxyHosts\\\`, and refuses any other host before making a request. Add a row to \\\`proxyHosts\\\` and Apply to allow another host; the secret's name has to be written out, because the guard binds the secrets a service names.

Only \\\`https:\\\` URLs are fetched. A request body is text. A function on a Worker calls \\\`fetch\\\` itself and names its own secret; this recipe is for pages.\`);};
const _brainproxy_proxyHosts = function _proxyHosts(secrets) {return ([
  { host: "openrouter.ai", header: "authorization", prefix: "Bearer ", secret: async () => await secrets.OPENROUTER_API_KEY },
  { host: "api.anthropic.com", header: "x-api-key", prefix: "", secret: async () => await secrets.ANTHROPIC_API_KEY }
]);};
const _brainproxy_proxy_service = function _proxy_service(cloudflare,Response,proxyHosts) {return (cloudflare.Worker(
  "proxy",
  async (request) => {
    const json = (status, error, message) => new Response(JSON.stringify({ error, message }), { status, headers: { "content-type": "application/json" } });
    const { url, method = "GET", headers = {}, body = null, secret = false } = await request.json();
    let target;
    try {
      target = new URL(url);
    } catch {
      return json(400, "InvalidRequest", "url");
    }
    if (target.protocol !== "https:") return json(400, "InvalidRequest", "only https: is fetched");
    const out = new Headers(headers);
    for (const h of ["cookie", "host", "origin", "referer"]) out.delete(h);
    if (secret) {
      const rule = proxyHosts.find((h) => h.host === target.hostname);
      if (!rule) return json(403, "Forbidden", \`no secret is allowed for \${target.hostname}\`);
      // A secret that was never set is bound as an empty string.
      const value = await rule.secret();
      if (!value) return json(400, "InvalidRequest", \`the secret for \${target.hostname} is not set\`);
      out.set(rule.header, rule.prefix + value);
    }
    // With a secret attached a redirect is returned, not followed: another host must not receive the key.
    const r = await fetch(target.href, { method, headers: out, body: body == null || method === "GET" ? undefined : body, redirect: secret ? "manual" : "follow" });
    const back = new Headers({ "x-proxy-upstream": String(r.status) });
    for (const h of ["content-type", "location", "retry-after"]) if (r.headers.get(h)) back.set(h, r.headers.get(h));
    return new Response(r.body, { status: r.status, headers: back });
  },
  { methods: { "com.lopecode.brain.proxy.fetch": { type: "procedure", who: "owner" } } }
));};
const _brainproxy_proxy_announce = function _proxy_announce(plugins,proxy_service,invalidation) {
  plugins.add("workers", proxy_service, { invalidation });
  return "announced proxy_service";
};
const _brainproxy_proxyFetch = function _proxyFetch() {return ((brainBase, { token = null, fetch: send = (...a) => fetch(...a) } = {}) =>
  async (url, { method = "GET", headers = {}, body = null, secret = false } = {}) => {
    const r = await send(String(brainBase).replace(/\\/$/, "") + "/xrpc/com.lopecode.brain.proxy.fetch", {
      method: "POST",
      credentials: token ? "omit" : "include",
      headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) },
      body: JSON.stringify({ url: String(url), method, headers: Object.fromEntries(new Headers(headers)), body, secret })
    });
    if (r.headers.get("x-proxy-upstream")) return r;
    const e = await r.json().catch(() => ({}));
    throw Object.assign(new Error(e.message || e.error || "proxy.fetch " + r.status), { status: r.status, error: e.error || "Error" });
  });};
const _brainproxy_anon_be3d699220 = function _anonymous(md) {return (md\`## Tests\`);};
const _brainproxy_proxyRig = function _proxyRig(simulate,proxy_service,Response,proxyFetch) {return (async (options = {}) => {
  const seen = [];
  const sim = await simulate(proxy_service, {
    secrets: { OPENROUTER_API_KEY: "sk-or-1", ANTHROPIC_API_KEY: "", BRAIN_KEY: "k" },
    fetch: async (request) => {
      seen.push({ url: request.url, method: request.method, authorization: request.headers.get("authorization"), cookie: request.headers.get("cookie"), body: request.method === "GET" ? null : await request.text() });
      return new URL(request.url).pathname === "/moved"
        ? new Response(null, { status: 302, headers: { location: "https://elsewhere.example/" } })
        : new Response('{"ok":true}', { status: 200, headers: { "content-type": "application/json", "set-cookie": "a=b" } });
    },
    ...options
  });
  // The page's side, wired to the simulated Worker as the kernel and core would deliver it.
  const pfetch = proxyFetch("https://brain.internal", { fetch: (url, init) => sim.fetch(url, { ...init, headers: { ...init.headers, "x-brain-caller": "owner" } }) });
  return { sim, seen, pfetch };
});};
const _brainproxy_test_proxy_adds_a_secret_only_for_its_host = async function _test_proxy_adds_a_secret_only_for_its_host(proxyRig,expect) {
  const rig = await proxyRig();
  const r = await rig.pfetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", body: '{"m":1}', headers: { cookie: "x=1", "content-type": "application/json" }, secret: true });
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({ ok: true });
  expect(r.headers.get("set-cookie")).toBe(null);
  expect(rig.seen).toEqual([{ url: "https://openrouter.ai/api/v1/chat/completions", method: "POST", authorization: "Bearer sk-or-1", cookie: null, body: '{"m":1}' }]);
  let refused = null;
  try { await rig.pfetch("https://evil.example/collect", { secret: true }); } catch (e) { refused = e; }
  expect(refused).toMatchObject({ status: 403, message: "no secret is allowed for evil.example" });
  expect(rig.seen.length).toBe(1);
  return "1 upstream request, 1 refusal";
};
const _brainproxy_test_proxy_plain_fetch_and_refusals = async function _test_proxy_plain_fetch_and_refusals(proxyRig,expect) {
  const rig = await proxyRig();
  const r = await rig.pfetch("https://no-cors.example/data");
  expect(r.headers.get("x-proxy-upstream")).toBe("200");
  expect(rig.seen[0].authorization).toBe(null);
  const fails = async (url, init) => rig.pfetch(url, init).then(() => null, (e) => e.message);
  expect(await fails("http://plain.example/")).toBe("only https: is fetched");
  expect(await fails("not a url")).toBe("url");
  // The secret is named for the host and not set on this Brain.
  expect(await fails("https://api.anthropic.com/v1/messages", { secret: true })).toBe("the secret for api.anthropic.com is not set");
  // A redirect is handed back when a key was attached.
  const moved = await rig.pfetch("https://openrouter.ai/moved", { secret: true });
  expect([moved.status, moved.headers.get("location")]).toEqual([302, "https://elsewhere.example/"]);
  expect(rig.seen.map((s) => new URL(s.url).hostname)).toEqual(["no-cors.example", "openrouter.ai"]);
  return "3 refusals with no upstream request";
};
const _brainproxy_test_proxy_declares_what_it_needs = async function _test_proxy_declares_what_it_needs(proxy_service,expect) {
  const { meta } = await proxy_service.emit();
  expect(meta.worker).toBe("brain-x-proxy");
  expect(meta.secrets).toEqual(["ANTHROPIC_API_KEY", "OPENROUTER_API_KEY"]);
  expect(meta.access).toEqual({ "com.lopecode.brain.proxy.fetch": { type: "procedure", who: "owner" } });
  expect(meta.resources).toEqual([]);
  return meta.secrets.join(", ");
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_brainproxy_anon_ecb88c092c", null, ["md"], _brainproxy_anon_ecb88c092c);  
  $def("_brainproxy_proxyHosts", "proxyHosts", ["secrets"], _brainproxy_proxyHosts);  
  $def("_brainproxy_proxy_service", "proxy_service", ["cloudflare","Response","proxyHosts"], _brainproxy_proxy_service);  
  $def("_brainproxy_proxy_announce", "proxy_announce", ["plugins","proxy_service","invalidation"], _brainproxy_proxy_announce);  
  $def("_brainproxy_proxyFetch", "proxyFetch", [], _brainproxy_proxyFetch);  
  $def("_brainproxy_anon_be3d699220", null, ["md"], _brainproxy_anon_be3d699220);  
  $def("_brainproxy_proxyRig", "proxyRig", ["simulate","proxy_service","Response","proxyFetch"], _brainproxy_proxyRig);  
  $def("_brainproxy_test_proxy_adds_a_secret_only_for_its_host", "test_proxy_adds_a_secret_only_for_its_host", ["proxyRig","expect"], _brainproxy_test_proxy_adds_a_secret_only_for_its_host);  
  $def("_brainproxy_test_proxy_plain_fetch_and_refusals", "test_proxy_plain_fetch_and_refusals", ["proxyRig","expect"], _brainproxy_test_proxy_plain_fetch_and_refusals);  
  $def("_brainproxy_test_proxy_declares_what_it_needs", "test_proxy_declares_what_it_needs", ["proxy_service","expect"], _brainproxy_test_proxy_declares_what_it_needs);  
  main.define("module @tomlarkworthy/cloudflare-iac", async () => runtime.module((await import("/@tomlarkworthy/cloudflare-iac.js?v=4")).default));  
  main.define("cloudflare", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("cloudflare", _));  
  main.define("secrets", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("secrets", _));  
  main.define("simulate", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("simulate", _));  
  main.define("module @tomlarkworthy/plugin-registry", async () => runtime.module((await import("/@tomlarkworthy/plugin-registry.js?v=4")).default));  
  main.define("plugins", ["module @tomlarkworthy/plugin-registry", "@variable"], (_, v) => v.import("plugins", _));  
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));  
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));
  return main;
}` }, static: { module: "@tomlarkworthy/brain-static", cell: "static_service", hash: "046fd1d9f89352b117615a3c99ed24e4f0ae72af3f73c2ff06e5261a97125cbb", source: `
const _brainstatic_anon_aa857e9cd1 = function _anonymous(md) {return (md\`# brain-static

Files kept by a Cloud Brain and served from its address.

| | |
|---|---|
| Worker | \\\`brain-x-static\\\` |
| \\\`static.put\\\` | procedure. \\\`?path=\\\`, optional \\\`type=\\\` and \\\`public=true\\\`; the body is the file. Answers \\\`{ path, size, type, sha256, public, savedAt }\\\`. |
| \\\`static.get\\\` | query. \\\`?path=\\\`. The file, whoever may call the method. |
| \\\`static.list\\\` | query. \\\`?prefix=\\\`. \\\`{ files: [{ path, size, type, sha256, public, savedAt }] }\\\` |
| \\\`static.setPublic\\\` | procedure. \\\`{ path, public }\\\` |
| \\\`static.delete\\\` | procedure. \\\`{ path }\\\` |
| \\\`GET /static/<path>\\\` | anyone for a public file, the owner for any. \\\`ETag\\\` is the SHA-256; \\\`If-None-Match\\\` answers 304. |
| Storage | bytes in \\\`blobs\\\` and one row per file in \\\`rows\\\`, both under \\\`f/<path>\\\` |

A path is segments of \\\`A-Z a-z 0-9 @ . _ -\\\` joined by \\\`/\\\`, at most 200 characters. A file is at most 50 MB. Without \\\`type\\\` the content type comes from the extension (\\\`staticTypes\\\`), else \\\`application/octet-stream\\\`. A file is private until it is put or set public.

The methods are open to the owner and to other Workers of this Brain. The owner reaches every path. A Worker reaches only paths under its own name: \\\`brain-x-library\\\` under \\\`library/\\\`.

\\\`\\\`\\\`js
client = xrpcClient("https://brain.example", { namespace: "com.lopecode.brain" })
await client.procedure("static.put", bytes, { params: { path: "site/logo.png", public: "true" }, raw: true })
// https://brain.example/static/site/logo.png
\\\`\\\`\\\`

A page served from \\\`/static\\\` runs on the Brain's own address, so its scripts call the Brain as whoever is signed in. Put only pages you would run as yourself.\`);};
const _brainstatic_static_service = function _static_service(cloudflare,staticApp) {return (cloudflare.Worker("static", staticApp, {
  methods: {
    "com.lopecode.brain.static.put": { type: "procedure", who: "workers" },
    "com.lopecode.brain.static.get": { type: "query", who: "workers" },
    "com.lopecode.brain.static.list": { type: "query", who: "workers" },
    "com.lopecode.brain.static.setPublic": { type: "procedure", who: "workers" },
    "com.lopecode.brain.static.delete": { type: "procedure", who: "workers" }
  },
  paths: [{ path: "/static/*", who: "anyone" }]
}));};
const _brainstatic_static_announce = function _static_announce(plugins,static_service,invalidation) {
  plugins.add("workers", static_service, { invalidation });
  return "announced static_service";
};
const _brainstatic_staticTypes = function _staticTypes() {return ({
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  json: "application/json",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  woff2: "font/woff2",
  wasm: "application/wasm",
  pdf: "application/pdf"
});};
const _brainstatic_staticApp = function _staticApp(hono,Response,blobs,rows,staticTypes) {
  const app = new hono.Hono();
  const NS = "/xrpc/com.lopecode.brain.static.";
  const MAX = 50 * 1024 * 1024;
  const fail = (c, status, error, message) => c.json({ error, message }, status);
  const okPath = (p) => typeof p === "string" && p.length <= 200 && /^[A-Za-z0-9@._-]+(\\/[A-Za-z0-9@._-]+)*$/.test(p) && !p.split("/").some((s) => /^\\.+$/.test(s));
  // Where a caller may read and write: "" is everywhere, "name/" is under that name, null is nowhere.
  const scope = (c) => {
    const who = c.req.header("x-brain-caller") || "anonymous";
    if (who === "owner" || /^(token|did):/.test(who)) return "";
    return who.startsWith("worker:brain-x-") ? who.slice("worker:brain-x-".length) + "/" : null;
  };
  const refused = (c, path) => {
    if (!okPath(path)) return fail(c, 400, "InvalidRequest", "path");
    const s = scope(c);
    return s === null || !path.startsWith(s) ? fail(c, 403, "Forbidden", \`\${path} is outside \${s === null ? "what this caller may reach" : s}\`) : null;
  };
  const send = async (c, path, meta) => {
    const etag = '"' + meta.sha256 + '"';
    const headers = { "content-type": meta.type, etag, "cache-control": "no-cache", "x-content-type-options": "nosniff", "x-static-sha256": meta.sha256 };
    if (c.req.header("if-none-match") === etag) return new Response(null, { status: 304, headers });
    const bytes = await blobs.get("f/" + path);
    return bytes ? new Response(bytes, { headers }) : fail(c, 404, "NotFound", path);
  };
  app.post(NS + "put", async (c) => {
    const path = c.req.query("path") || "";
    const no = refused(c, path);
    if (no) return no;
    const bytes = new Uint8Array(await c.req.raw.arrayBuffer());
    if (bytes.length > MAX) return fail(c, 413, "TooLarge", \`\${bytes.length} bytes, at most \${MAX}\`);
    const sha256 = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
    const ext = ((path.match(/\\.([A-Za-z0-9]+)$/) || [])[1] || "").toLowerCase();
    const before = await rows.get("f/" + path);
    const open = c.req.query("public");
    const meta = { size: bytes.length, type: c.req.query("type") || staticTypes[ext] || "application/octet-stream", sha256, public: open != null ? open === "true" : !!(before && before.public), savedAt: Date.now() };
    await blobs.put("f/" + path, bytes);
    await rows.put("f/" + path, meta);
    return c.json({ path, ...meta });
  });
  app.get(NS + "get", async (c) => {
    const path = c.req.query("path") || "";
    const no = refused(c, path);
    if (no) return no;
    const meta = await rows.get("f/" + path);
    return meta ? send(c, path, meta) : fail(c, 404, "NotFound", path);
  });
  app.get(NS + "list", async (c) => {
    const s = scope(c);
    if (s === null) return fail(c, 403, "Forbidden", "this caller has no files");
    const prefix = c.req.query("prefix") || "";
    const files = (await rows.list("f/" + prefix)).map(({ key, value }) => ({ path: key.slice(2), ...value })).filter((f) => f.path.startsWith(s));
    return c.json({ files });
  });
  app.post(NS + "setPublic", async (c) => {
    const { path, public: open } = await c.req.json().catch(() => ({}));
    const no = refused(c, path);
    if (no) return no;
    const meta = await rows.get("f/" + path);
    if (!meta) return fail(c, 404, "NotFound", path);
    await rows.put("f/" + path, { ...meta, public: !!open });
    return c.json({ path, public: !!open });
  });
  app.post(NS + "delete", async (c) => {
    const { path } = await c.req.json().catch(() => ({}));
    const no = refused(c, path);
    if (no) return no;
    const deleted = await rows.delete("f/" + path);
    await blobs.delete("f/" + path);
    return c.json({ deleted: !!deleted });
  });
  app.get("/static/:path{.+}", async (c) => {
    const path = c.req.param("path");
    const meta = okPath(path) ? await rows.get("f/" + path) : null;
    if (!meta) return c.text("not found", 404);
    if (!meta.public && scope(c) !== "") return c.text("unauthorized", 401);
    return send(c, path, meta);
  });
  return app;
};
const _brainstatic_anon_be3d699220 = function _anonymous(md) {return (md\`## Tests\`);};
const _brainstatic_staticRig = function _staticRig(simulate,static_service) {return (async () => {
  const sim = await simulate(static_service, {});
  const call = (who, path, init = {}) => sim.fetch("https://static.internal" + path, { ...init, headers: { ...(init.headers || {}), "x-brain-caller": who } });
  const X = "/xrpc/com.lopecode.brain.static.";
  const put = (who, path, body, extra = "") => call(who, X + "put?path=" + encodeURIComponent(path) + extra, { method: "POST", body });
  const post = (who, name, input) => call(who, X + name, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
  return { sim, call, put, post, X };
});};
const _brainstatic_test_static_put_get_list_delete = async function _test_static_put_get_list_delete(staticRig,expect,sha256) {
  const rig = await staticRig();
  const made = await (await rig.put("owner", "site/a.css", "body { margin: 0 }")).json();
  expect(made).toMatchObject({ path: "site/a.css", size: 18, type: "text/css; charset=utf-8", public: false, sha256: await sha256("body { margin: 0 }") });
  expect([...rig.sim.blobs.keys()]).toEqual(["brain-x-static/f/site/a.css"]);
  const got = await rig.call("owner", rig.X + "get?path=site/a.css");
  expect([got.status, got.headers.get("content-type"), got.headers.get("etag"), await got.text()]).toEqual([200, "text/css; charset=utf-8", '"' + made.sha256 + '"', "body { margin: 0 }"]);
  await rig.put("owner", "site/data.bin", new Uint8Array([0, 255, 7]), "&type=application/x-thing");
  const back = await rig.call("owner", rig.X + "get?path=site/data.bin");
  expect([back.headers.get("content-type"), [...new Uint8Array(await back.arrayBuffer())]]).toEqual(["application/x-thing", [0, 255, 7]]);
  await rig.put("owner", "other.txt", "x");
  expect((await (await rig.call("owner", rig.X + "list?prefix=site/")).json()).files.map((f) => f.path)).toEqual(["site/a.css", "site/data.bin"]);
  expect((await rig.put("owner", "../up", "x")).status).toBe(400);
  expect((await rig.put("owner", "a//b", "x")).status).toBe(400);
  expect(await (await rig.post("owner", "delete", { path: "site/a.css" })).json()).toEqual({ deleted: true });
  expect((await rig.call("owner", rig.X + "get?path=site/a.css")).status).toBe(404);
  expect([...rig.sim.blobs.keys()].sort()).toEqual(["brain-x-static/f/other.txt", "brain-x-static/f/site/data.bin"]);
  return "3 files put, 1 deleted";
};
const _brainstatic_test_static_a_worker_reaches_only_paths_under_its_name = async function _test_static_a_worker_reaches_only_paths_under_its_name(staticRig,expect) {
  const rig = await staticRig();
  const lib = "worker:brain-x-library";
  await rig.put("owner", "site/a.css", "a");
  expect((await rig.put(lib, "library/n/1.html", "<p>")).status).toBe(200);
  expect((await rig.put(lib, "site/a.css", "overwritten")).status).toBe(403);
  expect((await rig.call(lib, rig.X + "get?path=site/a.css")).status).toBe(403);
  expect((await rig.post(lib, "delete", { path: "site/a.css" })).status).toBe(403);
  expect((await (await rig.call(lib, rig.X + "list")).json()).files.map((f) => f.path)).toEqual(["library/n/1.html"]);
  expect((await (await rig.call("owner", rig.X + "list")).json()).files.map((f) => f.path)).toEqual(["library/n/1.html", "site/a.css"]);
  // The core, and a caller with no name, have no files.
  expect((await rig.put("worker:brain-core", "core/x", "x")).status).toBe(403);
  expect((await rig.call("anonymous", rig.X + "list")).status).toBe(403);
  return "4 refusals";
};
const _brainstatic_test_static_serves_a_public_file_to_anyone = async function _test_static_serves_a_public_file_to_anyone(staticRig,expect) {
  const rig = await staticRig();
  const made = await (await rig.put("owner", "site/index.html", "<h1>hi</h1>")).json();
  expect((await rig.call("anonymous", "/static/site/index.html")).status).toBe(401);
  expect((await rig.call("owner", "/static/site/index.html")).status).toBe(200);
  expect(await (await rig.post("owner", "setPublic", { path: "site/index.html", public: true })).json()).toEqual({ path: "site/index.html", public: true });
  const page = await rig.call("anonymous", "/static/site/index.html");
  expect([page.status, page.headers.get("content-type"), await page.text()]).toEqual([200, "text/html; charset=utf-8", "<h1>hi</h1>"]);
  expect((await rig.call("anonymous", "/static/site/index.html", { headers: { "if-none-match": '"' + made.sha256 + '"' } })).status).toBe(304);
  // Putting again keeps it public; a path that was never put is not found.
  expect((await (await rig.put("owner", "site/index.html", "<h1>two</h1>")).json()).public).toBe(true);
  expect((await rig.call("anonymous", "/static/site/missing.html")).status).toBe(404);
  // A Worker is not the owner: it is refused a private file at the public path too.
  await rig.put("owner", "private.txt", "p");
  expect((await rig.call("worker:brain-x-library", "/static/private.txt")).status).toBe(401);
  return "401, 200, 304, 404";
};
const _brainstatic_test_static_declares_what_it_needs = async function _test_static_declares_what_it_needs(static_service,expect) {
  const { meta } = await static_service.emit();
  expect(meta).toMatchObject({ worker: "brain-x-static", role: "recipe", module: "@tomlarkworthy/brain-static", resources: ["blobs", "rows"], secrets: [], paths: [{ path: "/static/*", who: "anyone" }] });
  expect(Object.keys(meta.access).length).toBe(5);
  return meta.resources.join(", ");
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_brainstatic_anon_aa857e9cd1", null, ["md"], _brainstatic_anon_aa857e9cd1);  
  $def("_brainstatic_static_service", "static_service", ["cloudflare","staticApp"], _brainstatic_static_service);  
  $def("_brainstatic_static_announce", "static_announce", ["plugins","static_service","invalidation"], _brainstatic_static_announce);  
  $def("_brainstatic_staticTypes", "staticTypes", [], _brainstatic_staticTypes);  
  $def("_brainstatic_staticApp", "staticApp", ["hono","Response","blobs","rows","staticTypes"], _brainstatic_staticApp);  
  $def("_brainstatic_anon_be3d699220", null, ["md"], _brainstatic_anon_be3d699220);  
  $def("_brainstatic_staticRig", "staticRig", ["simulate","static_service"], _brainstatic_staticRig);  
  $def("_brainstatic_test_static_put_get_list_delete", "test_static_put_get_list_delete", ["staticRig","expect","sha256"], _brainstatic_test_static_put_get_list_delete);  
  $def("_brainstatic_test_static_a_worker_reaches_only_paths_under_its_name", "test_static_a_worker_reaches_only_paths_under_its_name", ["staticRig","expect"], _brainstatic_test_static_a_worker_reaches_only_paths_under_its_name);  
  $def("_brainstatic_test_static_serves_a_public_file_to_anyone", "test_static_serves_a_public_file_to_anyone", ["staticRig","expect"], _brainstatic_test_static_serves_a_public_file_to_anyone);  
  $def("_brainstatic_test_static_declares_what_it_needs", "test_static_declares_what_it_needs", ["static_service","expect"], _brainstatic_test_static_declares_what_it_needs);  
  main.define("module @tomlarkworthy/cloudflare-iac", async () => runtime.module((await import("/@tomlarkworthy/cloudflare-iac.js?v=4")).default));  
  main.define("cloudflare", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("cloudflare", _));  
  main.define("rows", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("rows", _));  
  main.define("blobs", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("blobs", _));  
  main.define("hono", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("hono", _));  
  main.define("simulate", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("simulate", _));  
  main.define("sha256", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("sha256", _));  
  main.define("module @tomlarkworthy/plugin-registry", async () => runtime.module((await import("/@tomlarkworthy/plugin-registry.js?v=4")).default));  
  main.define("plugins", ["module @tomlarkworthy/plugin-registry", "@variable"], (_, v) => v.import("plugins", _));  
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));  
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));
  return main;
}` }, library: { module: "@tomlarkworthy/brain-library", cell: "library_service", hash: "472019296b6acf69f6cd96afeddfef084b4ff7e2bba62d61f6f838574add77a7", source: `
const _brainlibrary_anon_202f660c5d = function _anonymous(md) {return (md\`# brain-library

Notebooks kept by a Cloud Brain and served from its address. The files are in \\\`brain-static\\\`, under \\\`library/\\\`; this Worker keeps the list, the versions and who may open each.

| | |
|---|---|
| Worker | \\\`brain-x-library\\\` |
| \\\`library.put\\\` | procedure, owner. \\\`?name=\\\`, optional \\\`public=true\\\` and \\\`parent=<sha256>\\\`; the body is the notebook's HTML file. |
| \\\`library.list\\\` | query, anyone. The owner gets every notebook, anyone else the public ones. |
| \\\`library.versions\\\` | query, owner. \\\`?name=\\\`. The last 10 saves, newest first. |
| \\\`library.setPublic\\\` | procedure, owner. \\\`{ name, public }\\\` |
| \\\`library.delete\\\` | procedure, owner. \\\`{ name }\\\`. Deletes every version. |
| \\\`GET /library/<name>\\\` | the notebook. Anyone for a public one, the owner for any. \\\`?v=<sha256>\\\` opens a kept version. |
| Calls | \\\`static.put\\\`, \\\`static.get\\\`, \\\`static.delete\\\` |
| Storage | \\\`rows\\\`, key \\\`n/<name>\\\`: \\\`{ title, sha256, size, public, savedAt, versions }\\\`. Files at \\\`library/<name>/<first 16 of sha256>.html\\\` in \\\`brain-static\\\`. |

A name is 1 to 80 of \\\`A-Z a-z 0-9 @ . _ -\\\`. The body must be a lopecode notebook: a file with a \\\`bootconf.json\\\` block. The title is the file's \\\`<title>\\\`. With \\\`parent\\\`, a put is refused with 409 unless \\\`parent\\\` is the SHA-256 of the notebook's newest version (empty for a new name), so two tabs saving one notebook do not overwrite each other unseen.

\\\`\\\`\\\`js
client = xrpcClient("https://brain.example", { namespace: "com.lopecode.brain" })
await client.procedure("library.put", htmlBytes, { params: { name: "notes", public: "true" }, raw: true })
// https://brain.example/library/notes
\\\`\\\`\\\`

\\\`libraryPanel({ client, origin, owner })\\\` is the list as a table, with upload, public and delete for the owner.

A notebook served from \\\`/library\\\` runs on the Brain's own address, so its cells call the Brain as whoever is signed in. Put only notebooks you would run as yourself.\`);};
const _brainlibrary_library_service = function _library_service(cloudflare,libraryApp) {return (cloudflare.Worker("library", libraryApp, {
  methods: {
    "com.lopecode.brain.library.put": { type: "procedure", who: "owner" },
    "com.lopecode.brain.library.list": { type: "query", who: "anyone" },
    "com.lopecode.brain.library.versions": { type: "query", who: "owner" },
    "com.lopecode.brain.library.setPublic": { type: "procedure", who: "owner" },
    "com.lopecode.brain.library.delete": { type: "procedure", who: "owner" }
  },
  paths: [{ path: "/library/*", who: "anyone" }],
  calls: ["com.lopecode.brain.static.put", "com.lopecode.brain.static.get", "com.lopecode.brain.static.delete"]
}));};
const _brainlibrary_library_announce = function _library_announce(plugins,library_service,invalidation) {
  plugins.add("workers", library_service, { invalidation });
  return "announced library_service";
};
const _brainlibrary_libraryApp = function _libraryApp(hono,xrpc,rows,Response) {
  const app = new hono.Hono();
  const NS = "/xrpc/com.lopecode.brain.library.";
  const STATIC = "com.lopecode.brain.static.";
  const KEEP = 10;
  const fail = (c, status, error, message) => c.json({ error, message }, status);
  const okName = (n) => /^[A-Za-z0-9@._-]{1,80}$/.test(n || "") && !/^\\.+$/.test(n);
  const isOwner = (c) => {
    const who = c.req.header("x-brain-caller") || "";
    return who === "owner" || /^(token|did):/.test(who);
  };
  const fileOf = (name, sha) => \`library/\${name}/\${sha.slice(0, 16)}.html\`;
  const drop = (name, sha) => xrpc.fetch(STATIC + "delete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: fileOf(name, sha) }) });
  app.post(NS + "put", async (c) => {
    const name = c.req.query("name") || "";
    if (!okName(name)) return fail(c, 400, "InvalidRequest", "name");
    const bytes = new Uint8Array(await c.req.raw.arrayBuffer());
    if (!new TextDecoder().decode(bytes).includes('id="bootconf.json"')) return fail(c, 400, "NotANotebook", "the file has no bootconf.json block");
    const head = await rows.get("n/" + name);
    const parent = c.req.query("parent");
    if (parent != null && parent !== (head ? head.sha256 : "")) return fail(c, 409, "StaleParent", \`the newest version of \${name} is \${head ? head.sha256 : "none"}\`);
    const sha256 = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
    const kept = await xrpc.fetch(STATIC + "put", { method: "POST", params: { path: fileOf(name, sha256), type: "text/html; charset=utf-8", public: "false" }, body: bytes });
    if (!kept.ok) return fail(c, 502, "UpstreamFailed", \`static.put answered \${kept.status}\`);
    const text = new TextDecoder().decode(bytes.subarray(0, 65536));
    const title = ((text.match(/<title>([^<]*)<\\/title>/) || [])[1] || name).trim().slice(0, 200);
    const savedAt = Date.now();
    const versions = [{ sha256, size: bytes.length, savedAt }, ...(head ? head.versions.filter((v) => v.sha256 !== sha256) : [])];
    for (const old of versions.slice(KEEP)) await drop(name, old.sha256);
    const open = c.req.query("public");
    const next = { title, sha256, size: bytes.length, public: open != null ? open === "true" : !!(head && head.public), savedAt, versions: versions.slice(0, KEEP) };
    await rows.put("n/" + name, next);
    return c.json({ name, title, sha256, size: next.size, public: next.public, savedAt, versions: next.versions.length });
  });
  app.get(NS + "list", async (c) => {
    const all = (await rows.list("n/")).map(({ key, value }) => ({ name: key.slice(2), title: value.title, sha256: value.sha256, size: value.size, public: value.public, savedAt: value.savedAt, versions: value.versions.length }));
    return c.json({ notebooks: isOwner(c) ? all : all.filter((n) => n.public) });
  });
  app.get(NS + "versions", async (c) => {
    const head = await rows.get("n/" + (c.req.query("name") || ""));
    return head ? c.json({ versions: head.versions }) : fail(c, 404, "NotFound", c.req.query("name") || "");
  });
  app.post(NS + "setPublic", async (c) => {
    const { name, public: open } = await c.req.json().catch(() => ({}));
    const head = okName(name) ? await rows.get("n/" + name) : null;
    if (!head) return fail(c, 404, "NotFound", String(name));
    await rows.put("n/" + name, { ...head, public: !!open });
    return c.json({ name, public: !!open });
  });
  app.post(NS + "delete", async (c) => {
    const { name } = await c.req.json().catch(() => ({}));
    const head = okName(name) ? await rows.get("n/" + name) : null;
    if (!head) return c.json({ deleted: false });
    for (const v of head.versions) await drop(name, v.sha256);
    await rows.delete("n/" + name);
    return c.json({ deleted: true, versions: head.versions.length });
  });
  app.get("/library/:name{.+}", async (c) => {
    const name = c.req.param("name");
    const head = okName(name) ? await rows.get("n/" + name) : null;
    if (!head) return c.text("not found", 404);
    if (!head.public && !isOwner(c)) return c.text("unauthorized", 401);
    const sha = c.req.query("v") || head.sha256;
    if (!head.versions.some((v) => v.sha256 === sha)) return c.text("not found", 404);
    const etag = '"' + sha + '"';
    const headers = { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache", etag, "x-library-sha256": sha };
    if (c.req.header("if-none-match") === etag) return new Response(null, { status: 304, headers });
    const file = await xrpc.fetch(STATIC + "get", { params: { path: fileOf(name, sha) } });
    return file.ok ? new Response(file.body, { headers }) : c.text("not found", 404);
  });
  return app;
};
const _brainlibrary_libraryPanel = function _libraryPanel(htl,Inputs) {return (({ client, origin, owner = false, current = null } = {}) => {
  if (!client) return htl.html\`<i style="color:var(--theme-foreground-muted)">Open this notebook from a Brain to see its library.</i>\`;
  const box = htl.html\`<div></div>\`, note = htl.html\`<div style="color:var(--theme-foreground-muted);margin-top:6px"></div>\`;
  let table = null;
  const say = (text) => void (note.textContent = text);
  const draw = async () => {
    const { notebooks } = await client.query("library.list");
    table = Inputs.table(
      notebooks.map((n) => ({ name: n.name, title: n.title, KB: Math.round(n.size / 1024), saved: new Date(n.savedAt), public: n.public, versions: n.versions })),
      {
        multiple: false,
        required: false,
        layout: "auto",
        format: {
          name: (name) => htl.html\`<a href=\${origin + "/library/" + name} target="_blank">\${name}</a>\`,
          saved: (d) => d.toISOString().slice(0, 16).replace("T", " "),
          public: (p) => (p ? "public" : "owner")
        }
      }
    );
    box.replaceChildren(notebooks.length ? table : htl.html\`<i style="color:var(--theme-foreground-muted)">No notebooks.</i>\`);
  };
  const run = (what, fn) => async () => {
    try {
      say(what + "…");
      say((await fn()) || "");
      await draw();
    } catch (e) {
      say(\`\${what} failed: \${(e && e.message) || e}\`);
    }
  };
  const picked = () => {
    const row = table && table.value;
    if (!row) throw new Error("choose a row");
    return row;
  };
  draw().catch((e) => say("library.list failed: " + ((e && e.message) || e)));
  const refresh = Inputs.button("Refresh", { reduce: run("Refresh", async () => "") });
  if (!owner) return htl.html\`<div>\${box}\${refresh}\${note}</div>\`;
  const file = Inputs.file({ label: "Notebook file", accept: ".html" });
  const name = Inputs.text({ label: "Name", placeholder: "from the file's name", width: "20em" });
  const put = async (as, bytes) => {
    const made = await client.procedure("library.put", bytes, { params: { name: as }, raw: true });
    return \`\${made.name} saved, \${made.versions} version\${made.versions === 1 ? "" : "s"}: \${origin}/library/\${made.name}\`;
  };
  const upload = Inputs.button("Upload", {
    reduce: run("Upload", async () => {
      if (!file.value) throw new Error("choose a file");
      return put(name.value || file.value.name.replace(/\\.html?$/i, "").replace(/[^A-Za-z0-9@._-]+/g, "-"), new Uint8Array(await file.value.arrayBuffer()));
    })
  });
  const flip = Inputs.button("Make public / owner only", { reduce: run("Change", async () => void (await client.procedure("library.setPublic", { name: picked().name, public: !picked().public }))) });
  const del = Inputs.button("Delete", { reduce: run("Delete", async () => void (await client.procedure("library.delete", { name: picked().name }))) });
  const save = current ? Inputs.button(\`Save this notebook as "\${current.name}"\`, { reduce: run("Save", async () => put(current.name, new TextEncoder().encode(await current.html()))) }) : "";
  return htl.html\`<div>\${box}<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0">\${refresh}\${flip}\${del}\${save}</div>\${file}\${name}\${upload}\${note}</div>\`;
});};
const _brainlibrary_anon_be3d699220 = function _anonymous(md) {return (md\`## Tests\`);};
const _brainlibrary_libraryNotebook = function _libraryNotebook() {return ((body, title = "Notes") => "<html><head><title>" + title + "</title><script id=\\"bootconf.json\\" type=\\"text/plain\\">{}</scr" + "ipt></head><body>" + body + "</body></html>");};
const _brainlibrary_libraryRig = function _libraryRig(simulate,static_service,library_service) {return (async () => {
  const stat = await simulate(static_service, {});
  const asked = [];
  const sim = await simulate(library_service, {
    core: async (request) => {
      const url = new URL(request.url);
      asked.push(url.pathname.split(".").pop() + " " + (url.searchParams.get("path") || ""));
      return stat.fetch("https://static.internal" + url.pathname + url.search, {
        method: request.method,
        headers: { "content-type": request.headers.get("content-type") || "", "x-brain-caller": "worker:brain-x-library" },
        body: request.method === "GET" ? undefined : await request.arrayBuffer()
      });
    }
  });
  const call = (who, path, init = {}) => sim.fetch("https://library.internal" + path, { ...init, headers: { ...(init.headers || {}), "x-brain-caller": who } });
  const X = "/xrpc/com.lopecode.brain.library.";
  const put = (who, name, html, extra = "") => call(who, X + "put?name=" + encodeURIComponent(name) + extra, { method: "POST", body: html });
  const post = (who, name, input) => call(who, X + name, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
  return { stat, sim, asked, call, put, post, X };
});};
const _brainlibrary_test_library_keeps_and_serves_a_notebook = async function _test_library_keeps_and_serves_a_notebook(libraryRig,libraryNotebook,expect,sha256) {
  const rig = await libraryRig();
  const one = libraryNotebook("one");
  const made = await (await rig.put("owner", "notes", one)).json();
  expect(made).toMatchObject({ name: "notes", title: "Notes", sha256: await sha256(one), size: one.length, public: false, versions: 1 });
  // The file is in the static Worker's store, under library/, and not public there.
  const file = "library/notes/" + made.sha256.slice(0, 16) + ".html";
  expect([...rig.stat.blobs.keys()]).toEqual(["brain-x-static/f/" + file]);
  expect(rig.stat.rows.get("f/" + file)).toMatchObject({ public: false, type: "text/html; charset=utf-8" });
  const page = await rig.call("owner", "/library/notes");
  expect([page.status, page.headers.get("content-type"), page.headers.get("x-library-sha256"), await page.text()]).toEqual([200, "text/html; charset=utf-8", made.sha256, one]);
  expect((await rig.call("anonymous", "/library/notes")).status).toBe(401);
  expect((await rig.call("owner", "/library/notes", { headers: { "if-none-match": '"' + made.sha256 + '"' } })).status).toBe(304);
  expect((await rig.call("owner", "/library/nothing")).status).toBe(404);
  expect((await rig.put("owner", "page", "<html><body>not a notebook</body></html>")).status).toBe(400);
  expect((await rig.put("owner", "a/b", one)).status).toBe(400);
  return "put, served, 401, 304, 404, 400";
};
const _brainlibrary_test_library_public_list_and_versions = async function _test_library_public_list_and_versions(libraryRig,libraryNotebook,expect) {
  const rig = await libraryRig();
  const one = libraryNotebook("one"), two = libraryNotebook("two", "Notes, edited");
  const v1 = await (await rig.put("owner", "notes", one)).json();
  await rig.put("owner", "private", libraryNotebook("p", "Private"));
  const list = async (who) => (await (await rig.call(who, rig.X + "list")).json()).notebooks.map((n) => n.name + (n.public ? " public" : ""));
  expect(await list("anonymous")).toEqual([]);
  expect(await (await rig.post("owner", "setPublic", { name: "notes", public: true })).json()).toEqual({ name: "notes", public: true });
  expect(await list("anonymous")).toEqual(["notes public"]);
  expect(await list("owner")).toEqual(["notes public", "private"]);
  // A second save: the name serves the new file, the old one by ?v=, and it stays public.
  expect((await rig.put("owner", "notes", two, "&parent=" + "0".repeat(64))).status).toBe(409);
  const v2 = await (await rig.put("owner", "notes", two, "&parent=" + v1.sha256)).json();
  expect(v2).toMatchObject({ title: "Notes, edited", public: true, versions: 2 });
  expect(await (await rig.call("anonymous", "/library/notes")).text()).toBe(two);
  expect(await (await rig.call("anonymous", "/library/notes?v=" + v1.sha256)).text()).toBe(one);
  expect((await rig.call("anonymous", "/library/notes?v=" + "0".repeat(64))).status).toBe(404);
  expect((await (await rig.call("owner", rig.X + "versions?name=notes")).json()).versions.map((v) => v.sha256)).toEqual([v2.sha256, v1.sha256]);
  // Deleting removes every version's file.
  expect(await (await rig.post("owner", "delete", { name: "notes" })).json()).toEqual({ deleted: true, versions: 2 });
  expect([...rig.stat.blobs.keys()].length).toBe(1);
  expect((await rig.call("anonymous", "/library/notes")).status).toBe(404);
  return "2 versions, 1 conflict, 2 files deleted";
};
const _brainlibrary_test_library_keeps_ten_versions = async function _test_library_keeps_ten_versions(libraryRig,libraryNotebook,expect) {
  const rig = await libraryRig();
  for (let i = 0; i < 12; i++) await rig.put("owner", "notes", libraryNotebook("save " + i));
  const { versions } = await (await rig.call("owner", rig.X + "versions?name=notes")).json();
  expect(versions.length).toBe(10);
  expect([...rig.stat.blobs.keys()].length).toBe(10);
  expect(await (await rig.call("owner", "/library/notes")).text()).toBe(libraryNotebook("save 11"));
  expect(rig.asked.filter((a) => a.startsWith("delete")).length).toBe(2);
  return "12 saves, 10 kept";
};
const _brainlibrary_test_library_declares_what_it_needs = async function _test_library_declares_what_it_needs(library_service,expect) {
  const { meta } = await library_service.emit();
  expect(meta).toMatchObject({
    worker: "brain-x-library", role: "recipe", module: "@tomlarkworthy/brain-library", resources: ["rows", "xrpc"], secrets: [],
    calls: ["com.lopecode.brain.static.delete", "com.lopecode.brain.static.get", "com.lopecode.brain.static.put"],
    paths: [{ path: "/library/*", who: "anyone" }]
  });
  return meta.calls.join(", ");
};
const _brainlibrary_test_library_panel_lists_notebooks = async function _test_library_panel_lists_notebooks(libraryPanel,expect) {
  const client = { query: async () => ({ notebooks: [{ name: "notes", title: "Notes", size: 4096, public: true, savedAt: 0, versions: 2 }] }) };
  const el = libraryPanel({ client, origin: "https://brain.example", owner: true });
  await new Promise((r) => setTimeout(r, 0));
  expect(el.querySelector("a").getAttribute("href")).toBe("https://brain.example/library/notes");
  expect([...el.querySelectorAll("button")].map((b) => b.textContent)).toEqual(["Refresh", "Make public / owner only", "Delete", "Upload"]);
  expect(libraryPanel({ client: null }).textContent).toMatch(/Open this notebook from a Brain/);
  return "1 row, 4 buttons";
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_brainlibrary_anon_202f660c5d", null, ["md"], _brainlibrary_anon_202f660c5d);  
  $def("_brainlibrary_library_service", "library_service", ["cloudflare","libraryApp"], _brainlibrary_library_service);  
  $def("_brainlibrary_library_announce", "library_announce", ["plugins","library_service","invalidation"], _brainlibrary_library_announce);  
  $def("_brainlibrary_libraryApp", "libraryApp", ["hono","xrpc","rows","Response"], _brainlibrary_libraryApp);  
  $def("_brainlibrary_libraryPanel", "libraryPanel", ["htl","Inputs"], _brainlibrary_libraryPanel);  
  $def("_brainlibrary_anon_be3d699220", null, ["md"], _brainlibrary_anon_be3d699220);  
  $def("_brainlibrary_libraryNotebook", "libraryNotebook", [], _brainlibrary_libraryNotebook);  
  $def("_brainlibrary_libraryRig", "libraryRig", ["simulate","static_service","library_service"], _brainlibrary_libraryRig);  
  $def("_brainlibrary_test_library_keeps_and_serves_a_notebook", "test_library_keeps_and_serves_a_notebook", ["libraryRig","libraryNotebook","expect","sha256"], _brainlibrary_test_library_keeps_and_serves_a_notebook);  
  $def("_brainlibrary_test_library_public_list_and_versions", "test_library_public_list_and_versions", ["libraryRig","libraryNotebook","expect"], _brainlibrary_test_library_public_list_and_versions);  
  $def("_brainlibrary_test_library_keeps_ten_versions", "test_library_keeps_ten_versions", ["libraryRig","libraryNotebook","expect"], _brainlibrary_test_library_keeps_ten_versions);  
  $def("_brainlibrary_test_library_declares_what_it_needs", "test_library_declares_what_it_needs", ["library_service","expect"], _brainlibrary_test_library_declares_what_it_needs);  
  $def("_brainlibrary_test_library_panel_lists_notebooks", "test_library_panel_lists_notebooks", ["libraryPanel","expect"], _brainlibrary_test_library_panel_lists_notebooks);  
  main.define("module @tomlarkworthy/cloudflare-iac", async () => runtime.module((await import("/@tomlarkworthy/cloudflare-iac.js?v=4")).default));  
  main.define("cloudflare", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("cloudflare", _));  
  main.define("rows", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("rows", _));  
  main.define("xrpc", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("xrpc", _));  
  main.define("hono", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("hono", _));  
  main.define("simulate", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("simulate", _));  
  main.define("sha256", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("sha256", _));  
  main.define("module @tomlarkworthy/brain-static", async () => runtime.module((await import("/@tomlarkworthy/brain-static.js?v=4")).default));  
  main.define("static_service", ["module @tomlarkworthy/brain-static", "@variable"], (_, v) => v.import("static_service", _));  
  main.define("module @tomlarkworthy/plugin-registry", async () => runtime.module((await import("/@tomlarkworthy/plugin-registry.js?v=4")).default));  
  main.define("plugins", ["module @tomlarkworthy/plugin-registry", "@variable"], (_, v) => v.import("plugins", _));  
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));  
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));
  return main;
}` }, metrics: { module: "@tomlarkworthy/brain-metrics", cell: "metrics_service", hash: "9bc96611ffd3306444ec21dec326d462dec6e51f582f26263695b0bc162bcda5", source: `
const _brainmetrics_anon_b45833825f = function _anonymous(md) {return (md\`# brain-metrics

Call counts, latency and errors for a Cloud Brain, and the charts that read them.

| | |
|---|---|
| Worker | \\\`brain-x-metrics\\\` |
| \\\`metrics.record\\\` | procedure, \\\`worker:brain-core\\\`. Stores one batch. |
| \\\`metrics.query\\\` | query, anyone. \\\`since\\\`, \\\`until\\\` (ms), \\\`step\\\` (ms, at least 60000). At most 8 days. |
| Storage | \\\`rows\\\`, key \\\`b/DAY/HH:MM\\\` (5-minute keys), a list of batches. Days older than 14 are deleted. |

The core counts every call it answers or forwards and sends a batch every 10 s, or at once after a fault. A fault is a status of 500 or above, except 501, which is the answer to a name no Worker declares. A batch:

\\\`\\\`\\\`js
{ from, to,                                                   // ms
  buckets: [{ worker, version, method, caller, status, n, ms, max }],  // ms is the sum over n calls
  errors:  [{ t, worker, version, method, caller, status, ms }] }      // faults
\\\`\\\`\\\`

\\\`version\\\` is the first 12 characters of the hash of the Worker that answered, read from the \\\`x-brain-served-by\\\` header every Worker adds to its responses. \\\`caller\\\` is \\\`owner\\\`, \\\`anonymous\\\`, \\\`token\\\`, \\\`did\\\`, \\\`guard\\\` or \\\`worker:NAME\\\`. \\\`method\\\` is the name after \\\`com.lopecode.brain.\\\`, a declared path, or \\\`(unknown)\\\` for a name no Worker declares. Calls to \\\`metrics.*\\\` are not counted.

Not counted: calls that do not pass through the core (the guard's health checks, a Worker's own \\\`fetch\\\` to the internet, sign-in on the kernel). Counts held by a core isolate that stops before its next call are lost, up to 10 s of them.\`);};
const _brainmetrics_metrics_service = function _metrics_service(cloudflare,metricsApp) {return (cloudflare.Worker("metrics", metricsApp, {
  methods: {
    "com.lopecode.brain.metrics.record": { type: "procedure", who: "worker:brain-core" },
    "com.lopecode.brain.metrics.query": { type: "query", who: "anyone" }
  }
}));};
const _brainmetrics_metrics_announce = function _metrics_announce(plugins,metrics_service,invalidation) {
  plugins.add("workers", metrics_service, { invalidation });
  return "announced metrics_service";
};
const _brainmetrics_metricsApp = function _metricsApp(hono,rows) {
  const app = new hono.Hono();
  const NS = "/xrpc/com.lopecode.brain.metrics.";
  const fail = (c, status, error, message) => c.json({ error, message }, status);
  const DAY = 86400000, KEEP = 14;
  const day = (t) => new Date(t).toISOString().slice(0, 10);
  app.post(NS + "record", async (c) => {
    const b = await c.req.json().catch(() => null);
    if (!b || !Array.isArray(b.buckets)) return fail(c, 400, "InvalidRequest", "buckets");
    const from = Number(b.from) || Date.now();
    const slot = new Date(Math.floor(from / 300000) * 300000).toISOString().slice(11, 16);
    await rows.append(\`b/\${day(from)}/\${slot}\`, { from, to: Number(b.to) || from, buckets: b.buckets.slice(0, 500), errors: (b.errors || []).slice(0, 50) }, 400);
    return c.json({ stored: b.buckets.length });
  });
  app.get(NS + "query", async (c) => {
    const until = Number(c.req.query("until")) || Date.now();
    const since = Number(c.req.query("since")) || until - 3600000;
    const step = Math.max(60000, Number(c.req.query("step")) || 60000);
    if (!(until > since) || until - since > 8 * DAY) return fail(c, 400, "InvalidRequest", "since and until, at most 8 days apart");
    const merged = new Map(), errors = [];
    let batches = 0;
    for (let d = Math.floor(since / DAY) * DAY; d <= until; d += DAY)
      for (const { value } of await rows.list(\`b/\${day(d)}/\`))
        for (const b of value || []) {
          if (b.to < since || b.from > until) continue;
          batches++;
          const t = Math.floor(b.from / step) * step;
          for (const x of b.buckets) {
            const k = [t, x.worker, x.version || "", x.method, x.caller, x.status].join("|");
            const m = merged.get(k) || { t, worker: x.worker, version: x.version || "", method: x.method, caller: x.caller, status: x.status, n: 0, ms: 0, max: 0 };
            merged.set(k, { ...m, n: m.n + x.n, ms: m.ms + x.ms, max: Math.max(m.max, x.max) });
          }
          errors.push(...b.errors);
        }
    // Once a day: delete the days past KEEP.
    const today = day(Date.now());
    if ((await rows.get("pruned")) !== today) {
      await rows.put("pruned", today);
      for (let i = KEEP + 1; i <= KEEP + 30; i++) await rows.deletePrefix(\`b/\${day(Date.now() - i * DAY)}/\`);
    }
    return c.json({ since, until, step, batches, series: [...merged.values()].sort((a, b) => a.t - b.t), errors: errors.sort((a, b) => b.t - a.t).slice(0, 500) });
  });
  return app;
};
const _brainmetrics_anon_346f8359a8 = function _anonymous(md) {return (md\`## Dashboard

\\\`metricsData\\\` is the answer of \\\`metrics.query\\\` for the chosen range, in 60 steps. Without a Brain (a local copy of the notebook) it is \\\`sampleMetrics()\\\`, and the heading says so. Each chart is a function of that answer:

| | |
|---|---|
| \\\`healthStrip(data)\\\` | one row per Worker, one cell per step, coloured by the share of calls that were faults |
| \\\`requestsChart(data)\\\` | calls per step, stacked by Worker |
| \\\`latencyChart(data)\\\` | mean (line) and slowest (dot) call per step, by Worker, in ms |
| \\\`errorsChart(data)\\\` | calls per step that returned 400 or above, by status |
| \\\`methodTable(data)\\\` | one row per Worker, version and method: calls, refused (4xx and 501), faults, mean and max ms |
| \\\`errorTable(data)\\\` | the faults, newest first, with a search box |
| \\\`dashboard(panels)\\\` | lays out \\\`[{ title, body, wide }]\\\` in a grid |\`);};
const _brainmetrics_brainOrigin = function _brainOrigin(location) {return (location.protocol === "https:" && !/observableusercontent\\.com$|^localhost$/.test(location.hostname) ? location.origin : null);};
const _brainmetrics_metricsClient = function _metricsClient(brainOrigin,xrpcClient) {return (brainOrigin ? xrpcClient(brainOrigin, { namespace: "com.lopecode.brain" }) : null);};
const _brainmetrics_viewof_metricsRange = function _metricsRange(Inputs) {return (Inputs.radio(new Map([["1 hour", 3600000], ["6 hours", 6 * 3600000], ["24 hours", 24 * 3600000], ["7 days", 7 * 24 * 3600000]]), { value: 3600000, label: "Range" }));};
const _brainmetrics_metricsRange = (G, _) => G.input(_);
const _brainmetrics_viewof_metricsRefresh = function _metricsRefresh(Inputs) {return (Inputs.button("Refresh"));};
const _brainmetrics_metricsRefresh = (G, _) => G.input(_);
const _brainmetrics_metricsData = async function _metricsData(metricsRefresh,metricsRange,metricsClient,sampleMetrics) {
  metricsRefresh;
  const until = Date.now(), since = until - metricsRange, step = Math.max(60000, Math.round(metricsRange / 60 / 60000) * 60000);
  if (!metricsClient) return { ...sampleMetrics({ since, until, step }), sample: true };
  try {
    return await metricsClient.query("metrics.query", { since, until, step });
  } catch (e) {
    return { since, until, step, series: [], errors: [], batches: 0, error: String((e && e.message) || e) };
  }
};
const _brainmetrics_metricsBoard = function _metricsBoard(dashboard,healthStrip,metricsData,width,requestsChart,latencyChart,errorsChart,methodTable,errorTable,d3) {return (dashboard([
  { title: "Health", body: healthStrip(metricsData, { width }), wide: true },
  { title: "Calls", body: requestsChart(metricsData, { width: width / 2 - 24 }) },
  { title: "Latency, ms", body: latencyChart(metricsData, { width: width / 2 - 24 }) },
  { title: "Calls that failed", body: errorsChart(metricsData, { width: width / 2 - 24 }) },
  { title: "By method", body: methodTable(metricsData) },
  { title: "Faults", body: errorTable(metricsData), wide: true }
], { note: metricsData.sample ? "Sample data: this copy of the notebook is not served by a Brain." : metricsData.error ? "metrics.query failed: " + metricsData.error : \`\${metricsData.batches} batches, \${d3.sum(metricsData.series, (d) => d.n)} calls\` }));};
const _brainmetrics_rollup = function _rollup() {return ((series, keys) => {
  const out = new Map();
  for (const d of series) {
    const k = keys.map((key) => d[key]).join("|");
    const m = out.get(k) || { ...Object.fromEntries(keys.map((key) => [key, d[key]])), n: 0, ms: 0, max: 0, e4: 0, e5: 0 };
    out.set(k, { ...m, n: m.n + d.n, ms: m.ms + d.ms, max: Math.max(m.max, d.max), e4: m.e4 + ((d.status >= 400 && d.status < 500) || d.status === 501 ? d.n : 0), e5: m.e5 + (d.status >= 500 && d.status !== 501 ? d.n : 0) });
  }
  return [...out.values()];
});};
const _brainmetrics_chartBase = function _chartBase() {return ((data, { width = 640, height = 200 } = {}) => ({
  width,
  height,
  marginLeft: 44,
  style: { background: "transparent", color: "var(--theme-foreground)", fontSize: "11px" },
  x: { type: "time", domain: [new Date(data.since), new Date(data.until)], label: null }
}));};
const _brainmetrics_requestsChart = function _requestsChart(rollup,Plot,chartBase) {return ((data, options = {}) => {
  const rows = rollup(data.series, ["t", "worker"]);
  return Plot.plot({
    ...chartBase(data, options),
    y: { label: "calls", grid: true },
    color: { legend: true },
    marks: [
      Plot.rectY(rows, Plot.stackY({ x1: (d) => new Date(d.t), x2: (d) => new Date(d.t + data.step), y: "n", fill: "worker", insetRight: 1, tip: true })),
      Plot.ruleY([0])
    ]
  });
});};
const _brainmetrics_latencyChart = function _latencyChart(rollup,Plot,chartBase) {return ((data, options = {}) => {
  const rows = rollup(data.series, ["t", "worker"]).map((d) => ({ ...d, at: new Date(d.t + data.step / 2), mean: d.ms / d.n }));
  return Plot.plot({
    ...chartBase(data, options),
    y: { label: "ms", grid: true, type: rows.some((d) => d.max > 2000) ? "sqrt" : "linear" },
    color: { legend: true },
    marks: [
      Plot.line(rows, { x: "at", y: "mean", z: "worker", stroke: "worker" }),
      Plot.dot(rows, { x: "at", y: "max", stroke: "worker", r: 1.5, tip: true }),
      Plot.ruleY([0])
    ]
  });
});};
const _brainmetrics_errorsChart = function _errorsChart(rollup,htl,Plot,chartBase) {return ((data, options = {}) => {
  const rows = rollup(data.series.filter((d) => d.status >= 400), ["t", "status"]).map((d) => ({ ...d, status: String(d.status) }));
  if (!rows.length) return htl.html\`<div style="color:var(--theme-foreground-muted)">None in this range.</div>\`;
  return Plot.plot({
    ...chartBase(data, options),
    y: { label: "calls", grid: true },
    color: { legend: true, type: "ordinal", scheme: "YlOrRd" },
    marks: [
      Plot.rectY(rows, Plot.stackY({ x1: (d) => new Date(d.t), x2: (d) => new Date(d.t + data.step), y: "n", fill: "status", insetRight: 1, tip: true })),
      Plot.ruleY([0])
    ]
  });
});};
const _brainmetrics_healthStrip = function _healthStrip(rollup,Plot,chartBase) {return ((data, options = {}) => {
  const rows = rollup(data.series, ["t", "worker"]).map((d) => ({ ...d, share: d.e5 / d.n }));
  const names = [...new Set(rows.map((d) => d.worker))].sort();
  return Plot.plot({
    ...chartBase(data, { ...options, height: 40 + 22 * Math.max(1, names.length) }),
    marginLeft: 130,
    y: { domain: names, label: null },
    color: { domain: [0, 1], range: ["#2e9e5b", "#e5484d"], legend: true, label: "share of calls that were faults", tickFormat: "%" },
    marks: [Plot.barX(rows, { x1: (d) => new Date(d.t), x2: (d) => new Date(d.t + data.step), y: "worker", fill: "share", insetRight: 1, title: (d) => \`\${d.worker}\\n\${d.n} calls, \${d.e5} failed\` })]
  });
});};
const _brainmetrics_methodTable = function _methodTable(Inputs,rollup) {return ((data) =>
  Inputs.table(
    rollup(data.series, ["worker", "version", "method"]).map((d) => ({ worker: d.worker, version: d.version, method: d.method, calls: d.n, refused: d.e4, faults: d.e5, "mean ms": Math.round(d.ms / d.n), "max ms": d.max })).sort((a, b) => b.calls - a.calls),
    { select: false, rows: 12, layout: "auto" }
  ));};
const _brainmetrics_errorTable = function _errorTable(htl,Inputs) {return ((data) => {
  const rows = data.errors.map((e) => ({ at: new Date(e.t), worker: e.worker, version: e.version || "", method: e.method, caller: e.caller, status: e.status, ms: e.ms }));
  if (!rows.length) return htl.html\`<div style="color:var(--theme-foreground-muted)">None in this range.</div>\`;
  const search = Inputs.search(rows, { placeholder: "worker, method, caller, status" });
  const box = htl.html\`<div></div>\`;
  const draw = () => box.replaceChildren(Inputs.table(search.value, { select: false, rows: 12, layout: "auto", format: { at: (d) => d.toISOString().slice(0, 19).replace("T", " ") } }));
  search.addEventListener("input", draw);
  draw();
  return htl.html\`<div>\${search}\${box}</div>\`;
});};
const _brainmetrics_dashboard = function _dashboard(htl) {return ((panels, { note = "" } = {}) => htl.html\`<div style="font:13px/1.45 var(--sans-serif, system-ui, sans-serif);color:var(--theme-foreground)">
  \${note ? htl.html\`<div style="color:var(--theme-foreground-muted);margin-bottom:8px">\${note}</div>\` : ""}
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px">
    \${panels.map((p) => htl.html\`<div style=\${\`border:1px solid var(--theme-foreground-faintest);border-radius:6px;padding:10px 12px;min-width:0;overflow:auto;\${p.wide ? "grid-column:1/-1;" : ""}\`}>
      <div style="font-weight:600;margin-bottom:6px">\${p.title}</div>\${p.body}</div>\`)}
  </div>
</div>\`);};
const _brainmetrics_sampleMetrics = function _sampleMetrics() {return (({ since = 0, until = 3600000, step = 60000 } = {}) => {
  const workers = [["brain-core", "inbox.list", 40, 0], ["brain-x-page", "/", 90, 0], ["brain-x-proxy", "proxy.fetch", 420, 0.06], ["brain-x-whatsapp", "/hooks/whatsapp", 120, 0]];
  const series = [], errors = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let t = Math.floor(since / step) * step; t < until; t += step)
    for (const [worker, method, ms, bad] of workers) {
      const n = Math.round(rnd() * 8);
      if (!n) continue;
      const failed = Math.min(n, Math.round(n * bad * 4 * rnd()));
      if (n - failed) series.push({ t, worker, version: "0123456789ab", method, caller: "owner", status: 200, n: n - failed, ms: Math.round((n - failed) * ms * (0.6 + rnd())), max: Math.round(ms * (1.5 + rnd())) });
      if (failed) {
        series.push({ t, worker, version: "0123456789ab", method, caller: "owner", status: 502, n: failed, ms: failed * ms * 3, max: ms * 4 });
        errors.push({ t, worker, method, caller: "owner", status: 502, ms: ms * 3 });
      }
    }
  return { since, until, step, batches: series.length, series, errors: errors.reverse() };
});};
const _brainmetrics_anon_be3d699220 = function _anonymous(md) {return (md\`## Tests\`);};
const _brainmetrics_test_metrics_record_and_query = async function _test_metrics_record_and_query(simulate,metrics_service,expect) {
  const sim = await simulate(metrics_service, { secrets: { BRAIN_KEY: "k" } });
  const X = "https://metrics.internal/xrpc/com.lopecode.brain.metrics.";
  const post = (body) => sim.fetch(X + "record", { method: "POST", headers: { "content-type": "application/json", "x-brain-caller": "worker:brain-core" }, body: JSON.stringify(body) });
  const T = Date.UTC(2026, 9, 6, 8, 0, 0);
  const bucket = (status, n, ms) => ({ worker: "brain-x-a", method: "a.go", caller: "owner", status, n, ms, max: ms });
  expect((await post({ nope: 1 })).status).toBe(400);
  await post({ from: T + 1000, to: T + 9000, buckets: [bucket(200, 2, 30)], errors: [] });
  await post({ from: T + 20000, to: T + 29000, buckets: [bucket(200, 1, 10), bucket(500, 1, 70)], errors: [{ t: T + 21000, worker: "brain-x-a", method: "a.go", caller: "owner", status: 500, ms: 70 }] });
  await post({ from: T + 400000, to: T + 409000, buckets: [bucket(200, 5, 50)], errors: [] });
  // Two batches share a 5-minute key; the third has its own.
  expect([...sim.rows.keys()].filter((k) => k.startsWith("b/"))).toEqual(["b/2026-10-06/08:00", "b/2026-10-06/08:05"]);
  const q = await (await sim.fetch(\`\${X}query?since=\${T}&until=\${T + 600000}&step=60000\`, { headers: { "x-brain-caller": "owner" } })).json();
  expect(q.batches).toBe(3);
  expect(q.series.map((s) => [s.t - T, s.status, s.n, s.ms])).toEqual([[0, 200, 3, 40], [0, 500, 1, 70], [360000, 200, 5, 50]]);
  expect(q.errors).toMatchObject([{ status: 500, ms: 70 }]);
  // Outside the range, nothing; more than 8 days, refused.
  expect((await (await sim.fetch(\`\${X}query?since=\${T + 3600000}&until=\${T + 7200000}\`)).json()).series).toEqual([]);
  expect((await sim.fetch(\`\${X}query?since=\${T}&until=\${T + 9 * 86400000}\`)).status).toBe(400);
  return q.series.length + " series rows";
};
const _brainmetrics_test_metrics_charts_draw = function _test_metrics_charts_draw(sampleMetrics,rollup,expect,d3,requestsChart,latencyChart,errorsChart,healthStrip,methodTable,dashboard) {
  const data = sampleMetrics({ since: 0, until: 3600000, step: 60000 });
  const totals = rollup(data.series, ["worker"]);
  expect(totals.map((t) => t.worker).sort()).toEqual(["brain-core", "brain-x-page", "brain-x-proxy", "brain-x-whatsapp"]);
  expect(d3.sum(totals, (t) => t.n)).toBe(d3.sum(data.series, (d) => d.n));
  // A chart with a legend is a figure holding more than one svg.
  const marks = (el, sel) => Math.max(...[el, ...el.querySelectorAll("svg")].map((n) => n.querySelectorAll(sel).length));
  expect(marks(requestsChart(data), "rect")).toBeGreaterThan(50);
  expect(marks(latencyChart(data), "path")).toBeGreaterThan(3);
  expect(marks(errorsChart(data), "rect")).toBeGreaterThan(0);
  expect(errorsChart({ ...data, series: [] }).textContent).toBe("None in this range.");
  expect(marks(healthStrip(data), "rect")).toBeGreaterThan(50);
  expect(methodTable(data).querySelectorAll("tbody tr").length).toBe(4);
  expect(dashboard([{ title: "a", body: "x" }, { title: "b", body: "y", wide: true }]).querySelectorAll("div[style*=border]").length).toBe(2);
  return "drawn";
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_brainmetrics_anon_b45833825f", null, ["md"], _brainmetrics_anon_b45833825f);  
  $def("_brainmetrics_metrics_service", "metrics_service", ["cloudflare","metricsApp"], _brainmetrics_metrics_service);  
  $def("_brainmetrics_metrics_announce", "metrics_announce", ["plugins","metrics_service","invalidation"], _brainmetrics_metrics_announce);  
  $def("_brainmetrics_metricsApp", "metricsApp", ["hono","rows"], _brainmetrics_metricsApp);  
  $def("_brainmetrics_anon_346f8359a8", null, ["md"], _brainmetrics_anon_346f8359a8);  
  $def("_brainmetrics_brainOrigin", "brainOrigin", ["location"], _brainmetrics_brainOrigin);  
  $def("_brainmetrics_metricsClient", "metricsClient", ["brainOrigin","xrpcClient"], _brainmetrics_metricsClient);  
  $def("_brainmetrics_viewof_metricsRange", "viewof metricsRange", ["Inputs"], _brainmetrics_viewof_metricsRange);  
  $def("_brainmetrics_metricsRange", "metricsRange", ["Generators","viewof metricsRange"], _brainmetrics_metricsRange);  
  $def("_brainmetrics_viewof_metricsRefresh", "viewof metricsRefresh", ["Inputs"], _brainmetrics_viewof_metricsRefresh);  
  $def("_brainmetrics_metricsRefresh", "metricsRefresh", ["Generators","viewof metricsRefresh"], _brainmetrics_metricsRefresh);  
  $def("_brainmetrics_metricsData", "metricsData", ["metricsRefresh","metricsRange","metricsClient","sampleMetrics"], _brainmetrics_metricsData);  
  $def("_brainmetrics_metricsBoard", "metricsBoard", ["dashboard","healthStrip","metricsData","width","requestsChart","latencyChart","errorsChart","methodTable","errorTable","d3"], _brainmetrics_metricsBoard);  
  $def("_brainmetrics_rollup", "rollup", [], _brainmetrics_rollup);  
  $def("_brainmetrics_chartBase", "chartBase", [], _brainmetrics_chartBase);  
  $def("_brainmetrics_requestsChart", "requestsChart", ["rollup","Plot","chartBase"], _brainmetrics_requestsChart);  
  $def("_brainmetrics_latencyChart", "latencyChart", ["rollup","Plot","chartBase"], _brainmetrics_latencyChart);  
  $def("_brainmetrics_errorsChart", "errorsChart", ["rollup","htl","Plot","chartBase"], _brainmetrics_errorsChart);  
  $def("_brainmetrics_healthStrip", "healthStrip", ["rollup","Plot","chartBase"], _brainmetrics_healthStrip);  
  $def("_brainmetrics_methodTable", "methodTable", ["Inputs","rollup"], _brainmetrics_methodTable);  
  $def("_brainmetrics_errorTable", "errorTable", ["htl","Inputs"], _brainmetrics_errorTable);  
  $def("_brainmetrics_dashboard", "dashboard", ["htl"], _brainmetrics_dashboard);  
  $def("_brainmetrics_sampleMetrics", "sampleMetrics", [], _brainmetrics_sampleMetrics);  
  $def("_brainmetrics_anon_be3d699220", null, ["md"], _brainmetrics_anon_be3d699220);  
  $def("_brainmetrics_test_metrics_record_and_query", "test_metrics_record_and_query", ["simulate","metrics_service","expect"], _brainmetrics_test_metrics_record_and_query);  
  $def("_brainmetrics_test_metrics_charts_draw", "test_metrics_charts_draw", ["sampleMetrics","rollup","expect","d3","requestsChart","latencyChart","errorsChart","healthStrip","methodTable","dashboard"], _brainmetrics_test_metrics_charts_draw);  
  main.define("module @tomlarkworthy/cloudflare-iac", async () => runtime.module((await import("/@tomlarkworthy/cloudflare-iac.js?v=4")).default));  
  main.define("cloudflare", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("cloudflare", _));  
  main.define("rows", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("rows", _));  
  main.define("hono", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("hono", _));  
  main.define("simulate", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("simulate", _));  
  main.define("module @tomlarkworthy/xrpc-client", async () => runtime.module((await import("/@tomlarkworthy/xrpc-client.js?v=4")).default));  
  main.define("xrpcClient", ["module @tomlarkworthy/xrpc-client", "@variable"], (_, v) => v.import("xrpcClient", _));  
  main.define("module @tomlarkworthy/plugin-registry", async () => runtime.module((await import("/@tomlarkworthy/plugin-registry.js?v=4")).default));  
  main.define("plugins", ["module @tomlarkworthy/plugin-registry", "@variable"], (_, v) => v.import("plugins", _));  
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));  
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));
  return main;
}` }, page: { module: "@tomlarkworthy/cloud-brain", cell: "page_service", hash: "c48244e07a2f2fc89ad615725b9367fbca4877280fbcde5e190df6c1f21345d4", source: '\nconst _cloudbrain_anon_2d66a42653 = function _anonymous(md) {return (md`# Cloud Brain`);};\nconst _cloudbrain_statusLine = function _statusLine(htl,session,brainOrigin) {\n  const box = (text, hue) => htl.html`<div style="padding:8px 12px;border-radius:6px;background:color-mix(in srgb, ${hue} 18%, var(--theme-background));color:var(--theme-foreground)">${text}</div>`;\n  if (session.local) return box("This is a local copy. It is not connected to a Brain. Use Clone below to make one in your Cloudflare account.", "#e6a700");\n  if (session.unreachable) return box("This Brain did not answer.", "#e5484d");\n  if (!session.signedIn) return box("Read-only. Sign in as the owner to use this Brain, or use Clone below to make your own.", "#e6a700");\n  if (!session.owner) return box(`Signed in as ${session.handle ? "@" + session.handle : session.did}. This Brain belongs to someone else, so you can read it, and use Clone below to make your own.`, "#e6a700");\n  return box(htl.html`Signed in as <b>${session.handle ? "@" + session.handle : session.did}</b>, the owner of ${new URL(brainOrigin).hostname}.`, "#2e9e5b");\n};\nconst _cloudbrain_signIn = function _signIn(brainOrigin,htl,session,press,location,Inputs) {\n  if (!brainOrigin) return htl.html``;\n  if (session.signedIn) {\n    return press("Sign out", async () => {\n      await fetch(brainOrigin + "/auth/logout", { method: "POST", credentials: "same-origin" });\n      location.reload();\n    });\n  }\n  // With submit, the value changes on the button or Enter, not on each key.\n  const handle = Inputs.text({ label: "atproto handle", placeholder: "your-handle.bsky.social", submit: "Sign in" });\n  handle.addEventListener("input", () => {\n    const h = handle.value.trim().replace(/^@/, "");\n    if (h) location.href = brainOrigin + "/auth/login?handle=" + encodeURIComponent(h);\n  });\n  return handle;\n};\nconst _cloudbrain_anon_8a5035967f = function _anonymous(md) {return (md`## Health`);};\nconst _cloudbrain_healthView = async function _healthView(assembled,client,session,sampleMetrics,dashboard,requestsChart,width,healthStrip,methodTable) {\n  assembled;\n  const until = Date.now(), ask = { since: until - 3600000, until, step: 60000 };\n  const data = !client || !session.owner\n    ? { ...sampleMetrics(ask), sample: true }\n    : await client.query("metrics.query", ask).catch((e) => ({ ...ask, series: [], errors: [], batches: 0, error: String((e && e.message) || e) }));\n  return dashboard([\n    { title: "Calls", body: requestsChart(data, { width: width - 40 }), wide: true },\n    { title: "Health", body: healthStrip(data, { width: width - 40 }), wide: true },\n    { title: "By method", body: methodTable(data), wide: true }\n  ], { note: data.sample ? "Sample data: sign in to a Brain to see its own." : data.error ? "metrics.query failed: " + data.error : "" });\n};\nconst _cloudbrain_anon_a22ac4e664 = function _anonymous(md) {return (md`## Operator`);};\nconst _cloudbrain_viewof_assistant = function _assistant(robocoop5,assistantPrompt,promptView,defaultWatches,assistantWatches,invalidation) {return (robocoop5({\n  group: "brain",\n  height: 420,\n  persist: true,\n  settings: true,\n  // The operator\'s brief leads; the prompt typed in the settings fold follows it.\n  system: () => assistantPrompt + "\\n\\n" + (promptView.value || ""),\n  watches: () => [...defaultWatches(), ...assistantWatches()],\n  invalidation\n}));};\nconst _cloudbrain_assistant = (G, _) => G.input(_);\nconst _cloudbrain_assistantLine = function _assistantLine(htl,brain,inboxPump) {return (htl.html`<div style="color:var(--theme-foreground-muted)">${\n  !brain ? "" : inboxPump.error ? "Inbox: " + inboxPump.error : inboxPump.answering ? "Answering messages in this tab." : "Standing by. Another tab is answering."\n}${brain && inboxPump.waiting ? ` ${inboxPump.waiting} waiting` : ""}</div>`);};\nconst _cloudbrain_anon_30d783050d = function _anonymous(md) {return (md`## Services`);};\nconst _cloudbrain_viewof_services = function _services(serviceList,declaredWorkers,brain) {return (serviceList({ services: declaredWorkers, brain }));};\nconst _cloudbrain_services = (G, _) => G.input(_);\nconst _cloudbrain_probation = async function _probation(assembled,brain,htl,invalidation,press,location) {\n  // Read after the page has run the tests and reported: a pass ends a probation.\n  assembled;\n  if (!brain) return htl.html``;\n  const s = await brain.state().catch(() => null);\n  if (!s) return htl.html``;\n  const short = (h) => String(h || "none").slice(0, 12);\n  const out = htl.html`<div></div>`;\n  for (const [name, k] of Object.entries(s.kernel)) {\n    if (k.state === "probation") {\n      const left = htl.html`<b></b>`;\n      const tick = () => {\n        const ms = Math.max(0, k.deadline - Date.now());\n        left.textContent = `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;\n      };\n      tick();\n      const timer = setInterval(tick, 1000);\n      invalidation.then(() => clearInterval(timer));\n      const keep = press("Keep this version", async () => {\n        await brain.confirm();\n        location.reload();\n      });\n      out.append(htl.html`<div style="padding:8px 12px;margin:4px 0;border-radius:6px;background:color-mix(in srgb, #e6a700 20%, var(--theme-background))"><b>${name}</b> <code>${short(k.hash)}</code> is live on probation. Confirm within ${left} or it is rolled back. ${keep}</div>`);\n    } else if (k.state === "rolled-back")\n      out.append(htl.html`<div style="padding:8px 12px;margin:4px 0;border-radius:6px;background:color-mix(in srgb, #e5484d 18%, var(--theme-background))"><b>${name}</b> <code>${short(k.failedHash)}</code> was rolled back to <code>${short(k.hash)}</code> at ${new Date(k.at).toLocaleTimeString()}: ${k.reason}</div>`);\n  }\n  return out;\n};\nconst _cloudbrain_anon_d98158477c = function _anonymous(md) {return (md`## Library\n\nNotebooks this Brain keeps and serves at \\`/library/<name>\\`, from \\`library.list\\`. Reference: \\`@tomlarkworthy/brain-library\\`; the files are in \\`@tomlarkworthy/brain-static\\`.`);};\nconst _cloudbrain_libraryView = function _libraryView(libraryPanel,client,brainOrigin,session,brain,notebookHtml) {return (libraryPanel({ client, origin: brainOrigin, owner: !!(session && session.owner), current: brain ? { name: "cloud-brain", html: notebookHtml } : null }));};\nconst _cloudbrain_anon_dd39820a85 = function _anonymous(md) {return (md`## Access\n\nA **token** is for a caller with no session, such as a script. A **grant** lets another atproto account call this Brain through its own PDS. Each names the methods it may call; neither can deploy, read a secret or give access.`);};\nconst _cloudbrain_accessPanel = async function _accessPanel(brain,htl,field,press,client) {\n  if (!brain) return htl.html`<i style="color:var(--theme-foreground-muted)">Sign in as the owner to see access.</i>`;\n  const list = htl.html`<div></div>`, note = htl.html`<div style="color:var(--theme-foreground-muted);margin-top:6px;word-break:break-all"></div>`;\n  const who = field("token name, or a DID to grant", { width: "18em" });\n  const methods = field("methods, e.g. proxy.fetch inbox.list", { width: "20em" });\n  const short = (ms) => ms.map((m) => m.replace("com.lopecode.brain.", "")).join(", ");\n  const remove = (label, fn) => {\n    return press(label, async () => (await fn(), draw()));\n  };\n  const draw = async () => {\n    const [{ tokens }, { grants }] = await Promise.all([client.query("token.list"), client.query("grant.list")]);\n    list.replaceChildren(htl.html`<table style="border-collapse:collapse;margin:0">\n      ${tokens.map((t) => htl.html`<tr><td style="padding:2px 12px 2px 0">token <b>${t.name}</b></td><td style="padding:2px 12px">${short(t.methods)}</td><td style="padding:2px 12px;color:var(--theme-foreground-muted)">created ${new Date(t.created).toISOString().slice(0, 10)}</td><td>${remove("Revoke", () => client.procedure("token.revoke", { name: t.name }))}</td></tr>`)}\n      ${grants.map((g) => htl.html`<tr><td style="padding:2px 12px 2px 0">${g.did}</td><td style="padding:2px 12px">${short(g.methods)}</td><td style="padding:2px 12px;color:var(--theme-foreground-muted)">granted ${new Date(g.granted).toISOString().slice(0, 10)}</td><td>${remove("Remove", () => client.procedure("grant.delete", { did: g.did }))}</td></tr>`)}\n      ${tokens.length + grants.length ? "" : htl.html`<tr><td style="color:var(--theme-foreground-muted)">No tokens or grants.</td></tr>`}\n    </table>`);\n  };\n  const names = () => methods.value.split(/[\\s,]+/).filter(Boolean);\n  const token = press("New token", async () => {\n    try {\n      const made = await client.procedure("token.create", { name: who.value.trim(), methods: names() });\n      note.replaceChildren(htl.html`Copy this token now. It is not shown again.<br><code>${made.token}</code>`);\n      await draw();\n    } catch (e) {\n      note.textContent = "No token: " + e.message;\n    }\n  });\n  const grant = press("Grant access", async () => {\n    try {\n      await client.procedure("grant.put", { did: who.value.trim(), methods: names() });\n      note.textContent = "Granted.";\n      await draw();\n    } catch (e) {\n      note.textContent = "Not granted: " + e.message;\n    }\n  });\n  await draw();\n  return htl.html`<div>${list}<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">${who}${methods}${token}${grant}</div>${note}</div>`;\n};\nconst _cloudbrain_anon_3d35a64e93 = function _anonymous(md) {return (md`## Clone\n\nCloning makes a new Brain in your own Cloudflare account from the code in this notebook: the guard, which holds the API token and is the only thing that can deploy; the core, which holds the data; and the kernel, which serves this notebook and checks who is calling. It copies no data: secrets, rows, the inbox, tokens and saved sessions stay on the Brain they are on. Other services are added afterwards with Apply.\n\nFill in the form on this page, whoever\'s Brain it is. **Download this notebook** gives the same page as a file, which installs the same way when opened from disk.`);};\nconst _cloudbrain_installPanel = function _installPanel(field,htl,press,seedSource,notebookHtml,installBrain) {\n  const seed = field("https://NAME.SUBDOMAIN.workers.dev  (the seed Worker\'s address)", { width: "34em" });\n  const token = field("Cloudflare API token", { secret: true, width: "34em" });\n  const handle = field("your atproto handle, e.g. alice.bsky.social", { width: "34em" });\n  const name = field("brain", { width: "34em" });\n  const note = htl.html`<div style="margin-top:8px"></div>`;\n  const copy = press("Copy the seed", (b) => navigator.clipboard.writeText(seedSource).then(() => (b.textContent = "Copied")));\n  const download = press("Download this notebook", async (b) => {\n    b.disabled = true;\n    const a = htl.html`<a download="cloud-brain.html">`;\n    a.href = URL.createObjectURL(new Blob([await notebookHtml()], { type: "text/html" }));\n    a.click();\n    setTimeout(() => URL.revokeObjectURL(a.href), 60000);\n    b.disabled = false;\n  });\n  const go = press("Clone into my account", async (b) => {\n    b.disabled = true;\n    try {\n      const out = await installBrain({ seed: seed.value.trim(), token: token.value.trim(), handle: handle.value.trim(), base: name.value.trim() || "brain", log: (t) => (note.textContent = t) });\n      token.value = "";\n      note.replaceChildren(htl.html`<div style="padding:10px 12px;border-radius:6px;background:color-mix(in srgb, #2e9e5b 18%, var(--theme-background))">\n        Installed. Your Brain is at <a href=${out.url} target="_blank" rel="noopener">${out.url}</a>. Sign in there as ${handle.value.trim()}.<br>\n        ${out.seedDeleted ? "The seed Worker was deleted." : htl.html`<b style="color:#e5484d">The seed Worker ${out.seedName} could not be deleted. Delete it in the Cloudflare dashboard now.</b>`}<br><br>\n        <b>Recovery key</b>, shown once. It opens the <a href=${out.guardUrl} target="_blank" rel="noopener">guard page</a>, where a deploy is approved or rolled back when the Brain itself is broken:<br>\n        <code style="word-break:break-all;user-select:all">${out.recoveryKey}</code>\n      </div>`);\n    } catch (e) {\n      note.replaceChildren(htl.html`<span style="color:#e5484d">Not installed: ${e.message}</span>`);\n      b.disabled = false;\n    }\n  });\n  const row = (label, el) => htl.html`<div style="display:block;margin:6px 0"><div style="font-size:12px;color:var(--theme-foreground-muted)">${label}</div>${el}</div>`;\n  return htl.html`<div style="font:14px/1.45 var(--sans-serif, system-ui, sans-serif)">\n    <ol style="padding-left:1.2em;max-width:44em">\n      <li>In the Cloudflare dashboard, create a Worker, replace its code with the seed, and deploy it. ${copy}\n        <details><summary style="cursor:pointer;color:var(--theme-foreground-muted)">the seed, ${seedSource.split("\\n").length - 1} lines</summary><pre style="font-size:11px;overflow:auto;max-height:16em">${seedSource}</pre></details></li>\n      <li>Create an API token for the account that can edit Workers scripts and R2 buckets.</li>\n      <li>Fill these in. The token goes to the seed, which is in your account, and to the guard this installs; it is not stored in this notebook.</li>\n    </ol>\n    ${row("Seed Worker address", seed)}${row("API token", token)}${row("Owner", handle)}${row("Name: the Brain is NAME.SUBDOMAIN.workers.dev", name)}\n    <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">${go}${download}</div>${note}\n  </div>`;\n};\nconst _cloudbrain_brainOrigin = function _brainOrigin(location) {return (location.protocol === "https:" && !/observableusercontent\\.com$|^localhost$/.test(location.hostname) ? location.origin : null);};\nconst _cloudbrain_session = function _session(brainOrigin) {return (brainOrigin\n  ? fetch(brainOrigin + "/auth/session", { credentials: "same-origin" }).then((r) => r.json()).catch(() => ({ signedIn: false, unreachable: true }))\n  : { signedIn: false, local: true });};\nconst _cloudbrain_client = function _client(brainOrigin,xrpcClient) {return (brainOrigin ? xrpcClient(brainOrigin, { namespace: "com.lopecode.brain" }) : null);};\nconst _cloudbrain_brain = function _brain(session,brainOrigin,client,fromBrain,verifyService) {return (session.owner\n  ? {\n      guardUrl: brainOrigin.replace(/^https:\\/\\/([^.]+)/, "https://$1-guard"),\n      state: () => client.query("infra.getState"),\n      info: (worker) => client.query("getInfo", { worker }),\n      registry: async () => (await client.query("service.list")).services,\n      asDeployed: (emitted) => {\n        const l = fromBrain[emitted.meta.module];\n        return l && emitted.source && emitted.source.text === l.baseline ? l.hash : null;\n      },\n      // A deploy is not finished when the guard says deployed: the page then loads the module back from the Worker,\n      // runs its tests and tells the core, which marks the version verified or has the guard put the old one back.\n      apply: async (emitted, { force = false } = {}) => {\n        const out = await client.procedure("infra.apply", { workers: [{ parts: emitted.parts, meta: emitted.meta, hash: emitted.hash, force }] });\n        for (const r of out.results) if (r.state === "deployed" || r.state === "probation") r.verdict = await verifyService(r.worker, { expect: r.hash }).catch((e) => ({ state: "not verified", reason: String((e && e.message) || e) }));\n        return out;\n      },\n      confirm: () => client.procedure("infra.confirm", {})\n    }\n  : null);};\nconst _cloudbrain_page_service = function _page_service(cloudflare,assets,Request) {return (cloudflare.Worker("page", () => assets.fetch(new Request("https://assets.internal/")), { paths: [{ path: "/", who: "anyone" }] }));};\nconst _cloudbrain_page_announce = function _page_announce(plugins,page_service,invalidation) {\n  plugins.add("workers", page_service, { invalidation });\n  return "announced page_service";\n};\nconst _cloudbrain_test_an_imported_service_names_the_module_it_is_written_in = async function _test_an_imported_service_names_the_module_it_is_written_in(core_service,kernel_service,guard_service,expect) {\n  const modules = [];\n  for (const s of [core_service, kernel_service, guard_service]) modules.push((await s.emit()).meta.module);\n  expect(modules).toEqual(["@tomlarkworthy/brain-core", "@tomlarkworthy/brain-kernel", "@tomlarkworthy/brain-guard"]);\n  return modules.join(", ");\n};\nconst _cloudbrain_test_the_page_is_a_service = async function _test_the_page_is_a_service(page_service,expect,simulate,Response) {\n  const { meta } = await page_service.emit();\n  expect(meta).toMatchObject({ worker: "brain-x-page", role: "recipe", module: "@tomlarkworthy/cloud-brain", resources: ["assets"], paths: [{ path: "/", who: "anyone" }] });\n  const sim = await simulate(page_service, { assets: async () => new Response("<html>the notebook</html>") });\n  expect(await (await sim.fetch("https://page.internal/")).text()).toBe("<html>the notebook</html>");\n  return meta.worker;\n};\nconst _cloudbrain_fromBrain = function _fromBrain() {return ({});};\nconst _cloudbrain_applySource = function _applySource(jbApply,runtime,probeDefine,createModule) {return (async (module, text) => {\n  const url = URL.createObjectURL(new Blob([text], { type: "text/javascript" }));\n  try {\n    const { default: define } = await import(url);\n    return jbApply({ currentModules: new Map(), runtime, probeDefine, createModule })(module, define);\n  } finally {\n    URL.revokeObjectURL(url);\n  }\n});};\nconst _cloudbrain_loadService = function _loadService(client,exportModuleJS,applySource,runtime,fromBrain) {return (async (worker, { expect = null } = {}) => {\n  let s = await client.query("getSource", { worker });\n  // A new version takes some seconds to reach every place Cloudflare answers from (seen 2026-10-06: the version\n  // before answered 20 s after a deploy). Ask again until the Worker is the one the registry names.\n  for (let i = 0; expect && s && s.hash !== expect && i < 20; i++) {\n    await new Promise((r) => setTimeout(r, 1500));\n    s = await client.query("getSource", { worker });\n  }\n  if (!s || !s.module || !s.text) return { worker, state: "no source" };\n  const here = await exportModuleJS(s.module).then((m) => m.source, () => null);\n  let state = "same";\n  if (here !== s.text) {\n    const out = await applySource(s.module, s.text);\n    state = here === null ? "added" : "replaced";\n    if (out && out.applied === false) return { worker, module: s.module, state: "not applied", reason: out.reason };\n  }\n  // A module nobody is looking at computes nothing: ask for the cells that announce its services.\n  const mod = runtime.mains.get(s.module) || [...runtime._variables].find((v) => v._name === "module " + s.module)?._value;\n  if (mod) for (const v of [...runtime._variables]) if (v._module === mod && /_announce$/.test(v._name || "")) await mod.value(v._name).catch(() => null);\n  fromBrain[s.module] = { worker, hash: s.hash, baseline: (await exportModuleJS(s.module)).source };\n  return { worker, module: s.module, hash: s.hash, state };\n});};\nconst _cloudbrain_verifyService = function _verifyService(loadService,runtime,client,session) {return (async (worker, { report = true, expect = null } = {}) => {\n  const loaded = await loadService(worker, { expect });\n  if (!loaded.module) return { worker, state: "no source" };\n  if (loaded.state === "not applied") return { worker, state: "not verified", reason: loaded.reason };\n  const mod = runtime.mains.get(loaded.module) || [...runtime._variables].find((v) => v._name === "module " + loaded.module)?._value;\n  const names = [...runtime._variables].filter((v) => v._module === mod && /^test_/.test(v._name || "")).map((v) => v._name);\n  const tests = [];\n  for (const name of names) {\n    try {\n      await Promise.race([mod.value(name), new Promise((_, no) => setTimeout(() => no(new Error("no result in 30 s")), 30000))]);\n      tests.push({ name, ok: true });\n    } catch (e) {\n      tests.push({ name, ok: false, message: String((e && e.message) || e).slice(0, 300) });\n    }\n  }\n  // What the Worker says it is running has to be what was loaded and tested.\n  const info = await client.query("getInfo", { worker }).catch(() => null);\n  if (!info || info.hash !== loaded.hash) tests.push({ name: "the Worker reports the hash that was loaded", ok: false, message: `loaded ${String(loaded.hash).slice(0, 12)}, running ${String(info && info.hash).slice(0, 12)}` });\n  const failed = tests.filter((x) => !x.ok);\n  const result = { worker, module: loaded.module, hash: loaded.hash, ok: failed.length === 0, tests: tests.length, failed };\n  if (!report || !session.owner) return result;\n  // The core is a Worker too: straight after its own deploy the version before may answer, and not know this hash.\n  const send = () => client.procedure("deploy.report", { worker, hash: loaded.hash, ok: result.ok, tests, reason: failed.map((f) => `${f.name}: ${f.message}`).join("; ") });\n  let said = null;\n  for (let i = 0; !said; i++) {\n    try {\n      said = await send();\n    } catch (e) {\n      if (i >= 8 || !/is not running/.test(String(e && e.message))) throw e;\n      await new Promise((r) => setTimeout(r, 2000));\n    }\n  }\n  return { ...result, state: said.state, previous: said.previous || null };\n});};\nconst _cloudbrain_assembled = async function _assembled(client,session,verifyService,loadService) {\n  if (!client) return [];\n  const { services: registry } = await client.query("service.list").catch(() => ({ services: [] }));\n  const out = [];\n  for (const r of registry) {\n    try {\n      out.push(session.owner ? await verifyService(r.worker, { expect: r.hash }) : await loadService(r.worker, { expect: r.hash }));\n    } catch (e) {\n      out.push({ worker: r.worker, state: "not loaded", reason: String((e && e.message) || e) });\n    }\n  }\n  return out;\n};\nconst _cloudbrain_assembledRefresh = function _assembledRefresh($0,assembled,brain) {\n  $0.tests = Object.fromEntries(assembled.map((a) => [a.worker, a.tests != null ? `${a.tests - a.failed.length}/${a.tests}${a.failed.length ? ": " + a.failed.map((f) => f.name).join(", ") : ""}` : a.state === "not loaded" || a.reason ? `${a.state}: ${a.reason || ""}` : ""]));\n  if (!brain) return "no owner session";\n  $0.refresh();\n  return "refreshed";\n};\nconst _cloudbrain_platformWiring = function _platformWiring(brain,backend,client,brainOrigin) {\n  if (!brain) return "platform cells are in memory: no owner session";\n  backend.use({\n    secret: async (name) => (await client.query("secret.get", { name })).value,\n    rowsGet: async (key) => (await client.query("rows.get", { worker: "tab", key })).value,\n    rowsPut: async (key, value) => (await client.procedure("rows.put", { worker: "tab", key, value })).ok,\n    rowsDelete: async (key) => (await client.procedure("rows.delete", { worker: "tab", key })).deleted,\n    rowsList: async (prefix = "") => (await client.query("rows.list", { worker: "tab", prefix })).rows,\n    xrpc: (kind, nsid, data) => (kind === "query" ? client.query(nsid, data) : client.procedure(nsid, data)),\n    deploy: (emitted) => brain.apply(emitted)\n  });\n  return "platform cells use " + brainOrigin;\n};\nconst _cloudbrain_field = function _field(Inputs) {return ((placeholder, { secret = false, width = "20em" } = {}) =>\n  (secret ? Inputs.password : Inputs.text)({ placeholder, width, autocomplete: "off" }));};\nconst _cloudbrain_press = function _press(Inputs) {return ((label, fn) => {\n  const b = Inputs.button(label, { reduce: () => void fn(b.querySelector("button")) });\n  return b;\n});};\nconst _cloudbrain_inboxHandlers = function _inboxHandlers(plugins) {return (plugins.get("inbox"));};\nconst _cloudbrain_inboxPump = async function* _inboxPump(brain,invalidation,client,inboxHandlers) {\n  if (!brain) return yield { answering: false, waiting: null, reason: "no owner session" };\n  const tab = Math.random().toString(36).slice(2, 10);\n  let stopped = false, status = { answering: false, waiting: 0, tab };\n  invalidation.then(() => {\n    stopped = true;\n    client.procedure("lease.take", { tab, release: true }).catch(() => null);\n  });\n  yield status;\n  while (!stopped) {\n    try {\n      if (document.visibilityState === "visible") {\n        const turn = await client.procedure("inbox.poll", { tab });\n        let left = turn.waiting;\n        for (const entry of turn.entries) {\n          const handlers = inboxHandlers.filter((h) => h.source === entry.source);\n          if (!handlers.length) continue;\n          for (const h of handlers) await h.handle(entry);\n          await client.procedure("inbox.done", { id: entry.id });\n          left--;\n        }\n        const next = { answering: turn.held, waiting: turn.held ? left : status.waiting, tab };\n        if (next.answering !== status.answering || next.waiting !== status.waiting) yield (status = next);\n      } else if (status.answering) yield (status = { ...status, answering: false });\n    } catch (e) {\n      if (status.error !== e.message) yield (status = { ...status, answering: false, error: e.message });\n    }\n    // One call a turn. The rows it reads are in D1, which bills nothing between calls.\n    await new Promise((r) => setTimeout(r, 5000));\n  }\n};\nconst _cloudbrain_guardInbox = function _guardInbox(plugins,$0,invalidation) {\n  plugins.add("inbox", { source: "guard", handle: async () => $0.refresh() }, { invalidation });\n  return "handles inbox entries from the guard";\n};\nconst _cloudbrain_assistantPrompt = function _assistantPrompt(brainOrigin) {return (`You are the operator of a Cloud Brain: the Cloudflare Workers deployed from this notebook\'s cells${brainOrigin ? ", at " + brainOrigin : ""}. Your job is to keep that infrastructure running for its owner and to change it when asked. You also happen to run inside the notebook that is its source, which is how you change it; the notebook is the means, not the subject.\n\nHow to work:\n- Start from what is running. Each step you are shown "brain", a one-line state of every Worker, probation, held deploys and the inbox. Call brain_status for the detail. Answer a question about the Brain from brain_status, brain_services or brain_call, not by reading source: source says what would be deployed, not what is.\n- Lead an answer with the state and what you did, in the owner\'s terms (which Worker, which version, is it serving). Leave cell names and notebook mechanics out unless asked.\n- Say so unprompted when something needs the owner: a Worker failing or put back, a version on probation that nobody has kept, a deploy waiting for approval, a secret a service names that is not set, messages waiting.\n- To change or add a service: read /content/@tomlarkworthy/markdown-wiki/running-a-cloud-brain.md, edit its cells, see its tests pass, brain_apply it, then check brain_status until it is serving or was put back, and report which. Prove a new or changed service from outside, with a real call, before you say it works. A kernel or core update is on probation until the owner presses Keep this version; tell them.\n- A deploy that comes back waiting is held for the owner\'s approval on the guard page. Say so, and after they approve, brain_apply it again: approval does not deploy.\n- A Worker in state "no source" was deployed before Workers carried their source. Tell the owner; do not rebuild it from memory unless asked.\n- A deploy carries the module\'s source: every Worker serves the module it was made from, and this page loads it from there. After brain_apply the module is loaded back from the Worker, its test_ cells are run and the result goes to the core; the tool\'s result has it as "verdict". verified: done. put-back: the tests failed and the version before is running again; fix and apply again. A service needs tests for this to mean anything, so write them.\n- You cannot read a secret\'s value, give access, approve a deploy or roll back. Those are the owner\'s on the page and the guard page; say which.\n- A turn that begins "WhatsApp message from the owner" came from the owner\'s phone: answer it with brain_call, method whatsapp.send, because text written here is not seen there. Keep such answers short.\n- A request that is only about notebooks, with nothing to do with this Brain, you still do, as any notebook assistant would.`);};\nconst _cloudbrain_inboxNow = function _inboxNow() {return ({});};\nconst _cloudbrain_inboxMirror = function _inboxMirror(inboxNow,inboxPump) {return (Object.assign(inboxNow, { error: null }, inboxPump));};\nconst _cloudbrain_brainSummary = function _brainSummary(brain,$0,inboxNow) {return (() => {\n  if (!brain) return "not signed in as the owner: the Brain\'s tools are refused";\n  const rows = $0.value || [];\n  const odd = rows.filter((r) => r.state !== "in sync" || r.note);\n  const parts = [\n    rows.length ? `${rows.length} Workers, ${rows.length - odd.length} in sync` : "Services not read yet",\n    ...odd.map((r) => `${r.worker}: ${r.state}${r.note ? " (" + r.note + ")" : ""}`)\n  ];\n  if (inboxNow.waiting) parts.push(`${inboxNow.waiting} inbox entries waiting`);\n  if (inboxNow.error) parts.push("inbox: " + inboxNow.error);\n  if (inboxNow.answering === false) parts.push("another tab holds the inbox");\n  return parts.join("; ");\n});};\nconst _cloudbrain_assistantWatches = function _assistantWatches(brainSummary) {return (() => [{ label: "brain", read: () => brainSummary() }]);};\nconst _cloudbrain_assistantRule = function _assistantRule(registerRule,invalidation,unregisterRule) {\n  const rule = { id: "cloud-brain", hook: "prompt", order: 95, always: true, check: () => "You are operating a Cloud Brain. What is running comes from brain_status, not from source. Before changing or deploying a service read /content/@tomlarkworthy/markdown-wiki/running-a-cloud-brain.md. A deploy is finished when its verdict is verified." };\n  registerRule(rule);\n  invalidation.then(() => unregisterRule(rule));\n  return "prompt section registered";\n};\nconst _cloudbrain_assistantRefuses = function _assistantRefuses() {return ((method) => /^(com\\.lopecode\\.brain\\.)?(secret\\.get|secret\\.read|token\\.|grant\\.|rule\\.put|rule\\.delete|infra\\.|service\\.|lease\\.|inbox\\.poll)/.test(method));};\nconst _cloudbrain_assistantTools = function _assistantTools(brain,defineTool,$0,client,brainOrigin,assistantRefuses,declaredWorkers,registerTool,invalidation,unregisterTool) {\n  const need = () => {\n    if (!brain) throw new Error("No owner session: this notebook is not signed in to a Brain.");\n  };\n  const tools = [\n    defineTool({\n      id: "brain_services",\n      description: "List the Cloud Brain\'s declared services: Worker name, methods, paths, secrets, the hash this notebook would deploy, the hash running, and the state (in sync, changed, not installed, skewed, failing, cannot deploy).",\n      parameters: { type: "object", properties: {} },\n      execute: async () => {\n        need();\n        await $0.refresh();\n        return { title: "services", output: JSON.stringify($0.value, null, 1) };\n      }\n    }),\n    defineTool({\n      id: "brain_status",\n      description: "The Cloud Brain\'s state in one call: every Worker with the version running and whether it is healthy, kernel and core probation with the deadline, deploys held for approval, when the guard\'s clock last ran, secrets a service names that are not set, and inbox entries waiting. Call this first for any question about what is running.",\n      parameters: { type: "object", properties: {} },\n      execute: async () => {\n        need();\n        const [state, secretList, inbox] = await Promise.all([\n          brain.state(),\n          client.query("secret.list").catch((e) => ({ error: e.message })),\n          client.query("inbox.list").catch((e) => ({ error: e.message }))\n        ]);\n        await $0.refresh();\n        const rows = $0.value || [];\n        const set = new Set((secretList.secrets || []).map((s) => s.name));\n        const out = {\n          brain: brainOrigin,\n          approvalNeeded: state.approval,\n          guardClock: state.tick ? { secondsAgo: Math.round((Date.now() - state.tick.at) / 1000), error: state.tick.error || null } : "never ran",\n          workers: rows.map((r) => ({ worker: r.worker, state: r.state, note: r.note || null, running: r.running ? String(r.running).slice(0, 12) : null, notebook: r.hash ? String(r.hash).slice(0, 12) : null })),\n          probation: Object.fromEntries(Object.entries(state.kernel || {}).map(([k, v]) => [k, { state: v.state, reason: v.reason || null, secondsLeft: v.deadline ? Math.max(0, Math.round((v.deadline - Date.now()) / 1000)) : null }])),\n          heldForApproval: (state.pending || []).map((p) => ({ worker: p.worker, hash: String(p.hash).slice(0, 12) })),\n          secretsNotSet: [...new Set(rows.flatMap((r) => r.secrets || []))].filter((n) => !/^(BRAIN_|CF_|COOKIE_KEY$|RECOVERY_KEY$)/.test(n) && !set.has(n)),\n          inboxWaiting: inbox.error ? inbox.error : (inbox.entries || []).filter((e) => !e.done).length\n        };\n        return { title: "brain status", output: JSON.stringify(out, null, 1) };\n      }\n    }),\n    defineTool({\n      id: "brain_call",\n      description: "Call one XRPC method of the Cloud Brain as its owner. method is short (inbox.list, whatsapp.send, secret.list, library.list, getInfo) or a full NSID. kind is query (GET, input becomes the query string) or procedure (POST, input is the JSON body).",\n      parameters: {\n        type: "object",\n        properties: { method: { type: "string" }, kind: { type: "string", enum: ["query", "procedure"] }, input: { type: "object" } },\n        required: ["method", "kind"]\n      },\n      execute: async ({ method, kind, input }) => {\n        need();\n        if (assistantRefuses(method)) throw new Error(`${method} is not available to the operator. The owner does this on the page.`);\n        const out = kind === "query" ? await client.query(method, input) : await client.procedure(method, input);\n        return { title: method, output: (typeof out === "string" ? out : JSON.stringify(out, null, 1)).slice(0, 20000) };\n      }\n    }),\n    defineTool({\n      id: "brain_apply",\n      description: "Ask the guard to deploy one declared service as it is in this notebook now. worker is its Worker name from brain_services, e.g. brain-x-echo. Returns deployed, probation, waiting (the owner must approve on the guard page), refused or put-back with the reason.",\n      parameters: { type: "object", properties: { worker: { type: "string" } }, required: ["worker"] },\n      execute: async ({ worker }) => {\n        need();\n        const emitted = (await Promise.all(declaredWorkers.map((s) => s.emit().catch((e) => ({ error: String(e.message || e), name: s.name }))))).find((e) => e.meta && e.meta.worker === worker);\n        if (!emitted) throw new Error(`No declared service deploys as ${worker}. brain_services lists them.`);\n        const out = await brain.apply(emitted);\n        $0.refresh();\n        return { title: "apply " + worker, output: JSON.stringify(out.results, null, 1) };\n      }\n    })\n  ];\n  tools.forEach((t) => registerTool(t));\n  invalidation.then(() => tools.forEach((t) => unregisterTool(t.id, t)));\n  return tools.map((t) => t.id);\n};\nconst _cloudbrain_whatsappInbox = function _whatsappInbox($0,KeyboardEvent,plugins,invalidation) {\n  const hand = async (entry) => {\n    // The settings fold has text boxes of its own; the chat\'s input is the one outside it.\n    const box = [...$0.querySelectorAll("textarea")].find((el) => !el.closest(".rc5-settings"));\n    if (!box) throw new Error("the operator has no input");\n    box.value = `WhatsApp message from the owner: ${JSON.stringify(entry.body.text)}`;\n    box.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));\n  };\n  plugins.add("inbox", { source: "whatsapp", handle: hand }, { invalidation });\n  return "hands WhatsApp messages to the operator";\n};\nconst _cloudbrain_test_assistant_refuses_owner_only_methods = function _test_assistant_refuses_owner_only_methods(expect,assistantRefuses) {\n  expect(["secret.get", "com.lopecode.brain.secret.get", "token.create", "grant.put", "infra.apply", "lease.take", "service.register"].map(assistantRefuses)).toEqual(Array(7).fill(true));\n  expect(["secret.list", "inbox.list", "whatsapp.send", "getInfo", "library.list"].map(assistantRefuses)).toEqual(Array(5).fill(false));\n  return "7 refused, 5 allowed";\n};\nconst _cloudbrain_notebookHtml = function _notebookHtml(location,exportToHTML,runtime) {return (async () => {\n  // The layout is kept; a pairing token and other one-time parameters are not.\n  const drop = new Set(["cc", "open", "close", "filesync", "from", "focus"]);\n  const kept = String(location.hash || "").replace(/^#/, "").split("&").filter(Boolean).filter((p) => !drop.has(p.split("=")[0]));\n  // No prerender: it bakes the open panes into the page as HTML, links carrying this tab\'s pairing token among them.\n  return (await exportToHTML({ mains: new Map(runtime.mains), runtime, options: { hash: kept.length ? "#" + kept.join("&") : "", prerender: false } })).source;\n});};\nconst _cloudbrain_installBrain = function _installBrain(guard_service,FormData,core_service,kernel_service,page_service,notebookHtml) {return (async ({ seed, token, handle, base = "brain", html = null, log = () => {}, fetch: send = (...a) => fetch(...a), wait = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) => {\n  const seedUrl = new URL(seed);\n  if (!/^[a-z][a-z0-9-]{1,30}$/.test(base)) throw new Error("the name is lower-case letters, digits and dashes");\n  const hex = (n = 32) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");\n  // Every Cloudflare call goes to the seed, which forwards it. The token is sent nowhere else.\n  const api = async (path, init = {}) => {\n    const r = await send(seedUrl.origin + "/client/v4" + path, { ...init, headers: { authorization: "Bearer " + token, ...(init.headers || {}) } });\n    const j = await r.json().catch(() => ({}));\n    if (!r.ok || j.success === false) throw new Error(`Cloudflare ${init.method || "GET"} ${path.replace(/[0-9a-f]{32}/, "ACCOUNT")}: ${r.status} ${JSON.stringify(j.errors || j).slice(0, 300)}`);\n    return j.result;\n  };\n  const json = { "content-type": "application/json" };\n\n  log("finding the account…");\n  const account = (await api("/accounts"))[0].id;\n  const subdomain = (await api(`/accounts/${account}/workers/subdomain`)).subdomain;\n  log("resolving " + handle + "…");\n  const did = /^did:/.test(handle)\n    ? handle\n    : (await (await send("https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=" + encodeURIComponent(handle.replace(/^@/, "")))).json()).did;\n  if (!/^did:(plc|web):/.test(did || "")) throw new Error("could not resolve the handle " + handle);\n  const guardName = base + "-guard";\n  const S = `/accounts/${account}/workers/scripts/${guardName}`;\n  if (await api(S + "/settings").then(() => true, () => false)) throw new Error(`${guardName} already exists in this account. Choose another name, or use its guard page.`);\n\n  log("uploading the guard…");\n  const recoveryKey = hex(), guardEmit = await guard_service.emit();\n  const metadata = {\n    main_module: "worker.js",\n    compatibility_date: "2026-10-01",\n    compatibility_flags: guardEmit.meta.flags,\n    migrations: { new_tag: "v1", new_sqlite_classes: ["Rows"] },\n    bindings: [\n      { type: "secret_text", name: "CF_API_TOKEN", text: token },\n      { type: "secret_text", name: "RECOVERY_KEY", text: recoveryKey },\n      { type: "secret_text", name: "BRAIN_KEY", text: hex() },\n      { type: "durable_object_namespace", name: "ROWS", class_name: "Rows" },\n      { type: "json", name: "BRAIN_CONFIG", json: { base, account, subdomain, owner: did } },\n      { type: "json", name: "BRAIN_INFO", json: { ...guardEmit.info, name: "brain-guard", deployedAt: new Date().toISOString() } }\n    ]\n  };\n  const form = new FormData();\n  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));\n  for (const p of guardEmit.parts) form.append(p.path, new File([p.text], p.path, { type: "application/javascript+module" }));\n  await api(S, { method: "PUT", body: form });\n  await api(S + "/subdomain", { method: "POST", headers: json, body: JSON.stringify({ enabled: true }) });\n  await api(S + "/schedules", { method: "PUT", headers: json, body: JSON.stringify(guardEmit.meta.crons.map((cron) => ({ cron }))) });\n\n  // A new workers.dev name takes some seconds to answer. Measured 2026-10-05: 15 to 20 s.\n  const guardUrl = `https://${guardName}.${subdomain}.workers.dev`, url = `https://${base}.${subdomain}.workers.dev`;\n  const guard = async (method, body) => {\n    const r = await send(`${guardUrl}/xrpc/com.lopecode.brain.infra.${method}`, { method: body === undefined ? "GET" : "POST", headers: { authorization: "Bearer " + recoveryKey, ...json }, body: body === undefined ? undefined : JSON.stringify(body) });\n    if (!r.ok) throw Object.assign(new Error(`guard ${method}: ${r.status}`), { status: r.status });\n    return r.json();\n  };\n  log("waiting for the guard to answer…");\n  for (let i = 0; ; i++) {\n    const up = await guard("getState").then(() => true, () => false);\n    if (up) break;\n    if (i >= 40) throw new Error("the guard did not answer at " + guardUrl);\n    await wait(2000);\n  }\n\n  const apply = async (service, extra = {}) => {\n    const e = await service.emit();\n    log(`deploying ${e.meta.worker}…`);\n    const out = (await guard("apply", { workers: [{ parts: e.parts, meta: e.meta, hash: e.hash, ...extra }] })).results[0];\n    if (!["deployed", "probation", "unchanged"].includes(out.state)) throw new Error(`${e.meta.worker}: ${out.state} ${out.reason || ""}`);\n  };\n  await apply(core_service);\n  await apply(kernel_service, { secrets: { COOKIE_KEY: hex() } });\n  log("writing the notebook out…");\n  await apply(page_service, { asset: html || (await notebookHtml()) });\n  await guard("confirm", {});\n\n  // The seed deletes itself, last. It is an open relay to the Cloudflare API for as long as it exists.\n  log("deleting the seed…");\n  const seedName = seedUrl.hostname.split(".")[0];\n  let seedDeleted = await api(`/accounts/${account}/workers/scripts/${seedName}?force=true`, { method: "DELETE" }).then(() => true, () => false);\n  if (!seedDeleted) seedDeleted = await send(seedUrl.origin + "/").then((r) => r.status === 404, () => true);\n  log("installed.");\n  return { url, guardUrl, recoveryKey, owner: did, seedDeleted, seedName };\n});};\nconst _cloudbrain_test_install_order_and_where_the_token_goes = async function _test_install_order_and_where_the_token_goes(Response,installBrain,expect) {\n  const calls = [];\n  const state = { guardUp: 0, applied: [] };\n  const reply = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { "content-type": "application/json" } });\n  const send = async (url, init = {}) => {\n    const u = new URL(url), method = init.method || "GET", auth = (init.headers || {}).authorization || "";\n    calls.push({ host: u.hostname, method, path: u.pathname.replace(/acc1/, "A"), auth });\n    if (u.hostname === "public.api.bsky.app") return reply({ did: "did:plc:alice" });\n    if (u.hostname === "seed-1.sub.workers.dev") {\n      const path = u.pathname.replace("/client/v4", "");\n      if (path === "/accounts") return reply({ success: true, result: [{ id: "acc1" }] });\n      if (path.endsWith("/workers/subdomain")) return reply({ success: true, result: { subdomain: "sub" } });\n      if (path.endsWith("/mine-guard/settings")) return reply({ success: false, errors: [{ code: 10007 }] }, 404);\n      if (path.endsWith("/mine-guard") && method === "PUT") {\n        state.metadata = JSON.parse(await init.body.get("metadata").text());\n        return reply({ success: true, result: {} });\n      }\n      return reply({ success: true, result: {} });\n    }\n    if (u.hostname === "mine-guard.sub.workers.dev") {\n      if (u.pathname.endsWith("infra.getState")) return ++state.guardUp < 3 ? reply({}, 404) : reply({ workers: [] });\n      if (u.pathname.endsWith("infra.apply")) {\n        const w = JSON.parse(init.body).workers[0];\n        state.applied.push({ worker: w.meta.worker, asset: typeof w.asset, secrets: Object.keys(w.secrets || {}) });\n        return reply({ results: [{ worker: w.meta.worker, state: "deployed" }] });\n      }\n      return reply({ confirmed: [] });\n    }\n    throw new Error("unexpected request to " + u.hostname);\n  };\n  const out = await installBrain({ seed: "https://seed-1.sub.workers.dev/", token: "cf-token-1", handle: "@alice.example", base: "mine", html: "<html>notebook</html>", fetch: send, wait: async () => {} });\n  expect(out).toMatchObject({ url: "https://mine.sub.workers.dev", guardUrl: "https://mine-guard.sub.workers.dev", owner: "did:plc:alice", seedDeleted: true });\n  expect(out.recoveryKey).toMatch(/^[0-9a-f]{64}$/);\n  // The Cloudflare token goes to the seed and into the guard\'s own secret, and nowhere else.\n  expect(calls.filter((c) => c.auth === "Bearer cf-token-1").every((c) => c.host === "seed-1.sub.workers.dev")).toBe(true);\n  expect(calls.filter((c) => c.host !== "seed-1.sub.workers.dev").some((c) => c.auth.includes("cf-token-1"))).toBe(false);\n  const b = Object.fromEntries(state.metadata.bindings.map((x) => [x.name, x]));\n  expect(b.CF_API_TOKEN.text).toBe("cf-token-1");\n  expect(b.RECOVERY_KEY.text).toBe(out.recoveryKey);\n  expect(b.BRAIN_CONFIG.json).toEqual({ base: "mine", account: "acc1", subdomain: "sub", owner: "did:plc:alice" });\n  expect(state.applied).toEqual([{ worker: "brain-core", asset: "undefined", secrets: [] }, { worker: "brain", asset: "undefined", secrets: ["COOKIE_KEY"] }, { worker: "brain-x-page", asset: "string", secrets: [] }]);\n  // The seed is deleted by the last Cloudflare call.\n  const cf = calls.filter((c) => c.host === "seed-1.sub.workers.dev");\n  expect(cf[cf.length - 1]).toMatchObject({ method: "DELETE", path: "/client/v4/accounts/A/workers/scripts/seed-1" });\n  expect(calls[calls.length - 1].method).toBe("DELETE");\n  return calls.length + " requests";\n};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n\n  $def("_cloudbrain_anon_2d66a42653", null, ["md"], _cloudbrain_anon_2d66a42653);  \n  $def("_cloudbrain_statusLine", "statusLine", ["htl","session","brainOrigin"], _cloudbrain_statusLine);  \n  $def("_cloudbrain_signIn", "signIn", ["brainOrigin","htl","session","press","location","Inputs"], _cloudbrain_signIn);  \n  $def("_cloudbrain_anon_8a5035967f", null, ["md"], _cloudbrain_anon_8a5035967f);  \n  $def("_cloudbrain_healthView", "healthView", ["assembled","client","session","sampleMetrics","dashboard","requestsChart","width","healthStrip","methodTable"], _cloudbrain_healthView);  \n  $def("_cloudbrain_anon_a22ac4e664", null, ["md"], _cloudbrain_anon_a22ac4e664);  \n  $def("_cloudbrain_viewof_assistant", "viewof assistant", ["robocoop5","assistantPrompt","promptView","defaultWatches","assistantWatches","invalidation"], _cloudbrain_viewof_assistant);  \n  $def("_cloudbrain_assistant", "assistant", ["Generators","viewof assistant"], _cloudbrain_assistant);  \n  $def("_cloudbrain_assistantLine", "assistantLine", ["htl","brain","inboxPump"], _cloudbrain_assistantLine);  \n  $def("_cloudbrain_anon_30d783050d", null, ["md"], _cloudbrain_anon_30d783050d);  \n  $def("_cloudbrain_viewof_services", "viewof services", ["serviceList","declaredWorkers","brain"], _cloudbrain_viewof_services);  \n  $def("_cloudbrain_services", "services", ["Generators","viewof services"], _cloudbrain_services);  \n  $def("_cloudbrain_probation", "probation", ["assembled","brain","htl","invalidation","press","location"], _cloudbrain_probation);  \n  $def("_cloudbrain_anon_d98158477c", null, ["md"], _cloudbrain_anon_d98158477c);  \n  $def("_cloudbrain_libraryView", "libraryView", ["libraryPanel","client","brainOrigin","session","brain","notebookHtml"], _cloudbrain_libraryView);  \n  $def("_cloudbrain_anon_dd39820a85", null, ["md"], _cloudbrain_anon_dd39820a85);  \n  $def("_cloudbrain_accessPanel", "accessPanel", ["brain","htl","field","press","client"], _cloudbrain_accessPanel);  \n  $def("_cloudbrain_anon_3d35a64e93", null, ["md"], _cloudbrain_anon_3d35a64e93);  \n  $def("_cloudbrain_installPanel", "installPanel", ["field","htl","press","seedSource","notebookHtml","installBrain"], _cloudbrain_installPanel);  \n  $def("_cloudbrain_brainOrigin", "brainOrigin", ["location"], _cloudbrain_brainOrigin);  \n  $def("_cloudbrain_session", "session", ["brainOrigin"], _cloudbrain_session);  \n  $def("_cloudbrain_client", "client", ["brainOrigin","xrpcClient"], _cloudbrain_client);  \n  $def("_cloudbrain_brain", "brain", ["session","brainOrigin","client","fromBrain","verifyService"], _cloudbrain_brain);  \n  $def("_cloudbrain_page_service", "page_service", ["cloudflare","assets","Request"], _cloudbrain_page_service);  \n  $def("_cloudbrain_page_announce", "page_announce", ["plugins","page_service","invalidation"], _cloudbrain_page_announce);  \n  $def("_cloudbrain_test_an_imported_service_names_the_module_it_is_written_in", "test_an_imported_service_names_the_module_it_is_written_in", ["core_service","kernel_service","guard_service","expect"], _cloudbrain_test_an_imported_service_names_the_module_it_is_written_in);  \n  $def("_cloudbrain_test_the_page_is_a_service", "test_the_page_is_a_service", ["page_service","expect","simulate","Response"], _cloudbrain_test_the_page_is_a_service);  \n  $def("_cloudbrain_fromBrain", "fromBrain", [], _cloudbrain_fromBrain);  \n  $def("_cloudbrain_applySource", "applySource", ["jbApply","runtime","probeDefine","createModule"], _cloudbrain_applySource);  \n  $def("_cloudbrain_loadService", "loadService", ["client","exportModuleJS","applySource","runtime","fromBrain"], _cloudbrain_loadService);  \n  $def("_cloudbrain_verifyService", "verifyService", ["loadService","runtime","client","session"], _cloudbrain_verifyService);  \n  $def("_cloudbrain_assembled", "assembled", ["client","session","verifyService","loadService"], _cloudbrain_assembled);  \n  $def("_cloudbrain_assembledRefresh", "assembledRefresh", ["viewof services","assembled","brain"], _cloudbrain_assembledRefresh);  \n  $def("_cloudbrain_platformWiring", "platformWiring", ["brain","backend","client","brainOrigin"], _cloudbrain_platformWiring);  \n  $def("_cloudbrain_field", "field", ["Inputs"], _cloudbrain_field);  \n  $def("_cloudbrain_press", "press", ["Inputs"], _cloudbrain_press);  \n  $def("_cloudbrain_inboxHandlers", "inboxHandlers", ["plugins"], _cloudbrain_inboxHandlers);  \n  $def("_cloudbrain_inboxPump", "inboxPump", ["brain","invalidation","client","inboxHandlers"], _cloudbrain_inboxPump);  \n  $def("_cloudbrain_guardInbox", "guardInbox", ["plugins","viewof services","invalidation"], _cloudbrain_guardInbox);  \n  $def("_cloudbrain_assistantPrompt", "assistantPrompt", ["brainOrigin"], _cloudbrain_assistantPrompt);  \n  $def("_cloudbrain_inboxNow", "inboxNow", [], _cloudbrain_inboxNow);  \n  $def("_cloudbrain_inboxMirror", "inboxMirror", ["inboxNow","inboxPump"], _cloudbrain_inboxMirror);  \n  $def("_cloudbrain_brainSummary", "brainSummary", ["brain","viewof services","inboxNow"], _cloudbrain_brainSummary);  \n  $def("_cloudbrain_assistantWatches", "assistantWatches", ["brainSummary"], _cloudbrain_assistantWatches);  \n  $def("_cloudbrain_assistantRule", "assistantRule", ["registerRule","invalidation","unregisterRule"], _cloudbrain_assistantRule);  \n  $def("_cloudbrain_assistantRefuses", "assistantRefuses", [], _cloudbrain_assistantRefuses);  \n  $def("_cloudbrain_assistantTools", "assistantTools", ["brain","defineTool","viewof services","client","brainOrigin","assistantRefuses","declaredWorkers","registerTool","invalidation","unregisterTool"], _cloudbrain_assistantTools);  \n  $def("_cloudbrain_whatsappInbox", "whatsappInbox", ["viewof assistant","KeyboardEvent","plugins","invalidation"], _cloudbrain_whatsappInbox);  \n  $def("_cloudbrain_test_assistant_refuses_owner_only_methods", "test_assistant_refuses_owner_only_methods", ["expect","assistantRefuses"], _cloudbrain_test_assistant_refuses_owner_only_methods);  \n  $def("_cloudbrain_notebookHtml", "notebookHtml", ["location","exportToHTML","runtime"], _cloudbrain_notebookHtml);  \n  $def("_cloudbrain_installBrain", "installBrain", ["guard_service","FormData","core_service","kernel_service","page_service","notebookHtml"], _cloudbrain_installBrain);  \n  $def("_cloudbrain_test_install_order_and_where_the_token_goes", "test_install_order_and_where_the_token_goes", ["Response","installBrain","expect"], _cloudbrain_test_install_order_and_where_the_token_goes);  \n  main.define("module @tomlarkworthy/cloudflare-iac", async () => runtime.module((await import("/@tomlarkworthy/cloudflare-iac.js?v=4")).default));  \n  main.define("declaredWorkers", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("declaredWorkers", _));  \n  main.define("serviceList", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("serviceList", _));  \n  main.define("backend", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("backend", _));  \n  main.define("sha256", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("sha256", _));  \n  main.define("seedSource", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("seedSource", _));  \n  main.define("cloudflare", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("cloudflare", _));  \n  main.define("assets", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("assets", _));  \n  main.define("simulate", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("simulate", _));  \n  main.define("module @tomlarkworthy/brain-guard", async () => runtime.module((await import("/@tomlarkworthy/brain-guard.js?v=4")).default));  \n  main.define("guard_service", ["module @tomlarkworthy/brain-guard", "@variable"], (_, v) => v.import("guard_service", _));  \n  main.define("module @tomlarkworthy/brain-core", async () => runtime.module((await import("/@tomlarkworthy/brain-core.js?v=4")).default));  \n  main.define("core_service", ["module @tomlarkworthy/brain-core", "@variable"], (_, v) => v.import("core_service", _));  \n  main.define("module @tomlarkworthy/brain-kernel", async () => runtime.module((await import("/@tomlarkworthy/brain-kernel.js?v=4")).default));  \n  main.define("kernel_service", ["module @tomlarkworthy/brain-kernel", "@variable"], (_, v) => v.import("kernel_service", _));  \n  main.define("module @tomlarkworthy/xrpc-client", async () => runtime.module((await import("/@tomlarkworthy/xrpc-client.js?v=4")).default));  \n  main.define("xrpcClient", ["module @tomlarkworthy/xrpc-client", "@variable"], (_, v) => v.import("xrpcClient", _));  \n  main.define("module @tomlarkworthy/plugin-registry", async () => runtime.module((await import("/@tomlarkworthy/plugin-registry.js?v=4")).default));  \n  main.define("plugins", ["module @tomlarkworthy/plugin-registry", "@variable"], (_, v) => v.import("plugins", _));  \n  main.define("module @tomlarkworthy/robocoop-5", async () => runtime.module((await import("/@tomlarkworthy/robocoop-5.js?v=4")).default));  \n  main.define("robocoop5", ["module @tomlarkworthy/robocoop-5", "@variable"], (_, v) => v.import("robocoop5", _));  \n  main.define("defaultWatches", ["module @tomlarkworthy/robocoop-5", "@variable"], (_, v) => v.import("defaultWatches", _));  \n  main.define("module @tomlarkworthy/robocoop-5-engine", async () => runtime.module((await import("/@tomlarkworthy/robocoop-5-engine.js?v=4")).default));  \n  main.define("promptView", ["module @tomlarkworthy/robocoop-5-engine", "@variable"], (_, v) => v.import("promptView", _));  \n  main.define("module @tomlarkworthy/robocoop-5-tools", async () => runtime.module((await import("/@tomlarkworthy/robocoop-5-tools.js?v=4")).default));  \n  main.define("registerRule", ["module @tomlarkworthy/robocoop-5-tools", "@variable"], (_, v) => v.import("registerRule", _));  \n  main.define("unregisterRule", ["module @tomlarkworthy/robocoop-5-tools", "@variable"], (_, v) => v.import("unregisterRule", _));  \n  main.define("registerTool", ["module @tomlarkworthy/robocoop-5-tools", "@variable"], (_, v) => v.import("registerTool", _));  \n  main.define("unregisterTool", ["module @tomlarkworthy/robocoop-5-tools", "@variable"], (_, v) => v.import("unregisterTool", _));  \n  main.define("module @tomlarkworthy/robocoop-5-core", async () => runtime.module((await import("/@tomlarkworthy/robocoop-5-core.js?v=4")).default));  \n  main.define("defineTool", ["module @tomlarkworthy/robocoop-5-core", "@variable"], (_, v) => v.import("defineTool", _));  \n  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));  \n  main.define("exportToHTML", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("exportToHTML", _));  \n  main.define("exportModuleJS", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("exportModuleJS", _));  \n  main.define("module @tomlarkworthy/file-sync", async () => runtime.module((await import("/@tomlarkworthy/file-sync.js?v=4")).default));  \n  main.define("jbApply", ["module @tomlarkworthy/file-sync", "@variable"], (_, v) => v.import("jbApply", _));  \n  main.define("probeDefine", ["module @tomlarkworthy/file-sync", "@variable"], (_, v) => v.import("probeDefine", _));  \n  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  \n  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  \n  main.define("createModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("createModule", _));  \n  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));  \n  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));  \n  main.define("module @tomlarkworthy/brain-metrics", async () => runtime.module((await import("/@tomlarkworthy/brain-metrics.js?v=4")).default));  \n  main.define("healthStrip", ["module @tomlarkworthy/brain-metrics", "@variable"], (_, v) => v.import("healthStrip", _));  \n  main.define("requestsChart", ["module @tomlarkworthy/brain-metrics", "@variable"], (_, v) => v.import("requestsChart", _));  \n  main.define("methodTable", ["module @tomlarkworthy/brain-metrics", "@variable"], (_, v) => v.import("methodTable", _));  \n  main.define("dashboard", ["module @tomlarkworthy/brain-metrics", "@variable"], (_, v) => v.import("dashboard", _));  \n  main.define("sampleMetrics", ["module @tomlarkworthy/brain-metrics", "@variable"], (_, v) => v.import("sampleMetrics", _));  \n  main.define("module @tomlarkworthy/brain-library", async () => runtime.module((await import("/@tomlarkworthy/brain-library.js?v=4")).default));  \n  main.define("libraryPanel", ["module @tomlarkworthy/brain-library", "@variable"], (_, v) => v.import("libraryPanel", _));\n  return main;\n}' } }
};

// sandbox.ts
var PRELUDE = (native) => `
globalThis.window = globalThis;
globalThis.lopecode = { contentSync: (id) => ({ status: 200, mime: "text/javascript", bytes: __hostCall("content", id) }) };
globalThis.Blob = class Blob { constructor(parts) { this.__t = parts.map((p) => (p && p.__t != null ? p.__t : String(p))).join(""); } async text() { return this.__t; } };
${native ? `URL.createObjectURL = (b) => __hostCall("register", b.__t); URL.revokeObjectURL = () => {};` : `
// Names a Worker has and QuickJS does not. The distiller only needs them to exist: a cell that names one is
// copied to the Worker as text and runs there.
for (const n of ["Request", "Response", "Headers", "URLSearchParams", "AbortController", "WebSocket", "FormData", "File", "ReadableStream", "DecompressionStream", "CompressionStream", "TransformStream", "WritableStream"]) globalThis[n] = class { constructor() { throw new Error(n + " is not available while distilling"); } };
for (const n of ["fetch", "atob", "btoa", "structuredClone", "queueMicrotask"]) globalThis[n] = () => { throw new Error(n + " is not available while distilling"); };
globalThis.URL = class URL { constructor() { throw new Error("URL is not available while distilling"); } static createObjectURL(b) { return __hostCall("register", b.__t); } static revokeObjectURL() {} };
globalThis.console = { log: (...a) => __hostCall("log", a.map(String).join(" ")), error: (...a) => __hostCall("log", a.map(String).join(" ")), warn: () => {} };
globalThis.setImmediate = (f) => { Promise.resolve().then(f); };
globalThis.setTimeout = (f) => { Promise.resolve().then(f); return 0; };
globalThis.clearTimeout = () => {};
globalThis.TextEncoder = class TextEncoder { encode(s) { const o = []; for (const ch of String(s)) { const c = ch.codePointAt(0); if (c < 0x80) o.push(c); else if (c < 0x800) o.push(0xc0 | (c >> 6), 0x80 | (c & 63)); else if (c < 0x10000) o.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); else o.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); } return new Uint8Array(o); } };
globalThis.TextDecoder = class TextDecoder { decode(b) { b = b instanceof Uint8Array ? b : new Uint8Array(b || []); let s = "", i = 0; while (i < b.length) { const c = b[i++]; let p = c; if (c >= 0xf0) p = ((c & 7) << 18) | ((b[i++] & 63) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63); else if (c >= 0xe0) p = ((c & 15) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63); else if (c >= 0xc0) p = ((c & 31) << 6) | (b[i++] & 63); s += String.fromCodePoint(p); } return s; } };
globalThis.crypto = { subtle: { digest: async (alg, data) => { const b = new Uint8Array(data.buffer || data); let h = ""; for (let i = 0; i < b.length; i++) h += (b[i] < 16 ? "0" : "") + b[i].toString(16); const hex = __hostCall("sha256hex", h); const out = new Uint8Array(hex.length / 2); for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16); return out.buffer; } } };
`}
`;
var MAIN = `
import { Runtime } from "observable-runtime";
export const distil = async (name, cell) => {
  const runtime = new Runtime({});
  runtime.fileAttachments = (find) => (n) => { const r = find(n); if (!r) throw new Error("no attachment " + n); return { url: async () => r.url, text: async () => __hostCall("blobText", r.url) }; };
  const define = (await import("/" + name + ".js?v=4")).default;
  let ok, bad; const got = new Promise((a, b) => { ok = a; bad = b; });
  const main = runtime.module(define, (n) => (n === cell ? { fulfilled: ok, rejected: bad } : undefined));
  runtime.mains = new Map([[name, main]]);
  const service = await got;
  const e = await service.emit();
  return JSON.stringify({ parts: e.parts, meta: e.meta, hash: e.hash, variables: runtime._variables.size });
};
`;

// worker.ts
var d = data_default;
var quickjs;
var distil = async (svc) => {
  const s = d.services[svc];
  if (!s)
    throw new Error("no service " + svc);
  quickjs ??= await newQuickJSWASMModuleFromVariant(newVariant(src_default, { wasmModule }));
  const blobs = new Map;
  const load = (spec) => {
    if (spec === "spike:main")
      return MAIN;
    if (spec.startsWith("blob:"))
      return blobs.get(spec);
    if (spec === "/" + s.module + ".js?v=4")
      return s.source;
    if (d.modules[spec] != null)
      return d.modules[spec];
    throw new Error("cannot load " + spec);
  };
  const hostCall = (name, arg) => {
    if (name === "content")
      return d.content[arg];
    if (name === "register") {
      const url = "blob:spike/" + blobs.size;
      blobs.set(url, arg);
      return url;
    }
    if (name === "blobText")
      return blobs.get(arg);
    if (name === "sha256hex")
      return sha256hex(arg);
    if (name === "source")
      return arg === s.module ? s.source : "";
    if (name === "log")
      return "";
    throw new Error("no host call " + name);
  };
  const rt = quickjs.newRuntime();
  try {
    rt.setMemoryLimit(64 * 1024 * 1024);
    rt.setMaxStackSize(1024 * 1024);
    rt.setModuleLoader((name) => load(name), (_b, name) => name);
    const vm = rt.newContext();
    try {
      vm.newFunction("__hostCall", (a, b) => vm.newString(hostCall(vm.getString(a), vm.getString(b)))).consume((f) => vm.setProp(vm.global, "__hostCall", f));
      const run = (code, file, type) => {
        const r = vm.evalCode(code, file, { type });
        if (r.error) {
          const e = vm.dump(r.error);
          r.error.dispose();
          throw new Error(file + ": " + JSON.stringify(e));
        }
        r.value.dispose();
      };
      run(PRELUDE(false), "prelude.js", "global");
      run(`import { distil } from "spike:main"; distil(${JSON.stringify(s.module)}, ${JSON.stringify(s.cell)}).then((v) => { globalThis.__result = v; }, (e) => { globalThis.__error = String(e && e.message) + " | " + String(e && e.stack); });`, "entry.js", "module");
      let jobs = 0;
      for (;; ) {
        const p = rt.executePendingJobs();
        if (p.error) {
          const e = vm.dump(p.error);
          p.error.dispose();
          throw new Error("job: " + JSON.stringify(e));
        }
        jobs += p.value;
        if (!p.value)
          break;
      }
      const read = (k) => vm.getProp(vm.global, k).consume((h) => vm.dump(h));
      const err = read("__error"), res = read("__result");
      if (err)
        throw new Error("sandbox: " + err);
      if (!res)
        throw new Error("no result after " + jobs + " jobs");
      const out = JSON.parse(res);
      return { svc, hash: out.hash.slice(0, 12), expected: s.hash.slice(0, 12), identical: out.hash === s.hash, parts: out.parts.map((p) => p.path + " " + p.text.length), jobs };
    } finally {
      vm.dispose();
    }
  } finally {
    rt.dispose();
  }
};
var worker_default = {
  async fetch(request) {
    const svc = new URL(request.url).searchParams.get("svc") || "";
    if (!svc)
      return Response.json({ services: Object.keys(d.services) });
    try {
      return Response.json(await distil(svc));
    } catch (e) {
      return Response.json({ svc, error: String(e && e.message || e).slice(0, 600) }, { status: 500 });
    }
  }
};
export {
  worker_default as default
};
