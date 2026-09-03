from __future__ import annotations

import argparse
import csv
from collections import defaultdict
from pathlib import Path


def read_manual_parts(parts_path: Path) -> str:
    lines = parts_path.read_text(encoding="utf-8").splitlines()
    if lines and lines[0].strip().upper() == "PARTS":
        lines = lines[1:]
    return "\n".join(lines).strip()


def read_bom(csv_path: Path) -> dict[str, dict[tuple[str, str], int]]:
    categories: dict[str, dict[tuple[str, str], int]] = defaultdict(lambda: defaultdict(int))
    with csv_path.open(encoding="utf-8-sig", newline="") as stream:
        for row in csv.DictReader(stream, delimiter=";"):
            category = row["Category"]
            if category not in {"SYSTEM COMPONENTS", "OBJECTS"}:
                continue
            key = (row["PartNumber"].strip(), row["FilePath"].strip())
            categories[category][key] += int(float(row["Quantity"]))
    return categories


def format_section(title: str, entries: list[tuple[int, str]]) -> list[str]:
    lines = [title, ""]
    for quantity, name in sorted(entries, key=lambda item: item[1].lower()):
        lines.append(f"{quantity} x {name}")
    lines.append("")
    return lines


def merge(parts_path: Path, csv_path: Path, output_path: Path) -> None:
    categories = read_bom(csv_path)
    manual = read_manual_parts(parts_path)
    sections: list[str] = ["PARTS", ""]

    for category in ("SYSTEM COMPONENTS", "OBJECTS"):
        entries = []
        for (part_number, file_path), quantity in categories.get(category, {}).items():
            label = part_number or Path(file_path).stem
            entries.append((quantity, label))
        sections.extend(format_section(category, entries))

    sections.extend(["PURCHASED PARTS", ""])
    if manual:
        sections.extend(manual.splitlines())
    sections.extend(["", "CONSUMABLES", "", ""])
    output_path.write_text("\n".join(sections), encoding="utf-8", newline="\n")
    print(f"Updated {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("parts_file", type=Path)
    parser.add_argument("bom_file", type=Path)
    parser.add_argument("output_file", type=Path)
    args = parser.parse_args()
    merge(args.parts_file, args.bom_file, args.output_file)
