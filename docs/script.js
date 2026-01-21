const repoBase = "https://bold-king-d69b.clehmann-330.workers.dev/api";
const container = document.getElementById("dynamic-content");

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

            inner.innerHTML = marked.parse(contentMarkdown);

            if(zipFile){
                const dl = document.createElement("div");
                dl.className = "download-link";

                const textSpan = document.createElement("span");
                textSpan.textContent = "Download"; 
                textSpan.style.fontWeight = "normal"; 

                const link = document.createElement("a");
                link.href = `${repoBase}/${encodeURIComponent(zipFile.path)}`;
                link.textContent = zipFile.name.replace(/_/g, " ").replace(/\.zip$/i,"");
                link.target = "_blank";

                dl.appendChild(textSpan);
                dl.appendChild(link);
                inner.appendChild(dl);
            }
        }
    });

    container.appendChild(wrapper);
}

async function loadFolders() {
    try {
        const itemsResp = await fetch(repoBase);
        if(!itemsResp.ok) throw new Error("Fehler beim Zugriff auf den Worker");
        const items = await itemsResp.json();

        for(const item of items){
            if(item.type==="dir"){
                try{
                    // Ordner über Worker abrufen
                    const folderResp = await fetch(`${repoBase}/${encodeURIComponent(item.name)}`);
                    if(!folderResp.ok) throw new Error(`Fehler beim Laden von ${item.name}`);
                    const folderContent = await folderResp.json();
                    if(!Array.isArray(folderContent)) continue;

                    const readme = folderContent.find(f=>f.name.toLowerCase()==="readme.md");
                    if(!readme) continue;

                    const zipFile = folderContent.find(f=>f.name.toLowerCase().endsWith(".zip"));

                    // README über Worker abrufen
                    const readmeResp = await fetch(`${repoBase}/${encodeURIComponent(readme.path)}`);
                    if(!readmeResp.ok) throw new Error(`Fehler beim Laden von ${readme.name}`);
                    const readmeData = await readmeResp.json();

                    // GitHub liefert content base64-codiert
                    const md = atob(readmeData.content.replace(/\n/g,''));

                    let lines = md.split("\n");
                    let titleLine = lines.length>0 && lines[0].startsWith("#")
                        ? lines[0].replace(/^#\s*/, "")
                        : "KEIN TITEL";
                    let content = lines.slice(1).join("\n");

                    createAccordion(titleLine, content, zipFile);

                } catch(err){
                    console.warn("Fehler beim Laden eines Ordners:", item.name, err);
                }
            }
        }

    } catch(err){
        console.error("Fehler beim Laden der Inhalte:", err);
        container.innerHTML = "<p style='color:red'>Fehler beim Laden der Inhalte</p>";
    }
}

loadFolders();
