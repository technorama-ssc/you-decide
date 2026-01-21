// GitHub Repo Basis-URL
const repoBase = "https://api.github.com/repos/technorama-ssc/you-decide/contents/";
const container = document.getElementById("dynamic-content");

// Funktion: Akkordeon erzeugen
function createAccordion(titleText, contentMarkdown, downloadUrl) {
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

    // Panel-Content: Markdown
    inner.innerHTML = marked.parse(contentMarkdown);

    // Download-Link hinzufügen, falls vorhanden
    if (downloadUrl) {
        const downloadHTML = `<br><p>Download <a href="${downloadUrl}" target="_blank">Exhibition Content</a></p>`;
        inner.innerHTML += downloadHTML;
    }

    panel.appendChild(inner);
    wrapper.appendChild(title);
    wrapper.appendChild(panel);

    // Click: Akkordeon öffnen/schließen
    title.addEventListener("click", () => {
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
        }
    });

    container.appendChild(wrapper);
}

// Ordner + README automatisch laden
async function loadFolders() {
    try {
        const response = await fetch(repoBase);
        if(!response.ok) throw new Error("Fehler beim Zugriff auf das Repo");
        const items = await response.json();

        for(const item of items){
            if(item.type==="dir"){
                try{
                    const folderResp = await fetch(item.url);
                    if(!folderResp.ok) throw new Error(`Fehler beim Laden von ${item.name}`);
                    const folderContent = await folderResp.json();
                    if(!Array.isArray(folderContent)) continue;

                    const readme = folderContent.find(f=>f.name.toLowerCase()==="readme.md");
                    if(!readme) continue;

                    const readmeResp = await fetch(readme.download_url);
                    if(!readmeResp.ok) throw new Error(`Fehler beim Laden von ${readme.name}`);
                    let md = await readmeResp.text();

                    // Titel aus erster Zeile der README
                    const lines = md.split("\n");
                    let titleLine = "KEIN TITEL";
                    let content = md;
                    if(lines.length>0 && lines[0].startsWith("#")){
                        titleLine = lines[0].replace(/^#\s*/, "");
                        content = lines.slice(1).join("\n");
                    }

                    // Prüfen, ob ZIP-Datei existiert (Download-Link)
                    // Annahme: Ordner heißt content_<foldername>, ZIP-Datei im gleichen Ordner
                    const zipName = folderContent.find(f=>f.name.endsWith(".zip") && f.name.toLowerCase().startsWith("content_"));
                    let downloadUrl = null;
                    if(zipName){
                        downloadUrl = zipName.download_url; // Raw-Link
                    }

                    createAccordion(titleLine, content, downloadUrl);

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

// Alles starten
loadFolders();
