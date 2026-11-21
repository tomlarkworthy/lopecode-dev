// browser/cells.ts generatorish: a method of a value of foreign shape
export const generatorish = () => (v: unknown): boolean => typeof v === "object" && v !== null && typeof v.next === "function";
