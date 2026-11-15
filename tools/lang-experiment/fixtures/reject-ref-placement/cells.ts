let c = () => {
  const r = ref(0);
  return r;
};
let flag = () => true;
let d = (flag) => {
  if (flag) return ref(0);
  return ref(1);
};
let e = (flag) => (flag ? ref(0) : ref(1));
