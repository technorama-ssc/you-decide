const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const repoBase = isLocal
    ? "http://localhost:8000/repos/technorama-ssc/you-decide/contents/"
    : "https://api.github.com/repos/technorama-ssc/you-decide/contents/";

const container = document.getElementById("dynamic-content");
const excludedDirs = new Set(["00 prototype workshop"]);

function isVisibleNumberedDir(name) {
    return /^\d/.test(name) && !excludedDirs.has(name.toLowerCase());
}

// -------------------------
// Helper: Bildpfade korrigieren
// -------------------------
function normalizeImageUrl(url) {
    if (isLocal) {
        // Lokal: Konvertiere GitHub URLs zu relativen Pfaden
        if (url.includes("raw.githubusercontent.com")) {
            // Extrahiere den Pfad aus der GitHub URL
            // https://raw.githubusercontent.com/technorama-ssc/you-decide/main/01%20exhibits/...
            const match = url.match(/main\/(.*)/);
            if (match) {
                return decodeURIComponent(match[1]);
            }
        }
        // Schon ein relativer Pfad - behalte ihn bei
        return url;
    } else {
        // Production: Konvertiere relative Pfade zu GitHub URLs
        if (!url.startsWith("http")) {
            return `https://raw.githubusercontent.com/technorama-ssc/you-decide/main/${url}`;
        }
        return url;
    }
}

