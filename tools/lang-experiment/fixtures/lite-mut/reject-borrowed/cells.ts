// Borrowed values: views stay borrowed; use after await is checked across loop back-edges.
export let frames = function* () {
  const buf = mut(new Float32Array(2));
  for (let k = 0; k < 2; k++) { buf[0] = k; yield borrow(buf); }
};
export let bad_view = (frames) => frames.subarray(0);
export let bad_loop_await = async (frames) => {
  let t = 0;
  for (let i = 0; i < 2; i++) { t += frames[0] ?? 0; await Promise.resolve(); }
  return t;
};
export let bad_widen = (frames: Float32Array) => frames;
export let ok_read = (frames) => (frames[0] ?? 0) + frames.length + snapshot(frames).length;
