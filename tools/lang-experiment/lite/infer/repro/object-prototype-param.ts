// Fixed 2026-11-21: core.ts tested `name in CAPABILITIES`, true for every Object.prototype name, so a parameter called
// valueOf, constructor or toString was injected as a capability whose type was that prototype function. Each is now
// [inject-unknown] when no cell has its name. Met in the corpus by port:fixtures/lite-types/reject-generics.
export const a = (valueOf) => 1;
export const b = (constructor) => constructor;
export const c = (toString) => action(() => toString);
