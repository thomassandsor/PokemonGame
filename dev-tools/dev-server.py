#!/usr/bin/env python3
"""
Quick Local Pokemon Game Development Server
Serves static files and bypasses CORS by proxying API calls
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import sys
import os
from urllib.parse import urlparse, parse_qs

class PokemonDevHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers for all responses
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        # Proxy API calls to Azure Functions
        if parsed_path.path.startswith('/api/'):
            self.proxy_to_azure(parsed_path)
        else:
            # Serve static files
            super().do_GET()
    
    def proxy_to_azure(self, parsed_path):
        try:
            # Check if local Azure Functions are running
            local_functions_url = "http://localhost:7071"
            try:
                import urllib.request
                req = urllib.request.Request(f"{local_functions_url}/api/")
                with urllib.request.urlopen(req, timeout=2) as response:
                    # Local functions are running - use them
                    azure_url = f"{local_functions_url}{self.path}"
                    print(f"PROXY [LOCAL]: {self.path} -> {azure_url}")
            except:
                # Local functions not running - fallback to live Azure
                azure_url = f"https://pokemongame-functions-2025.azurewebsites.net{self.path}"
                print(f"PROXY [LIVE]: {self.path} -> {azure_url}")
            
            # Make request to Azure
            req = urllib.request.Request(azure_url)
            
            with urllib.request.urlopen(req) as response:
                # Send response back to client
                self.send_response(response.getcode())
                
                # Copy headers from Azure response
                for header, value in response.headers.items():
                    if header.lower() not in ['content-encoding', 'transfer-encoding']:
                        self.send_header(header, value)
                
                self.end_headers()
                
                # Copy response body
                self.wfile.write(response.read())
                
        except Exception as e:
            print(f"PROXY ERROR: {e}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error_response = json.dumps({"error": str(e)}).encode()
            self.wfile.write(error_response)

def main():
    PORT = 8080
    
    # Change to the project root directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)  # Go up one level from dev-tools
    os.chdir(project_root)
    
    print(f"🎮 Pokemon Game Development Server")
    print(f"📁 Serving from: {project_root}")
    print(f"🌐 URL: http://localhost:{PORT}")
    print(f"🔄 Proxying API calls to Azure Functions")
    print(f"⚡ Live reload: Just refresh your browser after changes!")
    print()
    
    with socketserver.TCPServer(("", PORT), PokemonDevHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        print("Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped")

if __name__ == "__main__":
    main()
