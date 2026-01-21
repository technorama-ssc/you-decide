// --- WICHTIG: ALLES über den Worker laden ---
const repoBase = "https://bold-king-d69b.clehmann-330.workers.dev/api/";

// Container auf der Seite
const container = document.getElementById("dynamic-content");

// Hilfsfunktion – lädt Dateien über den Worker
async function fetchJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("Fehler: " + r.status);
    return await r.json();
}

// Accordion-Element für Haupt- und Unterordner
function createAccordion(titleText, contentMarkdown, parentPanel = null) {
    const wrapper = document.createElement("div");
    wrapper.className = "accordion-wrapper";

    const title = document.createElement("h1");
    title.className = "accordion";
    title.textContent = titleText.toUpperCase();

    const panel = document.createElement("div");
    panel.className = "panel";

    const inner = document.createElement("div");
    inner.className = "panel-content";

    panel.appendChild(inner);
    wrapper.appendChild(title);
    wrapper.appendChild(panel);

    // Wenn kein Parent → auf Startseite einfügen
    if (!parentPanel) {
        container.appendChild(wrapper);
    } else {
        // Unterordner werden IN das gelbe Panel des Hauptordners eingefügt
        parentPanel.appendChild(wrapper);
    }

    title.addEventListener("click", () => {
        if (!parentPanel) {
            // Nur Hauptordner schließen/öffnen
            document.querySelectorAll(".panel").forEach(p => { 
                if (p !== panel) p.style.display = "none"; 
            });
        }

        if (panel.style.display === "block") {
            panel.style.display = "none";
            wrapper.style.backgroundColor = "transparent";
            title.style.color = "#666";
        } else {
            panel.style.display = "block";

            if (!parentPanel) {
                wrapper.style.backgroundColor = "#eaff00";
                title.style.color = "#000";
                panel.style.color = "#000";
            }

            inner.innerHTML = marked.parse(contentMarkdown);
        }
    });

    return panel; // wichtig für Unterordner
}

// Hauptfunktion
async function loadFolders() {
    try {
        const rootItems = await fetchJSON(repoBase);

        // Nur Ordner durchgehen
        for (const item of rootItems) {
            if (item.type !== "dir") continue;

            // Ordnerinhalt laden
            const folder = await fetchJSON(repoBase + encodeURIComponent(item.name));

            // README suchen
            const readme = folder.find(f => f.name.toLowerCase() === "readme.md");
            if (!readme) continue;

            // README laden
            const readmeText = await fetch(readme.download_url).then(r => r.text());

            // Nur README.md auswerten, wenn sie mit '#' beginnt
            const firstLine = readmeText.split("\n")[0];
            if (!firstLine.startsWith("#")) continue;

            const mainTitle = firstLine.replace(/^#\s*/, "");
            const mainContent = readmeText.split("\n").slice(1).join("\n");

            // Hauptakkordeon erzeugen
            const mainPanel = createAccordion(mainTitle, mainContent);

            // 🔥 UNTERORDNER-LADELOGIK 🔥
            for (const sub of folder) {
                if (sub.type !== "dir") continue;

                const subFolder = await fetchJSON(repoBase + encodeURIComponent(item.name) + "/" + encodeURIComponent(sub.name));
                const subReadme = subFolder.find(f => f.name.toLowerCase() === "readme.md");

                if (!subReadme) continue;

                const subText = await fetch(subReadme.download_url).then(r => r.text());
                const subLines = subText.split("\n");

                // Nur wenn die unterordner-README ebenfalls mit '#' beginnt
                if (!subLines[0].startsWith("#")) continue;

                const subTitle = subLines[0].replace(/^#\s*/, "");
                const subContent = subLines.slice(1).join("\n");

                // Unterordner-Akkordeon INS Hauptpanel setzen
                createAccordion(subTitle, subContent, mainPanel);
            }
        }

    } catch (err) {
        console.error(err);
        container.innerHTML = "<p style='color:red'>Fehler beim Laden der Inhalte.</p>";
    }
}

loadFolders();
