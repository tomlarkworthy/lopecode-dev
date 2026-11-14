export let a = () => Math.random();
export let b = () => {
  const M = Math;
  return M.random() + Math["random"]();
};
