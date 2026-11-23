// Hand-written signatures of the allowed intrinsics, as declaration text parsed by lite's own parser.
// JSDoc flags on a member or overload:
//   @mutates  writes its receiver (legal only on a Mut receiver)
//   @fresh    returns a new value no one else holds (a valid argument of mut())
//   @view     returns something aliasing the receiver's storage (or, on a constructor, the argument's)
//   @retains  keeps a reference to an argument (a Mut or Borrowed may not be passed)
//   @banned   reading the member is an error (Math.random, Object.defineProperty)
// A method absent from this text is `unsupported`, not an error: the file is the coverage boundary.
// Callback parameters omit the third `array` argument on purpose: it would alias a Mut receiver.

export const TYPED_ARRAYS = "Float32Array Float64Array Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array".split(" ");
export const ALLOWED_GLOBALS = new Set(
  ("Object Array Math JSON Number String Boolean BigInt Symbol Map Set Error TypeError RangeError RegExp Promise " +
    "ArrayBuffer DataView TextEncoder TextDecoder Infinity NaN undefined isNaN isFinite parseInt parseFloat " +
    "encodeURIComponent decodeURIComponent encodeURI decodeURI atob btoa structuredClone URL URLSearchParams").split(" ").concat(TYPED_ARRAYS),
);
// the allowed globals Observable's parser does not know, so a compiled cell takes each one it uses as an input
// (the runtime resolves it to the global); ojs-roundtrip.test.ts checks this list against the parser
export const OJS_INPUT_GLOBALS = ["structuredClone", "URLSearchParams"];

const typedArray = (N: string) => `
interface ${N} {
  readonly length: number;
  /** @view */ readonly buffer: ArrayBuffer;
  /** @mutates */ set(src: ArrayLike<number>, offset?: number): void;
  /** @mutates @view */ fill(v: number, start?: number, end?: number): ${N};
  /** @mutates @view */ sort(f?: (a: number, b: number) => number): ${N};
  /** @mutates @view */ reverse(): ${N};
  /** @mutates @view */ copyWithin(target: number, start: number, end?: number): ${N};
  /** @view */ subarray(start?: number, end?: number): ${N};
  /** @view */ values(): Iterable<number>;
  /** @view */ keys(): Iterable<number>;
  /** @view */ entries(): Iterable<[number, number]>;
  /** @fresh */ slice(start?: number, end?: number): ${N};
  /** @fresh */ map(f: (v: number, i: number) => number): ${N};
  /** @fresh */ filter(f: (v: number, i: number) => unknown): ${N};
  /** @fresh */ toSorted(f?: (a: number, b: number) => number): ${N};
  /** @fresh */ toReversed(): ${N};
  /** @fresh */ with(i: number, v: number): ${N};
  reduce<U>(f: (acc: U, v: number, i: number) => U, init: U): U;
  forEach(f: (v: number, i: number) => void): void;
  every(f: (v: number, i: number) => unknown): boolean;
  some(f: (v: number, i: number) => unknown): boolean;
  indexOf(v: number): number;
  includes(v: number): boolean;
  join(sep?: string): string;
  at(i: number): number | undefined;
  toString(): string;
}
declare const ${N}: {
  /** @fresh */ new (n: number): ${N};
  /** @fresh */ new (src: Iterable<number>): ${N};
  /** @view @retains */ new (buffer: ArrayBuffer, offset?: number, length?: number): ${N};
  /** @fresh */ from(src: Iterable<number>): ${N};
  /** @fresh */ from(src: Iterable<number>, f: (v: number, i: number) => number): ${N};
  /** @fresh */ of(...xs: number[]): ${N};
};`;

