let list = (): string[] => [];
let push = (list) => {
  list.push("p");
  return list.length;
};
let test_empty = (list) => {
  if (list.length !== 0) throw new Error(`expected empty, got ${list.length}`);
  return "ok";
};
