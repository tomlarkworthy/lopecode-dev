#!/usr/bin/env python3
"""Copy a <script type="text/plain"> file-attachment block (matched by id) from a
source lopecode HTML into a target, inserting it just before an anchor block (also
matched by id). Idempotent: skips if the id already exists in the target."""
import re, sys

def find_block(html, att_id):
    # match <script ...id="att_id"...> ... </script>, id attr in any position
    pat = re.compile(
        r'<script\b[^>]*\bid="' + re.escape(att_id) + r'"[^>]*>.*?</script>',
        re.DOTALL)
    m = pat.search(html)
    if not m:
        sys.exit(f"block not found: {att_id}")
    return m.group(0), m.start(), m.end()

def main():
    src_path, tgt_path, copy_id, anchor_id = sys.argv[1:5]
    src = open(src_path, encoding="utf-8").read()
    tgt = open(tgt_path, encoding="utf-8").read()
    if f'id="{copy_id}"' in tgt:
        print(f"already present in target: {copy_id}")
        return
    block, _, _ = find_block(src, copy_id)
    _, a_start, _ = find_block(tgt, anchor_id)
    out = tgt[:a_start] + block + "\n" + tgt[a_start:]
    open(tgt_path, "w", encoding="utf-8").write(out)
    print(f"inserted {copy_id} ({len(block)} bytes) before {anchor_id}")

if __name__ == "__main__":
    main()
