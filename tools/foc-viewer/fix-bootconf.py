# Normalise a save-in-place export of the FoC site: bootconf mains order and default hash,
# no pairing token anywhere, and a page description in the head.
import base64, re, json, sys
p = sys.argv[1] if len(sys.argv) > 1 else "lopebooks/notebooks/Feeling_of_Computing.html"
s = open(p, encoding="utf-8").read()
MAINS = ["@tomlarkworthy/lopepage-2","@tomlarkworthy/foc-data","@tomlarkworthy/foc-chat",
         "@tomlarkworthy/foc-wiki","@tomlarkworthy/foc-demos","@tomlarkworthy/foc-projects",
         "@tomlarkworthy/foc-people","@tomlarkworthy/atproto","@tomlarkworthy/at-read",
         "@tomlarkworthy/save-in-place","@tomlarkworthy/module-selection",
         "@tomlarkworthy/claude-code-pairing","@tomlarkworthy/annotate",
         "@tomlarkworthy/command-palette","@tomlarkworthy/robocoop-5",
         "@tomlarkworthy/robocoop-5-engine","@tomlarkworthy/robocoop-5-srctools"]
HASH = "#view=S100(@tomlarkworthy/foc-chat,@tomlarkworthy/foc-wiki,@tomlarkworthy/foc-demos,@tomlarkworthy/foc-projects,@tomlarkworthy/foc-people)"
DESC = "The Feeling of Computing community in one file: the Slack archive read from atproto, the wiki, demo videos, projects and people."
done = False
for m in re.finditer(r'(<script id="bootconf\.json"[^>]*>)(.*?)(</script>)', s, re.S):
    try:
        conf = json.loads(m.group(2))
    except Exception:
        continue
    extra = set(conf["mains"]) - set(MAINS)
    assert not extra, extra
    conf["mains"] = MAINS
    conf["hash"] = HASH
    s = s[:m.start()] + m.group(1) + "\n" + json.dumps(conf, indent=2) + "\n" + m.group(3) + s[m.end():]
    done = True
    break
assert done, "no parseable bootconf block"
# Edit mode is whatever the exporting tab had toggled: editor-5's persist_attach_menu writes
# `__attachMenu` into cell_options.json, so an export from an editing tab ships an editing build.
# The published site is a reading build, so pin it off here.
edit_was = None
m = re.search(r'(<script id="@tomlarkworthy/editor-5/cell_options\.json"[^>]*>)(.*?)(</script>)', s, re.S)
assert m, "no editor-5 cell_options.json block"
opts = json.loads(base64.b64decode(m.group(2)).decode("utf-8"))
edit_was = opts.get("__attachMenu")
opts["__attachMenu"] = False
blob = base64.b64encode(json.dumps(opts, separators=(",", ":")).encode("utf-8")).decode("ascii")
s = s[:m.start()] + m.group(1) + "\n" + blob + "\n" + m.group(3) + s[m.end():]

s = re.sub(r"<title>.*?</title>", "<title>Feeling of Computing</title>", s, count=1, flags=re.S)
# pairing token captured into prerendered hrefs (command palette) or the hash
before = s.count("cc=LOPE")
s = re.sub(r"cc=LOPE-\d+-[A-Z0-9]+(?:&amp;|&)", "", s)
s = re.sub(r"(?:&amp;|&|\?)cc=LOPE-\d+-[A-Z0-9]+", "", s)
head = s[:s.index("</head>")]
if '<meta name="description"' not in head:
    s = s.replace('<meta property="og:type" content="website">',
                  '<meta property="og:type" content="website">\n  <meta name="description" content="%s">\n  <meta property="og:description" content="%s">' % (DESC, DESC), 1)
open(p, "w", encoding="utf-8").write(s)
print("bootconf mains:", len(MAINS), "| cc= removed:", before, "->", s.count("cc=LOPE"), "| description:", '<meta name="description"' in s[:s.index("</head>")], "| __attachMenu:", edit_was, "-> False")
