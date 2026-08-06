export function mix(a: i64, b: u32, c: f32): i64 {
  let r: i64 = a ^ (<i64>b << 13);
  r += <i64>(c * 3.25);
  r = rotl(r, 7) - clz(b) + popcnt(<i64>r);
  return r % 1000003;
}
export function fill(p: usize, n: i32, v: u8): void { memory.fill(p, v, <usize>n); }
export function copy(d: usize, s: usize, n: i32): void { memory.copy(d, s, <usize>n); }
export function trig(x: f64): f64 { return Math.sin(x) + Math.log(x + 1) + Math.pow(x, 1.5); }
