type User = { id: string; name: string };
const users = (): User[] => [
  { id: "u1", name: "Ann" },
  { id: "u2", name: "Bob" },
  { id: "u3", name: "Cy" },
];
const byId = (users: User[]) => {
  const index: Record<string, User> = {};
  for (const u of users) index[u.id] = u;
  return index;
};
const nameOfU2 = (byId: { [id: string]: User }) => byId["u2"]?.name;
