// A three-tap box blur over a Float32Array, written into a Mut local.
export let signal = () => Float32Array.from([0, 0, 3, 0, 0]);
export function blur(signal: Float32Array): Float32Array {
  const n = signal.length;
  const out = mut(new Float32Array(n));
  out.fill(0);
  for (let i = 0; i < n; i++) {
    const l = signal[Math.max(0, i - 1)];
    const r = signal[Math.min(n - 1, i + 1)];
    out[i] = (l + signal[i] + r) / 3;
  }
  return freeze(out);
}
export let test_blur = (blur) => {
  const expected = [0, 1, 1, 1, 0];
  for (let i = 0; i < expected.length; i++)
    if (Math.abs(blur[i] - expected[i]) > 1e-6) throw new Error(`blur[${i}] = ${blur[i]}`);
  return "ok";
};
