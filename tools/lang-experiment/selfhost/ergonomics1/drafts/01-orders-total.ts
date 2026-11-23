type Order = { id: number; customer: string; amount: number; paid: boolean };
const orders = (): Order[] => [
  { id: 1, customer: "ann", amount: 30, paid: true },
  { id: 2, customer: "bob", amount: 12.5, paid: false },
  { id: 3, customer: "ann", amount: 7.5, paid: true },
  { id: 4, customer: "cy", amount: 100, paid: true },
];
const paidTotal = (orders: Order[]) => orders.filter((o) => o.paid).map((o) => o.amount).reduce((a, b) => a + b, 0);
const bigCustomers = (orders: Order[]) => orders.filter((o) => o.amount > 20).map((o) => o.customer);
