export let frames = function* () {
  const buf = mut(new Float32Array(2));
  for (let k = 0; k < 2; k++) {
    buf[0] = k;
    yield borrow(buf);
  }
};
export let bad = async (frames) => {
  await Promise.resolve();
  return frames[0];
};
export let ok = async (frames) => {
  const x = frames[0];
  await Promise.resolve();
  return x;
};
