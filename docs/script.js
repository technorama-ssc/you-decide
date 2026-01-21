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
    title.textContent = folderName.toUpperCase();

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

            // Textfarbe auf schwarz setzen
            panel.style.color = "#000000";

            // Markdown laden
            if (!panel.dataset.loaded && readmeUrl) {
                try {
                    const response = await fetch(readmeUrl);
                    if (!response.ok) throw new Error(`README konnte nicht geladen werden: ${response.status}`);
                    let md = await response.text();
                    md = md.replace(/^# .*\n/, ""); // erste H1 entfernen
                    inner.innerHTML = marked.parse(md);
                    panel.dataset.loaded = "true";
                } catch (err) {
                    console.warn(`Fehler beim Laden der README für Ordner ${folderName}:`, err);
                    inner.innerHTML = "<p style='color:red'>README konnte nicht geladen werden.</p>";
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
        console.log("Repo-Response Status:", response.status);
        if (!response.ok) throw new Error(`Repo konnte nicht geladen werden: ${response.status}`);
        const items = await response.json();

        console.log("Gefundene Items im Repo:", items.map(i => i.name));

        for (const item of items) {
            if (item.type === "dir") {
                try {
                    const folderResponse = await fetch(item.url);
                    console.log(`Ordner ${item.name} Status:`, folderResponse.status);
                    if (!folderResponse.ok) throw new Error(`Ordner ${item.name} konnte nicht geladen werden: ${folderResponse.status}`);
                    const folderContent = await folderResponse.json();

                    // Prüfen, ob folderContent ein Array ist
                    let filesArray = Array.isArray(folderContent) ? folderContent : [folderContent];

                    console.log(`Inhalt von Ordner ${item.name}:`, filesArray.map(f => f.name));

                    // README.md finden
                    const readme = filesArray.find(f => f.name.toLowerCase() === "readme.md");

                    if (readme && readme.download_url) {
                        createAccordion(item.name, readme.download_url);
                    } else {
                        console.warn(`README.md fehlt oder hat keine download_url in Ordner ${item.name}`);
                    }
                } catch (err) {
                    console.warn(`Fehler beim Laden des Ordners ${item.name}:`, err);
                }
            }
        }
    } catch (err) {
        console.error("Fehler beim Laden der Ordner:", err);
        container.innerHTML = "<p style='color:red'>Fehler beim Laden der Inhalte</p>";
    }
}

loadFolders();
