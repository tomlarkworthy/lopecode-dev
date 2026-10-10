# Prompt caching: Workers AI through the Brain against MiMo 2.5 on OpenRouter

Measured 2026-10-10, 05:20 to 05:47 UTC, one machine in Berlin. Asked by Tom: "Can we investigate cache
performance compared to the real MimMo 2.5?"

Read as: prefix caching of the prompt, where a provider keeps the model's state for a prefix it has seen and bills
the repeated tokens at a lower rate. "The real MiMo 2.5" is read as `xiaomi/mimo-v2.5-pro` on OpenRouter, the model
`knowledge/training-robocoop-5.md` pins for every run, with `xiaomi/mimo-v2.5` beside it. Neither reading was
confirmed with Tom.

**Workers AI has no MiMo.** `ai.models?task=Text Generation` listed 36 models on 2026-10-10 and none is Xiaomi's.
Eight of them carry a price "per M cached input tokens". Two were measured, and they are different models from MiMo:
`@cf/zai-org/glm-5.3-flash` ($0.15 in, $0.50 out, $0.03 cached, the nearest in price to `xiaomi/mimo-v2.5` at $0.14
and $0.28) and `@cf/google/gemma-4-26b-a4b-it` ($0.10, $0.30, $0.05). The comparison is of two services' caches, not
of one model in two places.

## What was read

- Cloudflare, https://developers.cloudflare.com/workers-ai/features/prompt-caching/ (2026-10-10): "Workers AI enables
  prefix caching by default for select models", and "To maximize cache hit rates, send the `x-session-affinity`
  header with a unique identifier for your session or agent." It gives no lifetime for a cached prefix and no
  smallest size. Cached tokens "are billed at a lower rate than regular input tokens, which get totalled into your
  neuron count."
