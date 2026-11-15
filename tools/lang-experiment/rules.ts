// Rule registry. Every id here must have a fixtures/reject-<id>/ directory (fixtures.ts asserts it).
// `section` is the RULES.md section the rule comes from; `how` is "exact" or "approx" (see README).

export type RuleInfo = { id: string; section: string; summary: string; how: "exact" | "approx" };

export const RULES: RuleInfo[] = [
  // Files
  { id: "module-level", section: "Files", how: "exact", summary: "only cells, type/interface and import type at module level" },
  { id: "cell-not-function", section: "Files", how: "exact", summary: "a top-level let/const whose initializer is not an arrow or function expression" },
  { id: "duplicate-cell", section: "Files", how: "exact", summary: "a cell name defined twice across cells.ts and shell.ts" },
  // Cells and injection
  { id: "inject-unknown", section: "Cells and injection", how: "exact", summary: "parameter names no cell, foreign declaration or capability" },
  { id: "inject-type", section: "Cells and injection", how: "exact", summary: "typed parameter not assignable from the named cell's value type" },
  { id: "inject-ref", section: "Cells and injection", how: "approx", summary: "parameter typed Ref<X> must name a cell returning RefCell<X>" },
  { id: "inject-pattern", section: "Cells and injection", how: "exact", summary: "injected parameter must be a plain identifier (no destructuring, default, rest)" },
  { id: "free-name", section: "Cells and injection", how: "exact", summary: "free name that is not a parameter, local, prelude name or allowed intrinsic" },
  { id: "banned-member", section: "Cells and injection", how: "exact", summary: "Math.random" },
  { id: "cell-by-name", section: "Cells and injection", how: "exact", summary: "a cell referenced by its module-level name instead of as a parameter" },
  // Immutable by default
  { id: "member-write", section: "Immutable by default", how: "approx", summary: "assignment, compound assignment or ++/-- on a member of a non-Mut value" },
  { id: "no-delete", section: "Immutable by default", how: "exact", summary: "delete" },
  { id: "mutating-method", section: "Immutable by default", how: "approx", summary: "mutating method on a non-Mut Array/Map/Set/typed array" },
  { id: "object-assign", section: "Immutable by default", how: "approx", summary: "Object.assign onto an existing (non-literal, non-Mut) value" },
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
  { id: "let-capture", section: "Immutable by default", how: "exact", summary: "a let assigned from inside a nested function" },
  { id: "strict-eq-object", section: "Immutable by default", how: "exact", summary: "=== / !== (and ==, !=) on two non-primitive operands" },
  // Opt-in 1
  { id: "mut-bind", section: "Opt-in 1: Mut<T> locals", how: "exact", summary: "mut(...) must be the initializer of a local const" },
  { id: "mut-escape", section: "Opt-in 1: Mut<T> locals", how: "approx", summary: "Mut value returned, yielded, aliased, put in a literal, or passed to a non-Mut parameter" },
  { id: "mut-capture", section: "Opt-in 1: Mut<T> locals", how: "exact", summary: "Mut value referenced from a nested function" },
  { id: "mut-after-freeze", section: "Opt-in 1: Mut<T> locals", how: "approx", summary: "Mut binding used textually after freeze(binding)" },
  // Opt-in 2
  { id: "borrow-placement", section: "Opt-in 2: owner cells", how: "exact", summary: "borrow(x) only as the operand of yield in a generator cell" },
  { id: "borrowed-escape", section: "Opt-in 2: owner cells", how: "approx", summary: "Borrowed value returned, yielded, put in a ref/literal/let, or captured by a closure" },
  { id: "borrowed-await", section: "Opt-in 2: owner cells", how: "approx", summary: "Borrowed value used textually after an await in the same function" },
  // Refs and actions
  { id: "ref-placement", section: "Refs and actions", how: "exact", summary: "ref(...) only as the returned value of a sync, non-generator cell" },
  { id: "ref-in-ref", section: "Refs and actions", how: "exact", summary: "a ref cell whose content type contains Ref or RefCell anywhere" },
  { id: "ref-write", section: "Refs and actions", how: "approx", summary: "Ref.set/update outside the lexical body of action(...)" },
  { id: "action-call", section: "Refs and actions", how: "approx", summary: "an Action called outside the lexical body of action(...)" },
  { id: "action-pass", section: "Refs and actions", how: "approx", summary: "an Action passed to a parameter not typed Action" },
  { id: "action-capture", section: "Refs and actions", how: "approx", summary: "an action body uses a value that depends on state (a ref's value, an events value, a capability, or a local computed from one)" },
  { id: "read-outside-action", section: "Refs and actions", how: "exact", summary: "read(ref) outside the lexical body of action(...)" },
  // Foreign
  { id: "foreign-unmarked", section: "Foreign values and the shell", how: "exact", summary: "foreign.d.ts declaration without /** pure */ or /** effect */" },
  { id: "foreign-effect", section: "Foreign values and the shell", how: "exact", summary: "a checked cell takes an /** effect */ foreign" },
];

export const RULE_IDS = new Set(RULES.map((r) => r.id));
