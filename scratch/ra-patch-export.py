import re, sys
p='lopebooks/notebooks/tomlarkworthy_code-facts.html'
s=open(p).read()
m=re.search(r'(id="bootconf.json"[^>]*>)(.*?)(</script>)', s, re.S)
conf=m.group(2)
conf=re.sub(r'"hash": "[^"]*"', '"hash": "#view=R100(S65(@tomlarkworthy/code-facts),S35(@tomlarkworthy/blank-notebook,@tomlarkworthy/claude-code-pairing))"', conf)
conf=re.sub(r"\s*\"headless\": (true|false),", "", conf)
conf=re.sub(r'("hash": "[^"]*")', r'\1,\n  "headless": true', conf)  # lopepage-2 needs it: without it the bootloader inspector adopts every node first
mains=re.search(r'"mains": \[(.*?)\]', conf).group(1)
names=[x.strip('"') for x in mains.split(',')]
for n in ['@tomlarkworthy/code-facts','@tomlarkworthy/lopepage-2']:
    names.remove(n); names.insert(0,n)
conf=conf.replace(mains, ','.join('"%s"'%n for n in names))
s=s[:m.start(2)]+conf+s[m.end(2):]
tok=re.findall(r'LOPE-\d+-[A-Z0-9]{4}', s)
s=re.sub(r'#cc=LOPE-\d+-[A-Z0-9]{4}&amp;','#',s); s=re.sub(r'&(amp;)?cc=LOPE-\d+-[A-Z0-9]{4}','',s); s=re.sub(r'cc=LOPE-\d+-[A-Z0-9]{4}','',s)
open(p,'w').write(s)
print("tokens stripped:", len(tok), "left:", len(re.findall(r'LOPE-\d+-[A-Z0-9]{4}', s)))
print(conf)


# strip the baked prerender: it was captured from the headless tab, whose DOM values render as inspector objects
s=open(p).read()
b=s.find('<body>')+len('<body>'); c=s.find('<script id="lope-prerender-cleanup">')
if c>0:
    e=s.find('</script>', c)+len('</script>'); s=s[:b]+'\n'+s[e:]
    m=re.search(r'(id="bootconf.json"[^>]*>)(.*?)(</script>)', s, re.S)
    s=s[:m.start(2)]+re.sub(r',?\s*"prerender": true', '', m.group(2))+s[m.end(2):]
    open(p,'w').write(s); print("prerender stripped")
