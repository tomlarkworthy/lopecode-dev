type W = Mut<Map<number, number>>;
export const viaAlias = () => (m: W): void => void m.set(1, 1);
export const inline = () => (m: Mut<Map<number, number>>): void => void m.set(1, 1);
