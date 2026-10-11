// The page a deploy's verdict comes from: the shell with the boot list cut to brain-shell, so a run computes
// the tests of brain-shell and of the module it joins and no other main's (132 other tests ran beside a
// Worker's on the whole shell, 9 with brain-shell alone, 2026-10-11).
// build.ts writes it as .emitted/verify.html. Spec: plan/cloud-brain-deploy-verdict-from-a-shared-page.md, design 1.
import { blockContent, findSpan } from "../lib/notebook-blocks.ts";

export const VERIFY_MAINS = ["@tomlarkworthy/brain-shell"];

// mains: another boot list than brain-shell alone (verify-run.ts adds the module of the Worker a build is run for).
export function verifyShell(shell: string, mains: string[] = VERIFY_MAINS): string {
  const span = findSpan(shell, "bootconf.json");
  if (!span) throw new Error("no bootconf.json block");
  for (const m of VERIFY_MAINS) if (!findSpan(shell, m)) throw new Error(`no block ${m}`);
  const conf = { ...JSON.parse(blockContent(shell, "bootconf.json")!), mains };
  const raw = shell.slice(span.start, span.end);
  return shell.slice(0, span.start) + raw.slice(0, raw.indexOf(">") + 1) + "\n" + JSON.stringify(conf, null, 2) + "\n</script>" + shell.slice(span.end);
}
