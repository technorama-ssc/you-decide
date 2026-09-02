---
sections:
  - 00 you decide
  - 01 exhibits
  - 02 system
  - LICENSE.md
---

# You Decide

An exhibition on decisions and how to save the world.

This is the open-source platform for the “You Decide” exhibition by [Technorama](https://www.technorama.ch). All exhibits are modular. You can download the parts and info here, rebuild them, or improve them. The exhibition and this website keep changing with you and us.

Website: https://technorama-ssc.github.io/you-decide/

## What is where

| Folder | Content |
|---|---|
| `00 you decide/` | The exhibition as a whole: graphic template, fonts, label materials |
| `01 exhibits/` | One folder per exhibit (`NNN_name`) with `01 docs/`, `02 code/`, `03 hardware/`, `04 media/` |
| `02 system/` | The modular construction system: grid plates, connectors, documentation |
| `LICENSE.md` | Licences for media, software and hardware |
| `.site/` | The website (build script, HTML, CSS, JS). Nothing in here is exhibition content |

## How the website is built

Every `README.md` does two jobs: GitHub shows it when you browse the folder, and the website is built from it. A folder is part of the website when its `README.md` starts with a front matter block between two `---` lines. The heading and the text below become the section on the site:

```markdown
---
id: "000"
download: Exhibit Build Kit
---

# Do not Press

A red button with the words “Do not press.” Behind it is a mechanism that you cannot see, but you can reach it.

![Do not Press](You%20Decide_Do%20not%20press_Technorama.jpg)

## Findings

- Visitors press the button although it says not to.

## Background (draft)

Text that stays in the repo but is not shown on the website yet.
```

| Key | Meaning |
|---|---|
| `id` | Exhibit number, used for ordering (optional) |
| `published` | `published: false` keeps a draft in the repo but off the website |
| `download` | Zips the whole folder as a download; the value is the link text |
| `sections` | Sub folders (or `.md` files) nested below this entry, or `"*"` for every sub folder whose README has a front matter block. Used for the top-level sections and the system; exhibits use `##` headings instead |

The title is the first `#` heading. Images are placed in the text as Markdown images with a path relative to the folder (spaces as `%20`); the website shows them after the text. Every `##` heading below becomes a nested entry (Findings, background texts). A heading ending in `(draft)` stays in the file but is left off the website. The numbering of the folders is for people browsing the repo; the website only follows `sections` and the headings. This root README lists the top-level sections.

Every push to `main` runs `.site/build.py` in GitHub Actions and deploys the result to GitHub Pages. Zips, `content.json` and the media copies are build outputs and are not committed.

### Build and preview locally

```bash
python .site/serve.py
```

This builds the site into `.site/dist/` and serves it at http://localhost:8000/. Use `python .site/build.py` to only build; it lists what was published, what was skipped as a draft, and fails on missing files.

## Adding an exhibit

1. Copy `01 exhibits/_Template/` to `01 exhibits/NNN_<exhibit name>/`.
2. Put files into `01 docs/`, `02 code/`, `03 hardware/` and `04 media/`.
3. Edit `README.md`: set the `id`, the heading, the text, the image and the `##` sections. Remove `published: false` when the exhibit should go on the website.
4. Run `python .site/build.py` to check that everything referenced exists.

## Licencing

All information and materials are provided under the following licences, see [LICENSE.md](LICENSE.md):

Media, labels and fonts [![Creative Commons](https://img.shields.io/badge/Creative%20Commons-CC%20BY%204.0-blue)](https://creativecommons.org/licenses/by/4.0/)
Software [![MIT License](https://img.shields.io/badge/MIT%20License--blue)](https://opensource.org/license/mit)
Hardware [![CERN Open Hardware Licence](https://img.shields.io/badge/CERN%20Open%20Hardware%20Licence-CERN--OHL--P-blue)](https://cern-ohl.web.cern.ch/)

[![Made by Technorama](https://img.shields.io/badge/Made%20by-Technorama-blue)](https://www.technorama.ch)
