const repoBase = "https://api.github.com/repos/technorama-ssc/you-decide/contents/";
const container = document.getElementById("dynamic-content");

/* ---------------------------------------------------------
   Accordion erzeugen
---------------------------------------------------------- */
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
            return;
        }

        panel.style.display = "block";
        wrapper.style.backgroundColor = "#eaff00";
        title.style.color = "#000";

        // Hauptordner Markdown
        inner.innerHTML = marked.parse(contentMarkdown);

        // ZIP Download
        if (zipFile) {
            const dl = document.createElement("div");
            dl.className = "download-link";

            const label = document.createElement("span");
            label.textContent = "Download";

            const link = document.createElement("a");
            link.href = zipFile.download_url;
            link.target = "_blank";

            const name = zipFile.name.replace(/\.zip$/i, "");
            link.textContent = name;

            dl.appendChild(label);
            dl.appendChild(link);
            inner.appendChild(dl);
        }

        // Unterordner anhängen
        if (subfoldersHtml) {
            inner.insertAdjacentHTML("beforeend", subfoldersHtml);
        }
    });

    container.appendChild(wrapper);
}

/* ---------------------------------------------------------
   README aus Ordner laden (nur wenn # Titel vorhanden)
---------------------------------------------------------- */
async function loadReadmeFromFolder(url) {

    const resp = await fetch(url);
    if (!resp.ok) return null;

    const files = await resp.json();
    if (!Array.isArray(files)) return null;

    const readme = files.find(f => f.name.toLowerCase() === "readme.md");
    if (!readme) return null;

    const mdResp = await fetch(readme.download_url);
    if (!mdResp.ok) return null;

    const md = await mdResp.text();
    const lines = md.split("\n");

    if (!lines[0].startsWith("#")) return null;

    return {
        title: lines[0].replace(/^#\s*/, ""),
        content: lines.slice(1).join("\n")
    };
}

/* ---------------------------------------------------------
   Hauptlogik
---------------------------------------------------------- */
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

            if (!lines[0].startsWith("#")) continue;

            const title = lines[0].replace(/^#\s*/, "");
            const content = lines.slice(1).join("\n");

            const zipFile = folderContent.find(f => f.name.toLowerCase().endsWith(".zip"));

            let subHtml = "";

            for (const sub of folderContent) {

                if (sub.type !== "dir") continue;
                if (!/^\d/.test(sub.name)) continue;

                const subData = await loadReadmeFromFolder(sub.url);
                if (!subData) continue;

                subHtml += `
                    <div class="subfolder-block">
                        <h1 class="subfolder-title">${subData.title}</h1>
                        ${marked.parse(subData.content)}
                    </div>
                `;
            }

            createAccordion(title, content, zipFile, subHtml);
        }

    } catch (err) {
        console.error(err);
        container.innerHTML = "<p style='color:red'>Fehler beim Laden</p>";
    }
}

loadFolders();
