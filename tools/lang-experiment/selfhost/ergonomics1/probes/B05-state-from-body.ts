const count = (): StateCell<number> => state(0);
const clamp = (count: State<number>) => {
  count.set(10);
  return "clamped";
};
const seen = (count: number) => count;
