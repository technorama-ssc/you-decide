# You Decide

An exhibition on decisions and how to save the world.

This is the open-source platform for the “You Decide” exhibition by [Technorama](https://www.technorama.ch). All exhibits are modular. You can download the parts and info here, rebuild them, or improve them. The exhibition and this website keep changing with you and us.

Website: https://technorama-ssc.github.io/you-decide/

## What is where

| Folder | Content |
|---|---|
| `you decide/` | The exhibition as a whole: graphic template, fonts, label materials |
| `exhibits/` | One folder per exhibit with `docs/`, `code/`, `hardware/` and `media/` |
| `system/` | The modular construction system: grid plates, connectors, documentation |
| `LICENSE.md` | Licences for media, software and hardware |
| `.site/` | The website (build script, HTML, CSS, JS). Nothing in here is exhibition content |

## How the website is built

A folder appears on the website when it contains a `youdecide.json`. Folder names carry no meaning; the JSON says what is shown:

```json
{
  "id": "000",
  "title": "Do not Press",
  "published": true,
  "text": "README.md",
  "images": ["You Decide_Do not press_Technorama.jpg"],
  "download": { "label": "Exhibit Build Kit" },
  "sections": ["docs/findings"]
}
```

| Key | Meaning |
|---|---|
| `id` | Exhibit number, used for ordering (optional) |
| `title` | Title on the website; falls back to the first heading of the text file |
| `published` | `false` keeps a draft in the repo but off the website (default `true`) |
| `text` | Markdown file rendered as the description (default `README.md`) |
| `images` | Images shown with the text, paths relative to the folder |
| `download` | `true` or `{ "label": "…" }` zips the whole folder as a download |
| `sections` | Sub folders shown as nested entries, or `"*"` for every sub folder that has a `youdecide.json` |

The root `youdecide.json` lists the top-level sections in order.

Every push to `main` runs `.site/build.py` in GitHub Actions and deploys the result to GitHub Pages. Zips, `content.json` and the media copies are build outputs and are not committed.

### Build and preview locally

```bash
python .site/serve.py
```

This builds the site into `.site/dist/` and serves it at http://localhost:8000/. Use `python .site/build.py` to only build; it lists what was published, what was skipped as a draft, and fails on missing files.

## Adding an exhibit

1. Copy `exhibits/_template/` to `exhibits/<exhibit name>/`.
2. Write the description in `README.md`, put files into `docs/`, `code/`, `hardware/` and `media/`.
3. Edit `youdecide.json`: set `id`, `title` and the hero image. Leave `"published": false` while it is a draft; set it to `true` to put it on the website.
4. Run `python .site/build.py` to check that everything referenced exists.

## Licencing

All information and materials are provided under the following licences, see [LICENSE.md](LICENSE.md):

Media, labels and fonts [![Creative Commons](https://img.shields.io/badge/Creative%20Commons-CC%20BY%204.0-blue)](https://creativecommons.org/licenses/by/4.0/)
Software [![MIT License](https://img.shields.io/badge/MIT%20License--blue)](https://opensource.org/license/mit)
Hardware [![CERN Open Hardware Licence](https://img.shields.io/badge/CERN%20Open%20Hardware%20Licence-CERN--OHL--P-blue)](https://cern-ohl.web.cern.ch/)

[![Made by Technorama](https://img.shields.io/badge/Made%20by-Technorama-blue)](https://www.technorama.ch)
