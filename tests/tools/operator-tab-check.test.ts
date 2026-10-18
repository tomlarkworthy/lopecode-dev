import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { running, runningGroups } from "./needs";
import { judgeBase, judgeFile, parseArgs, PAGE, PAIRING, TAB, type Read } from "../../tools/cloud-brain/operator-tab-check.ts";

const ROOT = resolve(import.meta.dir, "../..");
const HASH = `#view=C100(S50(${PAGE},@tomlarkworthy/cloud-brain-docs,@tomlarkworthy/cloud-brain-specs),S50(${TAB}))`;
// A whole build with the tab: the read the probe made of .emitted/cloud-brain.html on 2026-10-11.
const built: Read = { mains: [PAGE, TAB, PAIRING], hash: HASH, operatorPane: "chat", pageSection: "link", fields: 1, fieldsInPane: 1, folds: 1, fieldBottom: 868, paneScroll: 0, paneHeadings: ["Operator", "Tests"], sectionFields: 0, ccWs: 4, inboxPump: 8 };
// The page module in a shell with no brain-operator: the chat under its own heading.
const oldShell: Read = { ...built, mains: [PAGE, PAIRING], operatorPane: null, pageSection: "chat", fieldsInPane: 0, fieldBottom: null, paneScroll: null, paneHeadings: [], sectionFields: 1 };

describe("operator-tab-check", () => {
  test("the arguments", () => {
    expect(parseArgs(["a.html"])).toEqual({ file: "a.html", proof: false, base: null, shell: null, expect: null });
    expect(parseArgs(["a.html", "--proof"]).proof).toBe(true);
    expect(parseArgs(["--base", "cb4", "--shell", "s.html", "--expect", "old-shell"])).toEqual({ file: null, proof: false, base: "https://cb4.endpointservices.workers.dev", shell: "s.html", expect: "old-shell" });
    expect(parseArgs(["--base", "https://b.example/"]).base).toBe("https://b.example");
    for (const bad of [[], ["a.html", "b.html"], ["a.html", "--base", "cb4"], ["a.html", "--shell", "s.html"], ["--base", "cb4", "--proof"], ["--base", "cb4", "--expect", "new"], ["--base"], ["a.html", "--times", "2"]])
      expect(() => parseArgs(bad)).toThrow();
  });

  test("a whole build passes, and each requirement fails by name", () => {
    expect(judgeFile(built)).toEqual([]);
    const failing = (change: Partial<Read>) => judgeFile({ ...built, ...change }).map((f) => f.slice(0, 2));
    expect(failing({ operatorPane: "no part", fieldsInPane: 0, fields: 0, fieldBottom: null, paneScroll: null })).toEqual(["R1", "R2", "R4"]);
    expect(failing({ paneHeadings: ["Operator", "Health"] })).toEqual(["R1"]);
    expect(failing({ fieldBottom: 901 })).toEqual(["R2"]);
    expect(failing({ paneScroll: 12 })).toEqual(["R2"]);
    expect(failing({ hash: HASH.replace(`S50(${TAB})`, `S30(${PAIRING})`) })).toEqual(["R3"]);
    expect(failing({ mains: [PAGE, TAB] })).toEqual(["R3"]);
    expect(failing({ ccWs: 0 })).toEqual(["R3"]);
    // Two chats: the section drew one as well.
    expect(failing({ fields: 2, folds: 2, pageSection: "chat", sectionFields: 1 })).toEqual(["R4"]);
    expect(failing({ inboxPump: null })).toEqual(["R6"]);
  });

  test("at the address: the new shell, and the old one with --expect old-shell", () => {
    expect(judgeBase(built, 1729, null)).toEqual([]);
    expect(judgeBase(oldShell, 1729, "old-shell")).toEqual([]);
    expect(judgeBase(oldShell, 1729, null).length).toBe(2);
    expect(judgeBase(built, 1729, "old-shell").length).toBe(2);
    expect(judgeBase(built, null, null)).toEqual(["cloud-brain did not join the page"]);
    // The tab drawn and the part not there yet.
    expect(judgeBase({ ...built, operatorPane: "no part", fields: 0, fieldsInPane: 0 }, 1729, null).length).toBe(1);
    // Before the page module that has the section was deployed.
    expect(judgeBase({ ...oldShell, pageSection: null }, 1729, "old-shell").length).toBe(1);
  });

  // brain-operator has no seed since 2026-10-18 (i13287): it is read from cloud-brain-dev/deploy/ after bun sync.ts.
  test("the build's layout is the one the probe looks for, and the modules carry what it reads", async () => {
    const build = readFileSync(resolve(ROOT, "tools/cloud-brain/build.ts"), "utf8");
    expect(build).toContain(`conf.hash = "${HASH}";`);
    expect(build).toContain(`{ name: "${TAB}", deployed: true, main: true, files: {} }`);
    expect(/const OWNED = \[[^\]]*"brain-operator"/.test(build)).toBe(false);
    const tab = readFileSync(running("brain-operator"), "utf8");
    expect(tab).toContain('data-operator="chat"');
    expect(tab).toContain('data-operator="no part"');
    expect((await runningGroups("brain-operator")).imports.map((i) => /^import \{[^}]*\} from "([^"]+)"/.exec(i)?.[1])).toEqual(["@tomlarkworthy/plugin-registry", "@tomlarkworthy/lopepage-urls", "@tomlarkworthy/jest-expect-standalone"]);
    const page = readFileSync(resolve(ROOT, "tools/cloud-brain/cloud-brain.ojs"), "utf8");
    expect(page).toContain('data-operator-section="link"');
    expect(page).toContain('data-operator-section="chat"');
    expect(page).toContain(`mains.has("${TAB}")`);
  });
});
