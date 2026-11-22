// The view of a Mut is consumed immediately by a non-retaining intrinsic: accepted.
let n = () => 3;
let copyHead = (n) => {
  const src = new Float32Array(8);
  for (let i = 0; i < src.length; i++) src[i] = i;
  const dst = new Float32Array(n);
  dst.set(src.subarray(0, n));
  const total = Array.from(src.subarray(0, n)).reduce((a, b) => a + b, 0);
  return { head: dst, total, src: src };
};
