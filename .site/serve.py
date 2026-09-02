import http.server
import socketserver
import json
import os
import mimetypes
import re

PORT = 8000
DIRECTORY = "docs"
EXCLUDED_DIRS = {"00 prototype workshop"}

def is_numbered_visible_entry(name):
    return re.match(r'^\d', name) and name.lower() not in EXCLUDED_DIRS

class DevRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Serve from current directory (Repo Root)
        super().__init__(*args, directory=os.getcwd(), **kwargs)

    def do_GET(self):
        # Redirect root to /docs/
        if self.path == "/":
            self.send_response(301)
            self.send_header("Location", "/docs/")
            self.end_headers()
            return

        # Handle API requests (Mocking GitHub API)
        if self.path.startswith("/repos/technorama-ssc/you-decide/contents/"):
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            # Extract the relative path from the URL
            # Expected URL: /repos/technorama-ssc/you-decide/contents/<path>
            api_prefix = "/repos/technorama-ssc/you-decide/contents/"
            rel_path = self.path[len(api_prefix):]
            
            # Remove query parameters if any
            if "?" in rel_path:
                rel_path = rel_path.split("?")[0]
            
            # Unquote the path to handle spaces etc (e.g. %20 -> " ")
            from urllib.parse import unquote
            rel_path = unquote(rel_path)

            full_path = os.path.join(os.getcwd(), rel_path)
            
            # Security check: ensure we don't escape the repo directory
            if not os.path.abspath(full_path).startswith(os.getcwd()):
                 self.wfile.write(json.dumps([]).encode("utf-8"))
                 return

            response_data = []
            
            if os.path.isdir(full_path):
                try:
                    for entry in os.listdir(full_path):
                        if entry.startswith("."): continue # Skip hidden files
                        
                        # Only include folders/files that start with a number
                        if not is_numbered_visible_entry(entry):
                            continue
                        
                        entry_path = os.path.join(full_path, entry)
                        is_dir = os.path.isdir(entry_path)
                        
                        # Construct clean path relative to repo root
                        clean_path = f"{rel_path}/{entry}" if rel_path else entry
                        while "//" in clean_path:
                             clean_path = clean_path.replace("//", "/")
                        
                        # Safe URL construction
                        # Note: We must NOT replace // in http://
                        base_url = f"http://localhost:{PORT}"
                        
                        item = {
                            "name": entry,
                            "path": clean_path,
                            "sha": "fake-sha",
                            "size": os.path.getsize(entry_path) if not is_dir else 0,
                            "url": f"{base_url}/repos/technorama-ssc/you-decide/contents/{clean_path}",
                            "html_url": f"{base_url}/blob/main/{clean_path}",
                            "git_url": "",
                            "download_url": f"{base_url}/{clean_path}",
                            "type": "dir" if is_dir else "file",
                            "_links": {
                                "self": "",
                                "git": "",
                                "html": ""
                            }
                        }
                        response_data.append(item)
                    self.wfile.write(json.dumps(response_data).encode("utf-8"))
                    return
                except Exception as e:
                    print(f"Error listing directory {full_path}: {e}")
                    self.send_error(500, f"Error listing directory: {e}")
                    return

            elif os.path.isfile(full_path):
                # Handle file API request -> return JSON with base64 content
                try:
                    import base64
                    with open(full_path, "rb") as f:
                        content = base64.b64encode(f.read()).decode("utf-8")
                    
                    # Clean path for download url (remove leading slash if any)
                    clean_download_path = rel_path.lstrip("/")
                    
                    response_data = {
                        "name": os.path.basename(full_path),
                        "path": rel_path,
                        "sha": "fake-sha",
                        "size": os.path.getsize(full_path),
                        "url": self.path,
                        "html_url": "",
                        "git_url": "",
                        "download_url": f"http://localhost:{PORT}/{clean_download_path}",
                        "type": "file",
                        "content": content,
                        "encoding": "base64",
                        "_links": {}
                    }
                    self.wfile.write(json.dumps(response_data).encode("utf-8"))
                    return
                except Exception as e:
                    print(f"Error reading file {full_path}: {e}")
                    self.send_error(500, f"Error reading file: {e}")
                    return

        # Handle normal file requests
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

print(f"Starting local development server at http://localhost:{PORT}")
print(f"Open http://localhost:{PORT}/docs/ to view the website.")

# We serve the current directory (Repo Root) so we can access '00 you decide' etc.
# But the website is in 'docs'.
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer(("", PORT), DevRequestHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
