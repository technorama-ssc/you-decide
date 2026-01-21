const repoBase = "https://api.github.com/repos/technorama-ssc/you-decide/contents/";
const container = document.getElementById("dynamic-content");

// Hilfsfunktion: Lädt README + Titel aus einem Ordner
async function loadReadmeFromFolder(url) {
    const folderResp = await fetch(url);
    if (!folderResp.ok) return null;

    const folderContent = await folderResp.json();
    if (!Array.isArray(folderContent)) return null;

    const readme = folderContent.find(f => f.name.toLowerCase() === "readme.md");
    if (!readme) return null;

    const readmeResp = await fetch(readme.download_url);
    if (!readmeResp.ok) return null;

    const md = await readmeResp.text();
    const lines = md.split("\n");

    if (!lines[0].startsWith("#")) return null;

    const title = lines[0].replace(/^#\s*/, "");
    const content = lines.slice(1).join("\n");
    return { title, content };
}

// Akkordeon erstellen
function createAccordion(titleText, contentMarkdown, zipFile, subfoldersHtml) {
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
        document.querySelectorAll(".panel").forEach(p => { if (p !== panel) p.style.display = "none"; });
        document.querySelectorAll(".accordion-wrapper").forEach(w => { if (w !== wrapper) w.style.backgroundColor = "transparent"; });
        document.querySelectorAll(".accordion").forEach(a => { if (a !== title) a.style.color = "#666"; });

        if (panel.style.display === "block") {
            panel.style.display = "none";
            wrapper.style.backgroundColor = "transparent";
            title.style.color = "#666";
        } else {
            panel.style.display = "block";
            wrapper.style.backgroundColor = "#eaff00";
            title.style.color = "#000";
            panel.style.color = "#000";

            inner.innerHTML = marked.parse(contentMarkdown);

            if (zipFile) {
                const dl = document.createElement("div");
                dl.className = "download-link";
                const textSpan = document.createElement("span");
                textSpan.textContent = "Download";
                textSpan.style.fontWeight = "normal";

                const link = document.createElement("a");
                link.href = zipFile.download_url;

                let parts = zipFile.name.replace(/\.zip$/i, "").split("_");
                let displayName = parts.length >= 2
                    ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + " " +
                      parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1)
                    : zipFile.name.replace(/\.zip$/i, "");
                link.textContent = displayName;
                link.target = "_blank";

                dl.appendChild(textSpan);
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

// Hauptfunktion: lädt Hauptordner + Unterordner (parallel für schnellere Ladezeit)
async function loadFolders() {
    try {
        const response = await fetch(repoBase);
        if (!response.ok) throw new Error("Fehler beim Zugriff auf das Repo");

        const items = await response.json();

        // Parallel alle Hauptordner abarbeiten
        await Promise.all(items.filter(i => i.type === "dir").map(async (item) => {
            try {
                const folderResp = await fetch(item.url);
                if (!folderResp.ok) return;

                const folderContent = await folderResp.json();
                const readme = folderContent.find(f => f.name.toLowerCase() === "readme.md");
                if (!readme) return;

                const readmeResp = await fetch(readme.download_url);
                if (!readmeResp.ok) return;

                const md = await readmeResp.text();
                const lines = md.split("\n");

                if (!lines[0].startsWith("#")) return;

                const titleLine = lines[0].replace(/^#\s*/, "");
                const content = lines.slice(1).join("\n");

                const zipFile = folderContent.find(f => f.name.toLowerCase().endsWith(".zip"));

                // Unterordner parallel laden
                const subfolderPromises = folderContent.filter(sub => sub.type === "dir" && /^\d/.test(sub.name))
                    .map(sub => loadReadmeFromFolder(sub.url));

                const subfolderData = await Promise.all(subfolderPromises);

                // Nur gültige Unterordner mit README
                const validSubfolders = subfolderData.filter(d => d !== null);

                let subHtml = "";
                validSubfolders.forEach(sub => {
                    subHtml += `
                        <div class="subfolder-block">
                            <h2 class="subfolder-title">${sub.title}</h2>
                            <div class="subfolder-text">
                                ${marked.parse(sub.content)}
                            </div>
                        </div>
                    `;
                });

                createAccordion(titleLine, content, zipFile, subHtml);

            } catch (err) {
                console.warn("Fehler beim Laden eines Hauptordners:", item.name, err);
            }
        }));

    } catch (err) {
        console.error("Fehler beim Laden der Ordner:", err);
        container.innerHTML = "<p style='color:red'>Fehler beim Laden der Inhalte</p>";
    }
}

loadFolders();
