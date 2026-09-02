"""Build the site and serve it locally.

    python .site/serve.py            # build + serve on http://localhost:8000
    python .site/serve.py --no-build # serve the last build only
"""
import http.server
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(HERE, "dist")
PORT = 8000

if "--no-build" not in sys.argv:
    subprocess.run([sys.executable, os.path.join(HERE, "build.py")], check=True)

if not os.path.isdir(DIST):
    sys.exit("No build found in .site/dist - run python .site/build.py first.")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


print(f"Serving {DIST} at http://localhost:{PORT}/  (Ctrl+C to stop)")
with http.server.ThreadingHTTPServer(("", PORT), Handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
