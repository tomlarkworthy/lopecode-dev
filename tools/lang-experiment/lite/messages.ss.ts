// Names a cell may not use, and the wording of the action-capture message, as SoundScript cells. Under bun,
// types.ts links them with types.ss.ts; in the notebook they are compiled cells of @tomlarkworthy/soundscript-checker.

// A compiled cell is Observable JavaScript: it reads viewof and mutable as keywords, and names a cell's viewof
// inputs $0, $1, …, so a name of the code (not of a type, which is kept in a comment) may not be one of these.
// viewof and mutable stay usable as a property's key or a member's name; $<digits> is reserved there too.
export const viewofInputName = () => (name: string): boolean => /^\$\d+$/.test(name);
// e1 (2026-11-23): the names the compiler writes into a compiled cell. Each runtime cell and capability is an input
// ss_<name> (tc-text.ss.ts tcInputsIn), a closure registration calls ss_closure or ss_methods with a list whose
// parameter is ss_i (tc-reg.ss.ts, fnreg.ts), and a duplicate or a type is a variable $ss$… (tcVariableName)
export const emittedName = () => (name: string): boolean => name.startsWith("ss_") || name.startsWith("$ss$");
export const reservedName = (viewofInputName, emittedName) => (name: string): boolean => viewofInputName(name) || emittedName(name) || name === "viewof" || name === "mutable";
export const RESERVED_MSG = (viewofInputName, emittedName) => (name: string): string => viewofInputName(name)
  ? `${name} is reserved: Observable JavaScript names a cell's viewof inputs $0, $1, …`
  : emittedName(name)
  ? `${name} is reserved: the compiler names what it inserts into a compiled cell ss_… and $ss$…, so a name with either prefix would replace it; rename it`
  : `${name} is reserved: Observable JavaScript reads it as a keyword`;
// a cell may not be named like an input the compiled cells take from the module's scope: a state cell's value takes
// Generators, an events or listener cell takes invalidation (a parameter named invalidation is the capability)
export const reservedCellName = (reservedName) => (name: string): boolean => reservedName(name) || name === "Generators" || name === "invalidation";
export const RESERVED_CELL_MSG = (reservedName, RESERVED_MSG) => (name: string): string => reservedName(name)
  ? RESERVED_MSG(name)
  : `${name} is reserved as a cell name: compiled cells take ${name} from the module, and a cell of that name would replace it`;
// a9 (2026-11-23): the compiler refuses a cell whose text holds its insertion mark or its language mark (tc-build.ss.ts
// tcCompileChecked), so the checker refuses it first; the marks are written split, as there
export const reservedText = () => (text: string): string | null => ["/*" + "ss", "/*" + '{lang:"ss"}*/'].find((m) => text.includes(m)) ?? null;
export const RESERVED_TEXT_MSG = () => (cell: string, m: string): string => `cell ${cell} contains the text ${m}, which the compiler reserves for what it inserts into a compiled cell, so the cell would not compile; write it another way (in a string, "/" + "*ss")`;

// e1 (2026-11-23), B5: a syntax ban's message is the node kind, but for x!, which ergonomics1 21 met as the word
// TSNonNullExpression: it names what the checker accepts in its place
export const banMessage = () => (rule: string, kind: string): string => rule === "no-non-null"
  ? "x! (a non-null assertion) is not checked; narrow the value instead: x ?? fallback, if (x === undefined) return …, or a for…of loop over an array in place of an index"
  : kind;
// e1 (2026-11-23), 6a: an index read stays T | undefined (S2.x); the fixes the possibly-undefined messages name
export const UNDEF_FIX = () => "; an index read (xs[i]), a find or a get may give undefined: give a fallback (xs[i] ?? 0), check it first (if (x === undefined) return …), loop with for…of in place of an index, or read the last element with xs.at(-1) and check that";
// what capture.ts found: a name an action body uses, why it depends on state, and whether the checker could not follow it
export type CaptureFound = { readonly name: string; readonly why: string; readonly opaque?: boolean; readonly fix?: string };
export const captureMessage = () => (c: CaptureFound): string => c.fix !== undefined
  ? `${c.name} ${c.why}; ${c.fix}`
  : c.opaque
  ? `${c.name} ${c.why}; an action may use from its cell only inputs that hold no state and the consts and functions made from them, so pass the value to the action when it is called`
  : c.why.startsWith("capability ")
  ? `${c.name} is a capability, so an action using it would make the stored state depend on something the calls do not record; take the value as an argument of the action (a handler is called with values only by a canvas's onPointerDown, onPointerMove, onPointerUp and onPointerCancel, which give { x, y, t, id, buttons }, and an input's onInput, which gives its text; onClick gives none)`
  : `${c.name} depends on state (${c.why}), so an action using it would act on the value from the cell's last run; read the state cell inside the action with read(...), or pass the value to the action when it is called`;
