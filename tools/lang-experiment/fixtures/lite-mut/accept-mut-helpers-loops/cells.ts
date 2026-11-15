// Non-escaping helpers writing a captured Mut, a Mut per loop iteration, freeze after the loop.
let rows = () => [[1, 2], [3, 4]];
let scaled = (rows) => {
  const out = mut<number[][]>([]);
  const add = (r: readonly number[]) => { out.push(r.map((x) => x * 10)); };
  for (const r of rows) {
    const row = mut([...r]);
    row.push(0);
    add(freeze(row));
  }
  return freeze(out);
};
