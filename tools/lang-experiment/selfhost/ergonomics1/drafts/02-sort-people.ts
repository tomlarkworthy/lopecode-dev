type Person = { name: string; age: number };
const people = (): Person[] => [
  { name: "zoe", age: 30 },
  { name: "adam", age: 25 },
  { name: "bea", age: 30 },
  { name: "carl", age: 19 },
];
const byAgeThenName = (people: Person[]) =>
  [...people].sort((a, b) => a.age - b.age || a.name.localeCompare(b.name));
const names = (byAgeThenName: Person[]) => byAgeThenName.map((p) => p.name).join(",");
