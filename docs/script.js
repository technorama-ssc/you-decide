const repoBase = "https://api.github.com/repos/technorama-ssc/you-decide/contents/";
const container = document.getElementById("dynamic-content");

/* ---------------------------------------------------------
   🔥 Lädt README + Titel aus einem Ordner
---------------------------------------------------------- */
async function loadReadmeFromFolder(url) {
    const folderResponse = await fetch(url);
    if(!folderResponse.ok) return null;

    const folderContent = await folderResponse.json();
    if(!Array.isArray(folderContent)) return null;

    const readme = folderContent.find(f => f.name.toLowerCase() === "readme.md");
    if(!readme) return null;

    const readmeResp = await fetch(readme.download_url);
    if(!readmeResp.ok) return null;

    let md = await readmeResp.text();
    let lines = md.split("\n");

    if(!lines[0].startsWith("#")) return null;

    const title = lines[0].replace(/^#\s*/, "");
    const content = lines.slice(1).join("\n");

    return { title, content };
}

/* ---------------------------------------------------------
   🔥 Erstellt einen Block (Haupt- oder Unterordner)
---------------------------------------------------------- */
function createBlock(titleText, contentMarkdown, zipFile, isSubfolder=false) {
    // Block Wrapper
    const block = document.createElement("div");
    block.className = "folder-block";

    // Titel
    const title = document.createElement(isSubfolder ? "h2" : "h1");
    title.className = isSubfolder ? "subfolder-title" : "accordion";
    title.textContent = titleText.toUpperCase();
    block.appendChild(title);

    // Panel / Inhalt
    const panel = document.createElement("div");
    panel.className = "panel-content";
    panel.style.display = isSubfolder ? "block" : "none"; // Unterordner nur sichtbar beim Klick des Hauptordners
    panel.innerHTML = marked.parse(contentMarkdown);
    block.appendChild(panel);

    // ZIP Download (falls vorhanden)
    if(zipFile){
        const dl = document.createElement("div");
        dl.className = "download-link";

        const textSpan = document.createElement("span");
        textSpan.textContent = "Download"; 
        textSpan.style.fontWeight = "normal";

        const link = document.createElement("a");
        link.href = zipFile.download_url;

        let parts = zipFile.name.replace(/\.zip$/i, "").split("_");
        let displayName = "";

        if(parts.length >= 2){
            displayName =
                parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + " " +
                parts[parts.length-1].charAt(0).toUpperCase() + parts[parts.length-1].slice(1);
        } else {
            displayName = zipFile.name.replace(/\.zip$/i, "");
        }

        link.textContent = displayName;
        link.target = "_blank";

        dl.appendChild(textSpan);
        dl.appendChild(link);
        panel.appendChild(dl);
    }

    container.appendChild(block);

    // Linie unter jedem Block
    const line = document.createElement("div");
    line.className = "separator-line";
    container.appendChild(line);

    return { block, panel };
}

/* ---------------------------------------------------------
   🔥 Lädt Hauptordner + Unterordner
---------------------------------------------------------- */
async function loadFolders() {
    try {
        const response = await fetch(repoBase);
        if(!response.ok) throw new Error("Fehler beim Zugriff auf das Repo");

        const items = await response.json();

        for(const item of items){
            if(item.type !== "dir") continue;

            const folderResp = await fetch(item.url);
            if(!folderResp.ok) continue;

            const folderContent = await folderResp.json();
            const readme = folderContent.find(f => f.name.toLowerCase() === "readme.md");
            if(!readme) continue;

            const readmeResp = await fetch(readme.download_url);
            if(!readmeResp.ok) continue;

            let md = await readmeResp.text();
            let lines = md.split("\n");

            if(!lines[0].startsWith("#")) continue;

            const titleLine = lines[0].replace(/^#\s*/, "");
            const content = lines.slice(1).join("\n");
            const zipFile = folderContent.find(f => f.name.toLowerCase().endsWith(".zip"));

            // Hauptblock erstellen
            const { block, panel } = createBlock(titleLine, content, zipFile, false);

            // Unterordner laden
            for(const sub of folderContent){
                if(sub.type !== "dir") continue;
                if(!/^\d/.test(sub.name)) continue;

                const subData = await loadReadmeFromFolder(sub.url);
                if(!subData) continue;

                // Unterblock erstellen
                const { block: subBlock } = createBlock(subData.title, subData.content, null, true);
                subBlock.style.display = "none"; // initially hidden
                panel.appendChild(subBlock);

                // Klick auf Haupttitel zeigt/verbirgt Unterordner
                block.querySelector(".accordion").addEventListener("click", () => {
                    subBlock.style.display = subBlock.style.display === "block" ? "none" : "block";
                });
            }
        }

    } catch(err){
        console.error("Fehler beim Laden der Ordner:", err);
        container.innerHTML = "<p style='color:red'>Fehler beim Laden der Inhalte</p>";
    }
}

loadFolders();
