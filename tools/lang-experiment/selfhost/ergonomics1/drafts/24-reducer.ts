type Ev = { type: "deposit"; amount: number } | { type: "withdraw"; amount: number } | { type: "reset" };
type Acct = { balance: number; log: string[] };
const reduce = () => (s: Acct, e: Ev): Acct => {
  switch (e.type) {
    case "deposit":
      return { balance: s.balance + e.amount, log: [...s.log, `+${e.amount}`] };
    case "withdraw":
      if (e.amount > s.balance) return { ...s, log: [...s.log, "refused"] };
      return { balance: s.balance - e.amount, log: [...s.log, `-${e.amount}`] };
    case "reset":
      return { balance: 0, log: [] };
  }
};
const acct = (): StateCell<Acct> => state<Acct>({ balance: 0, log: [] });
const dispatch = (acct: State<Acct>, reduce: (s: Acct, e: Ev) => Acct) => action((e: Ev) => acct.update((s) => reduce(s, e)));
const test_reduce = (reduce: (s: Acct, e: Ev) => Acct) => {
  let s: Acct = { balance: 0, log: [] };
  for (const e of [{ type: "deposit", amount: 10 }, { type: "withdraw", amount: 3 }, { type: "withdraw", amount: 30 }] as Ev[]) s = reduce(s, e);
  if (s.balance !== 7) throw new Error(`balance ${s.balance}`);
  return s.log.join(" ");
};
