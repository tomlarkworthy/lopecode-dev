type Rt = { evalDepth: number; actionDepth: number; call: Map<string, unknown> | null; waiting: (() => void)[]; commits: number };
export const idle = (rt: Rt) => (): boolean => !rt.call && !rt.waiting.length;
export const depth = (rt: { evalDepth: number; actionDepth: number }) => (): boolean => rt.evalDepth > 0;
export const viaWeak = (stores: WeakMap<object, string>) => (h: object): string | undefined => stores.get(h);
export const viaUnknown = (stores: unknown) => (): boolean => typeof stores === "object";
export const viaSym = (STATECELL: symbol) => (): boolean => typeof STATECELL === "symbol";
export const viaFn = (nameOf: (a: object) => string) => (a: object): string => nameOf(a);
