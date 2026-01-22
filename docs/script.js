const repoBase = "https://api.github.com/repos/technorama-ssc/you-decide/contents/";
const container = document.getElementById("dynamic-content");

/* -------------------------------------------------
   Bilder (jpg/jpeg) aus Ordner laden
-------------------------------------------------- */
async function loadImagesFromFolder(url) {
    const resp = await fetch(url);
    if (!resp.ok) return "";

    const items = await resp.json();
    if (!Array.isArray(items)) return "";

    const images = items.filter(f =>
        f.type === "file" && /\.(jpg|jpeg)$/i.test(f.name)
    );

    if (images.length === 0) return "";

    let html = `<div class="folder-images">`;

    for (const img of images) {
        html += `<img src="${img.download_url}" alt="${img.name}">`;
    }

    html += `</div>`;
    return html;
}

/* -------------------------------------------------
   Accordion erstellen
-------------------------------------------------- */
function createAccordion(titleText, contentMarkdown, zipFile, subfoldersHtml) {
    const wrapper = document.createElement("div");
    wrapper.className = "accordion-wrapper";

    const title = document.createElement("h1");
    title.className = "accordion";
    title.textContent = titleText.toUpperCase();

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

            inner.innerHTML = marked.parse(contentMarkdown);

            if (zipFile) {
                const dl = document.createElement("div");
                dl.className = "download-link";

                const span = document.createElement("span");
                span.textContent = "Download";

                const link = document.createElement("a");
                link.href = zipFile.download_url;
                link.target = "_blank";

                let parts = zipFile.name.replace(/\.zip$/i, "").split("_");
                link.textContent =
                    parts.length >= 2
                        ? parts[0] + " " + parts[parts.length - 1]
                        : zipFile.name;

                dl.appendChild(span);
                dl.appendChild(link);
                inner.appendChild(dl);
            }

            if (subfoldersHtml) {
                inner.insertAdjacentHTML("beforeend", subfoldersHtml);
            }
        }
    });

    container.appendChild(wrapper);
}

/* -------------------------------------------------
   README aus Unterordner laden
-------------------------------------------------- */
async function loadReadmeFromFolder(url) {
    const resp = await fetch(url);
    if (!resp.ok) return null;

    const items = await resp.json();
    if (!Array.isArray(items)) return null;

    const readme = items.find(f => f.name.toLowerCase() === "readme.md");
    if (!readme) return null;

    const md = await (await fetch(readme.download_url)).text();
    const lines = md.split("\n");

    if (!lines[0].startsWith("#")) return null;

    return {
        title: lines[0].replace(/^#\s*/, ""),
        content: lines.slice(1).join("\n")
    };
}

/* -------------------------------------------------
   Hauptfunktion
-------------------------------------------------- */
async function loadFolders() {
    try {
        const items = await (await fetch(repoBase)).json();

        for (const item of items) {
            if (item.type !== "dir") continue;

            const folderContent = await (await fetch(item.url)).json();

            const readme = folderContent.find(f => f.name.toLowerCase() === "readme.md");
            if (!readme) continue;

            const md = await (await fetch(readme.download_url)).text();
            const lines = md.split("\n");

            if (!lines[0].startsWith("#")) continue;

            const title = lines[0].replace(/^#\s*/, "");
            const content = lines.slice(1).join("\n");

            const zipFile = folderContent.find(f => f.name.toLowerCase().endsWith(".zip"));
            const imagesHtml = await loadImagesFromFolder(item.url);

            let subHtml = "";

            for (const sub of folderContent) {
                if (sub.type !== "dir") continue;
                if (!/^\d/.test(sub.name)) continue;

                const subData = await loadReadmeFromFolder(sub.url);
                if (!subData) continue;

                const subImages = await loadImagesFromFolder(sub.url);

                subHtml += `
                    <div class="subfolder-block">
                        <h2 class="subfolder-title">${subData.title}</h2>
                        <div class="subfolder-text">
                            ${marked.parse(subData.content)}
                            ${subImages}
                        </div>
                    </div>
                `;
            }

            createAccordion(
                title,
                content + imagesHtml,
                zipFile,
                subHtml
            );
        }

    } catch (err) {
        console.error(err);
        container.innerHTML = "<p style='color:red'>Fehler beim Laden der Inhalte</p>";
    }
}

loadFolders();
