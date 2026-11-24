type Person = { readonly name: string; readonly age: number };

const people = (): readonly Person[] => [
  { name: "zoe", age: 30 },
  { name: "adam", age: 25 },
  { name: "bea", age: 30 },
  { name: "carl", age: 19 },
];

const byAgeThenName = () => (a: Person, b: Person): number =>
  a.age !== b.age ? a.age - b.age : a.name < b.name ? -1 : a.name > b.name ? 1 : 0;

const names = (people: readonly Person[], byAgeThenName) =>
  people.toSorted(byAgeThenName).map((p) => p.name).join(",");
