// The website is fully static: build.py renders every README.md with a
// front matter block into content.json, copies the images into media/ and the
// download zips into downloads/. This script only turns content.json into
// the accordion layout.

const container = document.getElementById("dynamic-content");
let idCounter = 0;

function slugify(text) {
    const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    idCounter += 1;
    return `${slug || "section"}-${idCounter}`;
}

function getDownloadHtml(zipFile) {
    return `
        <div class="download-link">
            <span>Download:</span>
            <a href="${zipFile.download_url}" target="_blank" rel="noopener">${zipFile.label || zipFile.name}</a>
        </div>
    `;
}

// content.json liefert Bilder als {src, alt}; aeltere Builds als reine URL
function imageData(image) {
    return typeof image === "string" ? { src: image, alt: "" } : image;
}

function createImage(image) {
    const { src, alt } = imageData(image);
    const imgEl = document.createElement("img");
    imgEl.src = src;
    imgEl.alt = alt;
    imgEl.loading = "lazy";
    return imgEl;
}

function imageHtml(image, className) {
    const { src, alt } = imageData(image);
    return `<img src="${src}" alt="${alt.replace(/"/g, "&quot;")}" loading="lazy" class="${className}">`;
}

function setExpanded(button, expanded) {
    button.setAttribute("aria-expanded", expanded ? "true" : "false");
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

    const id = slugify(titleText);

    // Titel: die Ueberschrift enthaelt einen Button, damit die Sektion auch per
    // Tastatur und mit Screenreadern bedienbar ist.
    const title = document.createElement("h1");
    title.className = "accordion";
    title.title = titleText;

    const button = document.createElement("button");
    button.type = "button";
    button.id = `title-${id}`;
    button.textContent = titleText.toUpperCase();
    button.setAttribute("aria-controls", `panel-${id}`);
    setExpanded(button, false);
    title.appendChild(button);

    const panel = document.createElement("div");
    panel.className = "panel";
    panel.id = `panel-${id}`;
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-labelledby", button.id);

    const inner = document.createElement("div");
    inner.className = "panel-content";

    panel.appendChild(inner);
    wrapper.appendChild(title);
    wrapper.appendChild(panel);

    // -----------------------
    // Klick-Funktion
    // -----------------------
    button.addEventListener("click", () => {
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

        document.querySelectorAll(".accordion button").forEach(b => {
            if (b !== button) setExpanded(b, false);
        });

        if (panel.style.display === "block") {
            panel.style.display = "none";
            wrapper.style.removeProperty("background-color");
            wrapper.classList.remove("open");
            title.style.removeProperty("color");
            setExpanded(button, false);
        } else {
            panel.style.display = "block";
            wrapper.style.backgroundColor = "#eaff00";
            wrapper.classList.add("open");
            title.style.color = "#000";
            panel.style.color = "#000";
            setExpanded(button, true);

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
                link.rel = "noopener";
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
            (images || []).forEach(image => {
                const imgEl = createImage(image);
                if (lastMainContentNode && lastMainContentNode.parentNode) {
                    inner.insertBefore(imgEl, lastMainContentNode.nextSibling);
                } else {
                    inner.appendChild(imgEl);
                }
                lastMainContentNode = imgEl;
            });

            // Unterordner HTML + Bilder
            if (subfoldersHtml) {
                inner.insertAdjacentHTML("beforeend", subfoldersHtml);

                // EXHIBITS: Unterordner-Titel klickbar machen
                if (wrapper.classList.contains("exhibits")) {
                    const subfolderButtons = inner.querySelectorAll(".subfolder-title button");
                    subfolderButtons.forEach(subfolderButton => {
                        subfolderButton.addEventListener("click", (e) => {
                            e.stopPropagation();

                            // When a subfolder opens, return the main EXHIBITS header to gray.
                            wrapper.style.backgroundColor = "#666666";
                            title.style.color = "#000";

                            // Finde den nächsten Text-Block
                            const block = subfolderButton.closest(".subfolder-block");
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
                            subfolderButtons.forEach(b => setExpanded(b, false));

                            // Toggle diesen Block
                            if (!isOpen && textBlock) {
                                block.classList.add("open");
                                setExpanded(subfolderButton, true);
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

                            imgs.forEach(image => {
                                const imgEl = createImage(image);
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

            // Geoeffnete Sektion an den Seitenanfang scrollen. Die anderen Panels sind gerade
            // zugeklappt, sonst bliebe die Sektion irgendwo mitten auf der Seite stehen.
            // Absolut positionieren (kein scrollIntoView/smooth: die Seitenhoehe aendert sich gerade).
            const scrollToWrapper = () => window.scrollTo(0, wrapper.getBoundingClientRect().top + window.scrollY);
            scrollToWrapper();
            // Bilder, die erst noch laden, machen die Seite laenger: danach Position korrigieren.
            const pending = [...inner.querySelectorAll("img")].filter(img => !img.complete);
            if (pending.length) {
                Promise.all(pending.map(img => new Promise(resolve => {
                    img.addEventListener("load", resolve, { once: true });
                    img.addEventListener("error", resolve, { once: true });
                }))).then(() => {
                    if (Math.abs(wrapper.getBoundingClientRect().top) > 2) {
                        scrollToWrapper();
                    }
                });
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
                    <h2 class="subfolder-title"><button type="button" aria-expanded="false">${sub.title}</button></h2>
                    <div class="subfolder-text">
                        ${marked.parse(sub.content)}
                        ${sub.zipFile ? getDownloadHtml(sub.zipFile) : ""}
            `;

            // Verschachtelte Subsections (z.B. Findings unter einem Exponat)
            for (const subsub of sub.subsections || []) {
                subHtml += `
                    <div class="nested-subfolder-block">
                        <h3 class="nested-subfolder-title">${subsub.title}</h3>
                        <div class="nested-subfolder-content">
                            ${marked.parse(subsub.content)}
                            ${subsub.zipFile ? getDownloadHtml(subsub.zipFile) : ""}
                `;
                for (const image of subsub.images || []) {
                    subHtml += imageHtml(image, "nested-subfolder-img");
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
            wrapper.querySelector('.accordion button').click();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadContent().catch(err => {
        console.error('Fehler beim Laden der Inhalte:', err);
        container.innerHTML = `<p style='color:red'>Fehler beim Laden: ${err.message}</p>`;
    });
});
