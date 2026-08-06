export function sum(ptr: usize): f32 {
  let v = v128.load(ptr);
  let w = f32x4.mul(v, f32x4.splat(2.0));
  return f32x4.extract_lane(w, 0) + f32x4.extract_lane(w, 3);
}
export function ints(ptr: usize): i32 {
  let v = v128.load(ptr);
  return i32x4.extract_lane(i32x4.add(v, i32x4.splat(7)), 1);
}
