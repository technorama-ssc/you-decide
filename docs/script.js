const repoBase = "https://api.github.com/repos/technorama-ssc/you-decide/contents/";
const container = document.getElementById("dynamic-content");

function createAccordion(titleText, contentMarkdown, zipFile, subfoldersHtml, images, subfolderImages) {
    const wrapper = document.createElement("div");
    wrapper.className = "accordion-wrapper";

    const title = document.createElement("h1");
    title.className = "accordion";
    title.textContent = titleText.toUpperCase();
    title.title = titleText;

    const panel = document.createElement("div");
    panel.className = "panel";

    const inner = document.createElement("div");
    inner.className = "panel-content";

    panel.appendChild(inner);
    wrapper.appendChild(title);
    wrapper.appendChild(panel);

    title.addEventListener("click", () => {
        document.querySelectorAll(".panel").forEach(p => {
            if (p !== panel) p.style.display = "none";
        });

        document.querySelectorAll(".accordion-wrapper").forEach(w => {
            if (w !== wrapper) w.style.backgroundColor = "transparent";
        });

        document.querySelectorAll(".accordion").forEach(a => {
            if (a !== title) a.style.color = "#666";
        });

        if (panel.style.display === "block") {
            panel.style.display = "none";
            wrapper.style.backgroundColor = "transparent";
            title.style.color = "#666";
        } else {
            panel.style.display = "block";
            wrapper.style.backgroundColor = "#eaff00";
            title.style.color = "#000";
            panel.style.color = "#000";

            // Haupttext
            inner.innerHTML = marked.parse(contentMarkdown);

            // ZIP Download (falls vorhanden)
            let lastMainContentNode = null;
            if (zipFile) {
                const dl = document.createElement("div");
                dl.className = "download-link";

                const textSpan = document.createElement("span");
                textSpan.textContent = "Download";

                const link = document.createElement("a");
                link.href = zipFile.download_url;
                link.target = "_blank";

                let parts = zipFile.name.replace(/\.zip$/i, "").split("_");
                let displayName =
                    parts.length >= 2
                        ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + " " +
                          parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1)
                        : zipFile.name.replace(/\.zip$/i, "");

                link.textContent = displayName;

                dl.appendChild(textSpan);
                dl.appendChild(link);
                inner.appendChild(dl);

                lastMainContentNode = dl;
            } else {
                lastMainContentNode = inner.lastChild;
            }

            // Bilder Hauptordner unter Text / Download
            if (images && images.length > 0) {
                images.forEach(imgUrl => {
                    const imgEl = document.createElement("img");
                    imgEl.src = imgUrl;
                    imgEl.style.maxWidth = "600px";
                    imgEl.style.height = "auto";

                    if (lastMainContentNode && lastMainContentNode.parentNode) {
                        inner.insertBefore(imgEl, lastMainContentNode.nextSibling);
                        lastMainContentNode = imgEl;
                    } else {
                        inner.appendChild(imgEl);
                        lastMainContentNode = imgEl;
                    }
                });
            }

            // Unterordner HTML anhängen
            if (subfoldersHtml) {
                inner.insertAdjacentHTML("beforeend", subfoldersHtml);

                // Bilder für jeden Unterordner einfügen
                if (subfolderImages) {
                    const subfolderBlocks = inner.querySelectorAll(".subfolder-block");
                    subfolderBlocks.forEach((block, index) => {
                        const imgs = subfolderImages[index];
                        if (imgs && imgs.length > 0) {
                            imgs.forEach(url => {
                                const imgEl = document.createElement("img");
                                imgEl.src = url;
                                imgEl.style.maxWidth = "600px";
                                imgEl.style.height = "auto";
                                block.appendChild(imgEl);
                            });
                        }
                    });
                }
            }
        }
    });

    container.appendChild(wrapper);
}

/* README aus Ordner laden */
async function loadReadmeFromFolder(url) {
    const folderResponse = await fetch(url);
    if (!folderResponse.ok) return null;

    const folderContent = await folderResponse.json();
    if (!Array.isArray(folderContent)) return null;

    const readme = folderContent.find(f => f.name.toLowerCase() === "readme.md");
    if (!readme) return null;

    const readmeResp = await fetch(readme.download_url);
    if (!readmeResp.ok) return null;

    let md = await readmeResp.text();
    let lines = md.split("\n");

    if (!lines[0].startsWith("#")) return null;

    // Bilder im Unterordner erkennen
    const images = folderContent
        .filter(f => f.type === "file" && /\.jpe?g$/i.test(f.name))
        .map(f => f.download_url);

    return {
        title: lines[0].replace(/^#\s*/, ""),
        content: lines.slice(1).join("\n"),
        images
    };
}

/* Hauptordner + Unterordner + Bilder laden */
async function loadFolders() {
    try {
        const response = await fetch(repoBase);
        const items = await response.json();

        for (const item of items) {
            if (item.type !== "dir") continue;

            const folderResp = await fetch(item.url);
            const folderContent = await folderResp.json();

            const readme = folderContent.find(f => f.name.toLowerCase() === "readme.md");
            if (!readme) continue;

            const md = await (await fetch(readme.download_url)).text();
            const lines = md.split("\n");

            const titleLine = lines[0].startsWith("#")
                ? lines[0].replace(/^#\s*/, "")
                : "KEIN TITEL";

            const content = lines.slice(1).join("\n");
            const zipFile = folderContent.find(f => f.name.toLowerCase().endsWith(".zip"));

            // Bilder Hauptordner
            const images = folderContent
                .filter(f => f.type === "file" && /\.jpe?g$/i.test(f.name))
                .map(f => f.download_url);

            let subHtml = "";
            let subfolderImages = []; // Array für Bilder jedes Unterordners
            for (const sub of folderContent) {
                if (sub.type !== "dir") continue;
                if (!/^\d/.test(sub.name)) continue;

                const subData = await loadReadmeFromFolder(sub.url);
                if (!subData) continue;

                subHtml += `
                    <div class="subfolder-block">
                        <h2 class="subfolder-title">${subData.title}</h2>
                        <div class="subfolder-text">
                            ${marked.parse(subData.content)}
                        </div>
                    </div>
                `;

                subfolderImages.push(subData.images || []);
            }

            createAccordion(titleLine, content, zipFile, subHtml, images, subfolderImages);
        }

    } catch (err) {
        console.error(err);
        container.innerHTML = "<p style='color:red'>Fehler beim Laden der Inhalte</p>";
    }
}

loadFolders();
