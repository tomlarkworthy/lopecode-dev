let a = () => {
  function g(..._xs: number[]) {
    return arguments.length;
  }
  return g(1);
};
