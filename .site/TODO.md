# Website: open ideas

Not started yet, in the order we would tackle them.

- **Links to sections and exhibits.** Put the open section into the URL (`#the-coin`) so an exhibit can be shared and the back button works.
- **"View on GitHub" per exhibit.** A small link next to the download that opens the exhibit folder in the repo; the build knows the folder path.
- **HTML build instead of content.json.** Let `build.py` write the finished HTML. Faster, works without JavaScript, search engines and link previews see the text, and each exhibit can get its own address such as `/exhibits/the-coin/` with its own preview. Only worth it if exhibits should be shareable as separate links; then do it before the section links so those become real URLs.
- **Pixel-2 font.** Shipped with the site (`fonts/pixel-2.ttf`) but not used by the stylesheet yet.
