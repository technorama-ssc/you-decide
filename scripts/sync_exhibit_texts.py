from __future__ import annotations

import argparse
import re
from pathlib import Path


EXHIBITS_ROOT = Path(__file__).resolve().parents[1] / "01 exhibits"
TEXT_PATTERN = re.compile(r"^Text_.*\.txt$", re.IGNORECASE)


def readme_to_text(readme_path: Path) -> str:
    lines = readme_path.read_text(encoding="utf-8").splitlines()
    if lines and lines[0].startswith("\ufeff"):
        lines[0] = lines[0].lstrip("\ufeff")

    if lines and lines[0].startswith("#"):
        lines[0] = lines[0].lstrip("#").strip()

    return "\n".join(lines).rstrip() + "\n"


def find_text_targets(readme_path: Path) -> list[Path]:
    targets: list[Path] = []
    for directory in (readme_path.parent, *readme_path.parent.iterdir()):
        if not directory.is_dir() or not directory.name.lower().startswith("content"):
            continue
        targets.extend(
            path for path in directory.iterdir()
            if path.is_file() and TEXT_PATTERN.match(path.name)
        )
    return sorted(set(targets))


def sync(dry_run: bool = False) -> int:
    changed = 0
    for readme_path in sorted(EXHIBITS_ROOT.rglob("README.md")):
        if "_template" in {part.lower() for part in readme_path.parts}:
            continue
        targets = find_text_targets(readme_path)
        if not targets:
            continue

        content = readme_to_text(readme_path)
        for target in targets:
            current = target.read_text(encoding="utf-8")
            if current == content:
                continue
            changed += 1
            print(f"{'Would update' if dry_run else 'Updated'} {target}")
            if not dry_run:
                target.write_text(content, encoding="utf-8", newline="\n")
    return changed


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Synchronize exhibit README text to Text_*.txt files.")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    count = sync(dry_run=args.dry_run)
    print(f"{count} text file(s) {'would be ' if args.dry_run else ''}updated.")