export const INTRINSIC_DECLS = `
interface Array<T> {
  readonly length: number;
  /** @fresh */ map<U>(f: (v: T, i: number) => U): U[];
  /** @fresh */ filter(f: (v: T, i: number) => unknown): T[];
  /** @fresh */ flatMap<U>(f: (v: T, i: number) => U | readonly U[]): U[];
  /** @fresh */ slice(start?: number, end?: number): T[];
  /** @fresh */ concat(...xs: readonly T[][]): T[];
  /** @fresh */ toSorted(f?: (a: T, b: T) => number): T[];
  /** @fresh */ toReversed(): T[];
  /** @fresh */ toSpliced(start: number, deleteCount?: number, ...xs: T[]): T[];
  /** @fresh */ with(i: number, v: T): T[];
  reduce<U>(f: (acc: U, v: T, i: number) => U, init: U): U;
  find(f: (v: T, i: number) => unknown): T | undefined;
  findIndex(f: (v: T, i: number) => unknown): number;
  findLast(f: (v: T, i: number) => unknown): T | undefined;
  some(f: (v: T, i: number) => unknown): boolean;
  every(f: (v: T, i: number) => unknown): boolean;
  forEach(f: (v: T, i: number) => void): void;
  includes(v: T): boolean;
  indexOf(v: T): number;
  lastIndexOf(v: T): number;
  join(sep?: string): string;
  at(i: number): T | undefined;
  toString(): string;
  /** @view */ entries(): Iterable<[number, T]>;
  /** @view */ keys(): Iterable<number>;
  /** @view */ values(): Iterable<T>;
  /** @mutates @retains */ push(...xs: T[]): number;
  /** @mutates @retains */ unshift(...xs: T[]): number;
  /** @mutates */ pop(): T | undefined;
  /** @mutates */ shift(): T | undefined;
  /** @mutates @retains @fresh */ splice(start: number, deleteCount?: number, ...xs: T[]): T[];
  /** @mutates @view */ sort(f?: (a: T, b: T) => number): T[];
  /** @mutates @view */ reverse(): T[];
  /** @mutates @view @retains */ fill(v: T, start?: number, end?: number): T[];
  /** @mutates @view */ copyWithin(target: number, start: number, end?: number): T[];
}
declare const Array: {
  isArray(v: unknown): boolean;
  /** @fresh */ from<T>(src: Iterable<T>): T[];
  /** @fresh */ from<T, U>(src: Iterable<T>, f: (v: T, i: number) => U): U[];
  /** @fresh */ from(src: { readonly length: number }): undefined[];
  /** @fresh */ from<U>(src: { readonly length: number }, f: (v: undefined, i: number) => U): U[];
  /** @fresh */ of<T>(...xs: T[]): T[];
  /** @banned */ readonly prototype: unknown;
};
interface String {
  readonly length: number;
  startsWith(s: string, pos?: number): boolean;
  endsWith(s: string, pos?: number): boolean;
  includes(s: string, pos?: number): boolean;
  indexOf(s: string, pos?: number): number;
  lastIndexOf(s: string, pos?: number): number;
  slice(start?: number, end?: number): string;
  substring(start: number, end?: number): string;
  split(sep: string | RegExp, limit?: number): string[];
  trim(): string;
  trimStart(): string;
  trimEnd(): string;
  toUpperCase(): string;
  toLowerCase(): string;
  replace(pattern: string | RegExp, replacement: string): string;
  replaceAll(pattern: string | RegExp, replacement: string): string;
  match(re: RegExp): RegExpMatchArray | null;
  localeCompare(other: string): number;
  padStart(n: number, fill?: string): string;
  padEnd(n: number, fill?: string): string;
  repeat(n: number): string;
  charAt(i: number): string;
  charCodeAt(i: number): number;
  at(i: number): string | undefined;
  toString(): string;
}
declare function String(v?: unknown): string;
interface RegExpMatchArray {
  readonly length: number;
  readonly index?: number;
  readonly groups?: { readonly [k: string]: string };
}
interface RegExp {
  readonly source: string;
  readonly flags: string;
  test(s: string): boolean;
  exec(s: string): RegExpMatchArray | null;
}
interface Number {
  toFixed(digits?: number): string;
  toExponential(digits?: number): string;
  toPrecision(digits?: number): string;
  toString(radix?: number): string;
}
declare const Number: {
  (v?: unknown): number;
  readonly MAX_VALUE: number;
  readonly MIN_VALUE: number;
  readonly EPSILON: number;
  readonly MAX_SAFE_INTEGER: number;
  readonly MIN_SAFE_INTEGER: number;
  readonly POSITIVE_INFINITY: number;
  readonly NEGATIVE_INFINITY: number;
  readonly NaN: number;
  isInteger(v: unknown): boolean;
  isFinite(v: unknown): boolean;
  isNaN(v: unknown): boolean;
  isSafeInteger(v: unknown): boolean;
  parseFloat(s: string): number;
  parseInt(s: string, radix?: number): number;
};
interface Boolean { toString(): string }
declare function Boolean(v?: unknown): boolean;
declare const Math: {
  readonly PI: number; readonly E: number; readonly LN2: number; readonly LN10: number; readonly SQRT2: number;
  abs(x: number): number; floor(x: number): number; ceil(x: number): number; round(x: number): number;
  trunc(x: number): number; sign(x: number): number; sqrt(x: number): number; cbrt(x: number): number;
  exp(x: number): number; log(x: number): number; log2(x: number): number; log10(x: number): number;
  sin(x: number): number; cos(x: number): number; tan(x: number): number; asin(x: number): number;
  acos(x: number): number; atan(x: number): number; atan2(y: number, x: number): number;
  pow(x: number, y: number): number; min(...xs: number[]): number; max(...xs: number[]): number;
  hypot(...xs: number[]): number; fround(x: number): number;
  /** @banned */ random(): number;
};
declare const JSON: {
  stringify(v: unknown, replacer?: null, indent?: number | string): string;
  parse(s: string): unknown;
};
declare const Object: {
  /** @fresh */ entries<T>(o: { readonly [k: string]: T }): [string, T][];
  /** @fresh */ keys(o: object): string[];
  /** @fresh */ values<T>(o: { readonly [k: string]: T }): T[];
  /** @fresh */ fromEntries<T>(entries: Iterable<readonly [string, T]>): { [k: string]: T };
  is(a: unknown, b: unknown): boolean;
  /** @banned */ defineProperty(o: unknown, k: unknown, d: unknown): unknown;
  /** @banned */ setPrototypeOf(o: unknown, p: unknown): unknown;
  /** @banned */ defineProperties(o: unknown, d: unknown): unknown;
  /** @banned */ readonly prototype: unknown;
};
interface Map<K, V> {
  readonly size: number;
  get(k: K): V | undefined;
  has(k: K): boolean;
  forEach(f: (v: V, k: K) => void): void;
  /** @view */ keys(): Iterable<K>;
  /** @view */ values(): Iterable<V>;
  /** @view */ entries(): Iterable<[K, V]>;
  /** @mutates @retains @view */ set(k: K, v: V): Map<K, V>;
  /** @mutates */ delete(k: K): boolean;
  /** @mutates */ clear(): void;
}
declare const Map: {
  /** @fresh */ new <K, V>(): Map<K, V>;
  /** @fresh */ new <K, V>(entries: Iterable<readonly [K, V]>): Map<K, V>;
};
interface Set<T> {
  readonly size: number;
  has(v: T): boolean;
  forEach(f: (v: T) => void): void;
  /** @view */ keys(): Iterable<T>;
  /** @view */ values(): Iterable<T>;
  /** @view */ entries(): Iterable<[T, T]>;
  /** @mutates @retains @view */ add(v: T): Set<T>;
  /** @mutates */ delete(v: T): boolean;
  /** @mutates */ clear(): void;
}
declare const Set: {
  /** @fresh */ new <T>(): Set<T>;
  /** @fresh */ new <T>(values: Iterable<T>): Set<T>;
};
interface Error { readonly message: string; readonly name: string }
declare const Error: { /** @fresh */ new (message?: string): Error };
declare const TypeError: { /** @fresh */ new (message?: string): Error };
declare const RangeError: { /** @fresh */ new (message?: string): Error };
declare const RegExp: { /** @fresh */ new (source: string, flags?: string): RegExp };
interface Promise<T> {
  /** @retains */ then<U>(f: (v: T) => U | Promise<U>): Promise<U>;
}
declare const Promise: {
  resolve(): Promise<void>;
  /** @retains */ resolve<T>(v: T | Promise<T>): Promise<T>;
  /** @fresh */ all<T>(ps: readonly Promise<T>[]): Promise<T[]>;
};
interface ArrayBuffer { readonly byteLength: number; /** @fresh */ slice(start?: number, end?: number): ArrayBuffer }
declare const ArrayBuffer: { /** @fresh */ new (n: number): ArrayBuffer };
interface URLSearchParams {
  get(k: string): string | null;
  has(k: string): boolean;
  toString(): string;
}
declare const URLSearchParams: {
  /** @fresh */ new (init?: string | { readonly [k: string]: string }): URLSearchParams;
};
interface URL {
  readonly href: string; readonly hash: string; readonly search: string; readonly pathname: string;
  readonly host: string; readonly hostname: string; readonly origin: string; readonly protocol: string;
  readonly port: string; readonly searchParams: URLSearchParams;
  toString(): string;
}
declare const URL: { /** @fresh */ new (url: string, base?: string): URL };
declare const Infinity: number;
declare const NaN: number;
declare function isNaN(v: number): boolean;
declare function isFinite(v: number): boolean;
declare function parseInt(s: string, radix?: number): number;
declare function parseFloat(s: string): number;
declare function encodeURIComponent(s: string): string;
declare function decodeURIComponent(s: string): string;
declare function encodeURI(s: string): string;
declare function decodeURI(s: string): string;
declare function atob(s: string): string;
declare function btoa(s: string): string;
/** @fresh */ declare function structuredClone<T>(v: T): T;
declare function BigInt(v: number | string | boolean): bigint;
${TYPED_ARRAYS.map(typedArray).join("\n")}
`;

