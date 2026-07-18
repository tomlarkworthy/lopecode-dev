# Export tau-bench retail domain for the JS harness: tasks, tool schemas, wiki, and per-task
# ORACLE final-state deltas computed by replaying each task's ground-truth actions through the
# OFFICIAL Python tools (tau-src). The JS port is validated against these deltas (fidelity gate)
# and graded against them (reward = final-state match + required outputs, per tau_bench.envs.base).
import json, sys, os, copy, importlib.util, types as pytypes, glob

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "tau-src")
RETAIL = os.path.join(SRC, "tau_bench", "envs", "retail")
sys.path.insert(0, SRC)

# --- import tau_bench pieces without litellm ---
pkg = pytypes.ModuleType("tau_bench"); pkg.__path__ = [os.path.join(SRC, "tau_bench")]
sys.modules["tau_bench"] = pkg
envs = pytypes.ModuleType("tau_bench.envs"); envs.__path__ = [os.path.join(SRC, "tau_bench", "envs")]
sys.modules["tau_bench.envs"] = envs

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec)
    sys.modules[name] = m
    spec.loader.exec_module(m)
    return m

load("tau_bench.types", os.path.join(SRC, "tau_bench", "types.py"))
load("tau_bench.envs.tool", os.path.join(SRC, "tau_bench", "envs", "tool.py"))
tt = load("tasks_test", os.path.join(RETAIL, "tasks_test.py"))
wiki = open(os.path.join(RETAIL, "wiki.md")).read()

def load_data():
    return {
        "orders": json.load(open(os.path.join(RETAIL, "data", "orders.json"))),
        "products": json.load(open(os.path.join(RETAIL, "data", "products.json"))),
        "users": json.load(open(os.path.join(RETAIL, "data", "users.json"))),
    }

# --- collect tools ---
tools_map, tools_info = {}, []
for f in sorted(glob.glob(os.path.join(RETAIL, "tools", "*.py"))):
    base = os.path.basename(f)
    if base == "__init__.py":
        continue
    m = load("tool_" + base[:-3], f)
    for v in vars(m).values():
        if isinstance(v, type) and hasattr(v, "invoke") and hasattr(v, "get_info") and v.__module__ == m.__name__:
            info = v.get_info()
            tools_map[info["function"]["name"]] = v
            tools_info.append(info)

# --- replay ground-truth actions per task; record observations + final-state delta ---
initial = load_data()

def delta(final):
    d = {}
    for section in ("orders", "products", "users"):
        ch = {k: v for k, v in final[section].items()
              if json.dumps(v, sort_keys=True) != json.dumps(initial[section].get(k), sort_keys=True)}
        if ch:
            d[section] = ch
    return d

tasks_out = []
for i, t in enumerate(tt.TASKS_TEST):
    data = load_data()
    obs = []
    for a in t.actions:
        try:
            o = tools_map[a.name].invoke(data=data, **a.kwargs)
        except Exception as e:
            o = f"Error: {e}"
        obs.append(o)
    tasks_out.append({
        "idx": i,
        "user_id": t.user_id,
        "instruction": t.instruction,
        "actions": [{"name": a.name, "kwargs": a.kwargs} for a in t.actions],
        "outputs": t.outputs,
        "oracle_delta": delta(data),
        "oracle_observations": obs,
    })

json.dump({"wiki": wiki, "tools_info": tools_info, "tasks": tasks_out},
          open(os.path.join(HERE, "retail-export.json"), "w"), indent=1)
print("tasks:", len(tasks_out), "tools:", len(tools_info))
print("wrote retail-export.json,", os.path.getsize(os.path.join(HERE, "retail-export.json")) // 1024, "KB")
