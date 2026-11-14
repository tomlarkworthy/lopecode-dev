// Generic interfaces and functions (supported) and a bounded type parameter (unsupported).
interface Variable<T, I> { readonly name: string; readonly inputs: I; readonly value: T | undefined }
export let x = (): Variable<number, readonly []> => ({ name: "x", inputs: [], value: 1 });
export let y = (): Variable<string, readonly [Variable<number, readonly []>]> => ({ name: "y", inputs: [{ name: "x", inputs: [], value: 1 }], value: "1" });
export let valueOf = () => <T, I>(v: Variable<T, I>): T | undefined => v.value;
export let ok_read = (valueOf, x, y) => (valueOf(x) ?? 0) + (valueOf(y) ?? "").length;
export let bad_read = (valueOf, x): string | undefined => valueOf(x);
export let uns_constrained = () => <T extends string>(v: T) => v;
