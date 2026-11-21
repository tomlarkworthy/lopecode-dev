// runner.ts, or the control RUNNER_MUTANT names (mutants.ts)
import { runner as real } from "./runner.ts";
import { MUTANTS } from "./mutants.ts";

declare const process: { env: Record<string, string | undefined> };
const name = process.env.RUNNER_MUTANT ?? "";
if (name && !MUTANTS[name]) throw new Error(`RUNNER_MUTANT=${name}: no such mutant`);
if (name) console.error(`runner: mutant ${name}`);
export const runner = (name ? MUTANTS[name] : real) as typeof real;
