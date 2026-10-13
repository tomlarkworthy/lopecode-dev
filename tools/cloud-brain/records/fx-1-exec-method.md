# fx-1-exec-method: `fly.exec`, any command for the owner's tab and a named command for a blessed Worker

2026-10-13. Task 1 of `plan/cloud-brain-fly-exec-for-blessed-services.md`, built as its choice B. The
spec is written as choice A (a blessed Worker runs any command); the owner chose B, "a blessed Worker
runs only commands you have named in a setting" (comment 6238 of the project, as he was shown it), with
"1B 2A 3A 4A 5A 6A 7A 8A 9 can't u do it (later)", the reason of the `approve` made for him at event 6992.
The spec says of B one paragraph in two places, so where the commands are kept, the body a Worker sends
and what the log line says are this task's, and are in part 2. They are the writer's reading and not
his words.

The writer is a `claude` process with the token `impl-c650d9`, in the worktree
`…/.claude/worktrees/bm-fly-exec-for-blessed-services`. Times are CEST from `date`.

## 1. Before

At 21:32, with `brain-x-fly` at `527debcad75c`:

```
curl -s -o /dev/null -w "%{http_code}" -X POST https://cb4.endpointservices.workers.dev/xrpc/com.lopecode.brain.fly.exec     501
curl -s ".../xrpc/com.lopecode.brain.getSource?worker=brain-x-fly&part=reference" | grep -c "fly.exec"                       0
cd cloud-brain-dev && bun test.ts brain-x-fly      brain-x-fly @tomlarkworthy/brain-fly 527debcad75c: 12 passed, 0 failed, 1 need a browser
```

The seed's own test held that the name was no method: `test_fly_get_and_post_pass_a_path_of_the_app_and_no_other`
read 404 of `fly.exec` from the owner's tab.

## 2. What was built, in `tools/cloud-brain/brain-fly.ojs`

`POST fly.exec`. The method reference is the seed's prose, "A command on the machine"; this is what
differs from "The design" of the spec, and why.

| | The spec, choice A | As built, choice B |
|---|---|---|
| The body | `{ command, timeout }` for both callers | `{ command, timeout }` for the owner's tab alone. `{ name, timeout }` for a blessed Worker, and for the tab too. Both keys, or neither, or a key that is none of the three: 400 |
| A blessed Worker | any command | the command a setting names. 403 for `command` in its body, for a name that is not named, and for a body that is no object. With nothing named every body is one of the three |
| Where a command is | | a setting of `brain-x-fly`: the key is `command` and the name with its first letter in upper case, the value the list of texts as JSON. `commandDiskFree` = `["df","-h","/data"]` names `diskFree` |
| The log line | `{ at, by, machine, program, texts, upstream, exit, ms }` | the same with `name`: the named command, or `null` for a command of the tab's own texts |
| A command | 1 to 64 texts, 20,000 characters | the same, and the first text is not empty |

What is as the spec has it: the fixed rule, the service's check of the delegation's id against the
setting `blessed`, the one address, the timeout (1 to 60, 30), 409 with no machine named, nothing
started, Fly.io's body and status passed on with `x-fly-upstream`, `fly.get` and `fly.post` unchanged.

**Why a setting a command, and not one setting `commands`.** `config.set` takes a number, a boolean or
a text of 500 characters at most, and a key of letters and digits (`brain-core.ojs`, the route
`config.set`: `/^[A-Za-z][A-Za-z0-9]{0,63}$/`). The spec's sketch, `commands: { name: [texts] }`, is
then all the commands in 500 characters, and taking one out is an edit of JSON by hand. With a key a
command each has 500 characters, `config.set` with `value: null` takes one out, and `config.get` lists
each naming as a change with its time. The key cannot hold a `.` or a `-`, which is why the name is
joined to `command` by its upper-case letter. A Worker has 50 keys at most (the same route), of which
this service reads 7 before the commands.

**What a name is.** A lower-case letter, then letters and digits, 40 at most. The key is always
`command` and something, so a name cannot reach another setting: `blessed`, `machine`, `constructor` and
`__proto__` as names are 403 (the test).

**A value that is not a list of texts as JSON names nothing**: 403 for the Worker and 400 for the tab,
and no request to Fly.io. Eleven such values are in the test, a list of 65 texts among them.

**A blessed Worker is refused before the rest of its body is read.** `{ command: ["id"], timeout: 0 }`
from a Worker is 403 and not 400. With a named command it is then held as the tab is: a timeout of 0 or
61, or a key `stdin`, is 400.

**Every blessed Worker runs every named command.** A command is not named for one Worker. The spec's
sketch has it so ("a blessed Worker sends a name"), and his words as he was shown them say "commands you
have named in a setting". A command for one Worker alone would be a second key in each setting; not built.

**The tab may send a name.** The owner runs any command already; with `{ name }` he reads what a Worker
would be answered for it. A name that is not named is 400 for him.

**A request to Fly.io that fails** (no answer) is a 502 and one log line with `upstream: null`. The spec
does not speak of it.

The new cells are `flyExecBy` (who a call is by, from the headers), `flyCommand`, `flyNamed` and
`flyExecAsk` (what a body asks, or the refusal), each with no I/O, and `exec` in `flyOps`. `flyDefaults`
has four more values, `execTimeout`, `execMaxTimeout`, `execTexts` and `execChars`, which the prose says
as numbers and `test_fly_reference_says_each_default_and_has_no_hole` now reads: with `execMaxTimeout`
at 61 in the seed that test fails on "whole seconds, 1 to 61, and 30 when not given". The spec's trial
had found that it passed without them.

