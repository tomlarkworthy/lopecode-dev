import { Bash, InMemoryFs, getCommandNames } from "./_b.mjs";
const fs = new InMemoryFs({ "/hello.txt": "world\n" });
const sh = new Bash({ fs, cwd: "/" });
const r = await sh.exec("echo hi | tr a-z A-Z; cat hello.txt; ls /");
console.log("OK exit", r.exitCode, "stdout:", JSON.stringify(r.stdout));
console.log("commands:", getCommandNames().length);
