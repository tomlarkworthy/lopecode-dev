# Memento 3 and its neighbours: what the method is, how far the evidence goes, and what could be carried over

Read on 2026-10-11, 09:15 to 10:00 UTC, after Tom: "can we deep dive into that memement 3 research
and related citations and write a research report specifically about that and related tchnologies.
And what algirthms might be portable?" The paper came into the Brain by the daily snapshot on
2026-10-10 (27 votes on Hugging Face papers) and was in the digest of 2026-10-11.

Nothing here was run. It is a reading of 26 documents. The section on what could be carried over is
an opinion; each item says what in this checkout it rests on.

## What was read

- **Memento 3** (`arxiv:2610.11794`, Zhao, Yu, He, Fang, Tutunov, Bou-Ammar, Luo, Wang; UCL, Huawei
  Noah's Ark Lab, Liverpool; 8 October 2026): the HTML full text, whole, by this session. 50 references.
- **25 related sources**, fetched by a research agent (arXiv API record for each of 23 papers, HTML
  full text for 22, two web pages): the three earlier Memento papers, ten ARC-AGI-3 papers, six on
  code as a world model, four on rules and memory in language. They are in the Brain (see "In the
  cluster"). One, Hypothesis Search, was read as an abstract only.
- This session fetched four of the papers again and looked for the agent's quotations: the Rodionov
  study's table and three sentences, the Tycho sentence and its 154 of 162, the Memento-Skills gate,
  Twin's 2.60B tokens. All were found. The other 21 (19 papers, two web pages) rest on the agent's reading.

No code for Memento 3 was found: no link in the paper or on its arXiv page, and the earlier
repository (`Memento-Teams/Memento`, last pushed 2025-10-05) has nothing of it.

## The method

A frozen model (Claude Opus 5 in Claude Code, reasoning effort extra-high) plays a game whose rules
it is not told. It keeps three things outside itself:

```
H   the record: every action sent and every frame that came back
ψ   world_model.md: the rules it believes, in prose, with the alternatives it has not settled
θ   world_model_engine.py: those rules as a program that predicts the whole next frame
```

After each real action it chooses one of three: keep both, change the rulebook and compile it
again, or repair the code and leave the rulebook. A new pair is used for planning only when two
checks pass (the paper's equation 11):

```
θ ∈ [[ψ]]                         the model reads the source and judges it faithful to the rulebook
ô_θ(H_i, a_i) = o_{i+1}  for all i  replayed over the whole record, every one of 64 x 64 cells of every frame equal
```

Five things in it are separable:

1. **Two artefacts with an order between them.** "A change in the agent's understanding of the
   environment must be recorded in ψ_t before it is compiled into code." A fault in the code alone
   changes θ and not ψ.
2. **Acceptance by exact replay of everything recorded**, not of the last failure: "a repair must
   explain earlier evidence as well as the latest discrepancy".
3. **Plans are followed one action at a time and stopped at the first frame the model did not predict.**
4. **A preference for the shorter rulebook and code among those that pass**, asked of the model and
   checked again (minimum description length).
5. **Git as the memory of the learning.** A commit and a tag an iteration; the agent reads the
   history, diffs two rulebooks, restores a module a later edit broke.

A sixth, the **population**: N pairs kept at once on one shared record, one sampled for each plan,
every pair checked against what came back. Two models count as different only when their plans differ.

## What the evidence shows

```
ARC-AGI-3, 25 public games, 183 levels            mean RHAE   games cleared   actions
Memento 3 (Opus 5, extra-high)                    100.0       25              7,518  (human 17,135)
baseline1, arxiv:2605.05138 (the code Memento 3 began from) 99.0      25              8,347
NOOA                                              85.1        19
OPINE-World                                       78.4        20
```

Ablation, with the rulebook and without, same harness and model:

```
game   actions with / without   agent turns with / without
ft09   75 / 79                  132 / 174
ka59   341 / 382                298 / 310
cn04   201 / 216                248 / 346
all    617 / 677  (-9%)         678 / 830  (-18%)
```

Population of two against one, on one game (`wa30`): 597 scored actions against 899, better or
equal on 8 of 9 levels. Pong: 21 to 0 in three episodes after 9,504 emulator frames of learning, the
controller running with no model call.

What that does and does not establish:

- **The headline is at the ceiling of a set others have also cleared.** Its own table has baseline1
  at 99.0. Tycho (`arxiv:2607.28287`) reports 100.00 with GPT-5.6 Sol in 7,766 actions, and
  100.00 with Opus 5, the model Memento 3 uses, in 6,641 actions against Memento 3's 7,518. The
  component study (`arxiv:2607.15439`) reports that at the highest effort a variant with no
  executable model "completes every level with 41% fewer actions than the human baseline". The 25
  games are public; ARC-AGI-3 has 110 more that are not, and no score on those is given.
- **The rulebook's own contribution is three games, one run each**, and every arm cleared every
  level. The effect is 60 actions in 677. No variance is reported; `arxiv:2605.05138` reports one
  game scoring 100.00 and 57.80 between two models.
- **The population is one game, one run an arm.**
- **Cost is not stated**: no tokens, dollars or hours. Neighbours on the same games report USD 119 a
  game with Opus 5 (Tycho), USD 13 to 18 a game (NOOA), 2.60 billion tokens for 25 runs (Twin), a
  median of 4 h 26 min a playthrough (the component study).
- **The fidelity check is the model's own judgement** of its own source against its own rulebook.
  Only the replay is exact.
- **Pong's full-frame replay did not pass**: "Full-frame replay retains residual rendering and
  paddle-motion errors". The gate there was the score.

## What the neighbours say about each part

| part | for | against, or a limit |
|---|---|---|
| Exact replay as the gate | The component study: the variant with verification "ranks first throughout, sometimes narrowly" (39.16, 53.72, 65.64, 74.78 against 34.16, 40.67, 58.85, 72.51 for text only). Twin (`arxiv:2608.14490`): 93.3, no scored action until the twin replays every logged transition. | The same study: its verification arm also fixes the interface, so "its advantage therefore cannot be attributed to replay verification alone". Tycho: the policy whose models were transition-exact on 154 of 162 levels scored below the two whose models were exact on 62 of 155 and 25 of 137. "Accurate transition prediction therefore does not by itself ensure strong game-playing performance". |
| A program as the model | WorldCoder (`arxiv:2402.12275`), GIF-MCTS (`arxiv:2405.15383`), Code World Models for general game playing (`arxiv:2510.04542`) | The component study's section title: "An executable deliverable is not universally beneficial"; text alone beat the executable variant in both gpt-5.5 conditions. |
| Simplifying what passes | The component study: better than executable alone in three of four settings, by 3.39 to 8.38 points | Worse by 2.94 in the weakest setting. |
| Rules kept in language | AutoManual (`arxiv:2405.16247`): 86.2% on ALFWorld against Reflexion's 59.8. WALL-E (`arxiv:2410.07484`): rules pruned by comparing predicted with observed trajectories. Reflexion (`arxiv:2303.11366`). | None of these gates a rule on replay. |
| The model's capability | | Weng's survey (`web:weng-harness-engineering`): a scaffold that improved itself with GPT-4 got worse with weaker models. The component study's first discussion heading: "Capability and reasoning effort dominate the main comparison". |

The three earlier Memento papers are a different mechanism under one name. Memento
(`arxiv:2508.16153`) keeps a bank of cases (state, action, reward), written at the end of every
task, failures included, with nothing gating a write; it reads the 4 nearest by cosine, or by a small
learned Q-function. Memento 2 (`arxiv:2512.22716`) is the theory of that and has no experiment.
Memento-Skills (`arxiv:2603.18743`) keeps skills as folders with a `SKILL.md`; after a failure a
model names the one skill at fault and rewrites it, and "all mutations are guarded by an automatic
unit-test gate, a synthetic test case is generated, executed through the updated skill, and scored
by the judge". That test is written and judged by a model.

## What could be carried over

This project already keeps rulebooks. None of them is gated the way Memento 3 gates its own.

```
524 files in the session memory, 347 of them feedback rules       written at will, never replayed
 50 knowledge/*.md, 17 with `triggers:`, 24 with `write-triggers:`  scripts/replay-learnings-triggers.sh replays the 17's PATTERNS
                                                                  over past tool calls; nothing replays a doc's claims
tools/cloud-brain/*.ojs: prose cells beside the code              /review-notebook, a model's judgement
brain-maintenance: rules.md, agents/*.md, edited by an overseer   no test of an edit
a deploy on cb4                                                   the Worker's test cells, run apart from its author
```

In the order of how directly each fits:

1. **Replay of the record as the gate on a deploy.** Today's deploy of the search passed ten tests
   and answered 502 for 90 seconds, because the tests answer SQL from a map
   (`knowledge-reranking.md`, "The deploy"). The Brain already has the record: one log line a call
   with method, status and the query string. A candidate Worker asked the last N recorded read calls
   and compared by status is the paper's part 2 with a weaker comparison (the response bodies are
   not logged, so not cell-exact). For the search, `knowledge-eval/queries.json` is a stronger record and
   exists; a floor on each set, below which a deploy is refused, does not. Not built. The limit Tycho found applies: a version
   that replays the record exactly is not thereby a better version.
2. **Prose first, then code, and say which was wrong.** The three-way choice (keep, change the rule,
   repair the code) is a question the issue loop's triage does not ask in those words. Two reviews
   on 2026-10-11 found prose that a code change had made false (`review-notebook/SKILL.md`, Runs).
   A seed's `## Methods` prose cell (`brain-knowledge.ojs:11`) is its ψ. Requiring the prose cell to change in the same commit as a
   behaviour change, and a reviewer to judge only that pair, is the fidelity check; it is a model's
   judgement here as it is there.
3. **Stop at the first surprise.** An agent that writes down what it expects of a step and halts
   when the result differs is part 3. The deployer's probation is one case of it. The loop's
   implementers do not record an expectation before a deploy.
4. **Simplify what passes, then check again.** Cheap, and the one part with a result in a second
   paper. It fits the end of an implementer's turn, with the tests as the check.
5. **A gate on edits to a role brief.** The overseer edits `agents/*.md` with no test.
   Memento-Skills gates such an edit with a test a model writes and a model judges, which is a weak
   gate; a stronger one here would be the replay in item 1 applied to briefs, for which no record of
   cases exists yet.
6. **A solved procedure compiled to code that needs no model.** Pong's controller, and the reason
   the Brain runs no agent loop in a Worker. A turn that an agent has done three times the same way
   is a candidate for a cell. No instance was looked for.
7. **Two hypotheses on one record.** Two implementers given one bug and one shared log, and counted
   as different only if their next step differs. The evidence is one game. The cost doubles.
8. **Cases with their outcome, failures included, the 4 nearest read back** (Memento 1). The Brain's
   findings are this without the outcome field. The learned retrieval needs a reward for each read,
   and the Brain's log holds 13 real look-ups, so there is nothing to learn it from.

## What does not carry

- **Determinism.** Every guarantee in the paper is for a deterministic environment that can be reset.
  A Worker's dependencies, a browser and a model are none of these. Replay here would compare
  statuses and shapes, not cells.
- **The planner.** A shortest path through a simulator has no counterpart in this work.
- **The claim of recursive self-improvement.** The paper's own definition is a loop that revises a
  model of one game. The rulebook and code persist "across attempts and levels" of a game; the paper reports
  nothing carried from one game to the next.

## In the cluster

Entered on cb4 with a token made for this and revoked after: the 25 related sources as
`arxiv:<id>` and `web:<slug>` (abstract, mechanism, evidence, cost, what could not be verified),
`method: research:memento-3`, tag `memento-3`; one finding that cites them; and a summary of this
file as `doc:research-memento-3`. `arxiv:2610.11794` was there already, from the snapshot.

## Not done

- No part of this was run, on ARC-AGI-3 or on anything of ours.
- The 19 papers and two web pages this session did not fetch again were read by one agent, once.
- The 25 references of Memento 3 that are not listed above (the reinforcement-learning and Atari
  baselines, the POMDP theory) were not read.
- Whether the log's recorded calls are enough of a record for item 1 was not measured: how many
  distinct read calls a day, and how many answer the same from one hour to the next.
