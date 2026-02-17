import json

with open('docs/content.json', encoding='utf-8') as f:
    content = json.load(f)

print("=== Hauptkategorien ===")
for item in content:
    title = item.get('title', '?')
    subs = item.get('subsections', [])
    print(f"\n{title}")
    print(f"  Subsections: {len(subs)}")
    for sub in subs:
        sub_title = sub.get('title', '?')
        subsubs = len(sub.get('subsections', []))
        print(f"    - {sub_title} (nested: {subsubs})")
