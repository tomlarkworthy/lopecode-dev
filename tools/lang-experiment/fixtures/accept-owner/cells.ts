// An owner generator that keeps one Mut buffer across yields and lends it out.
let frames = function* () {
  const buf = mut(new Float32Array(3));
  for (let k = 1; k <= 3; k++) {
    for (let i = 0; i < buf.length; i++) buf[i] = k * (i + 1);
    yield borrow(buf);
  }
};
let total = (frames) => {
  let s = 0;
  for (const v of frames) s += v;
  return s;
};
let kept = (frames) => snapshot(frames);
let test_total = (total) => {
  if (total !== 18) throw new Error(`expected 18 (last frame 3+6+9), got ${total}`);
  return total;
};
let test_kept = (kept) => {
  if (!equals(Array.from(kept), [3, 6, 9])) throw new Error(`kept ${Array.from(kept)}`);
  return "ok";
};
