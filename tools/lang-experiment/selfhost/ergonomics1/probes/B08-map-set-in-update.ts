const scores = (): StateCell<Map<string, number>> => state(new Map<string, number>());
const score = (scores: State<Map<string, number>>) => action((who: string) => scores.update((m) => m.set(who, (m.get(who) ?? 0) + 1)));
const n = (scores: Map<string, number>) => scores.size;
