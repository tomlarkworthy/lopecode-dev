const getter = () => {
  let n = 0;
  const get = () => n;
  n = 5;
  return get;
};
const read5 = (getter: () => number) => getter();
