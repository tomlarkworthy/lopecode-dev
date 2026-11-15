// Return types against annotations, including paths that fall off the end.
let bad_return = (): number => "s";
let bad_branch = () => (flag: boolean): string => {
  if (flag) return "a";
  return 1;
};
let bad_fall_off = () => (flag: boolean): string => {
  if (flag) return "a";
};
let bad_async = async (): Promise<number> => "s";
let ok_union = () => (flag: boolean): string | number => (flag ? "a" : 1);
