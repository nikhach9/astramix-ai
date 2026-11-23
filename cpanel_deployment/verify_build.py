import os
import re

public_html = os.path.abspath('cpanel_deployment/public_html')
missing = []
found = []

for root, dirs, fnames in os.walk(public_html):
    for f in fnames:
        if f.endswith('.html'):
            fpath = os.path.join(root, f)
            with open(fpath, 'r', encoding='utf-8') as fp:
                content = fp.read()
            matches = re.findall(r'(/_next/static/[^\s"\'<>]+\.(?:css|js))', content)
            for m in matches:
                rel = m.lstrip('/').replace('/', os.sep)
                disk_path = os.path.join(public_html, rel)
                if not os.path.isfile(disk_path):
                    missing.append((os.path.relpath(fpath, public_html), m))
                else:
                    found.append(m)

print(f"Total HTML files checked: {len([f for r, d, fs in os.walk(public_html) for f in fs if f.endswith('.html')])}")
print(f"Total asset references: {len(found)}")
print(f"Unique asset references: {len(set(found))}")
print(f"Missing references: {len(missing)}")

if missing:
    for f, m in set(missing):
        print(f"  FAILED: {f} references missing {m}")
    exit(1)
else:
    print("SUCCESS: 100% of referenced CSS and JavaScript assets exist on disk in the same build output!")
    for asset in sorted(set(found)):
        print(f"  [OK] {asset}")
