"""Build the You Decide website from the README.md files in the content folders.

A folder is part of the website when its README.md starts with a YAML front
matter block. The heading and text below it are shown on the site, and GitHub
renders the same file when browsing the repo:

    ---
    id: "000"                      optional, used for ordering
    published: true                optional, false = draft, left out of the site
    download: Exhibit Build Kit    optional, zips the folder; the value is the link text
    sections:                      optional, sub folders or .md files nested below,
      - 00 grid system             or "*" for every sub folder with a front matter README
    ---
    # Do not Press

    A red button with the words "Do not press." ...

    ![Do not Press](hero.jpg)     images in the text are shown after it on the site

    ## Findings                    every "## " heading becomes a nested entry
    ...
    ## Background (draft)          "(draft)" at the end keeps it off the site

The root README.md lists the top-level sections. Output goes to `.site/dist/`
(content.json, media/ with images resized to 1200 px, downloads/, fonts/ and the
static site files). Needs Pillow for the image resizing: pip install pillow

    python .site/build.py
"""
import json
import os
import re
import shutil
import sys
import zipfile
from urllib.parse import quote, unquote

SITE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SITE_DIR)
DIST = os.path.join(SITE_DIR, "dist")
README = "README.md"
STATIC_FILES = ("index.html", "script.js", "style.css", "marked.min.js", "favicon.svg")
FONTS_DIR = os.path.join(ROOT, "00 you decide", "02 fonts")
MAX_IMAGE_WIDTH = 1200          # images are shown at 600 px; 1200 px keeps them sharp on retina screens
JPEG_QUALITY = 85

try:
    from PIL import Image, ImageOps
except ImportError:             # pip install pillow
    Image = None
DRAFT_RE = re.compile(r"^(.*?)\s*\(draft\)\s*$", re.I)

errors = []
drafts = []
warnings = set()


def rel(path):
    return os.path.relpath(path, ROOT).replace("\\", "/")


# ---------------------------------------------------------------------------
# Front matter (a small YAML subset: scalars, lists, comments)
# ---------------------------------------------------------------------------
def _scalar(text):
    text = text.strip()
    if len(text) >= 2 and text[0] == text[-1] and text[0] in "\"'":
        return text[1:-1]
    if text.lower() == "true":
        return True
    if text.lower() == "false":
        return False
    if text == "[]":
        return []
    if text.startswith("[") and text.endswith("]"):
        return [_scalar(p) for p in text[1:-1].split(",") if p.strip()]
    return text


def parse_front_matter(lines, where):
    meta = {}
    key = None
    for n, raw in enumerate(lines, 2):
        line = raw.rstrip()
        if not line.strip() or line.strip().startswith("#"):
            continue
        if re.match(r"^\s+-\s*", line) and key is not None:
            if not isinstance(meta.get(key), list):
                meta[key] = []
            meta[key].append(_scalar(re.sub(r"^\s+-\s*", "", line)))
            continue
        m = re.match(r"^([A-Za-z_][\w-]*)\s*:\s*(.*)$", line)
        if not m:
            errors.append(f"{where}: cannot read front matter line {n}: {raw!r}")
            continue
        key, value = m.group(1), m.group(2)
        meta[key] = _scalar(value) if value.strip() else []
    return meta


def read_page(path):
    """Return (meta, title, body) of a markdown file. meta is None without front matter."""
    with open(path, encoding="utf-8-sig") as f:
        lines = f.read().replace("\r\n", "\n").split("\n")
    meta = None
    if lines and lines[0].strip() == "---":
        try:
            end = next(i for i in range(1, len(lines)) if lines[i].strip() == "---")
        except StopIteration:
            errors.append(f"{rel(path)}: front matter is not closed with ---")
            return {}, None, ""
        meta = parse_front_matter(lines[1:end], rel(path))
        lines = lines[end + 1:]
    while lines and not lines[0].strip():
        lines.pop(0)
    title = None
    if lines and lines[0].startswith("#"):
        title = lines[0].lstrip("#").strip()
        lines = lines[1:]
    return meta, title, "\n".join(lines).strip("\n")


def has_front_matter(path):
    try:
        with open(path, encoding="utf-8-sig") as f:
            return f.readline().strip() == "---"
    except OSError:
        return False


def split_sections(body):
    """Split the body at '## ' headings into (main text, [(title, text, is_draft)])."""
    parts = re.split(r"^(?=## )", body, flags=re.M)
    sections = []
    for part in parts[1:]:
        head, _, text = part.partition("\n")
        title = head[3:].strip()
        m = DRAFT_RE.match(title)
        sections.append((m.group(1) if m else title, text.strip("\n"), bool(m)))
    return parts[0].strip("\n"), sections


