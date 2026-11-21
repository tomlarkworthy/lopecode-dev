// core.ts bug, NOT COVERED by the md port: `name in CAPABILITIES` is true for every Object.prototype name, so a
// parameter called valueOf, constructor or toString is injected as a capability whose type is that prototype function
// (checkSources gives b the value "function Object() { [native code] }", and c an action-capture "is a capability").
// A cell has no `in` on a record, so mdInjectParam stops with "parameter valueOf, a name of Object.prototype".
// Met in the corpus by port:fixtures/lite-types/reject-generics (and its lax copy).
export const a = (valueOf) => 1;
export const b = (constructor) => constructor;
export const c = (toString) => action(() => toString);
