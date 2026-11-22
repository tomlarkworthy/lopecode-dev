const s5_frames = function* () {
  const buf = new Float32Array(3);
  for (let k = 1; k <= 3; k++) {
    for (let i = 0; i < buf.length; i++) buf[i] = k * (i + 1);
    yield buf.slice();
  }
};

const s5_total = (s5_frames) => {
  let s = 0;
  for (const v of s5_frames) s += v;
  return s;
};

const s5_kept = (s5_frames) => snapshot(s5_frames);

const s5_first = async (s5_frames: Float32Array) => {
  const x = s5_frames.at(0) ?? 0;
  await Promise.resolve();
  return x;
};