// The prelude and capabilities of the specification, as declaration text; state/action/mut/freeze/borrow/snapshot are also
// special-cased by the checker (placement, freshness, ownership).
export const PRELUDE_DECLS = `
interface FetchResponse {
  readonly ok: boolean;
  readonly status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
  arrayBuffer(): Promise<ArrayBuffer>;
}
type Clock = () => number;
type Random = () => number;
type Fetch = (url: string, init?: { readonly method?: string; readonly headers?: { readonly [k: string]: string }; readonly body?: string }) => Promise<FetchResponse>;
type Log = (...args: unknown[]) => void;
type Invalidation = Promise<void>;
// compile's type depends on the cell names it is given; core.ts types each call.
type Compile = (spec: unknown) => unknown;
interface Pool { readonly size: number }
// An Events<T> parameter is a handle to a generator cell yielding T, not a dependency on its values.
// on(events, action) is a Listener; a cell whose whole value is one runs the action for each value.
interface Events<T> { readonly events: string }
interface Listener { readonly listener: string }
interface State<T> {
  set(v: T): void;
  update(f: (v: T) => T): void;
}
declare function equals(a: unknown, b: unknown): boolean;
declare function messageOf(e: unknown): string;
declare function memo<F>(f: F): F;
// e1 (2026-11-23): cast<T>(v) checks v against T at run time (S9.8); the checker types and refuses each call itself
type Cast<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly path: string; readonly error: string };
`;
export const CAPABILITIES: Record<string, string> = { now: "Clock", random: "Random", fetch: "Fetch", log: "Log", invalidation: "Invalidation", compile: "Compile", pool: "Pool" };
export const PRELUDE_FNS = new Set(["state", "action", "snapshot", "equals", "on", "read", "messageOf", "memo", "cast"]);

