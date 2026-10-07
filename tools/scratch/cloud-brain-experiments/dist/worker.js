var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../node_modules/@jitl/quickjs-ffi-types/dist/index.mjs
var EvalFlags, IntrinsicsFlags, JSPromiseStateEnum, GetOwnPropertyNamesFlags, IsEqualOp;
var init_dist = __esm({
  "../node_modules/@jitl/quickjs-ffi-types/dist/index.mjs"() {
    EvalFlags = { JS_EVAL_TYPE_GLOBAL: 0, JS_EVAL_TYPE_MODULE: 1, JS_EVAL_TYPE_DIRECT: 2, JS_EVAL_TYPE_INDIRECT: 3, JS_EVAL_TYPE_MASK: 3, JS_EVAL_FLAG_STRICT: 8, JS_EVAL_FLAG_STRIP: 16, JS_EVAL_FLAG_COMPILE_ONLY: 32, JS_EVAL_FLAG_BACKTRACE_BARRIER: 64 };
    IntrinsicsFlags = { BaseObjects: 1, Date: 2, Eval: 4, StringNormalize: 8, RegExp: 16, RegExpCompiler: 32, JSON: 64, Proxy: 128, MapSet: 256, TypedArrays: 512, Promise: 1024, BigInt: 2048, BigFloat: 4096, BigDecimal: 8192, OperatorOverloading: 16384, BignumExt: 32768 };
    JSPromiseStateEnum = { Pending: 0, Fulfilled: 1, Rejected: 2 };
    GetOwnPropertyNamesFlags = { JS_GPN_STRING_MASK: 1, JS_GPN_SYMBOL_MASK: 2, JS_GPN_PRIVATE_MASK: 4, JS_GPN_ENUM_ONLY: 16, JS_GPN_SET_ENUM: 32, QTS_GPN_NUMBER_MASK: 64, QTS_STANDARD_COMPLIANT_NUMBER: 128 };
    IsEqualOp = { IsStrictlyEqual: 0, IsSameValue: 1, IsSameValueZero: 2 };
  }
});

