import re,sys,base64,html,os
src=open('lopebooks/notebooks/tomlarkworthy_codestrates.html').read()
for m in re.finditer(r'<script id="(@tomlarkworthy/codestrates/[^"]+)"([^>]*)>(.*?)</script>',src,re.S):
    name=m.group(1).split('/')[-1]; attrs=m.group(2); body=m.group(3)
    data=base64.b64decode(body) if 'base64' in attrs else body.encode()
    open('tools/scratch/cs-vendor/'+name,'wb').write(data); print(name,len(data),attrs.strip()[:80])
