#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 12000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('X-Frame-Options', 'ALLOWALL')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

if __name__ == "__main__":
    os.chdir('/workspace')
    with socketserver.TCPServer(("0.0.0.0", PORT), MyHTTPRequestHandler) as httpd:
        print(f"Serving Pomodoro Timer at http://0.0.0.0:{PORT}")
        print(f"Access it at: https://work-1-fzqdpwkmlcexhnmj.prod-runtime.all-hands.dev")
        httpd.serve_forever()