// ../node_modules/quickjs-emscripten-core/dist/chunk-V2S4ZYJR.mjs
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
  __name(handleNextStep, "handleNextStep");
  return handleNextStep(gen.next());
}
function scopeFinally(scope, blockError) {
  let disposeError;
  try {
    scope.dispose();
  } catch (error) {
    disposeError = error;
  }
  if (blockError && disposeError) throw Object.assign(blockError, { message: `${blockError.message}
 Then, failed to dispose scope: ${disposeError.message}`, disposeError }), blockError;
  if (blockError || disposeError) throw blockError || disposeError;
}
function createDisposableArray(items) {
  let array = items ? Array.from(items) : [];
  function disposeAlive() {
    return array.forEach((disposable) => disposable.alive ? disposable.dispose() : void 0);
  }
  __name(disposeAlive, "disposeAlive");
  function someIsAlive() {
    return array.some((disposable) => disposable.alive);
  }
  __name(someIsAlive, "someIsAlive");
  return Object.defineProperty(array, SymbolDispose, { configurable: true, enumerable: false, value: disposeAlive }), Object.defineProperty(array, "dispose", { configurable: true, enumerable: false, value: disposeAlive }), Object.defineProperty(array, "alive", { configurable: true, enumerable: false, get: someIsAlive }), array;
}
function isDisposable(value) {
  return !!(value && (typeof value == "object" || typeof value == "function") && "alive" in value && typeof value.alive == "boolean" && "dispose" in value && typeof value.dispose == "function");
}
function intrinsicsToFlags(intrinsics) {
  if (!intrinsics) return 0;
  let result = 0;
  for (let [maybeIntrinsicName, enabled] of Object.entries(intrinsics)) {
    if (!(maybeIntrinsicName in IntrinsicsFlags)) throw new QuickJSUnknownIntrinsic(maybeIntrinsicName);
    enabled && (result |= IntrinsicsFlags[maybeIntrinsicName]);
  }
  return result;
}
function evalOptionsToFlags(evalOptions) {
  if (typeof evalOptions == "number") return evalOptions;
  if (evalOptions === void 0) return 0;
  let { type, strict, strip, compileOnly, backtraceBarrier } = evalOptions, flags = 0;
  return type === "global" && (flags |= EvalFlags.JS_EVAL_TYPE_GLOBAL), type === "module" && (flags |= EvalFlags.JS_EVAL_TYPE_MODULE), strict && (flags |= EvalFlags.JS_EVAL_FLAG_STRICT), strip && (flags |= EvalFlags.JS_EVAL_FLAG_STRIP), compileOnly && (flags |= EvalFlags.JS_EVAL_FLAG_COMPILE_ONLY), backtraceBarrier && (flags |= EvalFlags.JS_EVAL_FLAG_BACKTRACE_BARRIER), flags;
}
function getOwnPropertyNamesOptionsToFlags(options) {
  if (typeof options == "number") return options;
  if (options === void 0) return 0;
  let { strings: includeStrings, symbols: includeSymbols, quickjsPrivate: includePrivate, onlyEnumerable, numbers: includeNumbers, numbersAsStrings } = options, flags = 0;
  return includeStrings && (flags |= GetOwnPropertyNamesFlags.JS_GPN_STRING_MASK), includeSymbols && (flags |= GetOwnPropertyNamesFlags.JS_GPN_SYMBOL_MASK), includePrivate && (flags |= GetOwnPropertyNamesFlags.JS_GPN_PRIVATE_MASK), onlyEnumerable && (flags |= GetOwnPropertyNamesFlags.JS_GPN_ENUM_ONLY), includeNumbers && (flags |= GetOwnPropertyNamesFlags.QTS_GPN_NUMBER_MASK), numbersAsStrings && (flags |= GetOwnPropertyNamesFlags.QTS_STANDARD_COMPLIANT_NUMBER), flags;
}
function concat(...values) {
  let result = [];
  for (let value of values) value !== void 0 && (result = result.concat(value));
  return result;
}
function getGroupId(id) {
  return id >> 8;
}
function applyBaseRuntimeOptions(runtime, options) {
  options.interruptHandler && runtime.setInterruptHandler(options.interruptHandler), options.maxStackSizeBytes !== void 0 && runtime.setMaxStackSize(options.maxStackSizeBytes), options.memoryLimitBytes !== void 0 && runtime.setMemoryLimit(options.memoryLimitBytes);
}
function applyModuleEvalRuntimeOptions(runtime, options) {
  options.moduleLoader && runtime.setModuleLoader(options.moduleLoader), options.shouldInterrupt && runtime.setInterruptHandler(options.shouldInterrupt), options.memoryLimitBytes !== void 0 && runtime.setMemoryLimit(options.memoryLimitBytes), options.maxStackSizeBytes !== void 0 && runtime.setMaxStackSize(options.maxStackSizeBytes);
}
var __defProp2, __export2, QTS_DEBUG, errors_exports, QuickJSUnwrapError, QuickJSWrongOwner, QuickJSUseAfterFree, QuickJSNotImplemented, QuickJSAsyncifyError, QuickJSAsyncifySuspended, QuickJSMemoryLeakDetected, QuickJSEmscriptenModuleError, QuickJSUnknownIntrinsic, QuickJSPromisePending, QuickJSEmptyGetOwnPropertyNames, QuickJSHostRefRangeExceeded, QuickJSHostRefInvalid, AwaitYield, UsingDisposable, SymbolDispose, prototypeAsAny, Lifetime, StaticLifetime, WeakLifetime, Scope, AbstractDisposableResult, DisposableSuccess, DisposableFail, DisposableResult, QuickJSDeferredPromise, ModuleMemory, DefaultIntrinsics, QuickJSIterator, INT32_MIN, INT32_MAX, INVALID_HOST_REF_ID, HostRefMap, HostRef, ContextMemory, QuickJSContext, QuickJSRuntime, QuickJSEmscriptenModuleCallbacks, QuickJSModuleCallbacks, QuickJSWASMModule;
var init_chunk_V2S4ZYJR = __esm({
  "../node_modules/quickjs-emscripten-core/dist/chunk-V2S4ZYJR.mjs"() {
    init_dist();
    init_dist();
    __defProp2 = Object.defineProperty;
    __export2 = /* @__PURE__ */ __name((target, all) => {
      for (var name in all) __defProp2(target, name, { get: all[name], enumerable: true });
    }, "__export");
    QTS_DEBUG = false;
    __name(debugLog, "debugLog");
    errors_exports = {};
    __export2(errors_exports, { QuickJSAsyncifyError: /* @__PURE__ */ __name(() => QuickJSAsyncifyError, "QuickJSAsyncifyError"), QuickJSAsyncifySuspended: /* @__PURE__ */ __name(() => QuickJSAsyncifySuspended, "QuickJSAsyncifySuspended"), QuickJSEmptyGetOwnPropertyNames: /* @__PURE__ */ __name(() => QuickJSEmptyGetOwnPropertyNames, "QuickJSEmptyGetOwnPropertyNames"), QuickJSEmscriptenModuleError: /* @__PURE__ */ __name(() => QuickJSEmscriptenModuleError, "QuickJSEmscriptenModuleError"), QuickJSHostRefInvalid: /* @__PURE__ */ __name(() => QuickJSHostRefInvalid, "QuickJSHostRefInvalid"), QuickJSHostRefRangeExceeded: /* @__PURE__ */ __name(() => QuickJSHostRefRangeExceeded, "QuickJSHostRefRangeExceeded"), QuickJSMemoryLeakDetected: /* @__PURE__ */ __name(() => QuickJSMemoryLeakDetected, "QuickJSMemoryLeakDetected"), QuickJSNotImplemented: /* @__PURE__ */ __name(() => QuickJSNotImplemented, "QuickJSNotImplemented"), QuickJSPromisePending: /* @__PURE__ */ __name(() => QuickJSPromisePending, "QuickJSPromisePending"), QuickJSUnknownIntrinsic: /* @__PURE__ */ __name(() => QuickJSUnknownIntrinsic, "QuickJSUnknownIntrinsic"), QuickJSUnwrapError: /* @__PURE__ */ __name(() => QuickJSUnwrapError, "QuickJSUnwrapError"), QuickJSUseAfterFree: /* @__PURE__ */ __name(() => QuickJSUseAfterFree, "QuickJSUseAfterFree"), QuickJSWrongOwner: /* @__PURE__ */ __name(() => QuickJSWrongOwner, "QuickJSWrongOwner") });
    QuickJSUnwrapError = class extends Error {
      static {
        __name(this, "QuickJSUnwrapError");
      }
      constructor(cause, context) {
        let message = typeof cause == "object" && cause && "message" in cause ? String(cause.message) : String(cause);
        super(message);
        this.cause = cause;
        this.context = context;
        this.name = "QuickJSUnwrapError";
      }
    };
    QuickJSWrongOwner = class extends Error {
      static {
        __name(this, "QuickJSWrongOwner");
      }
      constructor() {
        super(...arguments);
        this.name = "QuickJSWrongOwner";
      }
    };
    QuickJSUseAfterFree = class extends Error {
      static {
        __name(this, "QuickJSUseAfterFree");
      }
      constructor() {
        super(...arguments);
        this.name = "QuickJSUseAfterFree";
      }
    };
    QuickJSNotImplemented = class extends Error {
      static {
        __name(this, "QuickJSNotImplemented");
      }
      constructor() {
        super(...arguments);
        this.name = "QuickJSNotImplemented";
      }
    };
    QuickJSAsyncifyError = class extends Error {
      static {
        __name(this, "QuickJSAsyncifyError");
      }
      constructor() {
        super(...arguments);
        this.name = "QuickJSAsyncifyError";
      }
    };
    QuickJSAsyncifySuspended = class extends Error {
      static {
        __name(this, "QuickJSAsyncifySuspended");
      }
      constructor() {
        super(...arguments);
        this.name = "QuickJSAsyncifySuspended";
      }
    };
    QuickJSMemoryLeakDetected = class extends Error {
      static {
        __name(this, "QuickJSMemoryLeakDetected");
      }
      constructor() {
        super(...arguments);
        this.name = "QuickJSMemoryLeakDetected";
      }
    };
    QuickJSEmscriptenModuleError = class extends Error {
      static {
        __name(this, "QuickJSEmscriptenModuleError");
      }
      constructor() {
        super(...arguments);
        this.name = "QuickJSEmscriptenModuleError";
      }
    };
    QuickJSUnknownIntrinsic = class extends TypeError {
      static {
        __name(this, "QuickJSUnknownIntrinsic");
      }
      constructor() {
        super(...arguments);
        this.name = "QuickJSUnknownIntrinsic";
      }
    };
    QuickJSPromisePending = class extends Error {
      static {
        __name(this, "QuickJSPromisePending");
      }
      constructor() {
        super(...arguments);
        this.name = "QuickJSPromisePending";
      }
    };
    QuickJSEmptyGetOwnPropertyNames = class extends Error {
      static {
        __name(this, "QuickJSEmptyGetOwnPropertyNames");
      }
      constructor() {
        super(...arguments);
        this.name = "QuickJSEmptyGetOwnPropertyNames";
      }
    };
    QuickJSHostRefRangeExceeded = class extends Error {
      static {
        __name(this, "QuickJSHostRefRangeExceeded");
      }
      constructor() {
        super(...arguments);
        this.name = "QuickJSHostRefRangeExceeded";
      }
    };
    QuickJSHostRefInvalid = class extends Error {
      static {
        __name(this, "QuickJSHostRefInvalid");
      }
      constructor() {
        super(...arguments);
        this.name = "QuickJSHostRefInvalid";
      }
    };
    __name(awaitYield, "awaitYield");
    __name(awaitYieldOf, "awaitYieldOf");
    AwaitYield = awaitYield;
    AwaitYield.of = awaitYieldOf;
    __name(maybeAsyncFn, "maybeAsyncFn");
    __name(maybeAsync, "maybeAsync");
    __name(awaitEachYieldedPromise, "awaitEachYieldedPromise");
    UsingDisposable = class {
      static {
        __name(this, "UsingDisposable");
      }
      [Symbol.dispose]() {
        return this.dispose();
      }
    };
    SymbolDispose = Symbol.dispose ?? /* @__PURE__ */ Symbol.for("Symbol.dispose");
    prototypeAsAny = UsingDisposable.prototype;
    prototypeAsAny[SymbolDispose] || (prototypeAsAny[SymbolDispose] = function() {
      return this.dispose();
    });
    Lifetime = class _Lifetime extends UsingDisposable {
      static {
        __name(this, "_Lifetime");
      }
      constructor(_value, copier, disposer, _owner) {
        super();
        this._value = _value;
        this.copier = copier;
        this.disposer = disposer;
        this._owner = _owner;
        this._alive = true;
        this._constructorStack = QTS_DEBUG ? new Error("Lifetime constructed").stack : void 0;
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
        if (this.assertAlive(), !this.copier) throw new Error("Non-dupable lifetime");
        return new _Lifetime(this.copier(this._value), this.copier, this.disposer, this._owner);
      }
      consume(map2) {
        this.assertAlive();
        let result = map2(this);
        return this.dispose(), result;
      }
      map(map2) {
        return this.assertAlive(), map2(this);
      }
      tap(fn) {
        return fn(this), this;
      }
      dispose() {
        this.assertAlive(), this.disposer && this.disposer(this._value), this._alive = false;
      }
      assertAlive() {
        if (!this.alive) throw this._constructorStack ? new QuickJSUseAfterFree(`Lifetime not alive
${this._constructorStack}
Lifetime used`) : new QuickJSUseAfterFree("Lifetime not alive");
      }
    };
    StaticLifetime = class extends Lifetime {
      static {
        __name(this, "StaticLifetime");
      }
      constructor(value, owner) {
        super(value, void 0, void 0, owner);
      }
      get dupable() {
        return true;
      }
      dup() {
        return this;
      }
      dispose() {
      }
    };
    WeakLifetime = class extends Lifetime {
      static {
        __name(this, "WeakLifetime");
      }
      constructor(value, copier, disposer, owner) {
        super(value, copier, disposer, owner);
      }
      dispose() {
        this._alive = false;
      }
    };
    __name(scopeFinally, "scopeFinally");
    Scope = class _Scope extends UsingDisposable {
      static {
        __name(this, "_Scope");
      }
      constructor() {
        super(...arguments);
        this._disposables = new Lifetime(/* @__PURE__ */ new Set());
        this.manage = (lifetime) => (this._disposables.value.add(lifetime), lifetime);
      }
      static withScope(block) {
        let scope = new _Scope(), blockError;
        try {
          return block(scope);
        } catch (error) {
          throw blockError = error, error;
        } finally {
          scopeFinally(scope, blockError);
        }
      }
      static withScopeMaybeAsync(_this, block) {
        return maybeAsync(void 0, function* (awaited) {
          let scope = new _Scope(), blockError;
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
        let scope = new _Scope(), blockError;
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
        for (let lifetime of lifetimes) lifetime.alive && lifetime.dispose();
        this._disposables.dispose();
      }
    };
    __name(createDisposableArray, "createDisposableArray");
    __name(isDisposable, "isDisposable");
    AbstractDisposableResult = class _AbstractDisposableResult extends UsingDisposable {
      static {
        __name(this, "_AbstractDisposableResult");
      }
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
      static {
        __name(this, "DisposableSuccess");
      }
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
      static {
        __name(this, "DisposableFail");
      }
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
      static {
        __name(this, "QuickJSDeferredPromise");
      }
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
    ModuleMemory = class {
      static {
        __name(this, "ModuleMemory");
      }
      constructor(module) {
        this.module = module;
      }
      toPointerArray(handleArray) {
        let typedArray = new Int32Array(handleArray.map((handle) => handle.value)), numBytes = typedArray.length * typedArray.BYTES_PER_ELEMENT, ptr = this.module._malloc(numBytes);
        return new Uint8Array(this.module.HEAPU8.buffer, ptr, numBytes).set(new Uint8Array(typedArray.buffer)), new Lifetime(ptr, void 0, (ptr2) => this.module._free(ptr2));
      }
      newTypedArray(kind, length) {
        let zeros = new kind(new Array(length).fill(0)), numBytes = zeros.length * zeros.BYTES_PER_ELEMENT, ptr = this.module._malloc(numBytes), typedArray = new kind(this.module.HEAPU8.buffer, ptr, length);
        return typedArray.set(zeros), new Lifetime({ typedArray, ptr }, void 0, (value) => this.module._free(value.ptr));
      }
      newMutablePointerArray(length) {
        return this.newTypedArray(Int32Array, length);
      }
      newHeapCharPointer(string) {
        let strlen = this.module.lengthBytesUTF8(string), dataBytes = strlen + 1, ptr = this.module._malloc(dataBytes);
        return this.module.stringToUTF8(string, ptr, dataBytes), new Lifetime({ ptr, strlen }, void 0, (value) => this.module._free(value.ptr));
      }
      newHeapBufferPointer(buffer) {
        let numBytes = buffer.byteLength, ptr = this.module._malloc(numBytes);
        return this.module.HEAPU8.set(buffer, ptr), new Lifetime({ pointer: ptr, numBytes }, void 0, (value) => this.module._free(value.pointer));
      }
      consumeHeapCharPointer(ptr) {
        let str = this.module.UTF8ToString(ptr);
        return this.module._free(ptr), str;
      }
    };
    DefaultIntrinsics = Object.freeze({ BaseObjects: true, Date: true, Eval: true, StringNormalize: true, RegExp: true, JSON: true, Proxy: true, MapSet: true, TypedArrays: true, Promise: true });
    __name(intrinsicsToFlags, "intrinsicsToFlags");
    __name(evalOptionsToFlags, "evalOptionsToFlags");
    __name(getOwnPropertyNamesOptionsToFlags, "getOwnPropertyNamesOptionsToFlags");
    __name(concat, "concat");
    QuickJSIterator = class extends UsingDisposable {
      static {
        __name(this, "QuickJSIterator");
      }
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
        if (!this.alive || this._isDone) return { done: true, value: void 0 };
        let nextMethod = this._next ?? (this._next = this.context.getProp(this.handle, "next"));
        return this.callIteratorMethod(nextMethod, value);
      }
      return(value) {
        if (!this.alive) return { done: true, value: void 0 };
        let returnMethod = this.context.getProp(this.handle, "return");
        if (returnMethod === this.context.undefined && value === void 0) return this.dispose(), { done: true, value: void 0 };
        let result = this.callIteratorMethod(returnMethod, value);
        return returnMethod.dispose(), this.dispose(), result;
      }
      throw(e) {
        if (!this.alive) return { done: true, value: void 0 };
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
        if (callResult.error) return this.dispose(), { value: callResult };
        let done = this.context.getProp(callResult.value, "done").consume((v) => this.context.dump(v)), value = this.context.getProp(callResult.value, "value");
        return callResult.value.dispose(), done && this.dispose(), { value: DisposableResult.success(value), done };
      }
    };
    INT32_MIN = -2147483648;
    INT32_MAX = 2147483647;
    INVALID_HOST_REF_ID = 0;
    __name(getGroupId, "getGroupId");
    HostRefMap = class {
      static {
        __name(this, "HostRefMap");
      }
      constructor() {
        this.nextId = INT32_MIN;
        this.freelist = [];
        this.groups = /* @__PURE__ */ new Map();
      }
      put(value) {
        let id = this.allocateId(), groupId = getGroupId(id), group = this.groups.get(groupId);
        return group || (group = /* @__PURE__ */ new Map(), this.groups.set(groupId, group)), group.set(id, value), id;
      }
      get(id) {
        if (id === INVALID_HOST_REF_ID) throw new QuickJSHostRefInvalid("no host reference id defined");
        let groupId = getGroupId(id), group = this.groups.get(groupId);
        if (!group) throw new QuickJSHostRefInvalid(`host reference id ${id} is not defined`);
        let value = group.get(id);
        if (!value) throw new QuickJSHostRefInvalid(`host reference id ${id} is not defined`);
        return value;
      }
      delete(id) {
        if (id === INVALID_HOST_REF_ID) throw new QuickJSHostRefInvalid("no host reference id defined");
        let groupId = getGroupId(id), group = this.groups.get(groupId);
        if (!group) throw new QuickJSHostRefInvalid(`host reference id ${id} is not defined`);
        group.delete(id), group.size === 0 && this.groups.delete(groupId), this.freelist.push(id);
      }
      allocateId() {
        if (this.freelist.length > 0) return this.freelist.shift();
        if (this.nextId === INVALID_HOST_REF_ID && this.nextId++, this.nextId > INT32_MAX) throw new QuickJSHostRefRangeExceeded(`HostRefMap: too many host refs created without disposing. Max simultaneous host refs: ${INT32_MAX - INT32_MIN}`);
        return this.nextId++;
      }
    };
    HostRef = class extends UsingDisposable {
      static {
        __name(this, "HostRef");
      }
      constructor(runtime, handle, id) {
        if (id === INVALID_HOST_REF_ID) throw new QuickJSHostRefInvalid("cannot create HostRef with undefined id");
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
      static {
        __name(this, "ContextMemory");
      }
      constructor(args) {
        super(args.module);
        this.scope = new Scope();
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
      static {
        __name(this, "QuickJSContext");
      }
      constructor(args) {
        super();
        this._undefined = void 0;
        this._null = void 0;
        this._false = void 0;
        this._true = void 0;
        this._global = void 0;
        this._BigInt = void 0;
        this._Symbol = void 0;
        this._SymbolIterator = void 0;
        this._SymbolAsyncIterator = void 0;
        this.cToHostCallbacks = { callFunction: /* @__PURE__ */ __name((ctx, this_ptr, argc, argv, fn_id) => {
          if (ctx !== this.ctx.value) throw new Error("QuickJSContext instance received C -> JS call with mismatched ctx");
          let fn = this.getFunction(fn_id);
          return Scope.withScopeMaybeAsync(this, function* (awaited, scope) {
            let thisHandle = scope.manage(new WeakLifetime(this_ptr, this.memory.copyJSValue, this.memory.freeJSValue, this.runtime)), argHandles = new Array(argc);
            for (let i = 0; i < argc; i++) {
              let ptr = this.ffi.QTS_ArgvGetJSValueConstPointer(argv, i);
              argHandles[i] = scope.manage(new WeakLifetime(ptr, this.memory.copyJSValue, this.memory.freeJSValue, this.runtime));
            }
            try {
              let result = yield* awaited(fn.apply(thisHandle, argHandles));
              if (result) {
                if ("error" in result && result.error) throw this.runtime.debugLog("throw error", result.error), result.error;
                let handle = scope.manage(result instanceof Lifetime ? result : result.value);
                return this.ffi.QTS_DupValuePointer(this.ctx.value, handle.value);
              }
              return 0;
            } catch (error) {
              return this.errorToHandle(error).consume((errorHandle) => this.ffi.QTS_Throw(this.ctx.value, errorHandle.value));
            }
          });
        }, "callFunction") };
        this.runtime = args.runtime, this.module = args.module, this.ffi = args.ffi, this.rt = args.rt, this.ctx = args.ctx, this.memory = new ContextMemory({ ...args, owner: this.runtime }), args.callbacks.setContextCallbacks(this.ctx.value, this.cToHostCallbacks), this.dump = this.dump.bind(this), this.getString = this.getString.bind(this), this.getNumber = this.getNumber.bind(this), this.resolvePromise = this.resolvePromise.bind(this), this.uint32Out = this.memory.manage(this.memory.newTypedArray(Uint32Array, 1));
      }
      get alive() {
        return this.memory.alive;
      }
      dispose() {
        this.memory.dispose();
      }
      get undefined() {
        if (this._undefined) return this._undefined;
        let ptr = this.ffi.QTS_GetUndefined();
        return this._undefined = new StaticLifetime(ptr);
      }
      get null() {
        if (this._null) return this._null;
        let ptr = this.ffi.QTS_GetNull();
        return this._null = new StaticLifetime(ptr);
      }
      get true() {
        if (this._true) return this._true;
        let ptr = this.ffi.QTS_GetTrue();
        return this._true = new StaticLifetime(ptr);
      }
      get false() {
        if (this._false) return this._false;
        let ptr = this.ffi.QTS_GetFalse();
        return this._false = new StaticLifetime(ptr);
      }
      get global() {
        if (this._global) return this._global;
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
      newObject(prototype2) {
        prototype2 && this.runtime.assertOwned(prototype2);
        let ptr = prototype2 ? this.ffi.QTS_NewObjectProto(this.ctx.value, prototype2.value) : this.ffi.QTS_NewObject(this.ctx.value);
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
        if (!fn) throw new TypeError("Expected a function");
        return this.newFunctionWithOptions({ name: typeof nameOrFn == "string" ? nameOrFn : void 0, length: fn.length, isConstructor: false, fn });
      }
      newConstructorFunction(nameOrFn, maybeFn) {
        let fn = typeof nameOrFn == "function" ? nameOrFn : maybeFn;
        if (!fn) throw new TypeError("Expected a function");
        return this.newFunctionWithOptions({ name: typeof nameOrFn == "string" ? nameOrFn : void 0, length: fn.length, isConstructor: true, fn });
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
        return error && typeof error == "object" ? (error.name !== void 0 && this.newString(error.name).consume((handle) => this.setProp(errorHandle, "name", handle)), error.message !== void 0 && this.newString(error.message).consume((handle) => this.setProp(errorHandle, "message", handle))) : typeof error == "string" ? this.newString(error).consume((handle) => this.setProp(errorHandle, "message", handle)) : error !== void 0 && this.newString(String(error)).consume((handle) => this.setProp(errorHandle, "message", handle)), errorHandle;
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
        if (id !== 0) return this.runtime.hostRefs.get(id), new HostRef(this.runtime, handle.dup(), id);
      }
      unwrapHostRef(handle) {
        let id = this.ffi.QTS_GetHostRefId(handle.value);
        if (id === 0) throw new QuickJSHostRefInvalid("handle is not a HostRef");
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
        if (!ptr) throw new Error("Couldn't allocate memory to get ArrayBuffer");
        return new Lifetime(this.module.HEAPU8.subarray(ptr, ptr + len), void 0, () => this.module._free(ptr));
      }
      getPromiseState(handle) {
        this.runtime.assertOwned(handle);
        let state = this.ffi.QTS_PromiseState(this.ctx.value, handle.value);
        if (state < 0) return { type: "fulfilled", value: handle, notAPromise: true };
        if (state === JSPromiseStateEnum.Pending) return { type: "pending", get error() {
          return new QuickJSPromisePending("Cannot unwrap a pending promise");
        } };
        let ptr = this.ffi.QTS_PromiseResult(this.ctx.value, handle.value), result = this.memory.heapValueHandle(ptr);
        if (state === JSPromiseStateEnum.Fulfilled) return { type: "fulfilled", value: result };
        if (state === JSPromiseStateEnum.Rejected) return { type: "rejected", error: result };
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
        if (a === b) return true;
        this.runtime.assertOwned(a), this.runtime.assertOwned(b);
        let result = this.ffi.QTS_IsEqual(this.ctx.value, a.value, b.value, equalityType);
        if (result === -1) throw new QuickJSNotImplemented("WASM variant does not expose equality");
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
        if (this.runtime.assertOwned(handle), !(this.ffi.QTS_GetLength(this.ctx.value, this.uint32Out.value.ptr, handle.value) < 0)) return this.uint32Out.value.typedArray[0];
      }
      getOwnPropertyNames(handle, options = { strings: true, numbersAsStrings: true }) {
        this.runtime.assertOwned(handle), handle.value;
        let flags = getOwnPropertyNamesOptionsToFlags(options);
        if (flags === 0) throw new QuickJSEmptyGetOwnPropertyNames("No options set, will return an empty array");
        return Scope.withScope((scope) => {
          let outPtr = scope.manage(this.memory.newMutablePointerArray(1)), errorPtr = this.ffi.QTS_GetOwnPropertyNames(this.ctx.value, outPtr.value.ptr, this.uint32Out.value.ptr, handle.value, flags);
          if (errorPtr) return this.fail(this.memory.heapValueHandle(errorPtr));
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
        firstArg === void 0 || Array.isArray(firstArg) ? args = firstArg ?? [] : args = restArgs;
        let resultPtr = this.memory.toPointerArray(args).consume((argsArrayPtr) => this.ffi.QTS_Call(this.ctx.value, func.value, thisVal.value, args.length, argsArrayPtr.value)), errorPtr = this.ffi.QTS_ResolveException(this.ctx.value, resultPtr);
        return errorPtr ? (this.ffi.QTS_FreeValuePointer(this.ctx.value, resultPtr), this.fail(this.memory.heapValueHandle(errorPtr))) : this.success(this.memory.heapValueHandle(resultPtr));
      }
      callMethod(thisHandle, key, args = []) {
        return this.getProp(thisHandle, key).consume((func) => this.callFunction(func, thisHandle, args));
      }
      evalCode(code, filename = "eval.js", options) {
        let detectModule = options === void 0 ? 1 : 0, flags = evalOptionsToFlags(options), resultPtr = this.memory.newHeapCharPointer(code).consume((charHandle) => this.ffi.QTS_Eval(this.ctx.value, charHandle.value.ptr, charHandle.value.strlen, filename, detectModule, flags)), errorPtr = this.ffi.QTS_ResolveException(this.ctx.value, resultPtr);
        return errorPtr ? (this.ffi.QTS_FreeValuePointer(this.ctx.value, resultPtr), this.fail(this.memory.heapValueHandle(errorPtr))) : this.success(this.memory.heapValueHandle(resultPtr));
      }
      throw(error) {
        return this.errorToHandle(error).consume((handle) => this.ffi.QTS_Throw(this.ctx.value, handle.value));
      }
      borrowPropertyKey(key) {
        return typeof key == "number" ? this.newNumber(key) : typeof key == "string" ? this.newString(key) : new StaticLifetime(key.value, this.runtime);
      }
      getMemory(rt) {
        if (rt === this.rt.value) return this.memory;
        throw new Error("Private API. Cannot get memory from a different runtime");
      }
      dump(handle) {
        this.runtime.assertOwned(handle);
        let type = this.typeof(handle);
        if (type === "string") return this.getString(handle);
        if (type === "number") return this.getNumber(handle);
        if (type === "bigint") return this.getBigInt(handle);
        if (type === "undefined") return;
        if (type === "symbol") return this.getSymbol(handle);
        let asPromiseState = this.getPromiseState(handle);
        if (asPromiseState.type === "fulfilled" && !asPromiseState.notAPromise) return handle.dispose(), { type: asPromiseState.type, value: asPromiseState.value.consume(this.dump) };
        if (asPromiseState.type === "pending") return handle.dispose(), { type: asPromiseState.type };
        if (asPromiseState.type === "rejected") return handle.dispose(), { type: asPromiseState.type, error: asPromiseState.error.consume(this.dump) };
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
      [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
        return this.alive ? `${this.constructor.name} { ctx: ${this.ctx.value} rt: ${this.rt.value} }` : `${this.constructor.name} { disposed }`;
      }
      getFunction(fn_id) {
        let fn = this.runtime.hostRefs.get(fn_id);
        if (typeof fn != "function") throw new Error(`Host reference ${fn_id} is not a function`);
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
      static {
        __name(this, "QuickJSRuntime");
      }
      constructor(args) {
        super();
        this.scope = new Scope();
        this.contextMap = /* @__PURE__ */ new Map();
        this.hostRefs = new HostRefMap();
        this._debugMode = false;
        this.cToHostCallbacks = { freeHostRef: /* @__PURE__ */ __name((rt, host_ref_id) => {
          if (rt !== this.rt.value) throw new Error("Runtime pointer mismatch");
          this.hostRefs.delete(host_ref_id);
        }, "freeHostRef"), shouldInterrupt: /* @__PURE__ */ __name((rt) => {
          if (rt !== this.rt.value) throw new Error("QuickJSContext instance received C -> JS interrupt with mismatched rt");
          let fn = this.interruptHandler;
          if (!fn) throw new Error("QuickJSContext had no interrupt handler");
          return fn(this) ? 1 : 0;
        }, "shouldInterrupt"), loadModuleSource: maybeAsyncFn(this, function* (awaited, rt, ctx, moduleName) {
          let moduleLoader = this.moduleLoader;
          if (!moduleLoader) throw new Error("Runtime has no module loader");
          if (rt !== this.rt.value) throw new Error("Runtime pointer mismatch");
          let context = this.contextMap.get(ctx) ?? this.newContext({ contextPointer: ctx });
          try {
            let result = yield* awaited(moduleLoader(moduleName, context));
            if (typeof result == "object" && "error" in result && result.error) throw this.debugLog("cToHostLoadModule: loader returned error", result.error), result.error;
            let moduleSource = typeof result == "string" ? result : "value" in result ? result.value : result;
            return this.memory.newHeapCharPointer(moduleSource).value.ptr;
          } catch (error) {
            return this.debugLog("cToHostLoadModule: caught error", error), context.throw(error), 0;
          }
        }), normalizeModule: maybeAsyncFn(this, function* (awaited, rt, ctx, baseModuleName, moduleNameRequest) {
          let moduleNormalizer = this.moduleNormalizer;
          if (!moduleNormalizer) throw new Error("Runtime has no module normalizer");
          if (rt !== this.rt.value) throw new Error("Runtime pointer mismatch");
          let context = this.contextMap.get(ctx) ?? this.newContext({ contextPointer: ctx });
          try {
            let result = yield* awaited(moduleNormalizer(baseModuleName, moduleNameRequest, context));
            if (typeof result == "object" && "error" in result && result.error) throw this.debugLog("cToHostNormalizeModule: normalizer returned error", result.error), result.error;
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
        let intrinsics = intrinsicsToFlags(options.intrinsics), ctx = new Lifetime(options.contextPointer || this.ffi.QTS_NewContext(this.rt.value, intrinsics), void 0, (ctx_ptr) => {
          this.contextMap.delete(ctx_ptr), this.callbacks.deleteContext(ctx_ptr), this.ffi.QTS_FreeContext(ctx_ptr);
        }), context = new QuickJSContext({ module: this.module, ctx, ffi: this.ffi, rt: this.rt, ownedLifetimes: options.ownedLifetimes, runtime: this, callbacks: this.callbacks });
        return this.contextMap.set(ctx.value, context), context;
      }
      setModuleLoader(moduleLoader, moduleNormalizer) {
        this.moduleLoader = moduleLoader, this.moduleNormalizer = moduleNormalizer, this.ffi.QTS_RuntimeEnableModuleLoader(this.rt.value, this.moduleNormalizer ? 1 : 0);
      }
      removeModuleLoader() {
        this.moduleLoader = void 0, this.ffi.QTS_RuntimeDisableModuleLoader(this.rt.value);
      }
      hasPendingJob() {
        return !!this.ffi.QTS_IsJobPending(this.rt.value);
      }
      setInterruptHandler(cb) {
        let prevInterruptHandler = this.interruptHandler;
        this.interruptHandler = cb, prevInterruptHandler || this.ffi.QTS_RuntimeEnableInterruptHandler(this.rt.value);
      }
      removeInterruptHandler() {
        this.interruptHandler && (this.ffi.QTS_RuntimeDisableInterruptHandler(this.rt.value), this.interruptHandler = void 0);
      }
      executePendingJobs(maxJobsToExecute = -1) {
        let ctxPtrOut = this.memory.newMutablePointerArray(1), valuePtr = this.ffi.QTS_ExecutePendingJob(this.rt.value, maxJobsToExecute ?? -1, ctxPtrOut.value.ptr), ctxPtr = ctxPtrOut.value.typedArray[0];
        if (ctxPtrOut.dispose(), ctxPtr === 0) return this.ffi.QTS_FreeValuePointerRuntime(this.rt.value, valuePtr), DisposableResult.success(0);
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
        if (limitBytes < 0 && limitBytes !== -1) throw new Error("Cannot set memory limit to negative number. To unset, pass -1");
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
        if (stackSize < 0) throw new Error("Cannot set memory limit to negative number. To unset, pass 0.");
        this.ffi.QTS_RuntimeSetMaxStackSize(this.rt.value, stackSize);
      }
      assertOwned(handle) {
        if (handle.owner && handle.owner.rt !== this.rt) throw new QuickJSWrongOwner(`Handle is not owned by this runtime: ${handle.owner.rt.value} != ${this.rt.value}`);
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
      [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
        return this.alive ? `${this.constructor.name} { rt: ${this.rt.value} }` : `${this.constructor.name} { disposed }`;
      }
      getSystemContext() {
        return this.context || (this.context = this.scope.manage(this.newContext())), this.context;
      }
    };
    QuickJSEmscriptenModuleCallbacks = class {
      static {
        __name(this, "QuickJSEmscriptenModuleCallbacks");
      }
      constructor(args) {
        this.freeHostRef = args.freeHostRef, this.callFunction = args.callFunction, this.shouldInterrupt = args.shouldInterrupt, this.loadModuleSource = args.loadModuleSource, this.normalizeModule = args.normalizeModule;
      }
    };
    QuickJSModuleCallbacks = class {
      static {
        __name(this, "QuickJSModuleCallbacks");
      }
      constructor(module) {
        this.contextCallbacks = /* @__PURE__ */ new Map();
        this.runtimeCallbacks = /* @__PURE__ */ new Map();
        this.suspendedCount = 0;
        this.cToHostCallbacks = new QuickJSEmscriptenModuleCallbacks({ freeHostRef: /* @__PURE__ */ __name((_asyncify, rt, host_ref_id) => {
          let runtimeCallbacks = this.runtimeCallbacks.get(rt);
          if (!runtimeCallbacks) throw new Error(`QuickJSRuntime(rt = ${rt}) not found when trying to free HostRef(id = ${host_ref_id})`);
          runtimeCallbacks.freeHostRef(rt, host_ref_id);
        }, "freeHostRef"), callFunction: /* @__PURE__ */ __name((asyncify, ctx, this_ptr, argc, argv, fn_id) => this.handleAsyncify(asyncify, () => {
          try {
            let vm = this.contextCallbacks.get(ctx);
            if (!vm) throw new Error(`QuickJSContext(ctx = ${ctx}) not found for C function call "${fn_id}"`);
            return vm.callFunction(ctx, this_ptr, argc, argv, fn_id);
          } catch (error) {
            return console.error("[C to host error: returning null]", error), 0;
          }
        }), "callFunction"), shouldInterrupt: /* @__PURE__ */ __name((asyncify, rt) => this.handleAsyncify(asyncify, () => {
          try {
            let vm = this.runtimeCallbacks.get(rt);
            if (!vm) throw new Error(`QuickJSRuntime(rt = ${rt}) not found for C interrupt`);
            return vm.shouldInterrupt(rt);
          } catch (error) {
            return console.error("[C to host interrupt: returning error]", error), 1;
          }
        }), "shouldInterrupt"), loadModuleSource: /* @__PURE__ */ __name((asyncify, rt, ctx, moduleName) => this.handleAsyncify(asyncify, () => {
          try {
            let runtimeCallbacks = this.runtimeCallbacks.get(rt);
            if (!runtimeCallbacks) throw new Error(`QuickJSRuntime(rt = ${rt}) not found for C module loader`);
            let loadModule = runtimeCallbacks.loadModuleSource;
            if (!loadModule) throw new Error(`QuickJSRuntime(rt = ${rt}) does not support module loading`);
            return loadModule(rt, ctx, moduleName);
          } catch (error) {
            return console.error("[C to host module loader error: returning null]", error), 0;
          }
        }), "loadModuleSource"), normalizeModule: /* @__PURE__ */ __name((asyncify, rt, ctx, moduleBaseName, moduleName) => this.handleAsyncify(asyncify, () => {
          try {
            let runtimeCallbacks = this.runtimeCallbacks.get(rt);
            if (!runtimeCallbacks) throw new Error(`QuickJSRuntime(rt = ${rt}) not found for C module loader`);
            let normalizeModule = runtimeCallbacks.normalizeModule;
            if (!normalizeModule) throw new Error(`QuickJSRuntime(rt = ${rt}) does not support module loading`);
            return normalizeModule(rt, ctx, moduleBaseName, moduleName);
          } catch (error) {
            return console.error("[C to host module loader error: returning null]", error), 0;
          }
        }), "normalizeModule") });
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
        if (asyncify) return asyncify.handleSleep((done) => {
          try {
            let result = fn();
            if (!(result instanceof Promise)) {
              debugLog("asyncify.handleSleep: not suspending:", result), done(result);
              return;
            }
            if (this.suspended) throw new QuickJSAsyncifyError(`Already suspended at: ${this.suspended.stack}
Attempted to suspend at:`);
            this.suspended = new QuickJSAsyncifySuspended(`(${this.suspendedCount++})`), debugLog("asyncify.handleSleep: suspending:", this.suspended), result.then((resolvedResult) => {
              this.suspended = void 0, debugLog("asyncify.handleSleep: resolved:", resolvedResult), done(resolvedResult);
            }, (error) => {
              debugLog("asyncify.handleSleep: rejected:", error), console.error("QuickJS: cannot handle error in suspended function", error), this.suspended = void 0;
            });
          } catch (error) {
            throw debugLog("asyncify.handleSleep: error:", error), this.suspended = void 0, error;
          }
        });
        let value = fn();
        if (value instanceof Promise) throw new Error("Promise return value not supported in non-asyncify context.");
        return value;
      }
    };
    __name(applyBaseRuntimeOptions, "applyBaseRuntimeOptions");
    __name(applyModuleEvalRuntimeOptions, "applyModuleEvalRuntimeOptions");
    QuickJSWASMModule = class {
      static {
        __name(this, "QuickJSWASMModule");
      }
      constructor(module, ffi) {
        this.module = module, this.ffi = ffi, this.callbacks = new QuickJSModuleCallbacks(module);
      }
      newRuntime(options = {}) {
        let rt = new Lifetime(this.ffi.QTS_NewRuntime(), void 0, (rt_ptr) => {
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
          if (options.memoryLimitBytes !== void 0 && vm.runtime.setMemoryLimit(-1), result.error) throw vm.dump(scope.manage(result.error));
          return vm.dump(scope.manage(result.value));
        });
      }
      getWasmMemory() {
        let memory = this.module.quickjsEmscriptenInit?.(() => {
        })?.getWasmMemory?.();
        if (!memory) throw new Error("Variant does not support getting WebAssembly.Memory");
        return memory;
      }
      getFFI() {
        return this.ffi;
      }
    };
  }
});

// ../node_modules/quickjs-emscripten-core/dist/module-ES6BEMUI.mjs
var module_ES6BEMUI_exports = {};
__export(module_ES6BEMUI_exports, {
  QuickJSModuleCallbacks: () => QuickJSModuleCallbacks,
  QuickJSWASMModule: () => QuickJSWASMModule,
  applyBaseRuntimeOptions: () => applyBaseRuntimeOptions,
  applyModuleEvalRuntimeOptions: () => applyModuleEvalRuntimeOptions
});
var init_module_ES6BEMUI = __esm({
  "../node_modules/quickjs-emscripten-core/dist/module-ES6BEMUI.mjs"() {
    init_chunk_V2S4ZYJR();
  }
});

// ../node_modules/@jitl/quickjs-wasmfile-release-sync/dist/ffi.mjs
var ffi_exports = {};
__export(ffi_exports, {
  QuickJSFFI: () => QuickJSFFI
});
var QuickJSFFI;
var init_ffi = __esm({
  "../node_modules/@jitl/quickjs-wasmfile-release-sync/dist/ffi.mjs"() {
    QuickJSFFI = class {
      static {
        __name(this, "QuickJSFFI");
      }
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
  }
});

// ../node_modules/@jitl/quickjs-wasmfile-release-sync/dist/emscripten-module.cloudflare.cjs
var require_emscripten_module_cloudflare = __commonJS({
  "../node_modules/@jitl/quickjs-wasmfile-release-sync/dist/emscripten-module.cloudflare.cjs"(exports, module) {
    var QuickJSRaw = (() => {
      var _scriptName = globalThis.document?.currentScript?.src;
      return async function(moduleArg = {}) {
        var moduleRtn;
        var c = moduleArg;
        function n(a) {
          a = { log: a || function() {
          } };
          for (const d of n.Pa) d(a);
          return c.quickJSEmscriptenExtensions = a;
        }
        __name(n, "n");
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
        } catch {
        }
        u = /* @__PURE__ */ __name(async (a) => {
          a = await fetch(a, { credentials: "same-origin" });
          if (a.ok) return a.arrayBuffer();
          throw Error(a.status + " : " + a.url);
        }, "u");
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
        __name(I, "I");
        function J(a) {
          c.onAbort?.(a);
          a = "Aborted(" + a + ")";
          w(a);
          z = true;
          a = new WebAssembly.RuntimeError(a + ". Build with -sASSERTIONS for more info.");
          C?.(a);
          throw a;
        }
        __name(J, "J");
        var K;
        async function aa(a) {
          if (!y) try {
            var d = await u(a);
            return new Uint8Array(d);
          } catch {
          }
          if (a == K && y) a = new Uint8Array(y);
          else throw "both async and sync fetching of the wasm failed";
          return a;
        }
        __name(aa, "aa");
        async function ba(a, d) {
          try {
            var b = await aa(a);
            return await WebAssembly.instantiate(b, d);
          } catch (e) {
            w(`failed to asynchronously prepare wasm: ${e}`), J(e);
          }
        }
        __name(ba, "ba");
        async function ca(a) {
          var d = K;
          if (!y) try {
            var b = fetch(d, { credentials: "same-origin" });
            return await WebAssembly.instantiateStreaming(b, a);
          } catch (e) {
            w(`wasm streaming compile failed: ${e}`), w("falling back to ArrayBuffer instantiation");
          }
          return ba(d, a);
        }
        __name(ca, "ca");
        class L {
          static {
            __name(this, "L");
          }
          name = "ExitStatus";
          constructor(a) {
            this.message = `Program terminated with exit(${a})`;
            this.status = a;
          }
        }
        var M = /* @__PURE__ */ __name((a) => {
          for (; 0 < a.length; ) a.shift()(c);
        }, "M"), N = [], O = [], da = /* @__PURE__ */ __name(() => {
          var a = c.preRun.shift();
          O.push(a);
        }, "da"), P = true, q, Q = new TextDecoder(), ea = /* @__PURE__ */ __name((a, d, b, e) => {
          b = d + b;
          if (e) return b;
          for (; a[d] && !(d >= b); ) ++d;
          return d;
        }, "ea"), R = /* @__PURE__ */ __name((a, d, b) => a ? Q.decode(E.subarray(a, ea(E, a, d, b))) : "", "R"), S = 0, fa = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335], ha = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334], T = {}, ia = /* @__PURE__ */ __name((a) => {
          if (!(a instanceof L || "unwind" == a)) throw a;
        }, "ia"), ja = /* @__PURE__ */ __name((a) => {
          A = a;
          P || 0 < S || (c.onExit?.(a), z = true);
          throw new L(a);
        }, "ja"), ka = /* @__PURE__ */ __name((a) => {
          if (!z) try {
            a();
          } catch (d) {
            ia(d);
          } finally {
            if (!(P || 0 < S)) try {
              A = a = A, ja(a);
            } catch (d) {
              ia(d);
            }
          }
        }, "ka"), U = /* @__PURE__ */ __name((a, d, b) => {
          var e = E;
          if (!(0 < b)) return 0;
          var f = d;
          b = d + b - 1;
          for (var g = 0; g < a.length; ++g) {
            var h = a.codePointAt(g);
            if (127 >= h) {
              if (d >= b) break;
              e[d++] = h;
            } else if (2047 >= h) {
              if (d + 1 >= b) break;
              e[d++] = 192 | h >> 6;
              e[d++] = 128 | h & 63;
            } else if (65535 >= h) {
              if (d + 2 >= b) break;
              e[d++] = 224 | h >> 12;
              e[d++] = 128 | h >> 6 & 63;
              e[d++] = 128 | h & 63;
            } else {
              if (d + 3 >= b) break;
              e[d++] = 240 | h >> 18;
              e[d++] = 128 | h >> 12 & 63;
              e[d++] = 128 | h >> 6 & 63;
              e[d++] = 128 | h & 63;
              g++;
            }
          }
          e[d] = 0;
          return d - f;
        }, "U"), V = {}, la = /* @__PURE__ */ __name(() => {
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
            for (d in V) void 0 === V[d] ? delete a[d] : a[d] = V[d];
            var b = [];
            for (d in a) b.push(`${d}=${a[d]}`);
            W = b;
          }
          return W;
        }, "la"), W, X = /* @__PURE__ */ __name((a) => {
          for (var d = 0, b = 0; b < a.length; ++b) {
            var e = a.charCodeAt(b);
            127 >= e ? d++ : 2047 >= e ? d += 2 : 55296 <= e && 57343 >= e ? (d += 4, ++b) : d += 3;
          }
          return d;
        }, "X"), ma = [null, [], []], pa = /* @__PURE__ */ __name((a, d, b, e) => {
          var f = { string: /* @__PURE__ */ __name((k) => {
            var l = 0;
            if (null !== k && void 0 !== k && 0 !== k) {
              l = X(k) + 1;
              var p = Y(l);
              U(k, p, l);
              l = p;
            }
            return l;
          }, "string"), array: /* @__PURE__ */ __name((k) => {
            var l = Y(k.length);
            D.set(k, l);
            return l;
          }, "array") };
          a = c["_" + a];
          var g = [], h = 0;
          if (e) for (var m = 0; m < e.length; m++) {
            var x = f[b[m]];
            x ? (0 === h && (h = na()), g[m] = x(e[m])) : g[m] = e[m];
          }
          b = a(...g);
          return b = (function(k) {
            0 !== h && oa(h);
            return "string" === d ? R(k) : "boolean" === d ? !!k : k;
          })(b);
        }, "pa");
        c.wasmMemory ? q = c.wasmMemory : q = new WebAssembly.Memory({ initial: (c.INITIAL_MEMORY || 16777216) / 65536, maximum: 32768 });
        I();
        c.noExitRuntime && (P = c.noExitRuntime);
        c.print && (v = c.print);
        c.printErr && (w = c.printErr);
        c.wasmBinary && (y = c.wasmBinary);
        c.thisProgram && (r = c.thisProgram);
        if (c.preInit) for ("function" == typeof c.preInit && (c.preInit = [c.preInit]); 0 < c.preInit.length; ) c.preInit.shift()();
        c.cwrap = (a, d, b, e) => {
          var f = !b || b.every((g) => "number" === g || "boolean" === g);
          return "string" !== d && f && !e ? c["_" + a] : (...g) => pa(a, d, b, g);
        };
        c.UTF8ToString = R;
        c.stringToUTF8 = (a, d, b) => U(a, d, b);
        c.lengthBytesUTF8 = X;
        var qa, oa, Y, na, ra = { b: /* @__PURE__ */ __name((a, d, b, e) => J(`Assertion failed: ${R(a)}, at: ` + [d ? R(d) : "unknown filename", b, e ? R(e) : "unknown function"]), "b"), q: /* @__PURE__ */ __name(() => J(""), "q"), l: /* @__PURE__ */ __name(() => {
          P = false;
          S = 0;
        }, "l"), m: /* @__PURE__ */ __name(function(a, d) {
          a = -9007199254740992 > a || 9007199254740992 < a ? NaN : Number(a);
          a = new Date(1e3 * a);
          F[d >> 2] = a.getSeconds();
          F[d + 4 >> 2] = a.getMinutes();
          F[d + 8 >> 2] = a.getHours();
          F[d + 12 >> 2] = a.getDate();
          F[d + 16 >> 2] = a.getMonth();
          F[d + 20 >> 2] = a.getFullYear() - 1900;
          F[d + 24 >> 2] = a.getDay();
          var b = a.getFullYear();
          F[d + 28 >> 2] = (0 !== b % 4 || 0 === b % 100 && 0 !== b % 400 ? ha : fa)[a.getMonth()] + a.getDate() - 1 | 0;
          F[d + 36 >> 2] = -(60 * a.getTimezoneOffset());
          b = new Date(a.getFullYear(), 6, 1).getTimezoneOffset();
          var e = new Date(a.getFullYear(), 0, 1).getTimezoneOffset();
          F[d + 32 >> 2] = (b != e && a.getTimezoneOffset() == Math.min(e, b)) | 0;
        }, "m"), j: /* @__PURE__ */ __name((a, d) => {
          T[a] && (clearTimeout(T[a].id), delete T[a]);
          if (!d) return 0;
          var b = setTimeout(() => {
            delete T[a];
            ka(() => qa(a, performance.now()));
          }, d);
          T[a] = { id: b, Qa: d };
          return 0;
        }, "j"), n: /* @__PURE__ */ __name((a, d, b, e) => {
          var f = (/* @__PURE__ */ new Date()).getFullYear(), g = new Date(f, 0, 1).getTimezoneOffset();
          f = new Date(f, 6, 1).getTimezoneOffset();
          G[a >> 2] = 60 * Math.max(g, f);
          F[d >> 2] = Number(g != f);
          d = /* @__PURE__ */ __name((h) => {
            var m = Math.abs(h);
            return `UTC${0 <= h ? "-" : "+"}${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}`;
          }, "d");
          a = d(g);
          d = d(f);
          f < g ? (U(a, b, 17), U(d, e, 17)) : (U(a, e, 17), U(d, b, 17));
        }, "n"), p: /* @__PURE__ */ __name(() => Date.now(), "p"), k: /* @__PURE__ */ __name((a) => {
          var d = E.length;
          a >>>= 0;
          if (2147483648 < a) return false;
          for (var b = 1; 4 >= b; b *= 2) {
            var e = d * (1 + 0.2 / b);
            e = Math.min(e, a + 100663296);
            a: {
              e = (Math.min(2147483648, 65536 * Math.ceil(Math.max(a, e) / 65536)) - q.buffer.byteLength + 65535) / 65536 | 0;
              try {
                q.grow(e);
                I();
                var f = 1;
                break a;
              } catch (g) {
              }
              f = void 0;
            }
            if (f) return true;
          }
          return false;
        }, "k"), e: /* @__PURE__ */ __name((a, d) => {
          var b = 0, e = 0, f;
          for (f of la()) {
            var g = d + b;
            G[a + e >> 2] = g;
            b += U(f, g, Infinity) + 1;
            e += 4;
          }
          return 0;
        }, "e"), f: /* @__PURE__ */ __name((a, d) => {
          var b = la();
          G[a >> 2] = b.length;
          a = 0;
          for (var e of b) a += X(e) + 1;
          G[d >> 2] = a;
          return 0;
        }, "f"), d: /* @__PURE__ */ __name(() => 52, "d"), o: /* @__PURE__ */ __name(function() {
          return 70;
        }, "o"), c: /* @__PURE__ */ __name((a, d, b, e) => {
          for (var f = 0, g = 0; g < b; g++) {
            var h = G[d >> 2], m = G[d + 4 >> 2];
            d += 8;
            for (var x = 0; x < m; x++) {
              var k = a, l = E[h + x], p = ma[k];
              0 === l || 10 === l ? (k = 1 === k ? v : w, l = ea(p, 0), l = Q.decode(p.buffer ? p.subarray(0, l) : new Uint8Array(p.slice(0, l))), k(l), p.length = 0) : p.push(l);
            }
            f += m;
          }
          G[e >> 2] = f;
          return 0;
        }, "c"), a: q, r: ja, s: /* @__PURE__ */ __name(function(a, d, b, e, f) {
          return c.callbacks.callFunction(void 0, a, d, b, e, f);
        }, "s"), i: /* @__PURE__ */ __name(function(a) {
          return c.callbacks.shouldInterrupt(void 0, a);
        }, "i"), h: /* @__PURE__ */ __name(function(a, d, b) {
          b = R(b);
          return c.callbacks.loadModuleSource(void 0, a, d, b);
        }, "h"), g: /* @__PURE__ */ __name(function(a, d, b, e) {
          b = R(b);
          e = R(e);
          return c.callbacks.normalizeModule(void 0, a, d, b, e);
        }, "g"), t: /* @__PURE__ */ __name(function(a, d) {
          c.callbacks.freeHostRef(void 0, a, d);
        }, "t") }, Z;
        Z = await (async function() {
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
          __name(a, "a");
          var d = { a: ra };
          if (c.instantiateWasm) return new Promise((b) => {
            c.instantiateWasm(d, (e, f) => {
              b(a(e, f));
            });
          });
          K ??= c.locateFile ? c.locateFile("emscripten-module.wasm", t) : t + "emscripten-module.wasm";
          return a((await ca(d)).instance);
        })();
        (function() {
          function a() {
            c.calledRun = true;
            if (!z) {
              H = true;
              Z.u();
              B?.(c);
              c.onRuntimeInitialized?.();
              if (c.postRun) for ("function" == typeof c.postRun && (c.postRun = [c.postRun]); c.postRun.length; ) {
                var d = c.postRun.shift();
                N.push(d);
              }
              M(N);
            }
          }
          __name(a, "a");
          if (c.preRun) for ("function" == typeof c.preRun && (c.preRun = [c.preRun]); c.preRun.length; ) da();
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
        ;
        return moduleRtn;
      };
    })();
    if (typeof exports === "object" && typeof module === "object") {
      module.exports = QuickJSRaw;
      module.exports.default = QuickJSRaw;
    } else if (typeof define === "function" && define["amd"]) define([], () => QuickJSRaw);
  }
});

// shim.js
globalThis.requestAnimationFrame = (f) => {
  queueMicrotask(() => f(Date.now()));
  return 0;
};

// ../node_modules/@observablehq/runtime/src/errors.js
var RuntimeError = class extends Error {
  static {
    __name(this, "RuntimeError");
  }
  constructor(message, input) {
    super(message);
    this.input = input;
  }
};
RuntimeError.prototype.name = "RuntimeError";

// ../node_modules/@observablehq/runtime/src/generatorish.js
function generatorish(value) {
  return value && typeof value.next === "function" && typeof value.return === "function";
}
__name(generatorish, "generatorish");

// ../node_modules/@observablehq/runtime/src/constant.js
function constant(x) {
  return () => x;
}
__name(constant, "constant");

// ../node_modules/@observablehq/runtime/src/identity.js
function identity(x) {
  return x;
}
__name(identity, "identity");

// ../node_modules/@observablehq/runtime/src/rethrow.js
function rethrow(error) {
  return () => {
    throw error;
  };
}
__name(rethrow, "rethrow");

// ../node_modules/@observablehq/runtime/src/array.js
var prototype = Array.prototype;
var map = prototype.map;
var forEach = prototype.forEach;

// ../node_modules/@observablehq/runtime/src/noop.js
function noop() {
}
__name(noop, "noop");

// ../node_modules/@observablehq/runtime/src/variable.js
var TYPE_NORMAL = 1;
var TYPE_IMPLICIT = 2;
var TYPE_DUPLICATE = 3;
var no_observer = /* @__PURE__ */ Symbol("no-observer");
var no_value = Promise.resolve();
function Variable(type, module, observer, options) {
  if (!observer) observer = no_observer;
  Object.defineProperties(this, {
    _observer: { value: observer, writable: true },
    _definition: { value: variable_undefined, writable: true },
    _duplicate: { value: void 0, writable: true },
    _duplicates: { value: void 0, writable: true },
    _indegree: { value: NaN, writable: true },
    // The number of computing inputs.
    _inputs: { value: [], writable: true },
    _invalidate: { value: noop, writable: true },
    _module: { value: module },
    _name: { value: null, writable: true },
    _outputs: { value: /* @__PURE__ */ new Set(), writable: true },
    _promise: { value: no_value, writable: true },
    _reachable: { value: observer !== no_observer, writable: true },
    // Is this variable transitively visible?
    _rejector: { value: variable_rejector(this) },
    _shadow: { value: initShadow(module, options) },
    _type: { value: type },
    _value: { value: void 0, writable: true },
    _version: { value: 0, writable: true }
  });
}
__name(Variable, "Variable");
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
  if (!options?.shadow) return null;
  return new Map(
    Object.entries(options.shadow).map(([name, definition]) => [name, new Variable(TYPE_IMPLICIT, module).define([], definition)])
  );
}
__name(initShadow, "initShadow");
function variable_attach(variable) {
  variable._module._runtime._dirty.add(variable);
  variable._outputs.add(this);
}
__name(variable_attach, "variable_attach");
function variable_detach(variable) {
  variable._module._runtime._dirty.add(variable);
  variable._outputs.delete(this);
}
__name(variable_detach, "variable_detach");
function variable_undefined() {
  throw variable_undefined;
}
__name(variable_undefined, "variable_undefined");
function variable_stale() {
  throw variable_stale;
}
__name(variable_stale, "variable_stale");
function variable_rejector(variable) {
  return (error) => {
    if (error === variable_stale) throw error;
    if (error === variable_undefined) throw new RuntimeError(`${variable._name} is not defined`, variable._name);
    if (error instanceof Error && error.message) throw new RuntimeError(error.message, variable._name);
    throw new RuntimeError(`${variable._name} could not be resolved`, variable._name);
  };
}
__name(variable_rejector, "variable_rejector");
function variable_duplicate(name) {
  return () => {
    throw new RuntimeError(`${name} is defined more than once`);
  };
}
__name(variable_duplicate, "variable_duplicate");
function variable_define(name, inputs, definition) {
  switch (arguments.length) {
    case 1: {
      definition = name, name = inputs = null;
      break;
    }
    case 2: {
      definition = inputs;
      if (typeof name === "string") inputs = null;
      else inputs = name, name = null;
      break;
    }
  }
  return variable_defineImpl.call(
    this,
    name == null ? null : String(name),
    inputs == null ? [] : map.call(inputs, this._resolve, this),
    typeof definition === "function" ? definition : constant(definition)
  );
}
__name(variable_define, "variable_define");
function variable_resolve(name) {
  return this._shadow?.get(name) ?? this._module._resolve(name);
}
__name(variable_resolve, "variable_resolve");
function variable_defineImpl(name, inputs, definition) {
  const scope = this._module._scope, runtime = this._module._runtime;
  this._inputs.forEach(variable_detach, this);
  inputs.forEach(variable_attach, this);
  this._inputs = inputs;
  this._definition = definition;
  this._value = void 0;
  if (definition === noop) runtime._variables.delete(this);
  else runtime._variables.add(this);
  if (name !== this._name || scope.get(name) !== this) {
    let error, found;
    if (this._name) {
      if (this._outputs.size) {
        scope.delete(this._name);
        found = this._module._resolve(this._name);
        found._outputs = this._outputs, this._outputs = /* @__PURE__ */ new Set();
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
        this._duplicate = void 0;
        if (found._duplicates.size === 1) {
          found = found._duplicates.keys().next().value;
          error = scope.get(this._name);
          found._outputs = error._outputs, error._outputs = /* @__PURE__ */ new Set();
          found._outputs.forEach(function(output) {
            output._inputs[output._inputs.indexOf(error)] = found;
          });
          found._definition = found._duplicate, found._duplicate = void 0;
          runtime._dirty.add(error).add(found);
          runtime._updates.add(found);
          scope.set(this._name, found);
        }
      } else {
        throw new Error();
      }
    }
    if (this._outputs.size) throw new Error();
    if (name) {
      if (found = scope.get(name)) {
        if (found._type === TYPE_DUPLICATE) {
          this._definition = variable_duplicate(name), this._duplicate = definition;
          found._duplicates.add(this);
        } else if (found._type === TYPE_IMPLICIT) {
          this._outputs = found._outputs, found._outputs = /* @__PURE__ */ new Set();
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
          error._outputs = found._outputs, found._outputs = /* @__PURE__ */ new Set();
          error._outputs.forEach(function(output) {
            output._inputs[output._inputs.indexOf(found)] = error;
          });
          error._duplicates = /* @__PURE__ */ new Set([this, found]);
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
  if (this._version > 0) ++this._version;
  runtime._updates.add(this);
  runtime._compute();
  return this;
}
__name(variable_defineImpl, "variable_defineImpl");
function variable_import(remote, name, module) {
  if (arguments.length < 3) module = name, name = remote;
  return variable_defineImpl.call(this, String(name), [module._resolve(String(remote))], identity);
}
__name(variable_import, "variable_import");
function variable_delete() {
  return variable_defineImpl.call(this, null, [], noop);
}
__name(variable_delete, "variable_delete");
function variable_pending() {
  if (this._observer.pending) this._observer.pending();
}
__name(variable_pending, "variable_pending");
function variable_fulfilled(value) {
  if (this._observer.fulfilled) this._observer.fulfilled(value, this._name);
}
__name(variable_fulfilled, "variable_fulfilled");
function variable_rejected(error) {
  if (this._observer.rejected) this._observer.rejected(error, this._name);
}
__name(variable_rejected, "variable_rejected");

// ../node_modules/@observablehq/runtime/src/module.js
var variable_variable = /* @__PURE__ */ Symbol("variable");
var variable_invalidation = /* @__PURE__ */ Symbol("invalidation");
var variable_visibility = /* @__PURE__ */ Symbol("visibility");
function Module(runtime, builtins = []) {
  Object.defineProperties(this, {
    _runtime: { value: runtime },
    _scope: { value: /* @__PURE__ */ new Map() },
    _builtins: { value: new Map([
      ["@variable", variable_variable],
      ["invalidation", variable_invalidation],
      ["visibility", variable_visibility],
      ...builtins
    ]) },
    _source: { value: null, writable: true }
  });
}
__name(Module, "Module");
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
  if (!v) throw new RuntimeError(`${name} is not defined`);
  if (v._type === TYPE_DUPLICATE) throw new RuntimeError(`${name} is defined more than once`);
  return v.define.apply(v, arguments);
}
__name(module_redefine, "module_redefine");
function module_define() {
  const v = new Variable(TYPE_NORMAL, this);
  return v.define.apply(v, arguments);
}
__name(module_define, "module_define");
function module_import() {
  const v = new Variable(TYPE_NORMAL, this);
  return v.import.apply(v, arguments);
}
__name(module_import, "module_import");
function module_variable(observer, options) {
  return new Variable(TYPE_NORMAL, this, observer, options);
}
__name(module_variable, "module_variable");
async function module_value(name) {
  let v = this._scope.get(name);
  if (!v) throw new RuntimeError(`${name} is not defined`);
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
__name(module_value, "module_value");
async function module_revalue(runtime, variable) {
  await runtime._compute();
  try {
    return await variable._promise;
  } catch (error) {
    if (error === variable_stale) return module_revalue(runtime, variable);
    throw error;
  }
}
__name(module_revalue, "module_revalue");
function module_derive(injects, injectModule) {
  const map2 = /* @__PURE__ */ new Map();
  const modules = /* @__PURE__ */ new Set();
  const copies = [];
  function alias(source) {
    let target = map2.get(source);
    if (target) return target;
    target = new Module(source._runtime, source._builtins);
    target._source = source;
    map2.set(source, target);
    copies.push([target, source]);
    modules.add(source);
    return target;
  }
  __name(alias, "alias");
  const derive = alias(this);
  for (const inject of injects) {
    const { alias: alias2, name } = typeof inject === "object" ? inject : { name: inject };
    derive.import(name, alias2 == null ? name : alias2, injectModule);
  }
  for (const module of modules) {
    for (const [name, variable] of module._scope) {
      if (variable._definition === identity) {
        if (module === this && derive._scope.has(name)) continue;
        const importedModule = variable._inputs[0]._module;
        if (importedModule._source) alias(importedModule);
      }
    }
  }
  for (const [target, source] of copies) {
    for (const [name, sourceVariable] of source._scope) {
      const targetVariable = target._scope.get(name);
      if (targetVariable && targetVariable._type !== TYPE_IMPLICIT) continue;
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
__name(module_derive, "module_derive");
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
      if (value === void 0) {
        this._scope.set(variable._name = name, variable);
      } else {
        variable.define(name, constant(value));
      }
    }
  }
  return variable;
}
__name(module_resolve, "module_resolve");
function module_builtin(name, value) {
  this._builtins.set(name, value);
}
__name(module_builtin, "module_builtin");
function variable_name(variable) {
  return variable._name;
}
__name(variable_name, "variable_name");

// ../node_modules/@observablehq/runtime/src/runtime.js
var frame = typeof requestAnimationFrame === "function" ? requestAnimationFrame : typeof setImmediate === "function" ? setImmediate : (f) => setTimeout(f, 0);
function Runtime(builtins, global = window_global) {
  const builtin = this.module();
  Object.defineProperties(this, {
    _dirty: { value: /* @__PURE__ */ new Set() },
    _updates: { value: /* @__PURE__ */ new Set() },
    _precomputes: { value: [], writable: true },
    _computing: { value: null, writable: true },
    _init: { value: null, writable: true },
    _modules: { value: /* @__PURE__ */ new Map() },
    _variables: { value: /* @__PURE__ */ new Set() },
    _disposed: { value: false, writable: true },
    _builtin: { value: builtin },
    _global: { value: global }
  });
  if (builtins) for (const name in builtins) {
    new Variable(TYPE_IMPLICIT, builtin).define(name, [], builtins[name]);
  }
}
__name(Runtime, "Runtime");
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
__name(runtime_dispose, "runtime_dispose");
function runtime_module(define4, observer = noop) {
  let module;
  if (define4 === void 0) {
    if (module = this._init) {
      this._init = null;
      return module;
    }
    return new Module(this);
  }
  module = this._modules.get(define4);
  if (module) return module;
  this._init = module = new Module(this);
  this._modules.set(define4, module);
  try {
    define4(this, observer);
  } finally {
    this._init = null;
  }
  return module;
}
__name(runtime_module, "runtime_module");
function runtime_precompute(callback) {
  this._precomputes.push(callback);
  this._compute();
}
__name(runtime_precompute, "runtime_precompute");
function runtime_compute() {
  return this._computing || (this._computing = this._computeSoon());
}
__name(runtime_compute, "runtime_compute");
function runtime_computeSoon() {
  return new Promise(frame).then(() => this._disposed ? void 0 : this._computeNow());
}
__name(runtime_computeSoon, "runtime_computeSoon");
async function runtime_computeNow() {
  let queue = [], variables, variable, precomputes = this._precomputes;
  if (precomputes.length) {
    this._precomputes = [];
    for (const callback of precomputes) callback();
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
  __name(postqueue, "postqueue");
}
__name(runtime_computeNow, "runtime_computeNow");
function runtime_defer(depth = 0) {
  let p = Promise.resolve();
  for (let i = 0; i < depth; ++i) p = p.then(() => {
  });
  return p;
}
__name(runtime_defer, "runtime_defer");
function variable_circular(variable) {
  const inputs = new Set(variable._inputs);
  for (const i of inputs) {
    if (i === variable) return true;
    i._inputs.forEach(inputs.add, inputs);
  }
  return false;
}
__name(variable_circular, "variable_circular");
function variable_increment(variable) {
  ++variable._indegree;
}
__name(variable_increment, "variable_increment");
function variable_decrement(variable) {
  --variable._indegree;
}
__name(variable_decrement, "variable_decrement");
function variable_value(variable) {
  return variable._promise.catch(variable._rejector);
}
__name(variable_value, "variable_value");
function variable_invalidator(variable) {
  return new Promise(function(resolve) {
    variable._invalidate = resolve;
  });
}
__name(variable_invalidator, "variable_invalidator");
function variable_intersector(invalidation, variable) {
  let node = typeof IntersectionObserver === "function" && variable._observer && variable._observer._node;
  let visible = !node, resolve = noop, reject = noop, promise, observer;
  if (node) {
    observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting) && (promise = null, resolve()));
    observer.observe(node);
    invalidation.then(() => (observer.disconnect(), observer = null, reject()));
  }
  return function(value) {
    if (visible) return Promise.resolve(value);
    if (!observer) return Promise.reject();
    if (!promise) promise = new Promise((y, n) => (resolve = y, reject = n));
    return promise.then(() => value);
  };
}
__name(variable_intersector, "variable_intersector");
function variable_compute(variable) {
  variable._invalidate();
  variable._invalidate = noop;
  variable._pending();
  const value0 = variable._value;
  const version = ++variable._version;
  const inputs = variable._inputs;
  const definition = variable._definition;
  let invalidation = null;
  const promise = variable._promise = variable._promise.then(init, init).then(define4).then(generate);
  function init() {
    return Promise.all(inputs.map(variable_value));
  }
  __name(init, "init");
  function define4(inputs2) {
    if (variable._version !== version) throw variable_stale;
    for (let i = 0, n = inputs2.length; i < n; ++i) {
      switch (inputs2[i]) {
        case variable_invalidation: {
          inputs2[i] = invalidation = variable_invalidator(variable);
          break;
        }
        case variable_visibility: {
          if (!invalidation) invalidation = variable_invalidator(variable);
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
  __name(define4, "define");
  function generate(value) {
    if (variable._version !== version) throw variable_stale;
    if (generatorish(value)) {
      (invalidation || variable_invalidator(variable)).then(variable_return(value));
      return variable_generate(variable, version, value);
    }
    return value;
  }
  __name(generate, "generate");
  promise.then((value) => {
    variable._value = value;
    variable._fulfilled(value);
  }, (error) => {
    if (error === variable_stale || variable._version !== version) return;
    variable._value = void 0;
    variable._rejected(error);
  });
}
__name(variable_compute, "variable_compute");
function variable_generate(variable, version, generator) {
  const runtime = variable._module._runtime;
  let currentValue;
  function compute(onfulfilled) {
    return new Promise((resolve) => resolve(generator.next(currentValue))).then(({ done, value }) => {
      return done ? void 0 : Promise.resolve(value).then(onfulfilled);
    });
  }
  __name(compute, "compute");
  function recompute() {
    const promise = compute((value) => {
      if (variable._version !== version) throw variable_stale;
      currentValue = value;
      postcompute(value, promise).then(() => runtime._precompute(recompute));
      variable._fulfilled(value);
      return value;
    });
    promise.catch((error) => {
      if (error === variable_stale || variable._version !== version) return;
      postcompute(void 0, promise);
      variable._rejected(error);
    });
  }
  __name(recompute, "recompute");
  function postcompute(value, promise) {
    variable._value = value;
    variable._promise = promise;
    variable._outputs.forEach(runtime._updates.add, runtime._updates);
    return runtime._compute();
  }
  __name(postcompute, "postcompute");
  return compute((value) => {
    if (variable._version !== version) throw variable_stale;
    currentValue = value;
    runtime._precompute(recompute);
    return value;
  });
}
__name(variable_generate, "variable_generate");
function variable_error(variable, error) {
  variable._invalidate();
  variable._invalidate = noop;
  variable._pending();
  ++variable._version;
  variable._indegree = NaN;
  (variable._promise = Promise.reject(error)).catch(noop);
  variable._value = void 0;
  variable._rejected(error);
}
__name(variable_error, "variable_error");
function variable_return(generator) {
  return function() {
    generator.return();
  };
}
__name(variable_return, "variable_return");
function variable_reachable(variable) {
  if (variable._observer !== no_observer) return true;
  const outputs = new Set(variable._outputs);
  for (const output of outputs) {
    if (output._observer !== no_observer) return true;
    output._outputs.forEach(outputs.add, outputs);
  }
  return false;
}
__name(variable_reachable, "variable_reachable");
function window_global(name) {
  return globalThis[name];
}
__name(window_global, "window_global");

// worker.js
import { DurableObject } from "cloudflare:workers";

// ../node_modules/quickjs-emscripten-core/dist/index.mjs
init_chunk_V2S4ZYJR();
init_dist();
async function newQuickJSWASMModuleFromVariant(variantOrPromise) {
  let variant2 = smartUnwrap(await variantOrPromise), [wasmModuleLoader, QuickJSFFI2, { QuickJSWASMModule: QuickJSWASMModule2 }] = await Promise.all([variant2.importModuleLoader().then(smartUnwrap), variant2.importFFI(), Promise.resolve().then(() => (init_module_ES6BEMUI(), module_ES6BEMUI_exports)).then(smartUnwrap)]), wasmModule2 = await wasmModuleLoader();
  wasmModule2.type = "sync";
  let ffi = new QuickJSFFI2(wasmModule2);
  return new QuickJSWASMModule2(wasmModule2, ffi);
}
__name(newQuickJSWASMModuleFromVariant, "newQuickJSWASMModuleFromVariant");
function smartUnwrap(val) {
  return val && "default" in val && val.default ? val.default && "default" in val.default && val.default.default ? val.default.default : val.default : val;
}
__name(smartUnwrap, "smartUnwrap");
function newVariant(baseVariant, options) {
  return { ...baseVariant, async importModuleLoader() {
    let moduleLoader = smartUnwrap(await baseVariant.importModuleLoader());
    return async function() {
      let moduleLoaderArg = options.emscriptenModule ? { ...options.emscriptenModule } : {}, log2 = options.log ?? ((...args) => debugLog("newVariant moduleLoader:", ...args)), tapValue = /* @__PURE__ */ __name((message, val) => (log2(...message, val), val), "tapValue"), force = /* @__PURE__ */ __name((val) => typeof val == "function" ? val() : val, "force");
      (options.wasmLocation || options.wasmSourceMapLocation || options.locateFile) && (moduleLoaderArg.locateFile = (fileName, relativeTo) => {
        let args = { fileName, relativeTo };
        if (fileName.endsWith(".wasm") && options.wasmLocation !== void 0) return tapValue(["locateFile .wasm: provide wasmLocation", args], options.wasmLocation);
        if (fileName.endsWith(".map")) {
          if (options.wasmSourceMapLocation !== void 0) return tapValue(["locateFile .map: provide wasmSourceMapLocation", args], options.wasmSourceMapLocation);
          if (options.wasmLocation && !options.locateFile) return tapValue(["locateFile .map: infer from wasmLocation", args], options.wasmLocation + ".map");
        }
        return options.locateFile ? tapValue(["locateFile: use provided fn", args], options.locateFile(fileName, relativeTo)) : tapValue(["locateFile: unhandled, passthrough", args], fileName);
      }), options.wasmBinary && (moduleLoaderArg.wasmBinary = await force(options.wasmBinary)), options.wasmMemory && (moduleLoaderArg.wasmMemory = await force(options.wasmMemory));
      let optionsWasmModule = options.wasmModule, modulePromise;
      optionsWasmModule && (moduleLoaderArg.instantiateWasm = async (imports, onSuccess) => {
        modulePromise ?? (modulePromise = Promise.resolve(force(optionsWasmModule)));
        let wasmModule2 = await modulePromise;
        if (!wasmModule2) throw new QuickJSEmscriptenModuleError(`options.wasmModule returned ${String(wasmModule2)}`);
        let instance = await WebAssembly.instantiate(wasmModule2, imports);
        return onSuccess(instance), instance.exports;
      }), moduleLoaderArg.monitorRunDependencies = (left) => {
        log2("monitorRunDependencies:", left);
      }, moduleLoaderArg.quickjsEmscriptenInit = () => newMockExtensions(log2);
      let resultPromise = moduleLoader(moduleLoaderArg), extensions = moduleLoaderArg.quickjsEmscriptenInit?.(log2);
      if (optionsWasmModule && extensions?.receiveWasmOffsetConverter && !extensions.existingWasmOffsetConverter) {
        let wasmBinary = await force(options.wasmBinary) ?? new ArrayBuffer(0);
        modulePromise ?? (modulePromise = Promise.resolve(force(optionsWasmModule)));
        let wasmModule2 = await modulePromise;
        if (!wasmModule2) throw new QuickJSEmscriptenModuleError(`options.wasmModule returned ${String(wasmModule2)}`);
        extensions.receiveWasmOffsetConverter(wasmBinary, wasmModule2);
      }
      if (extensions?.receiveSourceMapJSON) {
        let loadedSourceMapData = await force(options.wasmSourceMapData);
        typeof loadedSourceMapData == "string" ? extensions.receiveSourceMapJSON(JSON.parse(loadedSourceMapData)) : loadedSourceMapData ? extensions.receiveSourceMapJSON(loadedSourceMapData) : extensions.receiveSourceMapJSON({ version: 3, names: [], sources: [], mappings: "" });
      }
      return resultPromise;
    };
  } };
}
__name(newVariant, "newVariant");
function newMockExtensions(log2) {
  let mockMessage = "mock called, emscripten module may not be initialized yet";
  return { mock: true, removeRunDependency(name) {
    log2(`${mockMessage}: removeRunDependency called:`, name);
  }, receiveSourceMapJSON(data) {
    log2(`${mockMessage}: receiveSourceMapJSON called:`, data);
  }, WasmOffsetConverter: void 0, receiveWasmOffsetConverter(bytes, mod) {
    log2(`${mockMessage}: receiveWasmOffsetConverter called:`, bytes, mod);
  } };
}
__name(newMockExtensions, "newMockExtensions");

// ../node_modules/@jitl/quickjs-wasmfile-release-sync/dist/index.mjs
var variant = { type: "sync", importFFI: /* @__PURE__ */ __name(() => Promise.resolve().then(() => (init_ffi(), ffi_exports)).then((mod) => mod.QuickJSFFI), "importFFI"), importModuleLoader: /* @__PURE__ */ __name(() => Promise.resolve().then(() => __toESM(require_emscripten_module_cloudflare(), 1)).then((mod) => mod.default), "importModuleLoader") };
var src_default = variant;

// worker.js
import wasmModule from "./02028007bab4b877246b6f1a77434d1ce18122e5-quickjs.wasm";
import runtimeSrc from "./5b45f058f6be32b08d22b3c78bb2ddef58fb72b1-runtime.iife.txt";

// rc5-core.js
var _title = /* @__PURE__ */ __name(function _title2(md) {
  return md`# robocoop-5-core
The DOM-free brain of robocoop-5: the explicit-completion tool-use loop (\`createAgentSession\`, with
the \`completeGuard\` veto hook), the OpenRouter client factory, \`defineTool\`, \`composeFooter\` and the
pure transcript formatters. No bash, no DOM, no fetch at module scope.`;
}, "_title");
var _doc_composeFooter = /* @__PURE__ */ __name(function _doc_composeFooter2(md) {
  return md`### \`composeFooter({workdir, model})\`
Standard system-prompt footer (working directory + model line) appended by the engine's editable
prompt view.`;
}, "_doc_composeFooter");
var _doc_truncate = /* @__PURE__ */ __name(function _doc_truncate2(md) {
  return md`### \`truncate(text, limit)\`
Head+tail cap: keeps the first and last halves of \`limit\`, replacing the middle with a marker, so a
1MB \`cat\` can't blow the model context. Returns \`text\` unchanged when within \`limit\`.`;
}, "_doc_truncate");
var _truncate = /* @__PURE__ */ __name(function _truncate2() {
  return /* @__PURE__ */ __name((function truncate(text, limit) {
    const s = String(text ?? "");
    if (!limit || s.length <= limit) return s;
    const head = Math.ceil(limit / 2);
    const tail = Math.floor(limit / 2);
    const cut = s.length - head - tail;
    return s.slice(0, head) + "\n...[" + cut + " bytes truncated \u2014 use grep/sed to narrow]...\n" + s.slice(s.length - tail);
  }), "truncate");
}, "_truncate");
var _doc_defineTool = /* @__PURE__ */ __name(function _doc_defineTool2(md) {
  return md`### \`defineTool({id, description, parameters, execute})\`
Normalise a tool: validates the four fields, then wraps \`execute\` so it (a) short-circuits on an
aborted signal, (b) always resolves to \`{title, output:string, metadata}\`, and (c) turns thrown
errors into an \`Error: …\` output instead of rejecting. The loop calls \`tool.execute(args, ctx)\`.`;
}, "_doc_defineTool");
var _defineTool = /* @__PURE__ */ __name(function _defineTool2() {
  return /* @__PURE__ */ __name((function defineTool({ id, description, parameters, execute }) {
    if (!id || typeof id !== "string") throw new Error("Tool must have a string id");
    if (!description || typeof description !== "string")
      throw new Error("Tool must have a string description");
    if (!parameters || typeof parameters !== "object")
      throw new Error("Tool must have a parameters object");
    if (!execute || typeof execute !== "function")
      throw new Error("Tool must have an execute function");
    return {
      id,
      description,
      parameters,
      execute: /* @__PURE__ */ __name(async (args, ctx) => {
        try {
          if (ctx?.abort?.aborted)
            return { title: id + " aborted", output: "Execution was aborted", metadata: { aborted: true } };
          const result = await execute(args, ctx);
          return {
            title: result.title || id + " completed",
            output: typeof result.output === "string" ? result.output : JSON.stringify(result.output),
            metadata: { ...ctx?.getMetadata?.() || {}, ...result.metadata }
          };
        } catch (error) {
          return {
            title: id + " failed",
            output: "Error: " + error.message,
            metadata: { error: true, errorMessage: error.message }
          };
        }
      }, "execute")
    };
  }), "defineTool");
}, "_defineTool");
var _doc_createOpenRouterClient = /* @__PURE__ */ __name(function _doc_createOpenRouterClient2(md) {
  return md`### \`createOpenRouterClient({apiKey, fetch, referer, title, defaultModel})\`
OpenRouter chat-completions client (OpenAI wire format). Non-streaming today (\`stream:false\`);
returns \`{message, finish_reason, raw}\` with the assistant message **verbatim** incl. any
\`tool_calls\`. \`fetch\`/key are pluggable; \`fetch\` defaults to \`globalThis.fetch\`.`;
}, "_doc_createOpenRouterClient");
var _createOpenRouterClient = /* @__PURE__ */ __name(function _createOpenRouterClient2(globalThis2) {
  return /* @__PURE__ */ __name((function createOpenRouterClient({
    apiKey = globalThis2.process && globalThis2.process.env ? globalThis2.process.env.OPENROUTER_API_KEY : void 0,
    fetch: fetch2 = globalThis2.fetch,
    baseUrl = "https://openrouter.ai/api/v1",
    referer,
    title,
    defaultModel = "anthropic/claude-sonnet-4",
    // No `data:` line for this long = a dead request: abort and retry. Comment lines do not count — OpenRouter
    // sends ": OPENROUTER PROCESSING" every ~0.4 s while it waits on the provider, however long that is.
    streamIdleMs = 18e4,
    // Thinking with no visible output (content or tool call) for this long: abort and re-ask the same step with
    // the next, cheaper reasoning block. mimo-v2.5-pro reasoned 5-14 min on 6 of 98 sampled steps
    // (2026-09-28), across providers; `reasoning.max_tokens` was not honoured, `effort: 'low'` was. null disables.
    reasoningBudgetMs = 18e4,
    reasoningFallbacks = [{ effort: "low" }, { enabled: false }],
    cacheModels
    // optional Set<modelId> needing explicit cache_control; auto-detected from /models if omitted
  } = {}) {
    if (typeof fetch2 !== "function") {
      throw new Error("createOpenRouterClient: no fetch available (pass {fetch})");
    }
    let cacheableIds = cacheModels instanceof Set ? cacheModels : null;
    if (!cacheableIds) {
      Promise.resolve().then(() => fetch2(`${baseUrl}/models`)).then((r) => r && r.ok ? r.json() : null).then((j) => {
        if (j && Array.isArray(j.data)) cacheableIds = new Set(j.data.filter((m) => m && m.pricing && "input_cache_read" in m.pricing).map((m) => m.id));
      }).catch(() => {
      });
    }
    const supportsCacheControl = /* @__PURE__ */ __name((model) => cacheableIds ? cacheableIds.has(model) : /anthropic|claude|qwen/i.test(model || ""), "supportsCacheControl");
    const headers = /* @__PURE__ */ __name(() => {
      const h = { "Content-Type": "application/json" };
      const key = String(apiKey ?? "").trim();
      if (key) h.Authorization = `Bearer ${key}`;
      if (referer) h["HTTP-Referer"] = referer;
      if (title) h["X-Title"] = title;
      return h;
    }, "headers");
    async function chat({ model = defaultModel, messages, tools, tool_choice = "auto", temperature, seed, reasoning, max_tokens, signal, onReasoningToken } = {}) {
      if (!model) throw new Error("no model selected (the model picker is empty \u2014 wait for the model catalog to load, then pick a model)");
      let outMessages = messages;
      if (Array.isArray(messages) && messages.length && supportsCacheControl(model)) {
        const mark = /* @__PURE__ */ __name((msg) => {
          if (!msg) return msg;
          if (typeof msg.content === "string") return { ...msg, content: [{ type: "text", text: msg.content, cache_control: { type: "ephemeral" } }] };
          if (Array.isArray(msg.content) && msg.content.length) {
            const c = msg.content.slice();
            c[c.length - 1] = { ...c[c.length - 1], cache_control: { type: "ephemeral" } };
            return { ...msg, content: c };
          }
          return msg;
        }, "mark");
        outMessages = messages.slice();
        if (outMessages[0] && outMessages[0].role === "system") outMessages[0] = mark(outMessages[0]);
        const lastIdx = outMessages.length - 1;
        if (lastIdx > 0) outMessages[lastIdx] = mark(outMessages[lastIdx]);
      }
      const body = {
        model,
        messages: outMessages,
        stream: false,
        // ask OpenRouter to return token counts AND the actual USD cost of the call in `usage`.
        usage: { include: true },
        ...tools && tools.length ? { tools, tool_choice } : {},
        ...temperature != null ? { temperature } : {},
        ...seed != null ? { seed } : {},
        ...reasoning != null ? { reasoning } : {},
        ...max_tokens != null ? { max_tokens } : {}
      };
      const retriable = /* @__PURE__ */ __name((e) => !/come back tomorrow/i.test(String(e && e.message || e)) && /Failed to fetch|NetworkError|network error|load failed|stream error|stream idle|Upstream error|overloaded|ECONNRESET|OpenRouter (408|429|5\d\d)/i.test(String(e && e.message || e)), "retriable");
      let lastErr;
      const STREAM_IDLE_MS = streamIdleMs;
      let thinkLevel = 0, overBudget = false;
      for (let attempt2 = 0; attempt2 < 8; attempt2++) {
        if (attempt2 && !overBudget) await new Promise((r) => setTimeout(r, Math.min(6e4, 1e3 * 2 ** attempt2) + Math.random() * 1e3));
        if (signal && signal.aborted) throw lastErr || new Error("aborted");
        let watchdog;
        try {
          const ctrl = new AbortController();
          const onAbort = /* @__PURE__ */ __name(() => ctrl.abort(), "onAbort");
          if (signal) signal.addEventListener("abort", onAbort, { once: true });
          const sentAt = Date.now();
          let lastData = sentAt, rejectIdle, thought = false, visible = false;
          overBudget = false;
          const idleP = new Promise((_, rej) => {
            rejectIdle = rej;
          });
          idleP.catch(() => {
          });
          const canFallBack = reasoningBudgetMs != null && thinkLevel < reasoningFallbacks.length;
          watchdog = setInterval(() => {
            if (canFallBack && thought && !visible && Date.now() - sentAt >= reasoningBudgetMs) {
              clearInterval(watchdog);
              overBudget = true;
              rejectIdle(new Error("OpenRouter reasoning over budget: no visible output after " + reasoningBudgetMs + "ms"));
              ctrl.abort();
              return;
            }
            if (Date.now() - lastData < STREAM_IDLE_MS) return;
            clearInterval(watchdog);
            rejectIdle(new Error("OpenRouter stream idle: no data for " + STREAM_IDLE_MS + "ms"));
            ctrl.abort();
          }, Math.min(1e3, STREAM_IDLE_MS, reasoningBudgetMs ?? Infinity));
          const idle = /* @__PURE__ */ __name((p) => Promise.race([p, idleP]), "idle");
          const res = await idle(fetch2(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({ ...body, ...thinkLevel ? { reasoning: reasoningFallbacks[thinkLevel - 1] } : {}, stream: true }),
            signal: ctrl.signal
          })).catch((e) => {
            if (signal) signal.removeEventListener("abort", onAbort);
            throw e;
          });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            let detail = text;
            try {
              const j = JSON.parse(text);
              detail = j?.error?.message || text;
            } catch {
            }
            throw new Error("OpenRouter " + res.status + ": " + detail);
          }
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "", sawChoice = false, finish = null, native = null, usage = null, provider = null;
          const acc = { content: "", tool_calls: [], reasoning: "" };
          const t0 = Date.now();
          const timings = { startedAt: t0, firstDeltaMs: null, firstReasoningMs: null, firstVisibleMs: null, endMs: null, attempt: attempt2 + 1, reasoningFallback: thinkLevel ? reasoningFallbacks[thinkLevel - 1] : null };
          for (; ; ) {
            const { done, value } = await idle(reader.read()).catch((e) => {
              if (signal) signal.removeEventListener("abort", onAbort);
              throw e;
            });
            if (done) {
              clearInterval(watchdog);
              if (signal) signal.removeEventListener("abort", onAbort);
              break;
            }
            buf += decoder.decode(value, { stream: true });
            let nl;
            while ((nl = buf.indexOf("\n")) >= 0) {
              const line = buf.slice(0, nl).trim();
              buf = buf.slice(nl + 1);
              if (!line.startsWith("data: ")) continue;
              lastData = Date.now();
              const payload = line.slice(6);
              if (payload === "[DONE]") continue;
              let j;
              try {
                j = JSON.parse(payload);
              } catch {
                continue;
              }
              const c = j.choices && j.choices[0];
              if (c) {
                sawChoice = true;
                const d = c.delta || {};
                if (timings.firstDeltaMs == null) timings.firstDeltaMs = Date.now() - t0;
                const rd = typeof d.reasoning === "string" ? d.reasoning : typeof d.reasoning_content === "string" ? d.reasoning_content : null;
                if (rd) {
                  thought = true;
                  if (timings.firstReasoningMs == null) timings.firstReasoningMs = Date.now() - t0;
                  acc.reasoning += rd;
                  if (typeof onReasoningToken === "function") {
                    try {
                      onReasoningToken(rd);
                    } catch (e) {
                    }
                  }
                }
                if (typeof d.content === "string" && d.content || Array.isArray(d.tool_calls) && d.tool_calls.length) {
                  visible = true;
                  if (timings.firstVisibleMs == null) timings.firstVisibleMs = Date.now() - t0;
                }
                if (typeof d.content === "string") acc.content += d.content;
                if (Array.isArray(d.tool_calls)) {
                  for (const tc of d.tool_calls) {
                    const i = tc.index ?? 0;
                    const slot = acc.tool_calls[i] || (acc.tool_calls[i] = { id: "", type: "function", function: { name: "", arguments: "" } });
                    if (tc.id) slot.id = tc.id;
                    if (tc.function && tc.function.name) slot.function.name += tc.function.name;
                    if (tc.function && typeof tc.function.arguments === "string") slot.function.arguments += tc.function.arguments;
                  }
                }
                if (c.finish_reason) finish = c.finish_reason;
                if (c.native_finish_reason) native = c.native_finish_reason;
              }
              if (j.usage) usage = j.usage;
              if (j.provider) provider = j.provider;
              if (j.error) throw new Error("OpenRouter stream error: " + (j.error.message || JSON.stringify(j.error)));
            }
          }
          if (!sawChoice) throw new Error("OpenRouter: no choices in stream");
          timings.endMs = Date.now() - t0;
          const message = { role: "assistant", content: acc.content || null };
          const calls = acc.tool_calls.filter(Boolean);
          if (calls.length) message.tool_calls = calls;
          if (acc.reasoning) Object.defineProperty(message, "reasoning", { value: acc.reasoning, enumerable: false, configurable: true, writable: true });
          return { message, finish_reason: finish, native_finish_reason: native, usage, provider, reasoning: acc.reasoning || null, timings, raw: { streamed: true } };
        } catch (e) {
          clearInterval(watchdog);
          if (overBudget && !(signal && signal.aborted)) {
            thinkLevel++;
            if (typeof onReasoningToken === "function") {
              try {
                onReasoningToken("\n[no answer after " + Math.round(reasoningBudgetMs / 1e3) + " s of thinking: asking again with reasoning " + JSON.stringify(reasoningFallbacks[thinkLevel - 1]) + "]\n");
              } catch (_) {
              }
            }
            lastErr = e;
            continue;
          }
          if (e && e.name === "AbortError" || signal && signal.aborted || !retriable(e)) throw e;
          lastErr = e;
        }
      }
      throw lastErr;
    }
    __name(chat, "chat");
    return { chat };
  }), "createOpenRouterClient");
}, "_createOpenRouterClient");
var _doc_createAgentSession = /* @__PURE__ */ __name(function _doc_createAgentSession2(md) {
  return md`### \`createAgentSession({client, toolsProvider, systemPromptProvider, modelProvider, runCommand, …})\`
The persistent, live-resolved conversation. \`messages\` persists across \`send()\` calls (one long
chat). Tools, model and system prompt are re-read from their PROVIDERS at the top of **every step**,
so a notebook can register a new tool mid-conversation and it is offered on the next model turn with
no restart. Loop invariants: assistant turns appended verbatim, exactly one \`{role:'tool'}\` reply
per \`tool_calls[]\` entry, defensive JSON arg parse, central [\`truncate\`](#) of tool output.

LIVE CONTROL: \`steer(input)\` injects a user message into the RUNNING turn and aborts the in-flight model
call so it is read on the next step (the model is re-read each step, so switching the model picker mid-turn
applies on the next call); \`interrupt()\` aborts the in-flight call without injecting (used to apply a model
switch immediately); \`abort()\` hard-stops the whole turn. Returns \`{messages, send, abort, reset, interrupt, steer}\`.`;
}, "_doc_createAgentSession");
var _createAgentSession = /* @__PURE__ */ __name(function _createAgentSession2(AbortController2, truncate) {
  function toWireTool(t) {
    return {
      type: "function",
      function: {
        name: t.id,
        description: String(t.description ?? ""),
        parameters: t.parameters ?? { type: "object", properties: {}, required: [] }
      }
    };
  }
  __name(toWireTool, "toWireTool");
  return /* @__PURE__ */ __name(function createAgentSession({
    client,
    tools,
    toolsProvider,
    systemPrompt,
    systemPromptProvider,
    model,
    modelProvider,
    maxStepsPerTurn = 12,
    maxTokens = 8192,
    // Sampling, all opt-in: each is forwarded to client.chat() ONLY when non-null, so leaving them unset
    // keeps the provider's default (and keeps the request byte-identical to before this option existed).
    // temperature/seed pin sampling for reproducibility and for arm-matched benchmark runs (a baseline that
    // pins T=0 against an arm on the provider default is not a controlled comparison). CAVEAT: mimo-v2.5-pro
    // in thinking mode (its default) IGNORES temperature/top_p, so on mimo these change nothing — they are
    // real for the other models in the picker.
    temperature = null,
    seed = null,
    // Opaque OpenRouter `reasoning` block, forwarded verbatim when non-null (e.g. {enabled:false} to buy
    // ~-43% wall / -48% completion tokens on a thinking model, at an unmeasured quality cost). Opaque on
    // purpose: the provider owns this schema, the loop just carries it.
    reasoning = null,
    // Live-resolved reasoning: reasoningProvider() → the block to send (or null), re-read at the top of
    // every send(). Same idiom as modelProvider — a UI toggle can flip fast mode WITHOUT rebuilding the
    // session (a rebuild would wipe the chat history). Falls back to the static `reasoning` above.
    reasoningProvider = null,
    toolChoice = "auto",
    toolOutputLimit = 8e3,
    runCommand,
    completeToolName = null,
    // Opt-in veto over the completion signal: completeGuard({step, toolCallsThisTurn, summary, text,
    // toolNames}) returns a string to REJECT this task_complete (pushed as the tool result so the model
    // reads why) or null to accept. Applied at most ONCE per turn, so a model that insists can still end
    // the turn on its second call — the guard pushes back on premature/fabricated completion without
    // risking a livelock. `text` is the assistant message's own content on this step and `toolNames` are
    // the ids of the tools ACTUALLY registered right now, so a guard can address the user's real session
    // instead of a hardcoded tool list (see zeroToolCallGate).
    completeGuard = null,
    stallNudgeLimit = 0,
    malformedRetryLimit = 4,
    nudgeMessage,
    // Out-of-band per-STEP channel: noticesProvider({step, turn}) → string[] | null, called SYNCHRONOUSLY at
    // the top of every step (never awaited — whatever it returns must already be computed). Each line is
    // pushed as a system message before the model call. This is the seam ambient monitors ride on.
    noticesProvider,
    // Situational context (opt-in): contextProvider({scope, turn}) → string|null|Promise. Called with
    // scope 'session' once (result spliced right after the system prompt, so it lives in the cached
    // prefix) and scope 'turn' at the start of every send() (result pushed as a system message BEFORE
    // the user message, so the user's words stay last). A throw or null injects nothing.
    contextProvider = null
  } = {}) {
    if (!client || typeof client.chat !== "function")
      throw new Error("createAgentSession requires a client with a chat() method");
    const getTools = toolsProvider ?? (() => tools ?? []);
    const getSystemPrompt = systemPromptProvider ?? (() => systemPrompt ?? null);
    const getReasoning = reasoningProvider ?? (() => reasoning);
    const rawGetModel = modelProvider ?? (() => model);
    let lastModel = null;
    const getModel = /* @__PURE__ */ __name(() => {
      const m = rawGetModel();
      const s = m == null ? "" : String(m).trim();
      if (s) {
        lastModel = s;
        return s;
      }
      return lastModel;
    }, "getModel");
    const completeSpec = completeToolName ? {
      type: "function",
      function: {
        name: completeToolName,
        description: "Call this to END YOUR TURN: when the task is fully complete, when you have finished answering, or when you are BLOCKED on something only the user can provide (missing information, a decision, credentials). Put your summary, final answer, or QUESTION TO THE USER in `summary` \u2014 the user cannot see or answer anything until your turn ends, so ending the turn IS how you ask. Never keep taking tool actions while waiting on the user.",
        parameters: { type: "object", properties: { summary: { type: "string", description: "Short summary / final answer shown to the user." } }, required: [] }
      }
    } : null;
    const nudge = nudgeMessage ?? "You ended your turn without calling a tool. If the task is complete, call " + (completeToolName || "the completion tool") + " with a short summary. If you need information or a decision from the user, call it with your question as the summary \u2014 the user only sees it when your turn ends. Otherwise keep going \u2014 call a tool to take the next concrete step; do not just describe what you will do.";
    const messages = [];
    let currentAbort = null;
    let turnCount = 0;
    let sessionContextInjected = false;
    const usage = { calls: 0, promptTokens: 0, completionTokens: 0, cachedTokens: 0, reasoningTokens: 0, reasoningChars: 0, costUSD: 0, providers: {} };
    const usageSnapshot = /* @__PURE__ */ __name(() => ({ ...usage, providers: { ...usage.providers } }), "usageSnapshot");
    let stepAbort = null;
    const steerQueue = [];
    function abort() {
      currentAbort?.abort();
    }
    __name(abort, "abort");
    function interrupt() {
      stepAbort?.abort();
    }
    __name(interrupt, "interrupt");
    function buildUserMessage(input) {
      let userText = input, images = null;
      if (input && typeof input === "object" && !Array.isArray(input)) {
        userText = input.text ?? null;
        images = input.images || null;
      }
      if (images && images.length) {
        const parts = [];
        if (userText != null) parts.push({ type: "text", text: String(userText) });
        for (const url of images) if (url) parts.push({ type: "image_url", image_url: { url } });
        return parts.length ? { role: "user", content: parts } : null;
      }
      return userText != null ? { role: "user", content: String(userText) } : null;
    }
    __name(buildUserMessage, "buildUserMessage");
    function steer(input) {
      const m = buildUserMessage(input);
      if (m) {
        steerQueue.push(m);
        interrupt();
      }
    }
    __name(steer, "steer");
    function reset() {
      messages.length = 0;
      steerQueue.length = 0;
      turnCount = 0;
      sessionContextInjected = false;
    }
    __name(reset, "reset");
    async function send(input, callbacks = {}, overrides = {}) {
      const turnTemperature = overrides.temperature !== void 0 ? overrides.temperature : temperature;
      const turnSeed = overrides.seed !== void 0 ? overrides.seed : seed;
      let providedReasoning = null;
      try {
        providedReasoning = getReasoning();
      } catch (e) {
      }
      const turnReasoning = overrides.reasoning !== void 0 ? overrides.reasoning : providedReasoning;
      const um = buildUserMessage(input);
      const abortController = new AbortController2();
      currentAbort = abortController;
      let metadata = {};
      const pendingImages = [];
      const ctx = {
        callId: null,
        abort: abortController.signal,
        runCommand,
        metadata: /* @__PURE__ */ __name((u) => {
          metadata = { ...metadata, ...u };
        }, "metadata"),
        getMetadata: /* @__PURE__ */ __name(() => metadata, "getMetadata"),
        // A tool (e.g. view_image) calls this to feed an image into the conversation; queued here and pushed
        // as a user image-message after the current tool batch, so the model sees it on the next step.
        attachImage: /* @__PURE__ */ __name((url) => {
          if (url) pendingImages.push(url);
        }, "attachImage")
      };
      const sp = getSystemPrompt();
      if (sp != null) {
        const LOOP_PRINCIPLES = "\n\nOPERATING PRINCIPLES (always active):\n- Target check before hard-to-undo actions (external mutations, purchases, cancellations, sends, deletions): name the exact target entity first. If MORE THAN ONE entity could plausibly match the request, or you have not examined all plausible candidates, resolve the ambiguity before acting \u2014 inspect the candidates, or ask the user when only they can disambiguate. Records you have NOT opened count as unexamined candidates: a match is only unique once you have surveyed every record that could contain the target. Never resolve ambiguity by taking the first match. When the survey is complete and exactly one candidate matches, proceed without asking.\n- Multi-part requests: when a request contains several distinct deliverables or changes, enumerate them explicitly up front, and before finishing check each part off \u2014 partial completion otherwise passes unnoticed. Skip this for single-part requests. A part you are NOT permitted to do is checked off by SAYING SO: declining it under a stated policy, or asking the user for what only they can supply, completes that part \u2014 never substitute a nearby action you were not asked for.";
        const m = { role: "system", content: String(sp) + LOOP_PRINCIPLES };
        if (messages[0]?.role === "system") messages[0] = m;
        else messages.unshift(m);
      }
      if (um) messages.push(um);
      turnCount++;
      if (contextProvider) {
        if (!sessionContextInjected) {
          let sc = null;
          try {
            sc = await contextProvider({ scope: "session", turn: turnCount });
          } catch (e) {
          }
          if (sc) {
            messages.splice(messages[0]?.role === "system" ? 1 : 0, 0, { role: "system", content: String(sc) });
            sessionContextInjected = true;
            callbacks.onContext?.("session", String(sc));
          }
        }
        let tc = null;
        try {
          tc = await contextProvider({ scope: "turn", turn: turnCount });
        } catch (e) {
        }
        if (tc) {
          messages.splice(messages.length - (um ? 1 : 0), 0, { role: "system", content: String(tc) });
          callbacks.onContext?.("turn", String(tc));
        }
      }
      const pushToolResult = /* @__PURE__ */ __name((callId, content) => {
        messages.push({ role: "tool", tool_call_id: callId, content });
        callbacks.onToolResult?.(callId, content);
      }, "pushToolResult");
      let finishReason = null;
      let step = 0;
      let stalls = 0;
      let malformed = 0;
      let turnToolCalls = 0;
      let completeVetoed = false;
      let batchVetoed = false;
      const startLen = messages.length;
      const dropImages = /* @__PURE__ */ __name(() => {
        let n = 0;
        for (const m of messages) if (Array.isArray(m.content)) m.content = m.content.map((p) => p && p.type === "image_url" ? (n++, { type: "text", text: "[image not shown: the model takes text only]" }) : p);
        return n;
      }, "dropImages");
      for (step = 0; step < maxStepsPerTurn; step++) {
        if (abortController.signal.aborted) {
          finishReason = "aborted";
          break;
        }
        callbacks.onStep?.(step, messages);
        if (noticesProvider) {
          let notices;
          try {
            notices = noticesProvider({ step, turn: turnCount });
          } catch (e) {
            notices = null;
          }
          if (notices && notices.length) {
            messages.push({ role: "system", content: "Watch updates (live values changed since your last step):\n" + notices.join("\n") });
            callbacks.onNotice?.(notices);
          }
        }
        if (steerQueue.length) {
          for (const sm of steerQueue.splice(0)) {
            messages.push(sm);
            callbacks.onSteer?.(sm);
          }
        }
        const live = getTools() ?? [];
        const wire = completeSpec ? [...live.map(toWireTool), completeSpec] : live.map(toWireTool);
        const byId = new Map(live.map((t) => [t.id, t]));
        const stepController = new AbortController2();
        stepAbort = stepController;
        if (abortController.signal.aborted) stepController.abort();
        const linkTurnAbort = /* @__PURE__ */ __name(() => stepController.abort(), "linkTurnAbort");
        abortController.signal.addEventListener("abort", linkTurnAbort, { once: true });
        let res;
        try {
          res = await client.chat({
            // an assistant turn with no content and no tool call (reasoning cut off at the token limit) stays
            // in the transcript for display; on the wire it is invalid and providers 400 the whole request
            model: getModel(),
            messages: messages.filter((m) => !(m.role === "assistant" && m.content == null && !m.tool_calls?.length)),
            tools: wire,
            tool_choice: toolChoice,
            max_tokens: maxTokens,
            ...turnTemperature != null ? { temperature: turnTemperature } : {},
            ...turnSeed != null ? { seed: turnSeed } : {},
            ...turnReasoning != null ? { reasoning: turnReasoning } : {},
            // Live reasoning stream (opt-in, additive): forwarded only when the caller actually wants it, so
            // a client stubbed in a test or written against the old signature sees an unchanged argument set.
            ...typeof callbacks.onReasoningToken === "function" ? { onReasoningToken: /* @__PURE__ */ __name((chunk) => callbacks.onReasoningToken(chunk, step), "onReasoningToken") } : {},
            signal: stepController.signal
          });
        } catch (e) {
          abortController.signal.removeEventListener("abort", linkTurnAbort);
          stepAbort = null;
          if (abortController.signal.aborted) {
            finishReason = "aborted";
            break;
          }
          if (stepController.signal.aborted) {
            callbacks.onInterrupt?.(step);
            continue;
          }
          if (/support image input/i.test(String(e?.message)) && dropImages()) {
            messages.push({ role: "system", content: "The model " + getModel() + " takes text only (" + e.message + '). The image(s) sent since your last step were NOT shown to you and are removed. You have not seen them: do not describe what they show. Check what you need another way (the element through eval_js or inspect_value), and tell the user that seeing an image needs a vision model (one not marked "no vision" in the model menu).' });
            continue;
          }
          throw e;
        }
        abortController.signal.removeEventListener("abort", linkTurnAbort);
        stepAbort = null;
        if (res?.usage) {
          usage.calls += 1;
          usage.promptTokens += res.usage.prompt_tokens || 0;
          usage.completionTokens += res.usage.completion_tokens || 0;
          usage.cachedTokens += res.usage.prompt_tokens_details?.cached_tokens || 0;
          usage.reasoningTokens += res.usage.completion_tokens_details?.reasoning_tokens || 0;
          usage.costUSD += res.usage.cost || 0;
        }
        if (typeof res?.reasoning === "string") usage.reasoningChars += res.reasoning.length;
        if (res?.provider) usage.providers[res.provider] = (usage.providers[res.provider] || 0) + 1;
        const msg = res?.message;
        if (!msg) throw new Error("client.chat returned no message");
        const noContent = !msg.content && !(Array.isArray(msg.tool_calls) && msg.tool_calls.length);
        const isMalformed = noContent && (res.finish_reason === "error" || res.native_finish_reason === "MALFORMED_FUNCTION_CALL");
        if (isMalformed) {
          if (malformed < malformedRetryLimit && step < maxStepsPerTurn - 1) {
            malformed++;
            messages.push({ role: "system", content: "Your previous reply was rejected by the provider as a malformed function call \u2014 it produced no valid tool call and no text. Emit exactly ONE tool call with strictly valid JSON arguments (every string closed, no trailing commas, no comments), or reply with plain text. Keep the call small." });
            callbacks.onMalformed?.(malformed);
            continue;
          }
          finishReason = "error";
          callbacks.onFinish?.({ messages, finishReason });
          break;
        }
        messages.push(msg);
        if (msg.content) callbacks.onText?.(msg.content);
        const calls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
        if (calls.length === 0) {
          const fr = res.finish_reason ?? "stop";
          const prevText = stalls > 0 ? messages.slice(0, -1).reverse().find((m) => m.role === "assistant")?.content : null;
          const words = /* @__PURE__ */ __name((t) => new Set(String(t || "").toLowerCase().match(/[a-z0-9_]{3,}/g) || []), "words");
          const restated = /* @__PURE__ */ __name((a, b) => {
            if (String(a || "").length < 400 || String(b || "").length < 400) return false;
            const A = words(a), B = words(b);
            let n = 0;
            for (const w of A) if (B.has(w)) n++;
            return n / (A.size + B.size - n) >= 0.3;
          }, "restated");
          if (fr === "stop" && restated(prevText, msg.content)) {
            finishReason = "stop";
            callbacks.onFinish?.({ messages, finishReason });
            break;
          }
          if (completeSpec && stalls < stallNudgeLimit && step < maxStepsPerTurn - 1) {
            stalls++;
            const stallMsg = fr === "length" ? "Your reply was cut off at the token limit BEFORE you called a tool \u2014 you are over-thinking. Stop planning and act in ONE small tool call now. Do NOT re-plan and do NOT write_file the whole module again \u2014 that discards the cells you already built. Make the SINGLE next small change with edit_file (add or fix ONE cell), then stop. Only write_file from scratch if the module is still empty." : nudge;
            messages.push({ role: "system", content: stallMsg });
            callbacks.onNudge?.(stalls, stallMsg);
            continue;
          }
          finishReason = fr;
          callbacks.onFinish?.({ messages, finishReason });
          break;
        }
        let completed = false;
        let completeSummary = null;
        for (let ci = 0; ci < calls.length; ci++) {
          const call = calls[ci];
          const callId = call.id || (call.id = "call_" + step + "_" + ci);
          const name = call?.function?.name;
          let args;
          try {
            const raw = call?.function?.arguments;
            args = raw == null || raw === "" ? {} : JSON.parse(raw);
          } catch {
            if (call?.function) call.function.arguments = "{}";
            const content = 'ERROR: your "' + String(name) + '" tool call was cut off \u2014 its arguments were truncated mid-string (you hit the per-turn output limit), so nothing ran. Do not resend such a large call. If the module already exists, ADD or fix ONE cell with a small edit_file \u2014 do NOT write_file the whole module again (that discards the cells you already built). Only when the module does not exist yet, write_file a small compiling skeleton (define() shell + one or two cells), then grow it one cell at a time with edit_file. Keep each tool call small.';
            pushToolResult(callId, content);
            continue;
          }
          if (completeSpec && name === completeToolName) {
            const others = calls.filter((c) => c?.function?.name !== completeToolName).length;
            if (others && !batchVetoed) {
              batchVetoed = true;
              pushToolResult(callId, "NOT ended: " + completeToolName + " was sent in the same step as " + others + " other tool call" + (others === 1 ? "" : "s") + ", so your summary was written before " + (others === 1 ? "its result" : "their results") + " existed. " + (others === 1 ? "It" : "They") + " ran: read the result" + (others === 1 ? "" : "s") + ", act on " + (others === 1 ? "it" : "them") + ", then call " + completeToolName + " on its own.");
              continue;
            }
            if (completeGuard && !completeVetoed) {
              let veto = null;
              try {
                veto = completeGuard({
                  step,
                  toolCallsThisTurn: turnToolCalls,
                  summary: typeof args.summary === "string" ? args.summary : null,
                  // The assistant's own text on this step, and the LIVE registry — a guard that names
                  // tools must name the ones this session actually has (the τ-airline arm unregisters the
                  // file tools, and the old hardcoded "read_file / write_file / …" advertised ghosts).
                  text: typeof msg.content === "string" ? msg.content : null,
                  toolNames: live.map((t) => t.id)
                });
              } catch (e) {
              }
              if (veto) {
                completeVetoed = true;
                pushToolResult(callId, String(veto));
                continue;
              }
            }
            completed = true;
            completeSummary = typeof args.summary === "string" ? args.summary : null;
            pushToolResult(callId, "ok");
            continue;
          }
          const tool = byId.get(name);
          if (!tool) {
            pushToolResult(callId, "ERROR: unknown tool " + String(name));
            continue;
          }
          callbacks.onToolCall?.(callId, name, args);
          turnToolCalls++;
          let output;
          try {
            const r = await tool.execute(args, { ...ctx, callId });
            output = String(r?.output ?? "");
          } catch (e) {
            output = "ERROR: " + (e?.message ?? String(e));
          }
          pushToolResult(callId, truncate(output, toolOutputLimit));
        }
        if (pendingImages.length) {
          messages.push({ role: "user", content: pendingImages.map((url) => ({ type: "image_url", image_url: { url } })) });
          pendingImages.length = 0;
        }
        if (completed) {
          if (completeSummary && !msg.content) messages.push({ role: "assistant", content: completeSummary });
          finishReason = "completed";
          callbacks.onFinish?.({ messages, finishReason });
          break;
        }
        stalls = 0;
        if (step === maxStepsPerTurn - 1) finishReason = "max_steps";
      }
      return {
        messages,
        finishReason: finishReason ?? "max_steps",
        steps: step + 1,
        turnMessages: messages.slice(startLen),
        usage: usageSnapshot()
      };
    }
    __name(send, "send");
    return { messages, send, abort, reset, interrupt, steer, usage, sampling: { temperature, seed, get reasoning() {
      try {
        return getReasoning();
      } catch (e) {
        return null;
      }
    } } };
  }, "createAgentSession");
}, "_createAgentSession");
var _doc_composeContext = /* @__PURE__ */ __name(function _doc_composeContext2(md) {
  return md`### \`composeContext(providers, {scope, turn, now, sectionTimeout, totalBudget})\`
Pure renderer for the situational-context block. Filters \`providers\` to the requested \`scope\`
('session' | 'turn'), dedupes by id (a non-weak provider shadows a \`weak\` fallback), orders by
\`priority\` (lower first), then runs every \`render({scope, turn, now})\` concurrently — each in a
try/catch and bounded by \`sectionTimeout\` ms, so one bad provider can only lose its own section.
Sections are truncated to each provider's \`budget\`, assembled as \`## label\` blocks inside one
\`<environment scope turn time>\` wrapper, capped at \`totalBudget\` chars in priority order. Returns
\`null\` when nothing rendered — a quiet turn injects no message at all. DOM-free and node-testable.`;
}, "_doc_composeContext");
var _composeContext = /* @__PURE__ */ __name(function _composeContext2(truncate) {
  return /* @__PURE__ */ __name((async function composeContext(providers, {
    scope = "turn",
    turn = 0,
    now = /* @__PURE__ */ new Date(),
    sectionTimeout = 250,
    totalBudget = 1500
  } = {}) {
    const list = (Array.isArray(providers) ? providers : []).filter((p) => p && p.id && typeof p.render === "function" && (p.scope ?? "turn") === scope);
    if (!list.length) return null;
    const byId = /* @__PURE__ */ new Map();
    for (const p of list) {
      const prev = byId.get(p.id);
      if (!prev || prev.weak && !p.weak) byId.set(p.id, p);
    }
    const ordered = [...byId.values()].sort((a, b) => (a.priority ?? 50) - (b.priority ?? 50));
    const results = await Promise.all(ordered.map(
      (p) => Promise.race([
        Promise.resolve().then(() => p.render({ scope, turn, now })),
        new Promise((res) => setTimeout(res, sectionTimeout))
        // resolves undefined → section dropped
      ]).catch(() => null)
    ));
    const sections = [];
    let used = 0, dropped = 0;
    for (let i = 0; i < ordered.length; i++) {
      const r = results[i];
      if (r == null || String(r).trim() === "") continue;
      const text = truncate(String(r).trim(), ordered[i].budget ?? 400);
      const sec = "## " + (ordered[i].label || ordered[i].id) + "\n" + text;
      if (used + sec.length > totalBudget) {
        dropped++;
        continue;
      }
      used += sec.length + 2;
      sections.push(sec);
    }
    if (!sections.length) return null;
    if (dropped) sections.push("(" + dropped + " context section(s) dropped: over budget)");
    const pad = /* @__PURE__ */ __name((n) => String(n).padStart(2, "0"), "pad");
    const stamp = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + " " + pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
    return '<environment scope="' + scope + '"' + (turn ? ' turn="' + turn + '"' : "") + ' time="' + stamp + '">\n' + sections.join("\n\n") + "\n</environment>";
  }), "composeContext");
}, "_composeContext");
var _composeFooter = /* @__PURE__ */ __name(function _composeFooter2() {
  return /* @__PURE__ */ __name((function composeFooter({ workdir = "/src", model } = {}) {
    const lines = ["", "Working directory: " + workdir];
    if (model) lines.push("Model: " + model);
    return lines.join("\n");
  }), "composeFooter");
}, "_composeFooter");
var _doc_summarizeTurn = /* @__PURE__ */ __name(function _doc_summarizeTurn2(md) {
  return md`### \`summarizeTurn(r)\`
Pure interpreter of a finished turn result. Returns \`null\` for a clean completion; otherwise a one-line
"⏹ Agent …" notice explaining why the turn ended (\`max_steps\` / \`aborted\` / \`error\` / stalled) plus a
tool tally from \`turnMessages\`. DOM-free so the UI imports it and node tests it.`;
}, "_doc_summarizeTurn");
var _summarizeTurn = /* @__PURE__ */ __name(function _summarizeTurn2() {
  return /* @__PURE__ */ __name((function summarizeTurn(r) {
    if (!r || r.finishReason === "completed") return null;
    const tally = {};
    for (const m of r.turnMessages || [])
      if (m.role === "assistant" && Array.isArray(m.tool_calls))
        for (const tc of m.tool_calls) {
          const n = tc.function && tc.function.name || "tool";
          tally[n] = (tally[n] || 0) + 1;
        }
    const acts = Object.entries(tally).map(([n, c]) => n + "\xD7" + c).join(", ");
    const why = r.finishReason === "max_steps" ? "reached the step limit" : r.finishReason === "aborted" ? "was stopped" : r.finishReason === "error" ? "hit a provider error" : "ended without calling task_complete";
    return "\u23F9 Agent " + why + " \xB7 " + r.steps + " step" + (r.steps === 1 ? "" : "s") + (acts ? " \xB7 " + acts : "") + ". No final reply \u2014 say \u201Ccontinue\u201D to resume or \u201Cfinish up\u201D.";
  }), "summarizeTurn");
}, "_summarizeTurn");
var _doc_toolLabel = /* @__PURE__ */ __name(function _doc_toolLabel2(md) {
  return md`### \`toolLabel(name, args)\`
Pure short label for a tool call, used in the live status line. Pulls a target hint
(\`path\`/\`file\`/\`name\`/\`id\`/\`module\`) from \`args\` (string JSON or object), basename-trimmed. Never throws.`;
}, "_doc_toolLabel");
var _toolLabel = /* @__PURE__ */ __name(function _toolLabel2() {
  return /* @__PURE__ */ __name((function toolLabel(name, args) {
    let arg = "";
    try {
      let a = args;
      if (typeof a === "string") a = JSON.parse(a);
      if (a) arg = a.path || a.file || a.name || a.id || a.module || "";
    } catch (e) {
    }
    return arg ? name + " " + String(arg).split("/").pop() : name || "tool";
  }), "toolLabel");
}, "_toolLabel");
var _rc5addressesUser = /* @__PURE__ */ __name(function _addressesUser() {
  return /* @__PURE__ */ __name((function addressesUser(text) {
    const s = String(text ?? "").trim();
    if (!s) return false;
    if (/\?["'`*_)\]}>\s]*$/.test(s)) return true;
    return /\b(?:i|we)\s*['’]?\s*(?:can['’]?t|cannot|can not|(?:a|)m\s+unable|are\s+unable|(?:a|)m\s+not\s+able|are\s+not\s+able)\b/i.test(s) || /\bnot\s+(?:permitted|allowed|authori[sz]ed)\b/i.test(s) || /\b(?:against|violates?|outside|prohibited\s+by)\s+(?:the\s+|our\s+|company\s+)?polic(?:y|ies)\b/i.test(s) || /\btransfer(?:ring)?\s+(?:you|this)\s+to\b/i.test(s);
  }), "addressesUser");
}, "_addressesUser");
var _rc5zeroToolCallGate = /* @__PURE__ */ __name(function _zeroToolCallGate(addressesUser) {
  return /* @__PURE__ */ __name((function zeroToolCallGate(info) {
    if (!info || info.toolCallsThisTurn !== 0) return null;
    const names = Array.isArray(info.toolNames) ? info.toolNames.filter(Boolean).map(String) : [];
    if (!names.length) return null;
    if (addressesUser(info.summary) || addressesUser(info.text)) return null;
    const shown = names.slice(0, 6).join(" / ") + (names.length > 6 ? " / \u2026" : "");
    return "REJECTED: you have made NO tool calls this turn, so nothing has been created, changed, or verified \u2014 a completion summary now would be fiction. Do the work first with real tool calls (" + shown + "), verify it, then call task_complete describing what you DID. If this request truly requires no tool work, END THE TURN BY SPEAKING TO THE USER: put your QUESTION to them, or your refusal and its reason, in the summary and call task_complete again \u2014 asking, declining under a stated policy, or handing off is a legitimate tool-free turn.";
  }), "zeroToolCallGate");
}, "_zeroToolCallGate");
function define2(runtime, observer) {
  const main = runtime.module();
  const $def = /* @__PURE__ */ __name((pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  }, "$def");
  $def("rc5c_title", null, ["md"], _title);
  $def("rc5c_doc_truncate", null, ["md"], _doc_truncate);
  $def("rc5c_truncate", "truncate", [], _truncate);
  $def("rc5c_doc_defineTool", null, ["md"], _doc_defineTool);
  $def("rc5c_defineTool", "defineTool", [], _defineTool);
  $def("rc5c_doc_createOpenRouterClient", null, ["md"], _doc_createOpenRouterClient);
  $def("rc5c_createOpenRouterClient", "createOpenRouterClient", ["globalThis"], _createOpenRouterClient);
  $def("rc5c_doc_createAgentSession", null, ["md"], _doc_createAgentSession);
  $def("rc5c_createAgentSession", "createAgentSession", ["AbortController", "truncate"], _createAgentSession);
  $def("rc5c_doc_composeContext", null, ["md"], _doc_composeContext);
  $def("rc5c_composeContext", "composeContext", ["truncate"], _composeContext);
  $def("rc5c_doc_composeFooter", null, ["md"], _doc_composeFooter);
  $def("rc5c_composeFooter", "composeFooter", [], _composeFooter);
  $def("rc5c_doc_summarizeTurn", null, ["md"], _doc_summarizeTurn);
  $def("rc5c_summarizeTurn", "summarizeTurn", [], _summarizeTurn);
  $def("rc5c_doc_toolLabel", null, ["md"], _doc_toolLabel);
  $def("rc5c_toolLabel", "toolLabel", [], _toolLabel);
  $def("_rc5addressesUser", "addressesUser", [], _rc5addressesUser);
  $def("_rc5zeroToolCallGate", "zeroToolCallGate", ["addressesUser"], _rc5zeroToolCallGate);
  return main;
}
__name(define2, "define");

// worker.js
var attempt = /* @__PURE__ */ __name((f) => {
  try {
    return { ok: f() };
  } catch (e) {
    return { err: String(e) };
  }
}, "attempt");
var attemptAsync = /* @__PURE__ */ __name(async (f) => {
  try {
    return { ok: await f() };
  } catch (e) {
    return { err: String(e) };
  }
}, "attemptAsync");
var log = [];
function define3(runtime, observer) {
  const main = runtime.module();
  main.variable(observer("a")).define("a", [], () => {
    log.push("a");
    return 21;
  });
  main.variable(observer("b")).define("b", ["a"], (a) => {
    log.push("b");
    return a * 2;
  });
  main.variable(observer("dom")).define("dom", [], () => {
    log.push("dom");
    return document.body;
  });
  main.variable(observer("fetch")).define("fetch", ["b"], (b) => (request) => new Response("hello " + b));
  return main;
}
__name(define3, "define");
var startup = {
  eval: attempt(() => (0, eval)("1 + 1")),
  newFunction: attempt(() => new Function("return 2 + 2")()),
  runtime: attempt(() => {
    const rt = new Runtime();
    define3(rt, () => void 0);
    return "constructed";
  })
};
var lazy;
var getMain = /* @__PURE__ */ __name(() => lazy ??= (() => {
  const rt = new Runtime();
  return define3(rt, () => void 0);
})(), "getMain");
var qjs;
var getQuickJS = /* @__PURE__ */ __name(() => qjs ??= newQuickJSWASMModuleFromVariant(newVariant(src_default, { wasmModule })), "getQuickJS");
var drain = /* @__PURE__ */ __name((vm) => {
  for (; ; ) {
    const r = vm.runtime.executePendingJobs();
    if (r.error) {
      const e = vm.dump(r.error);
      throw new Error("job " + JSON.stringify(e));
    }
    if (r.value === 0) return;
  }
}, "drain");
var evalDump = /* @__PURE__ */ __name((vm, code) => {
  const r = vm.evalCode(code);
  if (r.error) {
    const e = vm.dump(r.error);
    if (r.error.alive) r.error.dispose();
    throw new Error(JSON.stringify(e));
  }
  const v = vm.dump(r.value);
  if (r.value.alive) r.value.dispose();
  return v;
}, "evalDump");
var routes = {
  async "/e1"(request) {
    const t0 = performance.now();
    const main = getMain();
    const handler = await main.value("fetch");
    const res = await handler(request);
    return Response.json({ body: await res.text(), log: [...log], ms: performance.now() - t0, startup });
  },
  async "/e1/redefine"(request) {
    const n = Number(new URL(request.url).searchParams.get("a") ?? 5);
    getMain().redefine("a", [], () => {
      log.push("a'");
      return n;
    });
    return new Response("redefined a=" + n);
  },
  async "/e4"() {
    return Response.json({
      startup,
      request: {
        eval: attempt(() => (0, eval)("1 + 1")),
        newFunction: attempt(() => new Function("return 2 + 2")()),
        asyncFunction: attempt(() => (async () => {
        }).constructor("return 1")),
        wasmCompile: await attemptAsync(async () => await WebAssembly.compile(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])) && "compiled"),
        dynamicImportData: await attemptAsync(async () => (await import(["data:text/javascript,export default ", String(Date.now() % 7)].join(""))).default),
        dynamicImportBlob: await attemptAsync(async () => (await import(URL.createObjectURL(new Blob(["export default 7"], { type: "text/javascript" })))).default)
      }
    });
  },
  async "/e6"() {
    const t0 = performance.now();
    const QuickJS = await getQuickJS();
    const t1 = performance.now();
    const vm = QuickJS.newContext();
    const out = { loadMs: t1 - t0, onePlusOne: evalDump(vm, "1 + 1") };
    evalDump(vm, "globalThis.setTimeout = (f) => { Promise.resolve().then(f); return 0; }; 0");
    const t2 = performance.now();
    evalDump(vm, runtimeSrc + "\n0");
    evalDump(vm, `const rt = new Runtime(); const m = rt.module();
      m.variable().define("a", [], () => 21); m.variable().define("b", ["a"], (a) => a * 2);
      globalThis.out = "pending"; m.value("b").then((v) => { globalThis.out = v; }); 0`);
    drain(vm);
    out.runtimeInside = { b: evalDump(vm, "out"), ms: performance.now() - t2 };
    evalDump(vm, `m.variable().define("c", ["b"], (0, eval)("(b) => b + 1000")); m.value("c").then((v) => { globalThis.out = v; }); 0`);
    drain(vm);
    out.runtimeInside.cellFromString = evalDump(vm, "out");
    const interpretedCell = /* @__PURE__ */ __name((source) => (...inputs) => {
      const fn = vm.evalCode("(" + source + ")");
      if (fn.error) throw new Error(JSON.stringify(vm.dump(fn.error)));
      const args = inputs.map((x) => {
        const h = vm.evalCode("(" + JSON.stringify(x) + ")");
        return h.value;
      });
      const r = vm.callFunction(fn.value, vm.undefined, ...args);
      args.forEach((h) => h.dispose());
      fn.value.dispose();
      if (r.error) throw new Error(JSON.stringify(vm.dump(r.error)));
      const v = vm.dump(r.value);
      r.value.dispose();
      return v;
    }, "interpretedCell");
    const host = new Runtime();
    const hm = host.module();
    hm.variable().define("a", [], () => 21);
    hm.variable().define("b", ["a"], (a) => a * 2);
    hm.variable().define("c", ["a", "b"], interpretedCell("(a, b) => ({ sum: a + b, squares: [a * a, b * b] })"));
    out.hostCell = { first: await hm.value("c") };
    hm.redefine("a", [], () => 1);
    out.hostCell.afterRedefine = await hm.value("c");
    const loop = "(() => { let s = 0; for (let i = 0; i < 3e6; i++) s = (s + i * i) % 1000003; return s; })";
    const nativeLoop = /* @__PURE__ */ __name(() => {
      let s = 0;
      for (let i = 0; i < 3e6; i++) s = (s + i * i) % 1000003;
      return s;
    }, "nativeLoop");
    const n0 = Date.now();
    const nat = nativeLoop();
    const n1 = Date.now();
    const q0 = Date.now();
    const q = evalDump(vm, loop + "()");
    const q1 = Date.now();
    out.loop = { same: nat === q, nativeMs: n1 - n0, quickjsMs: q1 - q0, note: "workerd clocks do not advance during CPU work; see wall time from curl" };
    vm.dispose();
    return Response.json(out);
  },
  async "/e7"(request, env) {
    const QuickJS = await getQuickJS();
    const vm = QuickJS.newContext();
    const out = {};
    const pass = /* @__PURE__ */ __name((name, x) => {
      out[name] = attempt(() => {
        const h = vm.evalCode("(" + JSON.stringify(x) + ")");
        const v = vm.dump(h.value);
        h.value.dispose();
        return v;
      });
    }, "pass");
    pass("number", 3.5);
    pass("object", { a: [1, { b: "c" }] });
    pass("string", "h\xE9llo");
    const double = vm.newFunction("double", (h) => vm.newNumber(vm.getNumber(h) * 2));
    vm.setProp(vm.global, "double", double);
    double.dispose();
    out.hostFunctionSync = attempt(() => evalDump(vm, "double(21)"));
    const stub = env.STATE.get(env.STATE.idFromName("main"));
    const hostFetch = vm.newFunction("hostFetch", (pathH) => {
      const path = vm.getString(pathH);
      const p = vm.newPromise();
      stub.fetch("https://do" + path).then((r2) => r2.text()).then((t) => {
        const s = vm.newString(t);
        p.resolve(s);
        s.dispose();
      }, (e) => {
        const s = vm.newString(String(e));
        p.reject(s);
        s.dispose();
      });
      p.settled.then(() => drain(vm));
      return p.handle;
    });
    vm.setProp(vm.global, "hostFetch", hostFetch);
    hostFetch.dispose();
    const reqH = vm.evalCode("(" + JSON.stringify({ method: request.method, url: request.url, headers: Object.fromEntries(request.headers) }) + ")");
    vm.setProp(vm.global, "request", reqH.value);
    reqH.value.dispose();
    const r = vm.evalCode(`(async () => { const body = await hostFetch("/count"); return { status: 200, body: "guest saw " + request.method + " " + new URL(request.url).pathname + " and DO said " + body }; })()`);
    out.guestHandler = await attemptAsync(async () => {
      if (r.error) throw new Error(JSON.stringify(vm.dump(r.error)));
      const settled = await vm.resolvePromise(r.value);
      r.value.dispose();
      if (settled.error) throw new Error(JSON.stringify(vm.dump(settled.error)));
      const v = vm.dump(settled.value);
      settled.value.dispose();
      return v;
    });
    out.globalsInGuest = attempt(() => evalDump(vm, "['URL','fetch','TextEncoder','crypto','setTimeout','console','Promise','Map','Proxy','BigInt','WeakRef'].map((k) => k + ':' + typeof globalThis[k]).join(' ')"));
    out.guestPure = await attemptAsync(async () => {
      const r2 = vm.evalCode(`(async () => { const body = await hostFetch("/count"); return "guest saw " + request.method + " " + request.url.split("/").pop() + "; DO said " + body.slice(0, 40); })()`);
      const st = await vm.resolvePromise(r2.value);
      r2.value.dispose();
      if (st.error) throw new Error(JSON.stringify(vm.dump(st.error)));
      const v = vm.dump(st.value);
      st.value.dispose();
      return v;
    });
    out.dispose = attempt(() => {
      vm.dispose();
      return "clean";
    });
    return Response.json(out);
  },
  async "/e5"(request, env) {
    const code = new URL(request.url).searchParams.get("code") ?? `export default { async fetch(req) { let out = "none"; try { await fetch("https://example.com"); out = "fetched"; } catch (e) { out = String(e); } return new Response("dynamic says " + (6 * 7) + "; outbound: " + out); } }`;
    const t0 = Date.now();
    const r = await attemptAsync(async () => {
      const id = "cell-" + [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code)))].slice(0, 6).map((b) => b.toString(16)).join("");
      const worker = env.LOADER.get(id, async () => ({ compatibilityDate: "2025-09-01", mainModule: "main.js", modules: { "main.js": code }, env: {}, globalOutbound: null }));
      const res = await worker.getEntrypoint().fetch(new Request("https://dyn/"));
      return { id, body: await res.text() };
    });
    return Response.json({ ...r, ms: Date.now() - t0, hasLoader: !!env.LOADER });
  }
};
var State = class extends DurableObject {
  static {
    __name(this, "State");
  }
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v INTEGER)");
    this.born = Date.now();
    this.runtime = new Runtime();
    const m = this.main = this.runtime.module();
    m.variable().define("counter", [], () => ({ n: 0 }));
    m.variable().define("fetch", ["counter"], (counter) => () => ++counter.n);
    m.variable().define("pinnedCounter", [], () => ({ n: 0 }));
    m.variable({}).define("pinnedFetch", ["pinnedCounter"], (counter) => () => ++counter.n);
  }
  // E9: robocoop-5-core's loop, with a scripted model. `dieAtCall` simulates the object dying mid-turn.
  async agentTurn(input, { dieAtCall = 0, restore = null } = {}) {
    const sql = this.ctx.storage.sql;
    const core = this.runtime.module(define2);
    const createAgentSession = await core.value("createAgentSession");
    const defineTool = await core.value("defineTool");
    let calls = 0;
    const client = { chat: /* @__PURE__ */ __name(async ({ messages }) => {
      calls++;
      if (dieAtCall && calls === dieAtCall) throw new Error("simulated eviction");
      const toolResults = messages.filter((m) => m.role === "tool");
      if (toolResults.length < 2) {
        const n = toolResults.length;
        return { message: { role: "assistant", content: null, tool_calls: [{ id: "call_" + n, type: "function", function: { name: "add", arguments: JSON.stringify({ a: n + 1, b: 10 }) } }] }, finish_reason: "tool_calls", usage: {} };
      }
      return { message: { role: "assistant", content: "sums: " + toolResults.map((m) => m.content).join(", ") }, finish_reason: "stop", usage: {} };
    }, "chat") };
    const add = defineTool({ id: "add", description: "add two numbers", parameters: { type: "object", properties: { a: { type: "number" }, b: { type: "number" } }, required: ["a", "b"] }, execute: /* @__PURE__ */ __name(async ({ a, b }) => ({ title: "add", output: String(a + b), metadata: {} }), "execute") });
    const session = createAgentSession({ client, tools: [add], model: "fake", systemPrompt: "test" });
    if (restore) session.messages.push(...restore);
    const save = /* @__PURE__ */ __name((messages) => sql.exec("INSERT INTO kv2 VALUES ('transcript', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", JSON.stringify(messages)), "save");
    let finish = null, err = null;
    try {
      await session.send(input, { onStep: /* @__PURE__ */ __name((_step, messages) => save(messages), "onStep"), onFinish: /* @__PURE__ */ __name((f) => {
        finish = f.finishReason;
      }, "onFinish") });
    } catch (e) {
      err = String(e);
    }
    if (!err) save(session.messages);
    return { calls, finish, err, roles: session.messages.map((m) => m.role + (m.tool_calls ? ":call" : "")), last: session.messages.at(-1)?.content };
  }
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const sql = this.ctx.storage.sql;
    sql.exec("CREATE TABLE IF NOT EXISTS kv2 (k TEXT PRIMARY KEY, v TEXT)");
    const saved = /* @__PURE__ */ __name(() => {
      const r = [...sql.exec("SELECT v FROM kv2 WHERE k = 'transcript'")][0];
      return r ? JSON.parse(r.v) : null;
    }, "saved");
    if (path === "/agent/turn") return Response.json(await this.agentTurn("add some numbers").catch((e) => ({ threw: String(e && e.stack || e) })));
    if (path === "/agent/die") return Response.json(await this.agentTurn("add some numbers", { dieAtCall: 2 }).catch((e) => ({ threw: String(e) })));
    if (path === "/agent/saved") return Response.json((saved() ?? []).map((m) => m.role + (m.tool_calls ? ":call" : "") + (m.role === "tool" ? "=" + m.content : "")));
    if (path === "/agent/resume") return Response.json(await this.agentTurn("continue from where you stopped", { restore: saved() }).catch((e) => ({ threw: String(e) })));
    if (path === "/agent/webhook") {
      sql.exec("INSERT INTO kv2 VALUES ('inbox', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", "add some numbers");
      sql.exec("DELETE FROM kv2 WHERE k = 'reply'");
      await this.ctx.storage.setAlarm(Date.now());
      return new Response("accepted");
    }
    if (path === "/agent/reply") return Response.json([...sql.exec("SELECT k, v FROM kv2 WHERE k IN ('reply')")]);
    if (path === "/alarm/set") {
      await this.ctx.storage.setAlarm(Date.now() + 1e3);
      return new Response("alarm set");
    }
    const inMemory = (await this.main.value("fetch"))();
    const pinned = (await this.main.value("pinnedFetch"))();
    sql.exec("INSERT INTO kv VALUES ('n', 1) ON CONFLICT(k) DO UPDATE SET v = v + 1");
    const rows = [...sql.exec("SELECT k, v FROM kv")];
    return Response.json({ unobserved: inMemory, observed: pinned, rows, bornMsAgo: Date.now() - this.born });
  }
  async alarm() {
    const sql = this.ctx.storage.sql;
    sql.exec("CREATE TABLE IF NOT EXISTS kv2 (k TEXT PRIMARY KEY, v TEXT)");
    const inbox = [...sql.exec("SELECT v FROM kv2 WHERE k = 'inbox'")][0];
    if (inbox) {
      sql.exec("DELETE FROM kv2 WHERE k = 'inbox'");
      const r = await this.agentTurn(inbox.v);
      sql.exec("INSERT INTO kv2 VALUES ('reply', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", JSON.stringify(r));
      return;
    }
    sql.exec("INSERT INTO kv VALUES ('alarms', 1) ON CONFLICT(k) DO UPDATE SET v = v + 1");
    (await this.main.value("fetch"))();
  }
};
var worker_default = {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (path.startsWith("/e3")) return env.STATE.get(env.STATE.idFromName("main")).fetch("https://do" + (path.slice(3) || "/count"));
    const h = routes[path];
    if (!h) return new Response(Object.keys(routes).join("\n"), { status: 404 });
    try {
      return await h(request, env, ctx);
    } catch (e) {
      return new Response(String(e && e.stack || e), { status: 500 });
    }
  }
};
export {
  State,
  worker_default as default
};
//# sourceMappingURL=worker.js.map
