export let a = async () => {
  const m = await import("./cells");
  return typeof m;
};