// -------------------------
// Helper: Base64 dekodieren
// -------------------------
function decodeBase64(encoded) {
    try {
        return decodeURIComponent(atob(encoded).split('').map((c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    } catch (e) {
        console.error('Fehler beim Dekodieren:', e);
        return null;
    }
}

// -------------------------
// GitHub API Header mit Token
// -------------------------
const getGithubHeaders = () => {
    if (isLocal) return {};

    if (typeof GITHUB_TOKEN === 'undefined') {
        console.warn('GITHUB_TOKEN ist nicht definiert - verwende unauthentifizierte Requests');
        return {
            'Accept': 'application/vnd.github.v3+json'
        };
    }
    return {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
    };
};

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
            // EXHIBITS: gelber Hintergrund wie gewuenscht
            wrapper.style.backgroundColor = isExhibits ? "#eaff00" : "#eaff00";
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

                let displayName;
                if (zipFile.name.toLowerCase() === "content_youdecide_exhibition.zip") {
                    displayName = "Exhibition Graphics Kit";
                } else {
                    let parts = zipFile.name.replace(/\.zip$/i, "").split("_");
                    displayName =
                        parts.length >= 2
                            ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + " " +
                            parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1)
                            : zipFile.name.replace(/\.zip$/i, "");
                }

                link.textContent = displayName;

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
                    imgEl.src = normalizeImageUrl(imgUrl);
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
                    
                    // Verschachtelte Subfolder-Titel klickbar machen
                    // (Entfernt - werden jetzt wie normale Subfolder behandelt)
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
}

// -------------------------
// README aus Ordner laden
// -------------------------
async function loadReadmeFromFolder(url) {
    try {
        console.log('📥 Laden README von:', url);
        const folderResponse = await fetch(url, { headers: getGithubHeaders() });
        if (!folderResponse.ok) {
            console.warn(`⚠️ Fehler beim Laden: ${folderResponse.status} ${folderResponse.statusText}`);
            return null;
        }

        const folderContent = await folderResponse.json();
        if (!Array.isArray(folderContent)) return null;

        const readme = folderContent.find(f => f.name.toLowerCase() === "readme.md");
        if (!readme) return null;

        // Nutze GitHub API um Inhalt zu fetchen (base64 kodiert)
        const readmeResponse = await fetch(readme.url, { headers: getGithubHeaders() });
        if (!readmeResponse.ok) return null;

        const readmeData = await readmeResponse.json();
        const md = decodeBase64(readmeData.content);
        if (!md) return null;

        const lines = md.split("\n");

        if (!lines[0].startsWith("#")) return null;

        return {
            title: lines[0].replace(/^#\s*/, ""),
            content: lines.slice(1).join("\n")
        };
    } catch (err) {
        console.error('❌ Fehler in loadReadmeFromFolder:', err);
        return null;
    }
}

// -------------------------
// Bilder aus Ordner laden (nur JPG)
async function loadImagesFromFolder(url) {
    const folderResponse = await fetch(url, { headers: getGithubHeaders() });
    if (!folderResponse.ok) return [];

    const folderContent = await folderResponse.json();
    if (!Array.isArray(folderContent)) return [];

    return folderContent
        .filter(f => f.type === "file" && /\.(jpe?g|png)$/i.test(f.name))
        .map(f => f.download_url);
}

// -------------------------
// Hauptordner + Unterordner laden
// -------------------------
async function loadFolders() {
    try {
        console.log('🚀 Starte loadFolders()');
        console.log('📍 repoBase:', repoBase);
        console.log('🔑 Token definiert:', typeof GITHUB_TOKEN !== 'undefined');

        const response = await fetch(repoBase, { headers: getGithubHeaders() });

        console.log('✅ Fetch erfolgreich, Status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const items = await response.json();
        console.log('📦 Items gefunden:', items.length);

        for (const item of items) {
            if (item.type !== "dir") continue;
            if (!isVisibleNumberedDir(item.name)) continue;

            const folderResp = await fetch(item.url, { headers: getGithubHeaders() });
            if (!folderResp.ok) continue;

            const folderContent = await folderResp.json();
            if (!Array.isArray(folderContent)) continue;

            const readme = folderContent.find(f => f.name.toLowerCase() === "readme.md");
            if (!readme) continue;

            // Nutze GitHub API um Inhalt zu fetchen (base64 kodiert)
            const readmeResponse = await fetch(readme.url, { headers: getGithubHeaders() });
            if (!readmeResponse.ok) continue;

            const readmeData = await readmeResponse.json();
            const md = decodeBase64(readmeData.content);
            if (!md) continue;

            const lines = md.split("\n");

            const titleLine = lines[0].startsWith("#")
                ? lines[0].replace(/^#\s*/, "")
                : "KEIN TITEL";

            const content = lines.slice(1).join("\n");
            const zipFile = folderContent.find(f => f.name.toLowerCase().endsWith(".zip"));

            // Bilder Hauptordner
            const images = await loadImagesFromFolder(item.url);

            // Unterordner sammeln
            let subHtml = "";
            const subfolderImages = [];

            for (const sub of folderContent) {
                if (sub.type !== "dir") continue;
                if (!isVisibleNumberedDir(sub.name)) continue;
                if (item.name.toLowerCase() === "000_do not press" && ["00_findings", "01_libet experiment"].includes(sub.name)) continue;

                const subData = await loadReadmeFromFolder(sub.url);
                if (!subData) continue;

                subHtml += `
                    <div class="subfolder-block">
                        <h2 class="subfolder-title">${subData.title}</h2>
                        <div class="subfolder-text">
                            ${marked.parse(subData.content)}
                        </div>
                    </div>
                `;

                // Bilder Unterordner
                const imgs = await loadImagesFromFolder(sub.url);
                subfolderImages.push(imgs);
            }

            createAccordion(titleLine, content, zipFile, subHtml, images, subfolderImages);
        }

    } catch (err) {
        console.error('❌ Fehler beim Laden der Inhalte:');
        console.error('Message:', err.message);
        console.error('Stack:', err.stack);
        console.error('Full Error:', err);
        container.innerHTML = `<p style='color:red'>❌ Fehler beim Laden: ${err.message}</p>`;
    }
}

// -------------------------
// Statischen Content laden (Fallback für GitHub 403)
// -------------------------
async function loadStaticContent() {
    try {
        console.log('📄 Versuche content.json zu laden...');
        const response = await fetch(`content.json?cb=${Date.now()}`);

        if (!response.ok) {
            console.warn('⚠️ content.json nicht gefunden oder Fehler:', response.status);
            return false;
        }

        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
            console.warn('⚠️ content.json ist leer oder ungültig');
            return false;
        }

        console.log('✅ Statischen Content geladen:', data.length, 'Einträge');

        for (const item of data) {
            const { title, content, zipFile, images, subsections } = item;

            // Subsections HTML bauen
            let subHtml = "";
            let subfolderImages = [];

            if (subsections && Array.isArray(subsections)) {
                for (const sub of subsections) {
                    subHtml += `
                        <div class="subfolder-block">
                            <h2 class="subfolder-title">${sub.title}</h2>
                            <div class="subfolder-text">
                                ${marked.parse(sub.content)}
                    `;
                    
                    // Wenn es verschachtelte Subsections gibt (z.B. Libet Experiment unter Do not Press)
                    if (sub.subsections && Array.isArray(sub.subsections) && sub.subsections.length > 0) {
                        for (const subsub of sub.subsections) {
                            subHtml += `
                                <div class="nested-subfolder-block">
                                    <h2 class="nested-subfolder-title">${subsub.title}</h2>
                                    <div class="nested-subfolder-content">
                                        ${marked.parse(subsub.content)}
                            `;
                            // Bilder von nested subsections
                            if (subsub.images && subsub.images.length > 0) {
                                subsub.images.forEach(imgUrl => {
                                    subHtml += `<img src="${imgUrl}" style="max-width:600px;height:auto;" class="nested-subfolder-img">`;
                                });
                            }
                            subHtml += `
                                    </div>
                                </div>
                            `;
                        }
                    }
                    
                    subHtml += `
                            </div>
                        </div>
                    `;
                    subfolderImages.push(sub.images || []);
                }
            }

            createAccordion(title, content, zipFile, subHtml, images, subfolderImages);
        }
        return true;

    } catch (err) {
        console.error('❌ Fehler in loadStaticContent:', err);
        return false;
    }
}

// Starte Ladevorgang
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        console.log('🚀 Starting App...');

        // 1. Versuch: Statisch laden
        const success = await loadStaticContent();

        // 2. Versuch: GitHub API (Fallback)
        if (!success) {
            console.log('🔄 Fallback auf GitHub API...');
            console.log('GITHUB_TOKEN defined?', typeof GITHUB_TOKEN !== 'undefined');
            loadFolders();
        } else {
            console.log('✨ App gestartet mit statischem Content.');
        }
    }, 100);
});
