import re, sys

# Match the OLD synthetic-variable guard block regardless of comments/indentation.
OLD = re.compile(
    r'([ \t]*)if \(conf\.headless\) \{'          # open, capture base indent
    r'.*?'                                        # comments + for-loop head
    r'ojs_module\.variable\(observer\(nm\)\)\.define\(\[nm\], x => x\);'
    r'\s*\}\s*\}',                                # close for, close if
    re.DOTALL)

def new_block(ind):
    L = [
      ind+"if (conf.headless) {",
      ind+"    // runtime.module() applies the observer only on first instantiation; if another main",
      ind+"    // imported this module as a dependency first (e.g. save-in-place imports lopepage-2),",
      ind+"    // the dedup drops the observer and the page's output cell is never observed -> blank",
      ind+"    // page. Re-observe the module's unobserved cells IN PLACE (set the observer + mark",
      ind+"    // dirty so the reachability pass enqueues them) so the mount is reachable regardless",
      ind+"    // of load order, without adding synthetic variables the exporter would serialize.",
      ind+"    let __reobserved = false;",
      ind+"    for (const __v of __ojs_runtime._variables) {",
      ind+"        if (__v._module === ojs_module && typeof __v._observer === 'symbol') {",
      ind+"            __v._observer = observer(__v._name);",
      ind+"            __ojs_runtime._dirty.add(__v);",
      ind+"            __reobserved = true;",
      ind+"        }",
      ind+"    }",
      ind+"    if (__reobserved) __ojs_runtime._compute();",
      ind+"}",
    ]
    return "\n".join(L)

def fix(path):
    s=open(path,encoding='utf-8').read()
    n=0
    def rep(m):
        nonlocal n; n+=1
        return new_block(m.group(1))
    s2=OLD.sub(rep,s)
    if n: open(path,'w',encoding='utf-8').write(s2)
    return n

if __name__=='__main__':
    total=0
    for p in sys.argv[1:]:
        c=fix(p); total+=c
        if c: print(f"  {c}x  {p}")
    print(f"total replacements: {total}")
