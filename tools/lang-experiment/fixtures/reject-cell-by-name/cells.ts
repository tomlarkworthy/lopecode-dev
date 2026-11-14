export let a = () => 1;
export let b = () => a() + 1;
export function f(): number {
  return f();
}