`reach` and `send` are not touched (`git diff` of the seed has no line of either), and the rule of
`FLY_API_TOKEN` is not in this seed.

## 3. Tests

One new test, `test_fly_exec_is_the_owners_tab_for_any_command_and_a_blessed_worker_for_a_named_one`,
and three changed.

The nine callers of the spec, each through the rule (`decide` and `callerOf`, as the core asks it) and
through the service, with a named command and with a command of its own texts:

```
               rule    { name: "diskFree" }   { command: ["id","-u"] }
tab            true    200                    200
blessed        true    200                    403
wide           true    403                    403      a Worker under a delegation that is not in `blessed`
token          false   403                    403
tokenNamed     false   403                    403      a token under the blessed id
worker         false   403                    403
member         false   403                    403
membersWorker  false   403                    403
anonymous      false   403                    403
```

Three requests reach Fly.io from those eighteen calls, each `POST …/machines/aa11bb22cc3310/exec` with
`authorization: Bearer …` and `redirect: "manual"`. The test's own last line counts the rest: 26 bodies
of a blessed Worker refused, 11 settings that name nothing, 10 values of `blessed` that bless nothing,
22 bodies of the owner's refused. Beside them: the values next to the limits (64 texts, 20,000
characters, a timeout of 1 and of 60) are 200; no machine named is 409 with nothing sent; a line a
call with `by`, `name`, `program` cut at 80 and `texts`, and neither `s3cret`, `--token` nor the Fly.io
token in a line; a 412 and a 500 of Fly.io's passed on with their status, and a request that throws a 502.

Changed: `test_fly_declares_one_secret_one_cron_and_two_calls` (the manifest has the rule of
`fly.exec`), `test_fly_get_and_post_pass_a_path_of_the_app_and_no_other` (the name that is no method is
now `fly.shell`; its four 403s of `post?path=machines/…/exec` stand, which is R7),
`test_fly_status_says_the_secret_is_not_set_and_then_the_machine` (`exec` is 400 with no secret) and the
reference test above.

The runs, each after the last change to the seed:

```
cd $W && bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html \
  && bun tools/lope-reader.ts tools/cloud-brain/.emitted/cloud-brain.html --get-module @tomlarkworthy/brain-fly > tools/cloud-brain/.emitted/brain-fly.js \
  && (cd cloud-brain-dev && bun test.ts brain-x-fly --with $W/tools/cloud-brain/.emitted/brain-fly.js)
brain-x-fly @tomlarkworthy/brain-fly no hash (--with): 13 passed, 0 failed, 1 need a browser

bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-fly
"tests":14,"passed":14,"failed":[]

BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-fly --shell <the build> --times 20
"runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]
```

**The new test fails without each part.** The first command, with one line of the seed changed and
then put back:

| The seed with | The command's last line | The failure |
|---|---|---|
| a Worker's own `command` not refused | 12 passed, 1 failed | the new test, at the 403 of `{ command }` |
| a name that is not named not refused | 12 passed, 1 failed | the new test, at the name `other` |
| the id not looked for in `blessed` | 12 passed, 1 failed | the new test, at `wide`: 200 for 403 |
| `execMaxTimeout: 61` | 11 passed, 2 failed | the new test at a timeout of 61, and the reference test |
| the whole command in the log line | 12 passed, 1 failed | the new test, at `s3cret` in a line |

## 4. On cb4

REPLACE-ON-CB4

## 5. Not tried, not done

- **No call of `fly.exec` has reached Fly.io.** No machine is named on cb4, and the method is the
  owner's tab's and a blessed Worker's, of which there is none. Fly.io is a function of the test. So
  the two things the spec marks not verified stand: the unit of `timeout`, and what Fly.io answers for
  a stopped machine. They are the owner's first call, as the spec has it.
- **A blessing end to end.** `delegation.create`, the id in `blessed`, a Worker that sends
  `x-brain-as`, and the core's headers to the service: the test gives the service the headers the core
  is read to send (`brain-core.ojs`, lines 656 to 659) and does not run the core. No Worker was blessed
  on cb4; that is his.
- **On cb4 nothing shows a refusal by the service.** A token of the loop is refused by the core before
  the service is asked (it names no `fly.exec`), so the 403s of part 3 are the test's.
- **How soon a changed setting is read.** A core instance keeps the settings 60 s by its seed
  (`settingsMs ?? 60000`); not measured, and so a command taken out may run for that long after.
- **Two calls at once**, and the same call sent twice: each is a request to Fly.io. Nothing holds one
  back, and the test sends none at once.
- **The panel.** No control sends `fly.exec`, and the owner names a command with `config.set` by hand:
  task 2, `fx-2-panel`, whose spec has Run, Blessed and Bless and no control for a named command.
- **No knowledge page says the method.** `git grep -n -F 'fly.exec' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`
  printed lines of the spec alone before this record. `fly-5-docs`, which makes the page of the
  machine, is at `ready`.
- **`stdin`, `container`, `machine` and `cmd`** of Fly.io's body are not passed, as the spec has it.
