// Names a cell may not use, and the wording of the action-capture message, as SoundScript cells. Under bun,
// types.ts links them with types.ss.ts; in the notebook they are compiled cells of @tomlarkworthy/soundscript-checker.

// A compiled cell is Observable JavaScript: it reads viewof and mutable as keywords, and names a cell's viewof
// inputs $0, $1, …, so a name of the code (not of a type, which is kept in a comment) may not be one of these.
// viewof and mutable stay usable as a property's key or a member's name; $<digits> is reserved there too.
export const viewofInputName = () => (name: string): boolean => /^\$\d+$/.test(name);
export const reservedName = (viewofInputName) => (name: string): boolean => viewofInputName(name) || name === "viewof" || name === "mutable";
export const RESERVED_MSG = (viewofInputName) => (name: string): string => viewofInputName(name)
  ? `${name} is reserved: Observable JavaScript names a cell's viewof inputs $0, $1, …`
  : `${name} is reserved: Observable JavaScript reads it as a keyword`;

// what capture.ts found: a name an action body uses, why it depends on state, and whether the checker could not follow it
export type CaptureFound = { readonly name: string; readonly why: string; readonly opaque?: boolean };
export const captureMessage = () => (c: CaptureFound): string => c.opaque
  ? `${c.name} ${c.why}; an action may use from its cell only inputs that hold no state and the consts and functions made from them, so pass the value to the action when it is called`
  : c.why.startsWith("capability ")
  ? `${c.name} is a capability, so an action using it would make the stored state depend on something the calls do not record; take the value as an argument of the action`
  : `${c.name} depends on state (${c.why}), so an action using it would act on the value from the cell's last run; read the state cell inside the action with read(...), or pass the value to the action when it is called`;
