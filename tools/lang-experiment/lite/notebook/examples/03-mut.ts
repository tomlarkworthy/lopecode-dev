const samples = () => [0.1, 0.4, 0.45, 0.8, 0.95, 0.5];

// mut(...) gives a Mut<T> local that may be written; freeze(...) ends the writes and returns T.
const histogram = (samples: readonly number[]) => {
  const bins = mut(new Float64Array(4));
  for (const s of samples) bins[Math.min(3, Math.floor(s * 4))] += 1;
  return freeze(bins);
};

// Rejected: a Mut may not leave the cell that made it.
const leak = () => {
  const xs = mut([1, 2, 3]);
  xs.push(4);
  return xs;
};

// Rejected: a Mut may not be used after freeze.
const late = () => {
  const xs = mut([1, 2, 3]);
  const done = freeze(xs);
  xs.push(4);
  return done;
};
