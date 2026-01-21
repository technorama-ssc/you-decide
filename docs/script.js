const repoBase = "https://api.github.com/repos/technorama-ssc/you-decide/contents/";
const container = document.getElementById("dynamic-content");

function createAccordion(titleText, contentMarkdown, downloadInfo) {
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

    // Download-Link hinzufügen, wenn vorhanden
    let downloadLink = null;
    if (downloadInfo) {
        downloadLink = document.createElement("span");

        const textSpan = document.createElement("span");
        textSpan.className = "download-text";
        textSpan.textContent = "Download";

        const link = document.createElement("a");
        link.href = downloadInfo.url;
        link.className = "download-link";
        link.textContent = downloadInfo.label; // z.B. "Content Exhibition"
        link.download = ""; // Browser weißt an, die Datei zu speichern

        downloadLink.appendChild(textSpan);
        downloadLink.appendChild(link);
    }

    wrapper.appendChild(title);
    wrapper.appendChild(panel);
    if (downloadLink) wrapper.appendChild(downloadLink);

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
            inner.innerHTML = marked.parse(contentMarkdown);
        }
    });

    container.appendChild(wrapper);
}

async function loadFolders() {
    try {
