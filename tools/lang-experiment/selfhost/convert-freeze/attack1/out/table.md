| group | programs | accepted (strong) | fired in ctl | accepted and fired | silent, no B | silent, B | accepted (main) | silent (main) |
|---|---|---|---|---|---|---|---|---|
| C | 78 | 65 | 75 | 63 | 34 | 33 | 35 | 0 |
| N | 37 | 23 | 35 | 22 | 17 | 14 | 24 | 0 |
| V | 15 | 9 | 13 | 8 | 2 | 1 | 8 | 0 |
| rest | 6 | 5 | 6 | 5 | 1 | 1 | 5 | 0 |
| destr | 7 | 7 | 7 | 7 | 0 | 0 | 6 | 0 |
| default | 8 | 4 | 8 | 4 | 0 | 0 | 1 | 0 |
| union | 8 | 5 | 8 | 5 | 0 | 0 | 5 | 0 |
| let | 11 | 7 | 10 | 7 | 1 | 1 | 5 | 0 |
| keep | 22 | 18 | 19 | 15 | 0 | 0 | 1 | 0 |
| gen | 10 | 5 | 9 | 4 | 0 | 0 | 1 | 0 |
| throw | 4 | 4 | 4 | 4 | 0 | 0 | 2 | 0 |
| generic | 6 | 3 | 6 | 3 | 0 | 0 | 1 | 0 |
| mutparam | 7 | 7 | 7 | 7 | 0 | 0 | 4 | 0 |
| state | 4 | 2 | 1 | 1 | 0 | 0 | 2 | 0 |
| jsx | 5 | 1 | 0 | 0 | 0 | 0 | 1 | 0 |
| spread | 8 | 8 | 7 | 7 | 7 | 7 | 7 | 0 |
| events | 2 | 1 | 0 | 0 | 0 | 0 | 2 | 0 |
| sites | 5 | 5 | 5 | 5 | 0 | 0 | 5 | 0 |
| consumer | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 0 |
| total | 246 | 182 | 223 | 170 | 65 | 60 | 118 | 0 |

no channel (accepted, did not fire in ctl): C/from-mapfn-opt, C/then-callback-opt, N/structuredClone, V/splice-fresh, keep/helper-then, keep/helper-then-later, keep/async-helper-result, gen/gen-cell-local-reused, state/action-arg-stored, spread/push-spread-then-return, events/events-yield-c-alias, jsx/jsx-fn-c-alias

silent with B: C/every-inline-default, C/every-inline-opt, C/filter-inline-default, C/filter-inline-opt, C/find-inline-default, C/find-inline-opt, C/findIndex-inline-default, C/findIndex-inline-opt, C/findLast-inline-default, C/findLast-inline-opt, C/flatMap-inline-default, C/flatMap-inline-opt, C/forEach-inline-default, C/forEach-inline-opt, C/forEach-let-stash, C/map-forEach-3rd, C/map-gen-cell, C/map-inline-default, C/map-inline-opt, C/map-mut-param-receiver, C/map-named-default-result, C/map-named-opt-result, C/map-named-rest-result, C/map-of-record-mut, C/map-promise-sink, C/map-result-opt, C/min-literal-callback, C/min-named-callback, C/reduce-4th-typearg, C/set-forEach-3rd, C/some-inline-default, C/some-inline-opt, C/ta-forEach-promise-sink, N/array-of, N/array-of-map, N/array-of-promise-sink, N/min-array-of, N/min-reduce-init, N/reduce-init-async-sink, N/reduce-init-cell-input, N/reduce-init-map2, N/reduce-init-mut-param, N/reduce-init-promise-sink, N/reduce-init-set2, N/reduce-init-typearg, N/reduce-init-typearg-empty, N/ta-reduce-init, V/ta-view-promise-sink, consumer/C-consumer-reads-twice, consumer/N-consumer-reads-twice, consumer/spread-consumer-reads-twice, let/for-of-c-alias, rest/spread-of-mut-of-mut, spread/array-of-spread, spread/min-spread-arg, spread/push-spread-retains, spread/rest-spread-map-values, spread/rest-spread-maps, spread/rest-spread-promise-sink, spread/unshift-spread

silent without B only: C/map-state-sink, N/reduce-init-consumer, N/reduce-init-direct-return, N/reduce-init-state-sink, V/ta-view-direct-return

silent without B that SS_N=0 repairs: N/array-of, N/array-of-map, N/array-of-promise-sink, N/min-array-of, N/min-reduce-init, N/reduce-init-async-sink, N/reduce-init-cell-input, N/reduce-init-consumer, N/reduce-init-direct-return, N/reduce-init-map2, N/reduce-init-mut-param, N/reduce-init-promise-sink, N/reduce-init-set2, N/reduce-init-state-sink, N/reduce-init-typearg, N/reduce-init-typearg-empty, N/ta-reduce-init, V/ta-view-direct-return, V/ta-view-promise-sink, consumer/N-consumer-reads-twice

silent without B that SS_N=0 does not repair: 45
