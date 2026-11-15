let o = (): { a?: number } => ({});
let d = (o) => {
  delete o.a;
  return o;
};
