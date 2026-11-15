// Generic interfaces and functions (supported) and a bounded type parameter (unsupported).
interface Variable<T, I> { readonly name: string; readonly inputs: I; readonly value: T | undefined }
let x = (): Variable<number, readonly []> => ({ name: "x", inputs: [], value: 1 });
let y = (): Variable<string, readonly [Variable<number, readonly []>]> => ({ name: "y", inputs: [{ name: "x", inputs: [], value: 1 }], value: "1" });
let valueOf = () => <T, I>(v: Variable<T, I>): T | undefined => v.value;
let ok_read = (valueOf, x, y) => (valueOf(x) ?? 0) + (valueOf(y) ?? "").length;
let bad_read = (valueOf, x): string | undefined => valueOf(x);
let uns_constrained = () => <T extends string>(v: T) => v;
