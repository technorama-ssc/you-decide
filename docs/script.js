const repoBase = "https://api.github.com/repos/technorama-ssc/you-decide/contents/";
const container = document.getElementById("dynamic-content");

/**
 * Erstellt ein Accordion für einen Ordner
 * @param {string} titleText - Titel des Ordners
 * @param {string} contentMarkdown - Markdown-Text aus README.md
 * @param {object} zipFile - ZIP-Datei (optional)
 * @param {HTMLElement} parent - Parent-Element, in dem das Accordion eingefügt wird
 * @returns {HTMLElement} wrapper
 */
function createAccordion(titleText, contentMarkdown, zipFile, parent) {
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
    inner.innerHTML = marked.parse(contentMarkdown);
    panel.appendChild(inner);
    wrapper.appendChild(title);
    wrapper.appendChild(panel);

    if (zipFile) {
        const dl = document.createElement("div");
        dl.className = "download-link";

        const textSpan = document.createElement("span");
        textSpan.textContent = "Download";
        textSpan.style.fontWeight = "normal";

        const link = document.createElement("a");
        link.href = zipFile.download_url;

        let parts = zipFile.name.replace(/\.zip$/i, "").split("_");
        let displayName = parts.length >= 2
            ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + " " +
              parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1)
            : zipFile.name.replace(/\.zip$/i, "");
        link.textContent = displayName;
        link.target = "_blank";

        dl.appendChild(textSpan);
        dl.appendChild(link);
        inner.appendChild(dl);
    }

    title.addEventListener("click", () => {
        const currentlyOpen = panel.style.display === "block";

        // Alles schließen außer diesem Panel
        document.querySelectorAll(".panel").forEach(p => p.style.display = "none");
        document.querySelectorAll(".accordion").forEach(a => a.style.color = "#666");
        document.querySelectorAll(".accordion-wrapper").forEach(w => w.style.backgroundColor = "transparent");

        if (!currentlyOpen) {
            panel.style.display = "block";
            wrapper.style.backgroundColor = "#eaff00";
            title.style.color = "#000";
            panel.style.color = "#000";
        } else {
            panel.style.display = "none";
            wrapper.style.backgroundColor = "transparent";
            title.style.color = "#666";
        }
    });

    parent.appendChild(wrapper);
    return wrapper;
}

/**
 * Lädt alle Ordner und Unterordner rekursiv
 * @param {string} url - GitHub API URL
 * @param {HTMLElement} parentElement - Parent-Element, in das der Inhalt eingefügt wird
 */
async function loadFolders(url = repoBase, parentElement = container) {
    try {
        const response = await fe
