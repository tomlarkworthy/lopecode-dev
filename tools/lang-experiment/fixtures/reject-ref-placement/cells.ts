export let c = () => {
  const r = ref(0);
  return r;
};
export let flag = () => true;
export let d = (flag) => {
  if (flag) return ref(0);
  return ref(1);
};
export let e = (flag) => (flag ? ref(0) : ref(1));
