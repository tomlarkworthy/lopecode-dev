export const box = () => new Set<number>();
export const add = (box: Set<number>) => (x: number): void => { box.add(x); };
export const user = (add: (x: number) => void) => (): void => add(1);
export const typeBad = () => (x: number): string => x;
export const user2 = (typeBad: (x: number) => string) => (): string => typeBad(1);
