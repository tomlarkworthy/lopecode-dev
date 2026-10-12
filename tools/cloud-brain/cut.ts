// A text a tool prints, bounded at n characters. A text that was cut says so where it was cut: how much is shown,
// how long the whole is, and the flag of the tool that prints all. `whole` is that flag.
// Used by tab-tests.ts and verify-run.ts; cloud-brain-dev/test.ts has a copy of its own, since that repository is run
// with nothing of this one beside it. Spec: plan/cloud-brain-answers-cut-and-not-said.md, "The local tools".
export const cut = (text: string, n: number, whole = false) =>
  whole || text.length <= n ? text : `${text.slice(0, n)}… (cut: ${n} of ${text.length} characters; --whole prints all)`;
