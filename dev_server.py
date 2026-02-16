import http.server
import socketserver
import json
import os
import mimetypes

PORT = 8000
DIRECTORY = "docs"

class DevRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
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

            # Map to local file system path
            # The API path is relative to the repo root. 
            # Our local server serves from 'docs', but the repo root contains 'docs'.
            # However, the website content (markdowns, images) seems to be organized within the repo.
            # Let's check where the content actually is.
            # Based on script.js: repoBase = "https://api.github.com/repos/technorama-ssc/you-decide/contents/";
            # This implies the content is at the root of the repo.
            # But we are serving from 'docs'.
            # So if we request "", we are looking at the repo root.
            # If we request "docs", we are looking at 'docs'.
            
            # The current script.js fetches repoBase ("") to list folders like "00 you decide".
            # These folders are siblings of "docs" in the repo root.
            # So we need to access directories UP one level from "docs" if we want to serve the whole repo content via API.
            
            # Let's verify where 'dev_server.py' is located. It is in 'you-decide' (repo root).
            # But the http server serves 'docs' directory for the website html/js.
            # The API needs to serve files from the repo root (current directory of this script).
            
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
                        
                        entry_path = os.path.join(full_path, entry)
                        is_dir = os.path.isdir(entry_path)
                        
                        # Construct the download URL and API URL
                        # Download URL should be accessible via this server if it's inside 'docs', or...
                        # Wait, simpleHTTPRequestHandler only serves 'docs'.
                        # If the content is outside 'docs' (like "00 you decide"), the browser can't fetch it via standard HTTP GET if we restrict root to 'docs'.
                        
                        # Fix: We should probably serve the Root of the repo via HTTP, but open the browser at /docs/index.html
                        # OR, we implement a special handler that serves files from root if requested via specific path.
                        
                        # Actually, looking at the structure:
                        # c:\Users\chene\Documents\you_decide\you-decide\
                        #   docs\ (contains index.html, script.js)
                        #   00 you decide\ (content)
                        #   01 system\
                        
                        # Getting "download_url" right is crucial.
                        # If I request API for "00 you decide", it returns list of files.
                        # One file might be "intro.md".
                        # script.js will try to fetch "download_url".
                        # If download_url works, we are good.
                        
                        # Let's make the HTTP server serve the REPO ROOT (cwd), not just 'docs'.
                        # But then we need to redirect / to /docs/index.html or just tell user to go to /docs/
                        
                        # Let's stick to serving directory=DIRECTORY ('docs') for the main handler? 
                        # NO, because then we can't serve the content files which are siblings of docs.
                        
                        # CHANGED PLAN for DevRequestHandler:
                        # We will serve from CURRENT DIRECTORY (Repo Root).
                        # We will make sure accessing / goes to /docs/index.html
                        
                        item = {
                            "name": entry,
                            "path": rel_path + "/" + entry if rel_path else entry,
                            "sha": "fake-sha",
                            "size": os.path.getsize(entry_path) if not is_dir else 0,
                            "url": f"http://localhost:{PORT}/repos/technorama-ssc/you-decide/contents/{rel_path}/{entry}".replace("//", "/"),
                            "html_url": f"http://localhost:{PORT}/blob/main/{rel_path}/{entry}".replace("//", "/"),
                            "git_url": "",
                            "download_url": f"http://localhost:{PORT}/{rel_path}/{entry}".replace("//", "/"),
                            "type": "dir" if is_dir else "file",
                            "_links": {
                                "self": "",
                                "git": "",
                                "html": ""
                            }
                        }
                        response_data.append(item)
                except Exception as e:
                    print(f"Error listing directory {full_path}: {e}")
            
            self.wfile.write(json.dumps(response_data).encode("utf-8"))
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
