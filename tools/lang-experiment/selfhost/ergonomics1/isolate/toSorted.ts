const people = () => [{ n: "b", a: 2 }, { n: "a", a: 1 }];
const sorted = (people: { n: string; a: number }[]) => people.toSorted((x, y) => x.a - y.a);
