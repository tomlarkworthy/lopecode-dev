// robocoop-5 eval set = the robocoop-4 suite with a small overlay. The evals are IMPORTED (not copied)
// so both agents are measured by the same yardstick; the overlay only touches what the bash-less
// architecture genuinely changes:
//  - tool_call_matches criteria pinned to the bash tool → tool-agnostic equivalents (grep is a TOOL here)
//  - self-knowledge questions that referenced the bash shell / just-bash attachment → robocoop-5 facts
// Everything else (long-edit, editor-lifecycle, drive-ui, build-tool, …) runs verbatim.

import { EVALS as RC4_EVALS } from "../../robocoop-4/eval/live/evals.mjs";

const clone = (x) => JSON.parse(JSON.stringify(x));

// Full replacements for the rc4-architecture-specific self-knowledge evals.
const REPLACE = {
  "self-modules-roles": {
    id: "self-modules-roles",
    category: "self-knowledge",
    question:
      "You are implemented as several Observable modules in this notebook, each with a documented role (read " +
      "their names and header/doc cells — don't reverse-engineer the internals). Write to /notebook/answer.txt: " +
      "(1) the module that provides your agent core (the tool-use loop), (2) the module that provides your " +
      "file tools, and (3) where a /src file's byte-stable text is actually stored.",
    criteria: [
      { name: "tool_call_matches", args: { pattern: "robocoop" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "robocoop-5-core" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "robocoop-5-srctools" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "function", ignoreCase: true }, weight: 1 },
    ],
  },
  "self-decode-attachment": {
    id: "self-decode-attachment",
    category: "self-knowledge",
    // The exact decompressed size only comes from actually decoding it (eval_js + FileAttachment +
    // DecompressionStream) — 353704 bytes for the bundled jest-expect gzip.
    question:
      "This notebook bundles the jest-expect assertion library as a gzipped file attachment. Find that " +
      "attachment in your filesystem, decompress it (you'll need to run code in userspace), and write to " +
      "/notebook/answer.txt: the attachment's id, and the exact byte length (digits only) of the " +
      "DECOMPRESSED bundle.",
    criteria: [
      { name: "tool_used", args: { name: "eval_js" }, weight: 2 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "jest-expect-standalone-24.0.2.js.gz" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "353704" }, weight: 2 },
    ],
  },
  "self-live-edit-mechanism": {
    id: "self-live-edit-mechanism",
    category: "self-knowledge",
    question:
      "Explain how a change you make to a file under /src/ becomes live in the running notebook. Investigate " +
      "your own source, identify the module responsible, and describe the mechanism in one or two sentences. " +
      "Write your answer to /notebook/answer.txt.",
    criteria: [
      { name: "tool_call_matches", args: { pattern: "srctools|jbApply|applyModule" }, weight: 1 },
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "appl", ignoreCase: true }, weight: 2 },
      // "…applied onto the live RUNTIME" — the mechanism's destination; "compil" proved too strict
      // (a correct jbApply-diff answer need not mention compilation).
      { name: "answer_contains", args: { file: "/notebook/answer.txt", needle: "runtime", ignoreCase: true }, weight: 1 },
    ],
  },
};

// Criteria-level rewrites for evals that pinned the SHELL rather than the capability.
function patchCriteria(e) {
  // the live tool registry moved module in robocoop-5
  if (typeof e.question === "string")
    e.question = e.question.replaceAll("@tomlarkworthy/robocoop-4-tools", "@tomlarkworthy/robocoop-5-tools");
  for (const c of e.criteria || []) {
    if (c.name !== "tool_call_matches" || c.args?.name !== "bash") continue;
    // "searched with grep/rg via the shell" → "used the grep tool"
    if (/grep\|rg/.test(c.args?.pattern || "")) { c.name = "tool_used"; c.args = { name: "grep" }; continue; }
    // any other shell-grounding check → same pattern, any tool (rc5 has no bash)
    delete c.args.name;
  }
  // rc4 module names in grounded answers
  for (const c of e.criteria || []) {
    if (c.args?.needle === "@tomlarkworthy/robocoop-4-engine") c.args.needle = "@tomlarkworthy/robocoop-5-engine";
  }
  // inspect-anonymous-cell: rc5's list_values previews values, so it grounds the fact as legitimately
  // as inspect_value. Accept EITHER value tool (their args carry a "module" key; read_file's don't).
  if (e.id === "inspect-anonymous-cell") {
    for (const c of e.criteria || []) {
      if (c.name === "tool_used" && c.args?.name === "inspect_value") {
        c.name = "tool_call_matches";
        c.args = { pattern: '"module":\\s*"@user/vault"' };
      }
    }
  }
  return e;
}

export const EVALS = RC4_EVALS.map((e) =>
  REPLACE[e.id] ? clone(REPLACE[e.id]) : patchCriteria(clone(e))
);
