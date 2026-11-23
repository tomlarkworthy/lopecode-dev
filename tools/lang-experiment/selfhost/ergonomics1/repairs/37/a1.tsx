type Card = { title: string; body: string; tag?: string };
const cards = (): Card[] => [
  { title: "One", body: "first", tag: "new" },
  { title: "Two", body: "second" },
];
const CardView = () => (p: { card: Card }) => (
  <div class="card">
    <strong>{p.card.title}</strong>
    {p.card.tag ? <span class="tag">{p.card.tag}</span> : null}
    <p>{p.card.body}</p>
  </div>
);
const board = (cards: Card[], CardView) => (
  <div>
    {cards.map((c) => <div key={c.title}><CardView card={c} /></div>)}
  </div>
);
