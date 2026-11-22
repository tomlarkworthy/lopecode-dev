// Rule registry. Every id here must have a fixtures/reject-<id>/ directory or a case in the specification
// module's spec_rejects (fixtures.ts asserts it). `section` is the RULES.md section (deleted 2026-11-16, see
// README) the rule came from; `how` is "exact" or "approx" (see README).

export type RuleInfo = { id: string; section: string; summary: string; how: "exact" | "approx" };

export const RULES: RuleInfo[] = [
  // Files
  { id: "module-level", section: "Files", how: "exact", summary: "only cells, type/interface and import type at module level" },
  { id: "cell-not-function", section: "Files", how: "exact", summary: "a top-level let/const whose initializer is not an arrow or function expression" },
  { id: "duplicate-cell", section: "Files", how: "exact", summary: "a cell name defined twice, in cells.ts or across cells.ts and shell.ts" },
  // Cells and injection
  { id: "inject-unknown", section: "Cells and injection", how: "exact", summary: "parameter names no cell, foreign declaration or capability" },
  { id: "inject-type", section: "Cells and injection", how: "exact", summary: "typed parameter not assignable from the named cell's value type" },
  { id: "inject-state", section: "Cells and injection", how: "approx", summary: "parameter typed State<X> must name a cell returning StateCell<X>" },
  { id: "inject-pattern", section: "Cells and injection", how: "exact", summary: "injected parameter must be a plain identifier (no destructuring, default, rest)" },
  { id: "free-name", section: "Cells and injection", how: "exact", summary: "free name that is not a parameter, local, prelude name or allowed intrinsic" },
  { id: "banned-member", section: "Cells and injection", how: "exact", summary: "Math.random" },
  { id: "reserved-name", section: "Cells and injection", how: "exact", summary: "viewof, mutable or $<digits> as a name in code (a cell, a local, a parameter, or $<digits> as a key or member)" },
  { id: "cell-by-name", section: "Cells and injection", how: "exact", summary: "a cell referenced by its module-level name instead of as a parameter" },
  // Immutable by default
  { id: "member-write", section: "Immutable by default", how: "approx", summary: "assignment, compound assignment or ++/-- on a member of a non-Mut value" },
  { id: "no-delete", section: "Immutable by default", how: "exact", summary: "delete" },
  { id: "mutating-method", section: "Immutable by default", how: "approx", summary: "mutating method on a non-Mut Array/Map/Set/typed array" },
  { id: "object-assign", section: "Immutable by default", how: "approx", summary: "Object.assign onto an existing (non-literal, non-Mut) value" },
  { id: "object-freeze", section: "Immutable by default", how: "exact", summary: "Object.freeze of anything but an object or array literal" },
  { id: "no-var", section: "Immutable by default", how: "exact", summary: "var" },
  { id: "no-class", section: "Immutable by default", how: "exact", summary: "class" },
  { id: "no-this", section: "Immutable by default", how: "exact", summary: "this" },
  { id: "no-arguments", section: "Immutable by default", how: "exact", summary: "arguments" },
  { id: "new-non-intrinsic", section: "Immutable by default", how: "exact", summary: "new on anything but an allowed intrinsic" },
  { id: "no-any", section: "Immutable by default", how: "exact", summary: "the any type" },
  { id: "no-cast", section: "Immutable by default", how: "exact", summary: "as / <T> casts other than as const" },
  { id: "no-non-null", section: "Immutable by default", how: "exact", summary: "non-null assertion !" },
  { id: "no-ts-ignore", section: "Immutable by default", how: "exact", summary: "@ts-ignore / @ts-expect-error / @ts-nocheck" },
  { id: "no-enum", section: "Immutable by default", how: "exact", summary: "enum" },
  { id: "no-namespace", section: "Immutable by default", how: "exact", summary: "namespace / module declaration" },
  { id: "no-dynamic-import", section: "Immutable by default", how: "exact", summary: "import()" },
  { id: "let-capture", section: "Immutable by default", how: "exact", summary: "a let assigned from inside a nested function, or captured at all by a function the cell keeps (R-K)" },
  { id: "switch-fallthrough", section: "Immutable by default", how: "exact", summary: "a non-empty case body that can reach its end, followed by another case" },
  { id: "switch-declaration", section: "Immutable by default", how: "exact", summary: "const, let, function or class directly in a case, not in a block" },
  { id: "builtin-type-name", section: "Files", how: "exact", summary: "a top-level type or interface named as one of the checker's own types (Listener, Array, Pool, ...)" },
  { id: "strict-eq-object", section: "Immutable by default", how: "exact", summary: "=== / !== (and ==, !=) on two non-primitive operands" },
  { id: "iterator-capture", section: "Immutable by default", how: "approx", summary: "a nested function uses a binding of an enclosing function whose type may hold an iterator (Iterable, Generator or a type parameter)" },
  { id: "iterator-cell", section: "Immutable by default", how: "approx", summary: "a cell's value (a state cell's content, an events value) whose type may hold an iterator" },
  // Opt-in 1
  // 2026-11-22: what another cell holds is frozen at run time; the static ownership rules below are what is left
  { id: "mut-capture", section: "Opt-in 1: Mut<T> locals", how: "exact", summary: "a function the cell keeps captures a Mut (R-K: reads too), writes it, or the Mut is written after it" },
  { id: "mut-yield", section: "Opt-in 1: Mut<T> locals", how: "exact", summary: "a generator cell yields a Mut typed array that is not a fresh copy; R-Y: a Mut, or a let of a non-primitive type, declared before a yield of a generator is used after it" },
  // 2026-11-22, R-A: [mut-yield] would name a yield where the point is an await
  { id: "mut-await", section: "Opt-in 1: Mut<T> locals", how: "exact", summary: "a Mut, or a let of a non-primitive type, declared before an await is used after it, in a function whose values may be seen before it ends" },
  { id: "removed-call", section: "Opt-in 1: Mut<T> locals", how: "exact", summary: "mut(...), freeze(...) or borrow(...): no longer part of the language" },
  // Opt-in 2
  // State and actions
  { id: "state-placement", section: "State and actions", how: "exact", summary: "state(...) only as the returned value of a sync, non-generator cell" },
  { id: "state-in-state", section: "State and actions", how: "exact", summary: "a state cell whose content type contains State or StateCell anywhere" },
  { id: "state-undefined", section: "State and actions", how: "exact", summary: "a state cell whose content type admits undefined (undefined, void, unknown, or a union with one)" },
  { id: "state-write", section: "State and actions", how: "approx", summary: "State.set/update outside the lexical body of action(...)" },
  { id: "action-call", section: "State and actions", how: "approx", summary: "an Action called outside the lexical body of action(...)" },
  { id: "action-pass", section: "State and actions", how: "approx", summary: "an Action passed to a parameter not typed Action" },
  { id: "action-capture", section: "State and actions", how: "approx", summary: "an action body uses a value that depends on state (a state cell's value, an events value, a capability, or a local computed from one), or a let, a Mut, an enclosing function's parameter, or a const computed from one" },
  { id: "read-outside-action", section: "State and actions", how: "exact", summary: "read(s) outside the lexical body of action(...)" },
  // Foreign
  { id: "foreign-unmarked", section: "Foreign values and the shell", how: "exact", summary: "foreign.d.ts declaration without /** pure */ or /** effect */" },
  { id: "foreign-effect", section: "Foreign values and the shell", how: "exact", summary: "a checked cell takes an /** effect */ foreign" },
  // Cells in other languages (lite/boundary.ts)
  { id: "boundary-unannotated", section: "Observable JavaScript and raw cells", how: "exact", summary: "a parameter naming a cell in another language has no type annotation" },
  { id: "boundary-type", section: "Observable JavaScript and raw cells", how: "exact", summary: "a cell in another language taken as a type the boundary does not check (a function, a promise, a class, Events)" },
  { id: "boundary-state", section: "Observable JavaScript and raw cells", how: "exact", summary: "State<T> on a cell with no viewof, or two State types for one view" },
];

export const RULE_IDS = new Set(RULES.map((r) => r.id));
