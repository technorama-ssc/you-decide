const repoBase = "https://api.github.com/repos/technorama-ssc/you-decide/contents/";
const container = document.getElementById("dynamic-content");

// Erzeugt ein Akkordeon-Element
function createAccordion(titleText, contentMarkdown, zipFile, parentWrapper = null) {
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
        // Alle anderen Panels schließen
        document.querySelectorAll(".panel").forEach(p => { if(p!==panel) p.style.display="none"; });
        document.querySelectorAll(".accordion-wrapper").forEach(w => { if(w!==wrapper) w.style.backgroundColor="transparent"; });
        document.querySelectorAll(".accordion").forEach(a => { if(a!==title) a.style.color="#666"; });

        if(panel.style.display==="block"){
            panel.style.display="none";
            wrapper.style.backgroundColor="transparent";
            title.style.color="#666";
        } else {
            panel.style.display="block";
            wrapper.style.backgroundColor="#eaff00";
            title.style.color="#000";
            panel.style.color="#000";

            inner.innerHTML = marked.parse(contentMarkdown);

            if(zipFile){
                const dl = document.createElement("div");
                dl.className = "download-link";

                const textSpan = document.createElement("span");
                textSpan.textContent = "Download"; 
                textSpan.style.fontWeight = "normal";

                const link = document.createElement("a");
                link.href = zipFile.download_url;

                let parts = zipFile.name.replace(/\.zip$/i, "").split("_");
                let displayName = parts.length >= 2
                    ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + " " + parts[parts.length-1].charAt(0).toUpperCase() + parts[parts.length-1].slice(1)
                    : zipFile.name.replace(/\.zip$/i, "");
                link.textContent = displayName;
                link.target = "_blank";

                dl.appendChild(textSpan);
                dl.appendChild(link);
                inner.appendChild(dl);
            }
        }
    });

    if(parentWrapper){
        parentWrapper.appendChild(wrapper); // Unterordner in Hauptordner einfügen
    } else {
        container.appendChild(wrapper); // Hauptordner
    }

    return wrapper; // für Unterordner Referenz
}

// Lädt Inhalte eines Ordners rekursiv
async function loadFolderContent(folderUrl, parentWrapper = null) {
    const folderResp = await fetch(folderUrl);
    if(!folderResp.ok) throw new Error(`Fehler beim Laden von ${folderUrl}`);
    const folderContent = await folderResp.json();

    // README.md finden
    const readme = folderContent.find(f => f.name.toLowerCase() === "readme.md");
    if(!readme) return null;

    // ZIP-Datei optional
    const zipFile = folderContent.find(f => f.name.toLowerCase().endsWith(".zip"));

    const readmeResp = await fetch(readme.download_url);
    if(!readmeResp.ok) throw new Error(`Fehler beim Laden von ${readme.name}`);
    const md = await readmeResp.text();

    // Titel = erste Zeile, Rest = Inhalt
    const lines = md.split("\n");
    let titleLine = lines[0].startsWith("#") ? lines[0].replace(/^#\s*/, "") : "KEIN TITEL";
    let content = lines.slice(1).join("\n");

    // Akkordeon erstellen (mit parentWrapper falls Unterordner)
    const wrapper = createAccordion(titleLine, content, zipFile, parentWrapper);

    // Alle Unterordner prüfen und rekursiv laden
    for(const item of folderContent){
        if(item.type === "dir"){
            await loadFolderContent(item.url, wrapper); // Unterordner in Panel einfügen
        }
    }
}

// Startfunktion: lädt alle Hauptordner
async function loadFolders() {
    try {
        const response = await fetch(repoBase);
        if(!response.ok) throw new Error("Fehler beim Zugriff auf das Repo");
        const items = await response.json();

        for(const item of items){
            if(item.type === "dir"){
                try{
                    await loadFolderContent(item.url);
                } catch(err){
                    console.warn("Fehler beim Laden eines Ordners:", item.name, err);
                }
            }
        }

    } catch(err){
        console.error("Fehler beim Laden der Ordner:", err);
        container.innerHTML = "<p style='color:red'>Fehler beim Laden der Inhalte</p>";
    }
}

loadFolders();
