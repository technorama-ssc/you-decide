// GitHub Repo Basis-URL
const repoBase = "https://api.github.com/repos/technorama-ssc/you-decide/contents/";
const container = document.getElementById("dynamic-content");

// Akkordeon-HTML erzeugen
function createAccordion(titleText, contentMarkdown, downloadFile) {
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

    // Download-Link hinzufügen (unter dem Text)
    if (downloadFile) {
        const downloadWrapper = document.createElement("div");
        downloadWrapper.style.marginTop = "20px"; // Abstand unter Text

        const downloadText = document.createElement("span");
        downloadText.textContent = "Download "; // normaler Text
        downloadWrapper.appendChild(downloadText);

        const link = document.createElement("a");
        link.textContent = "Exhibition Content"; // klickbarer Text
        link.href = downloadFile.download_url;
        link.target = "_blank";
        link.style.textDecoration = "underline";
        downloadWrapper.appendChild(link);

        panel.appendChild(downloadWrapper);
    }

    // Click: Accordion öffnen/schließen
    title.addEventListener("click", () => {

        // alle anderen schließen
        document.querySelectorAll(".panel").forEach(p => {
            if (p !== panel) p.style.display = "none";
        });
        document.querySelectorAll(".accordion-wrapper").forEach(w => {
            if (w !== wrapper) w.style.backgroundColor = "transparent";
        });
        document.querySelectorAll(".accordion").forEach(a => {
            if (a !== title) a.style.color = "#666";
        });

        // aktueller öffnen
        if (panel.style.display === "block") {
            panel.style.display = "none";
            wrapper.style.backgroundColor = "transparent";
            title.style.color = "#666";
        } else {
            panel.style.display = "block";
            wrapper.style.backgroundColor = "#eaff00";
            title.style.color = "#000";
            panel.style.color = "#000000";

            // Markdown-Inhalt einfügen
            inner.innerHTML = marked.parse(contentMarkdown);
        }
    });

    container.appendChild(wrapper);
}

// Ordner + README automatisch laden
async function loadFolders() {
    try {
        const response = await fetch(repoBase);
        if (!response.ok) throw new Error("Fehler beim Zugriff auf das Repo");
        const items = await response.json();

        for (const item of items) {
            if (item.type === "dir") {
                try {
                    const folderResp = await fetch(item.url);
                    if (!folderResp.ok) throw new Error(`Fehler beim Laden von ${item.name}`);
                    const folderContent = await folderResp.json();
                    if (!Array.isArray(folderContent)) continue;

                    // README.md finden
                    const readme = folderContent.find(f => f.name.toLowerCase() === "readme.md");
                    if (!readme) continue;

                    const readmeResp = await fetch(readme.download_url);
                    if (!readmeResp.ok) throw new Error(`Fehler beim Laden von ${readme.name}`);
                    let md = await readmeResp.text();

                    // Titel aus erster Zeile
                    const lines = md.split("\n");
                    let titleLine = "KEIN TITEL";
                    let content = md;
                    if (lines.length > 0 && lines[0].startsWith("#")) {
                        titleLine = lines[0].replace(/^#\s*/, "");
                        content = lines.slice(1).join("\n");
                    }

                    // Download-Ordner suchen (content_* im Ordner)
                    const downloadFile = folderContent.find(f => f.name.toLowerCase().startsWith("content") && f.type === "dir");

                    createAccordion(titleLine, content, downloadFile);

                } catch (err) {
                    console.warn("Fehler beim Laden eines Ordners:", item.name, err);
                }
            }
        }

    } catch (err) {
        console.error("Fehler beim Laden der Ordner:", err);
        container.innerHTML = "<p style='color:red'>Fehler beim Laden der Inhalte</p>";
    }
}

// Alles starten
loadFolders();
