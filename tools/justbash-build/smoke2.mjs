import { Bash, InMemoryFs } from "just-bash";
const fs = new InMemoryFs();
const sh = new Bash({ fs, cwd: "/" });
// Does PWD appear in returned env after a cd within one exec?
let r = await sh.exec("mkdir -p /a/b && cd /a/b; echo hi", {cwd: "/"});
console.log("stdout:", JSON.stringify(r.stdout), "PWD in env:", r.env.PWD);
// Chain a second exec passing prior env + cwd=PWD
r = await sh.exec("pwd", {cwd: r.env.PWD || "/", env: r.env});
console.log("persisted pwd:", JSON.stringify(r.stdout));
// failing command still returns env?
r = await sh.exec("cd /a; false", {cwd: "/"});
console.log("after fail exit:", r.exitCode, "PWD:", r.env.PWD);
// stderr capture
r = await sh.exec("cat /nonexistent", {cwd: "/"});
console.log("stderr:", JSON.stringify(r.stderr), "exit:", r.exitCode);
