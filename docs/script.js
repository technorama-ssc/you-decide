// GitHub Repo Basis-URL
const repoBase = "https://api.github.com/repos/technorama-ssc/you-decide/contents/";

// Zielcontainer
const container = document.getElementById("dynamic-content");

// Funktion: Akkordeon erzeugen
function createAccordion(titleText, contentMarkdown, zipFile) {
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

    // Click: Accordion öffnen/schließen
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
            panel.style.color="#000";

            // Markdown-Inhalt einfügen
            inner.innerHTML = marked.parse(contentMarkdown);

            // ZIP-Datei Download-Link erstellen
            if(zipFile){
                const dl = document.createElement("div");
                dl.className = "download-link";

                const textSpan = document.createElement("span");
                textSpan.textContent = "Download"; // regular

                const link = document.createElement("a");
                link.href = zipFile.download_url;

                // Name aus ZIP-Datei: remove "content_" prefix & ".zip" suffix
                let nameParts = zipFile.name.replace(/^content_/, "").replace(/\.zip$/i, "").split("_");
                let displayName = nameParts.map((p,i)=>{
                    if(i===0) return p.charAt(0).toUpperCase() + p.slice(1); // erster Teil: Content
                    if(i===nameParts.length-1) return p.charAt(0).toUpperCase() + p.slice(1); // letzter Teil: Exhibition
                    return p; // alles dazwischen unverändert
                }).join(" ");
                link.textContent = displayName;
                link.target = "_blank";

                dl.appendChild(textSpan);
                dl.appendChild(link);

                inner.appendChild(dl);
            }
        }
    });

    container.appendChild(wrapper);
}

// Ordner + README + ZIP automatisch laden
async function loadFolders() {
    try {
        const response = await fetch(repoBase);
        if(!response.ok) throw new Error("Fehler beim Zugriff auf das Repo");
        const items = await response.json();

        for(const item of items){
            if(item.type==="dir"){
                try{
                    const folderResponse = await fetch(item.url);
                    if(!folderResponse.ok) throw new Error(`Fehler beim Laden von ${item.name}`);
                    const folderContent = await folderResponse.json();
                    if(!Array.isArray(folderContent)) continue;

                    // README.md finden
                    const readme = folderContent.find(f=>f.name.toLowerCase()==="readme.md");
                    if(!readme) continue;

                    // ZIP-Datei im Ordner finden (optional)
                    const zipFile = folderContent.find(f=>f.name.toLowerCase().endsWith(".zip"));

                    // README laden
                    const readmeResp = await fetch(readme.download_url);
                    if(!readmeResp.ok) throw new Error(`Fehler beim Laden von ${readme.name}`);
                    let md = await readmeResp.text();

                    // Erste Zeile als Titel
                    let lines = md.split("\n");
                    let titleLine = "KEIN TITEL";
                    let content = md;

                    if(lines.length>0 && lines[0].startsWith("#")){
                        titleLine = lines[0].replace(/^#\s*/, "");
                        content = lines.slice(1).join("\n");
                    }

                    createAccordion(titleLine, content, zipFile);

                } catch(err){
                    console.warn("Fehler beim Laden eines Ordners:", item.name, err);
                }
            }
        }

    } catch(err){
        console.error("Fehler beim Laden der Ordner:", err);
        container.innerHTML = "<p style='color
