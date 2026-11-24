type Acct = { readonly balance: number; readonly log: readonly string[] };
type AcctEvent =
  | { readonly type: "deposit"; readonly amount: number }
  | { readonly type: "withdraw"; readonly amount: number }
  | { readonly type: "reset" };

// The task's reduce(state, event): "state" is a prelude name, so the parameters are s and e.
const reduce = () => (s: Acct, e: AcctEvent): Acct => {
  if (e.type === "reset") return { balance: 0, log: [] };
  if (e.type === "deposit") return { balance: s.balance + e.amount, log: [...s.log, `+${e.amount}`] };
  if (e.amount > s.balance) return { balance: s.balance, log: [...s.log, "refused"] };
  return { balance: s.balance - e.amount, log: [...s.log, `-${e.amount}`] };
};

const acct = (): StateCell<Acct> => state<Acct>({ balance: 0, log: [] });

const dispatch = (acct: State<Acct>, reduce) => action((e: AcctEvent) => acct.update((s) => reduce(s, e)));

const test_reduce = (reduce) => {
  let s: Acct = { balance: 0, log: [] };
  s = reduce(s, { type: "deposit", amount: 10 });
  s = reduce(s, { type: "withdraw", amount: 3 });
  s = reduce(s, { type: "withdraw", amount: 30 });
  if (s.balance !== 7) throw new Error(`balance is ${s.balance}`);
  return s.log.join(" ");
};
