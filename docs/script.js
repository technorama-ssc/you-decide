// Cloudflare Worker URL
const repoBase = "https://bold-king-d69b.clehmann-330.workers.dev/api/";
const container = document.getElementById("dynamic-content");

// Akkordeon erzeugen
function createAccordion(titleText, contentMarkdown, zipFile, folderPath) {
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

            // Markdown-Inhalt einfügen
            inner.innerHTML = marked.parse(contentMarkdown);

            // Download-Link erstellen
            if(zipFile){
                const dl = document.createElement("div");
                dl.className = "download-link";

                const textSpan = document.createElement("span");
                textSpan.textContent = "Download";

                const link = document.createElement("a");
                link.href = zipFile.download_url;

                // Display-Name: erster und letzter Teil der ZIP
                let parts = zipFile.name.replace(/\.zip$/i, "").split("_");
                let displayName = "";
                if(parts.length >= 2){
                    displayName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + " " +
                                  parts[parts.length-1].charAt(0).toUpperCase() + parts[parts.length-1].slice(1);
                } else {
                    displayName = zipFile.name.replace(/\.zip$/i, "");
                }
                link.textContent = displayName;
                link.target = "_blank";

                dl.appendChild(textSpan);
                dl.appendChild(link);
                inner.appendChild(dl);

                // Developer-Link unter Download
                const dev = document.createElement("div");
                dev.className = "developer-link";
                const devLink = document.createElement("a");
                devLink.href = `https://github.com/technorama-ssc/you-decide/tree/main/${encodeURIComponent(folderPath)}`;
                devLink.textContent = "For Developers";
                devLink.target = "_blank";
                dev.appendChild(devLink);
                inner.appendChild(dev);
            }
        }
    })
