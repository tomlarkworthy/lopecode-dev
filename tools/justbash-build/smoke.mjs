import { Bash, InMemoryFs, getCommandNames } from "just-bash";

// 1. Shared fs across two Bash instances
const fs = new InMemoryFs({ "/work/readme.txt": "hello\n" });
const shellA = new Bash({ fs, cwd: "/work" });
const shellB = new Bash({ fs, cwd: "/work" });

let r = await shellA.exec("echo 'from A' > /work/a.txt && ls");
console.log("A ls:", JSON.stringify(r.stdout), "exit", r.exitCode);

r = await shellB.exec("cat a.txt");
console.log("B sees a.txt:", JSON.stringify(r.stdout), "exit", r.exitCode);

// 2. Does cwd persist across exec calls on same instance? (expect NO)
await shellA.exec("cd /");
r = await shellA.exec("pwd");
console.log("A pwd after cd / (separate exec):", JSON.stringify(r.stdout));

// 3. Does env return final env?
r = await shellA.exec("export FOO=bar; echo done");
console.log("exec returns env keys incl FOO?", r.env && Object.keys(r.env).includes("FOO"), "FOO=", r.env && r.env.FOO);

// 4. Read fs from outside via bash.fs
await shellA.writeFile("/work/outside.txt", "written via fs api\n");
console.log("fs.readFile:", JSON.stringify(await fs.readFile("/work/outside.txt")));
console.log("fs.readdir /work:", await fs.readdir("/work"));
console.log("fs.getAllPaths:", fs.getAllPaths());

// 5. cwd capture trick via trailing pwd into file
r = await shellA.exec("cd /work && mkdir -p sub && cd sub\npwd > /.cwd", {cwd: "/work"});
console.log("captured cwd:", JSON.stringify(await fs.readFile("/.cwd")));

// 6. command count
console.log("num commands:", getCommandNames().length);
