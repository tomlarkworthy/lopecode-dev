// stdlib/runtime.ts check, joinCells, keyFor: the oldest key of a Map
export const oldest = () => (m: Map<string, number>): string | undefined => { const f = m.keys().next(); return f.done ? undefined : f.value; };
