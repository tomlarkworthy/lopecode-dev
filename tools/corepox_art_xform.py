# Uniform-scale + translate rewrite of an SVG fragment: art = doc*S + T.
import re, json

NUM = r'-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?'

def xf_path(d, S, TX, TY):
    toks = re.findall(r'[A-Za-z]|' + NUM, d)
    out, i, cmd = [], 0, None
    # per-command: list of ('x','y','l','a') roles, and whether relative
    ROLE = {'M':'xy','L':'xy','T':'xy','H':'x','V':'y','C':'xyxyxy','S':'xyxy',
            'Q':'xyxy','A':'llfffxy','Z':''}
    while i < len(toks):
        t = toks[i]
        if re.match(r'^[A-Za-z]$', t):
            cmd = t; out.append(t); i += 1
            continue
        if cmd is None: raise ValueError("path starts with a number: " + d[:40])
        c = cmd.upper(); rel = cmd.islower()
        roles = ROLE[c]
        if roles == '':
            continue
        n = len(roles)
        vals = toks[i:i+n]
        if len(vals) < n: raise ValueError("short path run in " + d[:60])
        for r, v in zip(roles, vals):
            f = float(v)
            if r == 'l' or (rel and r in 'xy'): g = f * S
            elif r == 'x': g = f * S + TX
            elif r == 'y': g = f * S + TY
            else: g = f                                   # flags, x-axis-rotation
            out.append(fmt(g))
        i += n
        if c == 'M': cmd = 'l' if rel else 'L'            # implicit lineto
    # join: letters glued to the first number, numbers space separated
    s, prev_letter = '', False
    for t in out:
        if re.match(r'^[A-Za-z]$', t): s += t; prev_letter = True
        else:
            if not prev_letter and s and not s.endswith(' '): s += ' '
            s += t; prev_letter = False
    return s

def fmt(v):
    s = f"{v:.4f}".rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s

LEN  = {"width","height","r","rx","ry","stroke-width","font-size","stroke-dashoffset"}
X    = {"x","cx","x1","x2"}
Y    = {"y","cy","y1","y2"}

def xf_el(el, S, TX, TY):
    tag, attrs, kids = el
    a = {}
    for k, v in attrs.items():
        if k == 'd': a[k] = xf_path(v, S, TX, TY)
        elif k in X: a[k] = fmt(float(v) * S + TX)
        elif k in Y: a[k] = fmt(float(v) * S + TY)
        elif k in LEN: a[k] = fmt(float(v) * S)
        elif k == 'stroke-dasharray':
            a[k] = ' '.join(fmt(float(n) * S) for n in re.findall(NUM, v))
        elif k == 'transform':
            a[k] = xf_transform(v, S, TX, TY)
        elif k == 'style':
            a[k] = re.sub(r'transform-origin:\s*(' + NUM + r')px\s+(' + NUM + r')px',
                          lambda m: "transform-origin:%spx %spx" % (
                              fmt(float(m.group(1))*S+TX), fmt(float(m.group(2))*S+TY)), v)
        else: a[k] = v
    return (tag, a, [xf_el(k, S, TX, TY) for k in kids])

def xf_transform(v, S, TX, TY):
    def rot(m):
        p = [float(x) for x in re.findall(NUM, m.group(1))]
        if len(p) == 3: return "rotate(%s %s %s)" % (fmt(p[0]), fmt(p[1]*S+TX), fmt(p[2]*S+TY))
        return m.group(0)
    def tr(m):
        p = [float(x) for x in re.findall(NUM, m.group(1))]
        return "translate(%s %s)" % (fmt(p[0]*S), fmt((p[1] if len(p) > 1 else 0)*S))
    v = re.sub(r'rotate\(([^)]*)\)', rot, v)
    v = re.sub(r'translate\(([^)]*)\)', tr, v)
    return v
