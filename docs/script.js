const repoBase = "https://api.github.com/repos/technorama-ssc/you-decide/contents/";
const container = document.getElementById("dynamic-content");

/* ---------------------------------------------------------
   🔥 HILFSFUNKTION: Lädt README + Titel aus einem Ordner
---------------------------------------------------------- */
async function loadReadmeFromFolder(url){
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

    // Titel nur wenn erste Zeile mit #
    if(!lines[0].startsWith("#")) return null;

    const title = lines[0].replace(/^#\s*/, "");
    const content = lines.slice(1).join("\n");

    return { title, content };
}

/* ---------------------------------------------------------
   🔥 Funktion: erstellt einen Block (Haupt- oder Unterordner)
---------------------------------------------------------- */
function createBlock(titleText, contentMarkdown, zipFile) {
    const wrapper = document.createElement("div");
    wrapper.className = zipFile ? "accordion-wrapper" : "subfolder-block";

    // Titel
    const title = document.createElement("h1");
    title.className = zipFile ? "accordion" : "subfolder-title";
    title.textContent = titleText.toUpperCase();
    title.title = titleText;

    // Panel
    const panel = document.createElement("div");
    panel.className = zipFile ? "panel" : "subfolder-text";
    panel.style.display = zipFile ? "none" : "block"; // Unterordner direkt sichtbar

    // Panel Inhalt
    const inner = document.createElement("div");
    inner.className = "panel-content";
    inner.innerHTML = marked.parse(contentMarkdown);

    panel.appendChild(inner);
    wrapper.appendChild(title);
    wrapper.appendChild(panel);

    // ZIP-Download bei Hauptordner
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
        inner.appendChild(dl);
    }

    // Klick für Hauptordner
    if(zipFile){
        title.addEventListener("click", () => {
            const panelVisible = panel.style.display === "block";
            document.querySelectorAll(".panel").forEach(p => p.style.display="none");
            document.querySelectorAll(".accordion-wrapper").forEach(w => w.style.backgroundColor="transparent");
            document.querySelectorAll(".accordion").forEach(a => a.style.color="#666");

            if(!panelVisible){
                panel.style.display="block";
                wrapper.style.backgroundColor="#eaff00";
                title.style.color="#000";
                panel.style.color="#000";
            } else {
                panel.style.display="none";
                wrapper.style.backgroundColor="transparent";
                title.style.color="#666";
            }
        });
    }

    container.appendChild(wrapper);
}

/* ---------------------------------------------------------
   🔥 HAUPT-FUNKTION: Lädt Hauptordner + Unterordner
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

            // README Hauptordner
            const readme = folderContent.find(f => f.name.toLowerCase() === "readme.md");
            if(!readme) continue;

            const readmeResp = await fetch(readme.download_url);
            if(!readmeResp.ok) continue;

            let md = await readmeResp.text();
            let lines = md.split("\n");

            let titleLine = "KEIN TITEL";
            let content = md;

            if(lines[0].startsWith("#")){
                titleLine = lines[0].replace(/^#\s*/, "");
                content = lines.slice(1).join("\n");
            }

            const zipFile = folderContent.find(f => f.name.toLowerCase().endsWith(".zip"));

            // Hauptordner erstellen
            createBlock(titleLine, content, zipFile);

            // Unterordner laden
            for(const sub of folderContent){
                if(sub.type !== "dir") continue;
                if(!/^\d/.test(sub.name)) continue; // nur nummerierte Unterordner

                const subData = await loadReadmeFromFolder(sub.url);
                if(!subData) continue;

                // Unterordner-Block
                createBlock(subData.title, subData.content, null);
            }
        }

    } catch(err){
        console.error("Fehler beim Laden der Ordner:", err);
        container.innerHTML = "<p style='color:red'>Fehler beim Laden der Inhalte</p>";
    }
}

loadFolders();
