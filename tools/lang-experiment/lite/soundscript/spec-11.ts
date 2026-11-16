type S11Row = { price: number; name: string };

const s11_total = (s11_rows: S11Row[]) => s11_rows.reduce((a, r) => a + r.price, 0);

const s11_area = (s11_raw_area: number) => s11_raw_area + 1;

const s11_shown = (s11_level: number) => s11_level;

const s11_bump = (s11_level: State<number>) => action(() => s11_level.set(read(s11_level) + 3));

const s11_big = (s11_level: State<number>) => action(() => s11_level.set(99));

const s11_late_twice = (s11_late: number) => s11_late * 2;
