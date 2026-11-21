// browser/cells.ts on: Object.freeze({ [LISTENER]: true, events, action })
export const on = () => (l: symbol, events: unknown, act: (x: unknown) => void) => ({ [l]: true, events, action: act });
