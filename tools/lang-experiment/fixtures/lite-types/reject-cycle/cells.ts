// Two cells that depend on each other.
export let bad_a = (bad_b) => bad_b + 1;
export let bad_b = (bad_a) => bad_a + 1;
