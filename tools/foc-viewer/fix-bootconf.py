import re, json, sys
p = "lopebooks/notebooks/@tomlarkworthy_foc-viewer.html"
s = open(p, encoding="utf-8").read()
MAINS = ["@tomlarkworthy/lopepage-2","@tomlarkworthy/foc-data","@tomlarkworthy/foc-chat",
         "@tomlarkworthy/foc-wiki","@tomlarkworthy/foc-demos","@tomlarkworthy/foc-projects",
         "@tomlarkworthy/foc-people","@tomlarkworthy/atproto","@tomlarkworthy/at-read",
         "@tomlarkworthy/save-in-place","@tomlarkworthy/module-selection",
         "@tomlarkworthy/claude-code-pairing","@tomlarkworthy/annotate"]
HASH = "#view=S100(@tomlarkworthy/foc-chat,@tomlarkworthy/foc-wiki,@tomlarkworthy/foc-demos,@tomlarkworthy/foc-projects,@tomlarkworthy/foc-people)"
done = False
out = []
last = 0
for m in re.finditer(r'(<script id="bootconf\.json"[^>]*>)(.*?)(</script>)', s, re.S):
    try:
        conf = json.loads(m.group(2))
    except Exception:
        continue
    conf["mains"] = MAINS
    conf["hash"] = HASH
    s = s[:m.start()] + m.group(1) + "\n" + json.dumps(conf, indent=2) + "\n" + m.group(3) + s[m.end():]
    done = True
    break
assert done, "no parseable bootconf block"
s = re.sub(r"<title>.*?</title>", "<title>Feeling of Computing</title>", s, count=1, flags=re.S)
open(p, "w", encoding="utf-8").write(s)
print("bootconf mains:", len(MAINS), "hash has cc:", "cc=" in HASH)
