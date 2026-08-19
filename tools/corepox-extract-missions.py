#!/usr/bin/env python3
"""Recover mission ship-specs and objective text from Unity's BINARY .unity scenes.

The scenes are binary-serialised so the object graph is gone, but MonoBehaviour
string fields survive verbatim -- which is where the mission author put the ship
JSON and the on-screen objective prompts.
"""
import re, json, sys, subprocess, os, glob

SCENES = sorted(glob.glob('vendor/corepox/Meritocracy/Assets/scenes/missions/*.unity')) + \
         sorted(glob.glob('vendor/corepox/Meritocracy/Assets/scenes/ships/*.unity'))

def raw(p):
    return subprocess.run(['strings', '-n', '4', p], capture_output=True, text=True).stdout

START = re.compile(r'\{\s*"(?:name|type|components)"')


def json_blobs(t):
    out, pos = [], 0
    for m in START.finditer(t):
        i = m.start()
        if i < pos:                       # already consumed by an outer blob
            continue
        d, j, instr, esc = 0, i, False, False
        while j < len(t):
            c = t[j]
            if instr:
                if esc: esc = False
                elif c == '\\': esc = True
                elif c == '"': instr = False
            elif c == '"': instr = True
            elif c == '{': d += 1
            elif c == '}':
                d -= 1
                if d == 0: break
            j += 1
        if d != 0:
            continue
        blob = t[i:j+1]
        pos = j + 1
        try:
            out.append(json.loads(blob))
        except Exception:
            frag = re.findall(r'\{\s*"type"\s*:\s*"[^"]+"\s*,\s*"pos"\s*:\s*\[[-\d, ]+\][^}]*\}', blob)
            if frag:
                try:
                    out.append({'_partial': [json.loads(f) for f in frag]})
                except Exception:
                    pass
    return out

TEXTY = re.compile(r'^[a-z][a-z0-9 ,\'\-<>/=()#]{6,90}$', re.I)
NOISE = re.compile(r'clip plane|orthographic|unity default|^m_|Assets/|Library|MonoBehaviour|'
                   r'Culture=|PublicKeyToken|System\.|UnityEngine|^[0-9a-f]{16,}$|\.cs$|\.png$|'
                   r'Version=|mscorlib|Shader|Material|Texture|Sprite Renderer', re.I)

print(f'{"scene":26} {"ships":5} {"prompts"}')
print('-' * 78)
allout = {}
for p in SCENES:
    t = raw(p)
    ships = json_blobs(t)
    prompts = []
    for line in t.split('\n'):
        line = line.strip()
        if TEXTY.match(line) and not NOISE.search(line) and ' ' in line:
            if line not in prompts: prompts.append(line)
    name = os.path.basename(p).replace('.unity', '')
    allout[name] = {'ships': ships, 'prompts': prompts}
    print(f'{name:26} {len(ships):5} {len(prompts)}')

os.makedirs('scratch/corepox-art', exist_ok=True)
json.dump(allout, open('scratch/corepox-missions.json', 'w'), indent=1)
print(f'\nwrote scratch/corepox-missions.json')