// JSX: an element is a value. A renderer outside the checked cells turns it into DOM nodes; event
// props are Actions and receive data, never DOM Event objects.
export const JSX_DECLS = `
interface Elem { readonly tag: string; readonly children: readonly Child[] }
type Child = Elem | string | number | boolean | null | undefined | readonly Elem[];
type PointerData = { readonly x: number; readonly y: number; readonly t: number; readonly id: number; readonly buttons: number };
interface CommonProps {
  readonly children?: readonly Child[];
  readonly key?: string | number;
  readonly class?: string;
  readonly style?: string;
  readonly title?: string;
  readonly id?: string;
}
interface ButtonProps extends CommonProps { readonly onClick?: Action<[]>; readonly disabled?: boolean }
interface InputProps extends CommonProps {
  readonly type?: string;
  readonly name?: string;
  readonly value?: string | number;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly checked?: boolean;
  readonly disabled?: boolean;
  readonly onInput?: Action<[string]>;
  readonly onClick?: Action<[]>;
}
interface CanvasProps extends CommonProps {
  readonly width?: number;
  readonly height?: number;
  readonly onPointerDown?: Action<[PointerData]>;
  readonly onPointerMove?: Action<[PointerData]>;
  readonly onPointerUp?: Action<[PointerData]>;
  readonly onPointerCancel?: Action<[PointerData]>;
}
interface IntrinsicElements {
  div: CommonProps; span: CommonProps; p: CommonProps; label: CommonProps; strong: CommonProps;
  fieldset: CommonProps; legend: CommonProps; output: CommonProps;
  button: ButtonProps; input: InputProps; canvas: CanvasProps;
}
`;
