export function bad(n: i32): string {
  let x: i32 = "not a number";
  return x.undefinedMethod(n);
}
