// prelude.runtime.ts snapshot, equals
export const isView = () => (v: unknown): boolean => ArrayBuffer.isView(v);
