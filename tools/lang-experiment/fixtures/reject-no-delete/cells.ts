export let o = (): { a?: number } => ({});
export let d = (o) => {
  delete o.a;
  return o;
};
