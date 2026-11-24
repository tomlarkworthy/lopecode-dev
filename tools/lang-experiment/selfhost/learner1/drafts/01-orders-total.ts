type Order = { readonly id: number; readonly customer: string; readonly amount: number; readonly paid: boolean };

const orders = (): readonly Order[] => [
  { id: 1, customer: "ann", amount: 30, paid: true },
  { id: 2, customer: "bob", amount: 12.5, paid: false },
  { id: 3, customer: "ann", amount: 7.5, paid: true },
  { id: 4, customer: "cy", amount: 100, paid: true },
];

const paidTotal = (orders: readonly Order[]) => orders.filter((o) => o.paid).reduce((sum, o) => sum + o.amount, 0);

const bigCustomers = (orders: readonly Order[]) => orders.filter((o) => o.amount > 20).map((o) => o.customer);
