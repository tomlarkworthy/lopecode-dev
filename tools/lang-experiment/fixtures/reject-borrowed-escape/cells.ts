export let frames = function* () {
  const buf = mut(new Float32Array(2));
  for (let k = 0; k < 2; k++) {
    buf[0] = k;
    yield borrow(buf);
  }
};
export let bad = (frames) => frames;
export let bad2 = (frames) => {
  const f = () => frames[0];
  return f();
};
export let bad3 = (frames) => [frames];
export let bad4 = (frames) => ref(frames);
export let ok = (frames) => frames[0] + snapshot(frames)[1];
