import os
import json
import re
from urllib.parse import quote

# Konfiguration
ROOT_DIR = os.getcwd()
DOCS_DIR = os.path.join(ROOT_DIR, "docs")
OUTPUT_FILE = os.path.join(DOCS_DIR, "content.json")

# Bild-Endungen
IMAGE_EXTENSIONS = ('.jpg', '.jpeg', '.png')

def parse_readme(path):
    """Liest eine README.md und gibt Titel und Inhalt zurück."""
    if not os.path.exists(path):
        return None, None
    
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    if not lines:
        return None, None

    title = "KEIN TITEL"
    if lines[0].startswith('#'):
        title = lines[0].strip('#').strip()
        content = "".join(lines[1:])
    else:
        content = "".join(lines)
        
    return title, content

def find_images(directory):
    """Findet Bilder im Verzeichnis (nicht rekursiv)."""
    images = []
    if not os.path.exists(directory):
        return []
        
    for f in os.listdir(directory):
        if f.lower().endswith(IMAGE_EXTENSIONS):
            # Relativer Pfad von docs aus gesehen für die Webseite
            rel_path_from_root = os.path.relpath(os.path.join(directory, f), ROOT_DIR)
            # Web path: ../00_folder/image.jpg (URL-encoded for spaces)
            web_path = "../" + quote(rel_path_from_root.replace("\\", "/"), safe="/")
            images.append(web_path)
    return sorted(images)

def scan_repository():
    data = []
    
    # Sortierte Liste der Verzeichnisse im Root
    dirs = sorted([d for d in os.listdir(ROOT_DIR) if os.path.isdir(os.path.join(ROOT_DIR, d))])
    
    for d in dirs:
        # Nur Ordner die mit Ziffern starten (z.B. "00 you decide")
        if not re.match(r'^\d', d):
            continue
            
        full_path = os.path.join(ROOT_DIR, d)
        readme_path = os.path.join(full_path, "README.md")
        
        title, content = parse_readme(readme_path)
        if not title:
            print(f"Skipping {d}: No README found")
            continue
            
        print(f"Processing {d}...")
        
        # Zip finden
        zip_file = None
        for f in os.listdir(full_path):
            if f.lower().endswith('.zip'):
                rel_path_from_root = os.path.relpath(os.path.join(full_path, f), ROOT_DIR)
                web_path = "../" + quote(rel_path_from_root.replace("\\", "/"), safe="/")
                
                zip_file = {
                    "download_url": web_path,
                    "name": f
                }
                break
        
        # Bilder im Hauptordner
        images = find_images(full_path)
        
        # Unterordner scannen
        sub_items = []
        sub_dirs = sorted([sd for sd in os.listdir(full_path) if os.path.isdir(os.path.join(full_path, sd))])
        
        subfolder_images_list = []
        subfolders_html = ""
        
        for sd in sub_dirs:
            # Auch Unterordner sollten mit Ziffern starten oder relevant sein? 
            # Im Script war Logic: if (!/^\d/.test(sub.name)) continue;
            if not re.match(r'^\d', sd):
                continue

            sub_full_path = os.path.join(full_path, sd)
            sub_readme = os.path.join(sub_full_path, "README.md")
            
            sub_title, sub_content = parse_readme(sub_readme)
            if not sub_title:
                continue
                
            sub_images = find_images(sub_full_path)
            
            # Scan für Unter-Subsections (z.B. 01_libet experiment unter 000_do not press)
            sub_subsections = []
            sub_sub_dirs = sorted([ssd for ssd in os.listdir(sub_full_path) if os.path.isdir(os.path.join(sub_full_path, ssd))])
            
            for ssd in sub_sub_dirs:
                if not re.match(r'^\d', ssd):
                    continue
                
                sub_sub_full_path = os.path.join(sub_full_path, ssd)
                sub_sub_readme = os.path.join(sub_sub_full_path, "README.md")
                
                sub_sub_title, sub_sub_content = parse_readme(sub_sub_readme)
                if not sub_sub_title:
                    continue
                
                sub_sub_images = find_images(sub_sub_full_path)
                
                sub_sub_item = {
                    "title": sub_sub_title,
                    "content": sub_sub_content,
                    "images": sub_sub_images
                }
                sub_subsections.append(sub_sub_item)
            
            # Wir speichern die Rohdaten, das JS baut das HTML
            sub_item = {
                "title": sub_title,
                "content": sub_content,
                "images": sub_images,
                "subsections": sub_subsections
            }
            sub_items.append(sub_item)

        item = {
            "title": title,
            "content": content,
            "zipFile": zip_file,
            "images": images,
            "subsections": sub_items
        }
        data.append(item)
        
    return data

if __name__ == "__main__":
    print("Starte Scan...")
    content_data = scan_repository()
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(content_data, f, indent=2, ensure_ascii=False)
        
    print(f"Fertig! Datei erstellt: {OUTPUT_FILE}")
    print(f"Gefundene Hauptkategorien: {len(content_data)}")
