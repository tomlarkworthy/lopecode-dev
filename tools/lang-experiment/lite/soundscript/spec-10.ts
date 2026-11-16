const s10_double = () => (n: number) => n * 2;

const test_s10_double = (s10_double: (n: number) => number) => {
  if (s10_double(21) !== 42) throw new Error(`s10_double(21) is ${s10_double(21)}`);
  return "s10_double(21) is 42";
};
