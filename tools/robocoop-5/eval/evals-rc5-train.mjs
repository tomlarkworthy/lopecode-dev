// Evals written by rc5-train workers (.claude/skills/rc5-train), category "rc5-train". Each one encodes a
// defect a worker found in a real run: the goal prompt, criteria that fail on the defect, and an
// `oracle` reference solution that scores 1.00 under --oracle. Where the fix was a wiki page, a
// `tool_call_matches` criterion on the page path asserts it was read.
export const RC5_TRAIN_EVALS = [];
