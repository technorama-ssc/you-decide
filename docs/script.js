const repoBase = "https://api.github.com/repos/technorama-ssc/you-decide/contents/";
const container = document.getElementById("dynamic-content");

// Erstellt Haupt-Accordion
function createAccordion(titleText, contentMarkdown, zipFile, subfolders) {
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
    container.appendChild(wrapper);

    // Klick-Event Haupttitel
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
                link.href = zipFile.download_url;

                let parts = zipFile.name.replace(/\.zip$/i, "").split("_");
                let displayName = parts.length>=2 ? 
                    parts[0].charAt(0).toUpperCase()+parts[0].slice(1)+" "+parts[parts.length-1].charAt(0).toUpperCase()+parts[parts.length-1].slice(1)
                    : zipFile.name.replace(/\.zip$/i,"");
                link.textContent = displayName;
                link.target="_blank";

                dl.appendChild(textSpan);
                dl.appendChild(link);
                inner.appendChild(dl);
            }

            // Unterordner hinzufügen
            if(subfolders && subfolders.length>0){
                subfolders.forEach(sf => {
                    const subTitle = document.createElement("h2");
                    subTitle.className = "sub-accordion";
                    subTitle.textContent = sf.title.toUpperCase();

                    const subPanel = document.createElement("div");
                    subPanel.className = "panel";

                    const subInner = document.createElement("div");
                    subInner.className = "panel-content";
                    subInner.innerHTML = marked.parse(sf.content);

                    subPanel.appendChild(subInner);
                    inner.appendChild(subTitle);
                    inner.appendChild(subPanel);
                });
            }
        }
    });
}

// Hauptordner laden
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

                    const readme = folderContent.find(f=>f.name.toLowerCase()==="readme.md");
                    if(!readme) continue;

                    const zipFile = folderContent.find(f=>f.name.toLowerCase().endsWith(".zip"));

                    const readmeResp = await fetch(readme.download_url);
                    if(!readmeResp.ok) throw new Error(`Fehler beim Laden von ${readme.name}`);
                    let md = await readmeResp.text();

                    let lines = md.split("\n");
                    let titleLine = null;
                    let content = md;

                    if(lines.length>0 && lines[0].startsWith("#")){
                        titleLine = lines[0].replace(/^#\s*/, "");
                        content = lines.slice(1).join("\n");
                    }

                    if(!titleLine) continue; // nur Readme mit # als Titel

                    // Unterordner laden (nur Zahlen am Anfang)
                    const subfolders = [];
                    for(const sub of folderContent){
                        if(sub.type==="dir" && /^\d/.test(sub.name)){
                            const subResp = await fetch(sub.url);
                            if(!subResp.ok) continue;
                            const subContent = await subResp.json();
                            if(!Array.isArray(subContent)) continue;
                            const subReadme = subContent.find(f=>f.name.toLowerCase()==="readme.md");
                            if(!subReadme) continue;

                            const subReadmeResp = await fetch(subReadme.download_url);
                            if(!subReadmeResp.ok) continue;
                            let subMd = await subReadmeResp.text();
                            const subLines = subMd.split("\n");
                            if(subLines.length===0 || !subLines[0].startsWith("#")) continue;

                            subfolders.push({
                                title: subLines[0].replace(/^#\s*/,""),
                                content: subLines.slice(1).join("\n")
                            });
                        }
                    }

                    createAccordion(titleLine, content, zipFile, subfolders);

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
