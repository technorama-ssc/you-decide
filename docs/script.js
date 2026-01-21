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

    // Ordnernummer entfernen (z. B. "01_Ordnername" → "Ordnername")
    const displayName = folderName.replace(/^\d+_/, "");
    title.textContent = displayName.toUpperCase();
    title.title = displayName; // Mouseover ohne Nummer

    const panel = document.createElement("div");
    panel.className = "panel";

    const inner = document.createElement("div");
    inner.className = "panel-content";

    panel.appendChild(inner);
    wrapper.appendChild(title);
    wrapper.appendChild(panel);

    // Click: Accordion öffnen/schließen
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
                const response = await fetch(readmeUrl);
                let md = await response.text();
                md = md.replace(/^# .*\n/, ""); // erste H1 entfernen
                inner.innerHTML = marked.parse(md);
                panel.dataset.loaded = "true";
            }
        }
    });

    container.appendChild(wrapper);
}

// Ordner + README automatisch laden
async function loadFolders() {
    try {
        const response = await fetch(repoBase);
        const items = await response.json();

        for (const item of items) {
            if (item.type === "dir") {
                const folderUrl = item.url;
                const folderContent = await fetch(folderUrl).then(r => r.json());

                // README.md finden
                const readme = folderContent.find(f => f.name.toLowerCase() === "readme.md");

                // nur Ordner anzeigen, die README haben
                if (readme) {
                    createAccordion(item.name, readme.download_url);
                }
            }
        }
    } catch (err) {
        console.error("Fehler beim Laden der Ordner:", err);
        container.innerHTML = "<p style='color:red'>Fehler beim Laden der Inhalte</p>";
    }
}

loadFolders();
