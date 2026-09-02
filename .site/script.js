// The website is fully static: build.py renders every folder that has a
// youdecide.json into content.json, copies the images into media/ and the
// download zips into downloads/. This script only turns content.json into
// the accordion layout.

const container = document.getElementById("dynamic-content");

function getDownloadHtml(zipFile) {
    return `
        <div class="download-link">
            <span>Download:</span>
            <a href="${zipFile.download_url}" target="_blank">${zipFile.label || zipFile.name}</a>
        </div>
    `;
}

// -------------------------
// Akkordeon erstellen
// -------------------------
function createAccordion(titleText, contentMarkdown, zipFile, subfoldersHtml, images, subfolderImages) {
    const wrapper = document.createElement("div");
    wrapper.className = "accordion-wrapper";

    // Spezielle Klasse für EXHIBITS
    const isExhibits = titleText.toUpperCase().includes("EXHIBITS");
    if (isExhibits) {
        wrapper.classList.add("exhibits");
    }

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

    // -----------------------
    // Klick-Funktion
    // -----------------------
    title.addEventListener("click", () => {
        document.querySelectorAll(".panel").forEach(p => {
            if (p !== panel) p.style.display = "none";
        });

        document.querySelectorAll(".accordion-wrapper").forEach(w => {
            if (w !== wrapper) {
                w.style.removeProperty("background-color");
                w.classList.remove("open");
            }
        });

        document.querySelectorAll(".accordion").forEach(a => {
            if (a !== title) a.style.removeProperty("color");
        });

        if (panel.style.display === "block") {
            panel.style.display = "none";
            wrapper.style.removeProperty("background-color");
            wrapper.classList.remove("open");
            title.style.removeProperty("color");
        } else {
            panel.style.display = "block";
            wrapper.style.backgroundColor = "#eaff00";
            wrapper.classList.add("open");
            title.style.color = "#000";
            panel.style.color = "#000";

            // Haupttext
            inner.innerHTML = "";
            if (isExhibits) {
                const intro = document.createElement("div");
                intro.className = "exhibits-intro";
                intro.innerHTML = marked.parse(contentMarkdown);
                inner.appendChild(intro);
            } else {
                inner.innerHTML = marked.parse(contentMarkdown);
            }

            // ZIP Download
            let lastMainContentNode = null;
            if (zipFile) {
                const dl = document.createElement("div");
                dl.className = "download-link";

                const textSpan = document.createElement("span");
                textSpan.textContent = "Download:";

                const link = document.createElement("a");
                link.href = zipFile.download_url;
                link.target = "_blank";
                link.textContent = zipFile.label || zipFile.name;
                dl.style.marginTop = "1em";

                dl.appendChild(textSpan);
                dl.appendChild(link);
                inner.appendChild(dl);

                lastMainContentNode = dl;
            } else {
                lastMainContentNode = inner.lastChild;
            }

            // Bilder Hauptordner
            if (images && images.length > 0) {
                images.forEach(imgUrl => {
                    const imgEl = document.createElement("img");
                    imgEl.src = imgUrl;
                    imgEl.style.maxWidth = "600px";
                    imgEl.style.height = "auto";

                    if (lastMainContentNode && lastMainContentNode.parentNode) {
                        inner.insertBefore(imgEl, lastMainContentNode.nextSibling);
                        lastMainContentNode = imgEl;
                    } else {
                        inner.appendChild(imgEl);
                        lastMainContentNode = imgEl;
                    }
                });
            }

            // Unterordner HTML + Bilder
            if (subfoldersHtml) {
                inner.insertAdjacentHTML("beforeend", subfoldersHtml);

                // EXHIBITS: Unterordner-Titel klickbar machen
                if (wrapper.classList.contains("exhibits")) {
                    const subfolderTitles = inner.querySelectorAll(".subfolder-title");
                    subfolderTitles.forEach(subfolderTitle => {
                        subfolderTitle.style.cursor = "pointer";
                        subfolderTitle.addEventListener("click", (e) => {
                            e.stopPropagation();

                            // When a subfolder opens, return the main EXHIBITS header to gray.
                            wrapper.style.backgroundColor = "#666666";
                            title.style.color = "#000";

                            // Finde den nächsten Text-Block
                            const block = subfolderTitle.closest(".subfolder-block");
                            const textBlock = block.querySelector(".subfolder-text");
                            const isOpen = block.classList.contains("open");

                            // Verstecke / entferne open-Klasse von allen anderen Blöcken
                            inner.querySelectorAll(".subfolder-block").forEach(b => {
                                b.classList.remove("open");
                                b.querySelector(".subfolder-text").style.display = "none";
                                b.querySelectorAll("img:not(.nested-subfolder-img)").forEach(img => img.style.display = "none");
                                b.querySelectorAll(".nested-subfolder-title").forEach(el => el.style.display = "none");
                                b.querySelectorAll(".nested-subfolder-content").forEach(el => el.style.display = "none");
                            });

                            // Toggle diesen Block
                            if (!isOpen && textBlock) {
                                block.classList.add("open");
                                textBlock.style.display = "block";
                                block.querySelectorAll("img:not(.nested-subfolder-img)").forEach(img => img.style.display = "block");
                                // Nested subfolder imgs bleiben immer sichtbar
                                block.querySelectorAll(".nested-subfolder-img").forEach(img => img.style.display = "block");
                                // Nested Subfolder Titel und Content anzeigen
                                block.querySelectorAll(".nested-subfolder-title").forEach(el => el.style.display = "block");
                                block.querySelectorAll(".nested-subfolder-content").forEach(el => el.style.display = "block");
                            } else if (isOpen) {
                                wrapper.style.backgroundColor = "#eaff00";
                            }
                        });
                    });
                }

                if (subfolderImages) {
                    const subfolderBlocks = inner.querySelectorAll(".subfolder-block");
                    subfolderBlocks.forEach((block, index) => {
                        const imgs = subfolderImages[index];
                        if (imgs && imgs.length > 0) {
                            // Finde den ersten nested-subfolder-block
                            const firstNestedBlock = block.querySelector(".nested-subfolder-block");

                            imgs.forEach(url => {
                                const imgEl = document.createElement("img");
                                imgEl.src = url;
                                imgEl.style.maxWidth = "600px";
                                imgEl.style.height = "auto";

                                // Wenn es einen nested-subfolder-block gibt, füge das Bild davor ein
                                if (firstNestedBlock) {
                                    block.querySelector(".subfolder-text").insertBefore(imgEl, firstNestedBlock);
                                } else {
                                    // Ansonsten am Ende anfügen
                                    block.appendChild(imgEl);
                                }
                            });
                        }
                    });
                }
            }
        }
    });

    container.appendChild(wrapper);
    return wrapper;
}