# ---------------------------------------------------------------------------
# Assets
# ---------------------------------------------------------------------------
def copy_image(folder, name):
    src = os.path.join(folder, name)
    if not os.path.isfile(src):
        errors.append(f"{rel(folder)}: image '{name}' not found")
        return None
    target_rel = rel(src)
    dst = os.path.join(DIST, "media", target_rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if Image is None:
        warnings.add("Pillow is not installed, images are copied at full size (pip install pillow)")
        shutil.copy2(src, dst)
    else:
        with Image.open(src) as im:
            im = ImageOps.exif_transpose(im)
            if im.width > MAX_IMAGE_WIDTH:
                im = im.resize((MAX_IMAGE_WIDTH, round(im.height * MAX_IMAGE_WIDTH / im.width)), Image.LANCZOS)
            if dst.lower().endswith((".jpg", ".jpeg")):
                im.convert("RGB").save(dst, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
            else:
                im.save(dst, optimize=True)
    return "media/" + quote(target_rel)


def extract_images(folder, text):
    """Take ![alt](relative path) images out of the text, copy them to media/ and
    return (text without them, [urls]). External http(s) images stay in the text."""
    urls = []

    def repl(m):
        target = m.group(2).strip()
        if re.match(r"^(https?:)?//", target):
            return m.group(0)
        url = copy_image(folder, unquote(target))
        if url:
            urls.append(url)
        return ""

    text = re.sub(r"!\[([^\]]*)\]\(([^)\s]+)\)", repl, text)
    return re.sub(r"\n{3,}", "\n\n", text).strip("\n"), urls


def make_zip(folder, label):
    slug = os.path.basename(folder).replace(" ", "-")
    file_name = f"youdecide_{slug}.zip"
    os.makedirs(os.path.join(DIST, "downloads"), exist_ok=True)
    with zipfile.ZipFile(os.path.join(DIST, "downloads", file_name), "w", zipfile.ZIP_DEFLATED) as zf:
        for dirpath, dirnames, filenames in os.walk(folder):
            dirnames[:] = sorted(d for d in dirnames if not d.startswith("."))
            for fn in sorted(filenames):
                if fn.startswith("."):
                    continue
                full = os.path.join(dirpath, fn)
                zf.write(full, os.path.relpath(full, os.path.dirname(folder)))
    if label is True:
        label = "Build Kit"
    return {"name": file_name, "download_url": "downloads/" + quote(file_name), "label": str(label)}


# ---------------------------------------------------------------------------
# Tree
# ---------------------------------------------------------------------------
def resolve_sections(folder, spec):
    """Turn the `sections` value into a list of markdown file paths."""
    if spec == "*":
        return [os.path.join(folder, d, README) for d in sorted(os.listdir(folder))
                if os.path.isdir(os.path.join(folder, d))
                and has_front_matter(os.path.join(folder, d, README))]
    paths = []
    for entry in spec or []:
        target = os.path.join(folder, str(entry))
        if os.path.isdir(target):
            target = os.path.join(target, README)
        if not os.path.isfile(target):
            errors.append(f"{rel(folder)}: section '{entry}' has no README.md / file")
            continue
        paths.append(target)
    return paths


def build_node(page_path):
    folder = os.path.dirname(page_path)
    meta, heading, body = read_page(page_path)
    meta = meta or {}
    title = meta.get("title") or heading or os.path.basename(folder)
    if meta.get("published", True) is False:
        drafts.append(f"{rel(folder)} ({title})")
        return None
    content, inline = split_sections(body)
    content, images = extract_images(folder, content)
    zip_file = make_zip(folder, meta["download"]) if meta.get("download") else None

    subsections = []
    for sub_title, text, is_draft in inline:
        if is_draft:
            drafts.append(f"{rel(page_path)} ## {sub_title}")
            continue
        text, sub_images = extract_images(folder, text)
        subsections.append({"title": sub_title, "content": text, "zipFile": None,
                            "images": sub_images, "subsections": []})

    children = resolve_sections(folder, meta.get("sections"))
    if meta.get("sections") == "*":
        children.sort(key=lambda p: (str((read_page(p)[0] or {}).get("id", "~")), p))
    subsections += [n for n in (build_node(p) for p in children) if n is not None]

    return {"title": title, "content": content, "zipFile": zip_file,
            "images": images, "subsections": subsections}


def main():
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)
    for name in STATIC_FILES:
        shutil.copy2(os.path.join(SITE_DIR, name), DIST)
    os.makedirs(os.path.join(DIST, "fonts"))
    for name in sorted(os.listdir(FONTS_DIR)):
        if name.lower().endswith((".ttf", ".woff2", ".woff")):
            shutil.copy2(os.path.join(FONTS_DIR, name), os.path.join(DIST, "fonts", name))

    root_meta, _, _ = read_page(os.path.join(ROOT, README))
    if not root_meta or "sections" not in root_meta:
        sys.exit(f"{README} in the repo root needs a front matter block with `sections`.")
    data = [n for n in (build_node(p) for p in resolve_sections(ROOT, root_meta["sections"])) if n is not None]

    with open(os.path.join(DIST, "content.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    def describe(node, depth=0):
        extras = [f"{len(node['images'])} image(s)"] if node["images"] else []
        if node["zipFile"]:
            extras.append(node["zipFile"]["name"])
        print("  " * depth + f"- {node['title']}" + (f"  [{', '.join(extras)}]" if extras else ""))
        for sub in node["subsections"]:
            describe(sub, depth + 1)

    print("Published:")
    for node in data:
        describe(node)
    if drafts:
        print("\nSkipped (drafts):")
        for d in drafts:
            print(f"- {d}")
    if warnings:
        print("\nWarnings:")
        for w in sorted(warnings):
            print(f"- {w}")
    if errors:
        print("\nERRORS:")
        for e in errors:
            print(f"- {e}")
        sys.exit(1)
    print(f"\nDone: {rel(DIST)}")


if __name__ == "__main__":
    main()
