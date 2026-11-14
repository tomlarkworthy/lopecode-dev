// World state seen from the shell; ValueOf<"seed"> names a checked cell's value type.
export let vars_initial = (seed: ValueOf<"seed">) => ({ n: seed * 10 });
export let seedTwice = (seed): ValueOf<"seed"> => seed * 2;
