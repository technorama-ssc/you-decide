function createAccordion(titleText, contentMarkdown, zipFile, imageUrls, subfoldersHtml) {
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
        document.querySelectorAll(".panel").forEach(p => {
            if (p !== panel) p.style.display = "none";
        });

        document.querySelectorAll(".accordion-wrapper").forEach(w => {
            if (w !== wrapper) w.style.backgroundColor = "transparent";
        });

        document.querySelectorAll(".accordion").forEach(a => {
            if (a !== title) a.style.color = "#666";
        });

        if (panel.style.display === "block") {
            panel.style.display = "none";
            wrapper.style.backgroundColor = "transparent";
            title.style.color = "#666";
        } else {
            panel.style.display = "block";
            wrapper.style.backgroundColor = "#eaff00";
            title.style.color = "#000";
            panel.style.color = "#000";

            // Haupttext
            inner.innerHTML = marked.parse(contentMarkdown);

            // ZIP Download
            if (zipFile) {
                const dl = document.createElement("div");
                dl.className = "download-link";

                const textSpan = document.createElement("span");
                textSpan.textContent = "Download";

                const link = document.createElement("a");
                link.href = zipFile.download_url;
                link.target = "_blank";

                let parts = zipFile.name.replace(/\.zip$/i, "").split("_");
                let displayName =
                    parts.length >= 2
                        ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + " " +
                          parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1)
                        : zipFile.name.replace(/\.zip$/i, "");

                link.textContent = displayName;

                dl.appendChild(textSpan);
                dl.appendChild(link);
                inner.appendChild(dl);
            }

            // ⭐ Hauptbilder direkt nach Text / Download
            if (imageUrls && imageUrls.length > 0) {
                imageUrls.forEach(url => {
                    const img = document.createElement("img");
                    img.src = url;
                    img.style.maxWidth = "600px";
                    img.style.height = "auto";
                    img.style.display = "block";
                    img.style.marginTop = "40px";
                    inner.appendChild(img);
                });
            }

            // ⭐ Unterordner **nach** Haupttext + Download + Bilder
            if (subfoldersHtml) {
                inner.insertAdjacentHTML("beforeend", subfoldersHtml);
            }
        }
    });

    container.appendChild(wrapper);
}
