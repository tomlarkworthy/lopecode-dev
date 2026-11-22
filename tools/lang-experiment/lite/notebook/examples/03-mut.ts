const samples = () => [0.1, 0.4, 0.45, 0.8, 0.95, 0.5];

// A value this cell made is writable while the cell runs: bins is filled in place.
const histogram = (samples: readonly number[]) => {
  const bins = new Float64Array(4);
  for (const s of samples) bins[Math.min(3, Math.floor(s * 4))] += 1;
  return bins;
};

// Accepted: xs is made here, so it may be written and then returned. Readers get it read-only.
const grown = () => {
  const xs = [1, 2, 3];
  xs.push(4);
  return xs;
};

// Accepted: two names for one local array. The write through xs shows through done: [1, 2, 3, 4].
const twoNames = () => {
  const xs = [1, 2, 3];
  const done = xs;
  xs.push(4);
  return done;
};
