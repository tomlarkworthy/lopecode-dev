// Global declarations seen by every port's cells.ts and shell.ts. Brands are string-keyed
// properties so check.ts can recognise them with checker.getPropertyOfType.

interface StateCell<T> { readonly __lc_statecell: T }
interface State<T> {
  readonly __lc_state: (v: T) => T;
  set(v: T): void;
  update(f: (v: T) => T): void;
}
type Action<A extends unknown[] = []> = ((...args: A) => void) & { readonly __lc_action: A };
type Mut<T> = T & { readonly __lc_mut: true };
type Borrowed<T> = T & { readonly __lc_borrowed: true };
type Js = unknown;

interface FetchResponse {
  readonly ok: boolean;
  readonly status: number;
  text(): Promise<string>;
  json(): Promise<Js>;
  arrayBuffer(): Promise<ArrayBuffer>;
}
type Clock = (() => number) & { readonly __lc_cap: "clock" };
type Random = (() => number) & { readonly __lc_cap: "random" };
type Fetch = ((url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<FetchResponse>) & { readonly __lc_cap: "fetch" };
type Log = ((...args: unknown[]) => void) & { readonly __lc_cap: "log" };
type Invalidation = Promise<void>;

declare function state<T>(initial: T): StateCell<T>;
declare function action<A extends unknown[] = []>(f: (...args: A) => void): Action<A>;
declare function mut<T>(v: T): Mut<T>;
declare function freeze<T>(m: Mut<T>): T;
declare function borrow<T>(m: Mut<T>): Borrowed<T>;
declare function snapshot<T>(b: Borrowed<T>): T;
declare function equals(a: unknown, b: unknown): boolean;
declare function messageOf(e: unknown): string;
declare function read<T>(r: State<T>): T;

// Harness-only helpers used by the derived source (check.ts). Not callable from cells.
type __CellValue<R> =
  [R] extends [StateCell<infer T>] ? T :
  [R] extends [PromiseLike<infer T>] ? T :
  [R] extends [Generator<infer Y, any, any>] ? Y :
  [R] extends [AsyncGenerator<infer Y, any, any>] ? Y :
  R;
type __RefOf<R> = [R] extends [StateCell<infer T>] ? State<T> : "inject-state: the named cell does not return StateCell";