- OpenRouter's model list, https://openrouter.ai/api/v1/models and `/models/<slug>/endpoints` (2026-10-10):
  `xiaomi/mimo-v2.5-pro` $0.435 in, $0.87 out, $0.0036 cached a million tokens, served by GMICloud, AtlasCloud,
  Xiaomi, DigitalOcean, Novita and StreamLake at prices of their own (DigitalOcean's cached price is $0.096).
  `xiaomi/mimo-v2.5` $0.14, $0.28, $0.0028. Each endpoint has `supports_implicit_caching: false`.

## The protocol

`BRAIN_BASE=cb4 USD=<n> bun tools/cloud-brain/ai-cache-bench.ts <target> <prefixTokens>`, with `30000` and `8000` as
`prefixTokens`: the script writes 0.8 words a token asked, and the models counted about 27 000 and 7 000 tokens. The
targets were `cf:@cf/zai-org/glm-5.3-flash`, `cf:@cf/google/gemma-4-26b-a4b-it`, `or:xiaomi/mimo-v2.5-pro`,
`or:xiaomi/mimo-v2.5` and, for the pinned run, `or:xiaomi/mimo-v2.5-pro@Xiaomi`. One run is one prefix that nothing has sent
before: its first words are the run's name, then seeded words from a list of 55. The prefix is the system message.
Each call ends in a new one-line question, streams, and has `max_tokens` 16 and `temperature` 0. Six calls with 2 s
between the end of one and the start of the next, then one call after 60, 300 and 900 s idle. The ten runs went as
two batches of five: the OpenRouter runs from 05:21:41 UTC, the Workers AI runs from 05:25:54. Before them, two
runs with `--quick` (two calls, `prefixTokens` 2000) tried the script; they are under The rows, prefix of 1 900 tokens.

- Workers AI: `POST /xrpc/com.lopecode.brain.ai.v1/chat/completions` on cb4 with the owner's session, so the Brain's
  three hops are in the times (about 60 ms, `rpc-performance.md`). `USD` is the `usd` of each call, which the Brain
  charges whole: 0.01 for `glm-5.3-flash` at 30000 (both runs), 0.003 at 8000 and 2000; 0.007 for `gemma-4-26b` at
  30000 and 0.002 at 8000 (the `charged` of each row). With no `USD` the script sends 0.02. `x-session-affinity` was the run's name, but for
  one run that sent none (`AFFINITY=0` in the environment).
- OpenRouter: its own address, with `reasoning: { enabled: false }` and `usage: { include: true }`. cb4 holds no
  OpenRouter key (`proxy.fetch` answered "the secret for openrouter.ai is not set"), so the script reads the key the
  robocoop-5 eval tools read, from the git-ignored `tools/robocoop-4/.env`. One run pinned the provider Xiaomi
  (`provider: { only: ["Xiaomi"], allow_fallbacks: false }`).

`first` is milliseconds from sending to the first piece of text or reasoning.

**A limit of `first`.** Reasoning was switched off on the OpenRouter calls only; the script sends no such field to
Workers AI. 46 of the 47 Workers AI calls returned no answer text in their 16 tokens (the one that did: `glm-5.3-flash`
at 7 000 tokens, call 6, "OK"). Every one has a `first`, so for those 46 it is the time to a piece of reasoning. The
27 calls of MiMo 2.5 Pro all answered "OK" in text. So `first` compares calls of one model with each other. Between
Workers AI and MiMo it compares the first reasoning piece with the first answer piece, and says nothing of which
answers sooner. Not run again with reasoning off on both sides.

`cached` is
`usage.prompt_tokens_details.cached_tokens`. Cost is OpenRouter's `usage.cost`, and for Workers AI `usage.neurons`
at $0.000011. The rows are in `tools/cloud-brain/.emitted/ai-cache/`, which is git-ignored; they are all below.

## The rows, prefix of 27 000 tokens

```
                                     call  1      2      3      4      5      6    +60s   +300s   +900s
glm-5.3-flash, affinity      cached     0  27264  27264  27264  27264  27264  27264      0       0   of 27320
  Workers AI                 first   1657   3165   1018    704    890    704    758  17687    2034   ms
                             $ x1e-3 4.11   0.83   0.83   0.83   0.83   0.83   0.83   4.11    4.11
glm-5.3-flash, no affinity   cached     0  27264  27264  27264      0  27264      0      0       0   of 27315
                             first   1519   1585   7338   3200   1851   2295   1374   2278    8480
gemma-4-26b, affinity        cached     0  25984  25984  25984  25984  25984      0      0       0   of 26056
  Workers AI                 first   2813    700    577    700    672    529   1358   1493    1625
                             $ x1e-3 2.61   1.31   1.31   1.31   1.31   1.31   2.61   2.61    2.61
mimo-v2.5-pro, Xiaomi only   cached     0  27264  27264  27264  27264  27264  27264  27264       0   of 27381
  OpenRouter                 first   2723   2857   1667   1961   1772   1682   1788   3331    2518
                             $ x1e-3 11.9   0.15   0.15   0.15   0.15   0.15   0.15   0.15    11.9
mimo-v2.5-pro, any provider  cached     0  27344      0      0  27344  27264  27264  27264       0   of 27369
  OpenRouter                 provider  DO     DO     Xi     No     DO     Xi     No     Xi      No
                             first   3587   1190   2590   3439   2438   2976   2172   6976    2648
                             $ x1e-3 13.1   2.64   11.9   13.1   2.64   0.15   0.16   0.15    13.1
mimo-v2.5, any provider      cached     0  27328  27328  27328  27328  27328  27328  27328   27328   of 27380
  OpenRouter                 provider  GM     Xi     GM     GM     GM     GM     No     GM      GM
                             first   4309   1990   3601   3486  58762   4231   4180   2858   56741
                             $ x1e-3 3.26   0.08   0.08   0.08   0.08   0.08   0.11   0.08    0.08
```

DO DigitalOcean, Xi Xiaomi, No Novita, GM GMICloud.

## The rows, prefix of 7 000 tokens

```
                                     call  1      2      3      4      5      6    +60s   +300s   +900s
glm-5.3-flash, affinity      cached     0   7296   7296   7296   7296   7296   7296      0       0   of 7340
                             first    687    764   3553    727    553   5014   5716   1109    1800
gemma-4-26b, affinity        cached     0      0   6912   6912      0   6912   6912      0       0   of 6989
                             first   1054    567    466    497    556    433    495    852     867
mimo-v2.5-pro, any provider  cached     0   7328      0   7296   7296   7296   7296   7296       0   of 7360
                             provider  DO     DO     Xi     Xi     Xi     Xi     Xi     Xi      DO
                             first   1750   1391   2352   1832   6006   2306   1390   2656    1227
mimo-v2.5, any provider      cached     0   6144   6144   6144   7296   6144   6144   6144    6144   of 7311
                             provider  No     Xi     GM     GM     No     No     GM     GM      No
                             first  24027   1662   3055   2970   7922   4125   7442   2294    2587
```

## The rows, prefix of 1 900 tokens

The two `--quick` runs: two calls 2 s apart, and no call after an idle time.

```
                                     call  1      2
glm-5.3-flash, affinity      cached     0      0   of 1872
                             first   1585   4696
mimo-v2.5, any provider      cached     0   1024   of 1875
                             provider  GM     GM
                             first   1770   4827
```

## Reading

One run of each, so each line below is what that run showed, not a rate.

- **How long a prefix stays cached.** Workers AI: `glm-5.3-flash` had it after 60 s and not after 300 s, both sizes.
  `gemma-4-26b` lost the 26 000-token prefix inside 60 s and kept the 7 000-token one through 60 s. MiMo 2.5 Pro at
  Xiaomi had it after 300 s and not after 900 s. For an agent that waits minutes between turns, Xiaomi's cache
  outlived Cloudflare's.
- **What a hit saves in money.** At 27 000 tokens: `glm-5.3-flash` $0.00411 to $0.00083, a fifth. `gemma-4-26b`
  $0.00261 to $0.00131, a half. MiMo 2.5 Pro at Xiaomi $0.0119 to $0.00015, one eightieth. A cached call of MiMo 2.5
  Pro cost less than a cached call of either Workers AI model; an uncached one cost 3 to 5 times more.
- **What a hit saves in time.** `gemma-4-26b` at 27 000 tokens: 529 to 700 ms of `first` on a hit, 1358 to
  2813 ms on a miss. At 7 000 tokens the gain was small or none: 433 to 497 ms on the four hits, 556 and 567 ms on
  the two misses among the close calls, 852 to 1054 ms on the first call and the two after 300 s and more. `glm-5.3-flash` was too uneven to say: hits from 704 to 3165 ms, misses from 1657 to 17687 ms. MiMo 2.5 Pro
  at Xiaomi: 1667 to 3331 ms on a hit, 2518 and 2723 ms on the two misses, so no gain was seen. The
  smallest `first` in the 27 000-token rows was 529 ms on Workers AI (`gemma-4-26b`) and 1190 ms for MiMo 2.5 Pro (at
  DigitalOcean), but the first is a piece of reasoning and the second a piece of the answer (A limit of `first`), so
  this does not show that Workers AI answers sooner.
- **`x-session-affinity`: one pair of runs, and one run against.** `glm-5.3-flash` at 27 000 tokens missed on the
  fifth call of six and after 60 s without the header, and on neither with it. That is one run each way. With the
  header, `gemma-4-26b` at 7 000 tokens still missed on calls 2 and 5. So the header did not make a hit certain, and
  whether it made one more likely is not shown by this. `brain-x-ai` passes the header on; a caller has to send it.
- **OpenRouter's choice of provider breaks the cache of MiMo 2.5 Pro.** With no provider pinned, calls 3 and 4 went
  to providers that had not seen the prefix and were billed in full: the six close calls cost $0.0436 against
  $0.0127 pinned to Xiaomi. DigitalOcean's hit is billed at $0.00264, 17 times Xiaomi's.
- **`xiaomi/mimo-v2.5` reported the prefix cached on every call after the first**, at three providers, two of which
  (Xiaomi at call 2, Novita after 60 s) had not been sent it by this run, and still after 900 s. Not explained. It was billed as cached.
  It also wrote 14 to 16 reasoning tokens on most calls with reasoning switched off, and three of its 18 calls took
  24, 57 and 59 s to `first`.
- Only part of a prefix is reported cached: 27264 of 27320, 6912 of 6989. Each count at Workers AI, Xiaomi, Novita
  and GMICloud is a multiple of 64. DigitalOcean's are not (27344 and 7328, multiples of 16). Block size was not tested.
- **A short prompt.** `glm-5.3-flash` did not cache a prompt of 1872 tokens on its second call, 2 s after the first.
  `xiaomi/mimo-v2.5` at GMICloud cached 1024 of 1875. One call each. Cloudflare's page gives no smallest size.

## Not measured

- Workers AI with reasoning switched off, so that `first` is the first piece of an answer on both services.
- A second run of anything. The times of `glm-5.3-flash` in particular need more than one.
- MiMo and a Workers AI model on one task: nothing here says which answers better.
- A prefix that grows turn by turn, as an agent's does. Each call here had the same prefix and a new last message.
- Tool definitions in the prefix, `cache_control` markers, and the other six Workers AI models with a cached price.
- Whether five runs at once changed the times. They did not share a prefix.

## Spend

OpenRouter $0.100 by its own `usage.cost`, 47 answered calls. Workers AI $0.068 by `usage.neurons`, 47 calls, for
which the Brain charged the owner's allowance $0.294 (`usd` from 0.002 to 0.01 a call). Both sums include the two
`--quick` runs.
