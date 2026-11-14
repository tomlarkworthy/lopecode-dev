// v1: a captured let may be assigned only from a non-escaping local helper. Each of these escapes.
export let returned = () => {
  let n = 0;
  const inc = () => {
    n = n + 1;
  };
  return inc;
};
export let passed = () => {
  let n = 0;
  [1, 2].forEach((x) => {
    n += x;
  });
  return n;
};
export let stored = () => {
  let [n] = [0];
  const set = () => {
    n = 1;
  };
  return { set };
};
export let viaEscapingOuter = () => {
  let n = 0;
  const outer = () => {
    const inner = () => {
      n = 2;
    };
    inner();
  };
  return [outer];
};
