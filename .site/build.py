"""Build the You Decide website from the content folders.

Every folder that should appear on the website contains a `youdecide.json`:

    {
      "id": "000",                      optional, used for ordering
      "title": "Do not Press",          optional, falls back to the README heading
      "published": true,                optional, false = draft, left out of the site
      "text": "README.md",              optional, markdown file to render
      "images": ["hero.jpg"],           optional, paths relative to the folder
      "download": true,                 optional, true / {"label": "..."} zips the folder
      "sections": ["docs/findings"]     optional, list of sub folders, or "*" for all
    }

The root `youdecide.json` lists the top-level sections. Output goes to
`.site/dist/` (content.json, media/, downloads/ and the static site files).

    python .site/build.py
"""
import json
import os
import shutil
import sys
import zipfile
from urllib.parse import quote

SITE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SITE_DIR)
DIST = os.path.join(SITE_DIR, "dist")
META = "youdecide.json"
STATIC_FILES = ("index.html", "script.js", "style.css")

errors = []
drafts = []


def rel(path):
    return os.path.relpath(path, ROOT).replace("\\", "/")


def load_meta(folder):
    path = os.path.join(folder, META)
    try:
        with open(path, encoding="utf-8-sig") as f:
            return json.load(f)
    except FileNotFoundError:
        errors.append(f"{rel(folder)}: no {META}")
    except json.JSONDecodeError as e:
        errors.append(f"{rel(path)}: invalid JSON ({e})")
    return None


def read_text(folder, meta):
    """Return (heading, markdown body) of the text file named in meta."""
    name = meta.get("text", "README.md")
    path = os.path.join(folder, name)
    if not os.path.isfile(path):
        if "text" in meta:
            errors.append(f"{rel(folder)}: text file '{name}' not found")
        return None, ""
    with open(path, encoding="utf-8-sig") as f:
        lines = f.read().replace("\r\n", "\n").split("\n")
    if lines and lines[0].startswith("#"):
        return lines[0].lstrip("#").strip(), "\n".join(lines[1:])
    return None, "\n".join(lines)


def copy_image(folder, name):
    src = os.path.join(folder, name)
    if not os.path.isfile(src):
        errors.append(f"{rel(folder)}: image '{name}' not found")
        return None
    target_rel = rel(src)
    dst = os.path.join(DIST, "media", target_rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(src, dst)
    return "media/" + quote(target_rel)


def make_zip(folder, spec):
    slug = os.path.basename(folder).replace(" ", "-")
    file_name = f"youdecide_{slug}.zip"
    os.makedirs(os.path.join(DIST, "downloads"), exist_ok=True)
    zip_path = os.path.join(DIST, "downloads", file_name)
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for dirpath, dirnames, filenames in os.walk(folder):
            dirnames[:] = sorted(d for d in dirnames if not d.startswith("."))
            for fn in sorted(filenames):
                if fn == META or fn.startswith("."):
                    continue
                full = os.path.join(dirpath, fn)
                zf.write(full, os.path.relpath(full, os.path.dirname(folder)))
    label = spec.get("label", "Build Kit") if isinstance(spec, dict) else "Build Kit"
    return {"name": file_name, "download_url": "downloads/" + quote(file_name), "label": label}


def child_folders(folder, spec):
    """Resolve the `sections` entry of a folder into (child_folder, meta) pairs."""
    if spec == "*":
        found = []
        for name in sorted(os.listdir(folder)):
            child = os.path.join(folder, name)
            if os.path.isdir(child) and os.path.isfile(os.path.join(child, META)):
                meta = load_meta(child)
                if meta is not None:
                    found.append((child, meta))
        found.sort(key=lambda cm: (str(cm[1].get("id", "~")), cm[1].get("title", ""), cm[0]))
        return found
    result = []
    for entry in spec or []:
        if isinstance(entry, str):
            child = os.path.join(folder, entry)
            if not os.path.isdir(child):
                errors.append(f"{rel(folder)}: section folder '{entry}' not found")
                continue
            meta = load_meta(child)
            if meta is not None:
                result.append((child, meta))
        elif isinstance(entry, dict):
            result.append((folder, entry))
        else:
            errors.append(f"{rel(folder)}: unsupported section entry {entry!r}")
    return result


def build_node(folder, meta):
    if meta.get("published", True) is False:
        drafts.append(f"{rel(folder)} ({meta.get('title', os.path.basename(folder))})")
        return None
    heading, content = read_text(folder, meta)
    title = meta.get("title") or heading or os.path.basename(folder)
    images = [u for u in (copy_image(folder, n) for n in meta.get("images", [])) if u]
    zip_file = make_zip(folder, meta["download"]) if meta.get("download") else None
    subsections = [n for n in (build_node(c, m) for c, m in child_folders(folder, meta.get("sections")))
                   if n is not None]
    return {
        "title": title,
        "content": content,
        "zipFile": zip_file,
        "images": images,
        "subsections": subsections,
    }


def main():
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)
    for name in STATIC_FILES:
        shutil.copy2(os.path.join(SITE_DIR, name), DIST)

    root_meta = load_meta(ROOT)
    if root_meta is None:
        sys.exit("\n".join(errors))
    data = [n for n in (build_node(c, m) for c, m in child_folders(ROOT, root_meta.get("sections")))
            if n is not None]

    with open(os.path.join(DIST, "content.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    def describe(node, depth=0):
        extras = []
        if node["images"]:
            extras.append(f"{len(node['images'])} image(s)")
        if node["zipFile"]:
            extras.append(node["zipFile"]["name"])
        print("  " * depth + f"- {node['title']}" + (f"  [{', '.join(extras)}]" if extras else ""))
        for sub in node["subsections"]:
            describe(sub, depth + 1)

    print("Published:")
    for node in data:
        describe(node)
    if drafts:
        print("\nSkipped (draft, published = false):")
        for d in drafts:
            print(f"- {d}")
    if errors:
        print("\nERRORS:")
        for e in errors:
            print(f"- {e}")
        sys.exit(1)
    print(f"\nDone: {rel(DIST)}")


if __name__ == "__main__":
    main()
