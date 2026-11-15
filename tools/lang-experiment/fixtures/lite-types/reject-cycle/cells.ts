// Two cells that depend on each other.
let bad_a = (bad_b) => bad_b + 1;
let bad_b = (bad_a) => bad_a + 1;
