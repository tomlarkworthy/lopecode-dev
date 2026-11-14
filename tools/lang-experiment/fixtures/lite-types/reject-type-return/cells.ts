// Return types against annotations, including paths that fall off the end.
export let bad_return = (): number => "s";
export let bad_branch = () => (flag: boolean): string => {
  if (flag) return "a";
  return 1;
};
export let bad_fall_off = () => (flag: boolean): string => {
  if (flag) return "a";
};
export let bad_async = async (): Promise<number> => "s";
export let ok_union = () => (flag: boolean): string | number => (flag ? "a" : 1);
