type CardData = { readonly title: string; readonly body: string; readonly tag?: string };

const cards = (): readonly CardData[] => [
  { title: "One", body: "first", tag: "new" },
  { title: "Two", body: "second" },
];

const Card = () => (p: { readonly card: CardData }): Elem => (
  <div class="card">
    <strong>{p.card.title}</strong>
    {p.card.tag === undefined ? null : <span class="tag">{p.card.tag}</span>}
    <p>{p.card.body}</p>
  </div>
);

const board = (cards: readonly CardData[], Card) => (
  <div>
    {cards.map((c) => <Card key={c.title} card={c} />)}
  </div>
);
