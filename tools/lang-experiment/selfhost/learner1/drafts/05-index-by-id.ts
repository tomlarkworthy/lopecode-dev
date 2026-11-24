type User = { readonly id: string; readonly name: string };

const users = (): readonly User[] => [
  { id: "u1", name: "Ann" },
  { id: "u2", name: "Bob" },
  { id: "u3", name: "Cy" },
];

const byId = (users: readonly User[]) => {
  const m = new Map<string, User>();
  for (const u of users) m.set(u.id, u);
  return m;
};

const nameOfU2 = (byId) => byId.get("u2")?.name ?? "";
