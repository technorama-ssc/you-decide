// GitHub Repo Basis-URL
const repoBase = "https://api.github.com/repos/technorama-ssc/you-decide/contents/";

// Zielcontainer
const container = document.getElementById("dynamic-content");

// Akkordeon-HTML erzeugen
function createAccordion(folderName, readmeUrl) {
    const wrapper = document.createElement("div");
    wrapper.className = "accordion-wrapper";

    const title = document.createElement("h1");
    title.className = "accordion";

    // Führende Zahlen + Leerzeichen entfernen: "01 system" -> "system"
    const displayName = folderName.replace(/^\d+\s+/, "");
    title.textContent = displayName.toUpperCase();
    title.title = displayName; // Mouseover ohne Nummer

    const panel = document.createElement("div");
    panel.className = "panel";

    const inner = document.createElement("div");
    inner.className = "panel-content";

    panel.appendChild(inner);
    wrapper.appendChild(title);
    wrapper.appendChild(panel);

    // Click: Akkordeon öffnen/schließen
    title.addEventListener("click", async () => {

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

            // Sicherstellen, dass Textfarbe schwarz ist
            panel.style.color = "#000000";

            // Markdown laden
            if (!panel.dataset.loaded) {
                try {
                    const response = await fetch(readmeUrl);
                    if (!response.ok) throw new Error("Fehler beim Laden der README");
                    let md = await response.text();
                    md = md.replace(/^# .*\n/, ""); // erste H1 entfernen
                    inner.innerHTML = marked.parse(md);
                    panel.dataset.loaded = "true";
                } catch (err) {
                    inner.innerHTML = "<p style='color:red'>Fehler beim Laden der README</p>";
                    console.error(err);
                }
            }
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
                    const folderResponse = await fetch(item.url);
                    if (!folderResponse.ok) throw new Error(`Fehler beim Laden von ${item.name}`);
                    const folderContent = await folderResponse.json();

                    if (!Array.isArray(folderContent)) continue; // Safety-Check

                    // README.md finden
                    const readme = folderContent.find(f => f.name.toLowerCase() === "readme.md");
                    if (!readme) continue; // nur Ordner mit README

                    createAccordion(item.name, readme.download_url);

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