// -------------------------
// content.json laden und rendern
// -------------------------
async function loadContent() {
    const response = await fetch(`content.json?cb=${Date.now()}`);
    if (!response.ok) {
        throw new Error(`content.json: HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error("content.json ist leer");
    }

    for (const item of data) {
        const { title, content, zipFile, images, subsections } = item;

        // Subsections HTML bauen
        let subHtml = "";
        const subfolderImages = [];

        for (const sub of subsections || []) {
            subHtml += `
                <div class="subfolder-block">
                    <h2 class="subfolder-title">${sub.title}</h2>
                    <div class="subfolder-text">
                        ${marked.parse(sub.content)}
                        ${sub.zipFile ? getDownloadHtml(sub.zipFile) : ""}
            `;

            // Verschachtelte Subsections (z.B. Findings unter einem Exponat)
            for (const subsub of sub.subsections || []) {
                subHtml += `
                    <div class="nested-subfolder-block">
                        <h2 class="nested-subfolder-title">${subsub.title}</h2>
                        <div class="nested-subfolder-content">
                            ${marked.parse(subsub.content)}
                            ${subsub.zipFile ? getDownloadHtml(subsub.zipFile) : ""}
                `;
                for (const imgUrl of subsub.images || []) {
                    subHtml += `<img src="${imgUrl}" style="max-width:600px;height:auto;" class="nested-subfolder-img">`;
                }
                subHtml += `
                        </div>
                    </div>
                `;
            }

            subHtml += `
                    </div>
                </div>
            `;
            subfolderImages.push(sub.images || []);
        }

        const wrapper = createAccordion(title, content, zipFile, subHtml, images, subfolderImages);
        if (container.children.length === 1) {
            wrapper.querySelector('.accordion').click();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadContent().catch(err => {
        console.error('Fehler beim Laden der Inhalte:', err);
        container.innerHTML = `<p style='color:red'>Fehler beim Laden: ${err.message}</p>`;
    });
});
