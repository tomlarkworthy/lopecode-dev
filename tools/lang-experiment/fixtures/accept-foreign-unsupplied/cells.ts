// A foreign declared in foreign.d.ts with no value in foreign.runtime.ts (an import the harness cannot
// supply) rejects its consumers with "<name> is not defined", so a shell consumer is shell-skip.
let one = () => 1;
let test_one = (one) => {
  if (one !== 1) throw new Error(`one ${one}`);
  return "ok";
};
