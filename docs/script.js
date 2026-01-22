function createBlock(titleText, contentMarkdown, zipFile, isSubfolder=false) {
    // Block Wrapper
    const block = document.createElement("div");
    block.className = "folder-block";

    // Titel
    const title = document.createElement(isSubfolder ? "h2" : "h1");
    title.className = isSubfolder ? "subfolder-title" : "accordion";
    title.textContent = titleText.toUpperCase();
    block.appendChild(title);

    // Panel / Inhalt
    const panel = document.createElement("div");
    panel.className = "panel-content";
    panel.style.display = isSubfolder ? "block" : "none"; // Unterordner erst beim Klick sichtbar
    panel.innerHTML = marked.parse(contentMarkdown);
    block.appendChild(panel);

    // ZIP Download
    if(zipFile){
        const dl = document.createElement("div");
        dl.className = "download-link";
        const textSpan = document.createElement("span");
        textSpan.textContent = "Download"; 
        textSpan.style.fontWeight = "normal";
        const link = document.createElement("a");
        link.href = zipFile.download_url;
        let parts = zipFile.name.replace(/\.zip$/i, "").split("_");
        let displayName = parts.length >= 2 ? 
            parts[0].charAt(0).toUpperCase()+parts[0].slice(1)+" "+parts[parts.length-1].charAt(0).toUpperCase()+parts[parts.length-1].slice(1)
            : zipFile.name.replace(/\.zip$/i,"");
        link.textContent = displayName;
        link.target = "_blank";
        dl.appendChild(textSpan);
        dl.appendChild(link);
        panel.appendChild(dl);
    }

    container.appendChild(block);

    // Linie außerhalb des Blocks
    const line = document.createElement("div");
    line.className = "separator-line";
    container.appendChild(line);

    return { block, panel };
}
