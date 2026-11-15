let a = () => Math.random();
let b = () => {
  const M = Math;
  return M.random() + Math["random"]();
};
