# df27 = df26 + an optional `timeout_s` on eval_js (default 60, cap 600).
# Walk y turns 8-11 (2026-09-07): the writer cell runs ~1 s per target x 100 targets and never fits the
# fixed 60 s cap, so the deliverable stayed a timed-out all-null file for four turns.
import sys
src, dst = "robocoop-5-eval-bigcap-df26.html", "robocoop-5-eval-bigcap-df27.html"
s = open(src, encoding="utf8").read()
def rep(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:70])
    s = s.replace(old, new)
rep("60 s budget per call;",
    "60 s budget per call by default — pass `timeout_s` (up to 600) ONLY for a deliberate long run such as "
    "the writer cell over every target, and expect the page to be unresponsive until it returns;")
rep("""        code: {
          type: 'string',
          description: 'JavaScript. Bare expression is auto-returned; multi-statement needs `return`; await allowed.'
        }
      },
      required: [
        'module',
        'code'
      ],
      additionalProperties: false
    },
    execute: async ({module, code}) => {""",
    """        code: {
          type: 'string',
          description: 'JavaScript. Bare expression is auto-returned; multi-statement needs `return`; await allowed.'
        },
        timeout_s: {
          type: 'number',
          description: 'Seconds before the call is abandoned (default 60, max 600). Raise it only for a run you know is long, e.g. the writer over all targets.'
        }
      },
      required: [
        'module',
        'code'
      ],
      additionalProperties: false
    },
    execute: async ({module, code, timeout_s}) => {
      const timeoutMs = Math.min(600, Math.max(1, Number(timeout_s) || 60)) * 1000;""")
rep("const r = await evalInModule(mod, code);", "const r = await evalInModule(mod, code, timeoutMs);")
open(dst, "w", encoding="utf8").write(s)
print(dst, len(s))
