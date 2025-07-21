#!/usr/bin/env python3
"""
Pokemon Game Development Server with Origin-Based Routing
Routes API calls based on the request origin:
- localhost:8080 → local Azure Functions (localhost:7071)
- live domain → live Azure Functions
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import sys
import os
from urllib.parse import urlparse, parse_qs

# Configuration
LOCAL_FUNCTIONS_URL = "http://localhost:7071"
LIVE_AZURE_URL = "https://pokemongame-functions-2025.azurewebsites.net"

def check_local_functions_running():
    """
    Check if local Azure Functions are actually running
    """
    try:
        req = urllib.request.Request(f"{LOCAL_FUNCTIONS_URL}/api/")
        with urllib.request.urlopen(req, timeout=2) as response:
            return True
    except:
        return False

class PokemonOriginDevHandler(http.server.SimpleHTTPRequestHandler):
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
        
        # Proxy API calls to Azure Functions (local or live based on origin)
        if parsed_path.path.startswith('/api/'):
            self.proxy_to_azure(parsed_path)
        else:
            # Serve static files
            super().do_GET()

    def do_POST(self):
        parsed_path = urlparse(self.path)
        
        # Proxy API calls to Azure Functions (local or live based on origin)
        if parsed_path.path.startswith('/api/'):
            self.proxy_to_azure(parsed_path)
        else:
            # Handle non-API POST requests
            super().do_POST()
    
    def proxy_to_azure(self, parsed_path):
        try:
            # Determine routing based on request origin/host
            host_header = self.headers.get('Host', '')
            origin_header = self.headers.get('Origin', '')
            referer_header = self.headers.get('Referer', '')
            
            # Check if request is coming from localhost
            is_localhost_request = (
                'localhost' in host_header or 
                '127.0.0.1' in host_header or
                'localhost' in origin_header or
                'localhost' in referer_header
            )
            
            if is_localhost_request:
                # Check if local functions are running
                if check_local_functions_running():
                    api_target = LOCAL_FUNCTIONS_URL
                    mode = "LOCAL"
                else:
                    print(f"⚠️  Local Azure Functions not running on {LOCAL_FUNCTIONS_URL}")
                    print(f"🔄 Falling back to LIVE Azure for this request")
                    api_target = LIVE_AZURE_URL
                    mode = "LIVE (fallback)"
            else:
                # Request from live domain - use live Azure
                api_target = LIVE_AZURE_URL
                mode = "LIVE"
            
            azure_url = f"{api_target}{self.path}"
            print(f"PROXY [{mode}]: {self.path} -> {azure_url}")
            print(f"  📍 Origin: {origin_header or 'none'}, Host: {host_header}")
            
            # Create request with headers and body
            headers = {}
            for header in self.headers:
                if header.lower() not in ['host', 'connection']:
                    headers[header] = self.headers[header]
            
            # Get request body for POST requests
            content_length = int(self.headers.get('Content-Length', 0))
            request_body = self.rfile.read(content_length) if content_length > 0 else None
            
            # Create urllib request
            req = urllib.request.Request(
                azure_url, 
                data=request_body,
                headers=headers,
                method=self.command
            )
            
            try:
                with urllib.request.urlopen(req, timeout=30) as response:
                    # Send response back to client
                    self.send_response(response.getcode())
                    
                    # Copy headers from Azure response
                    for header, value in response.headers.items():
                        if header.lower() not in ['content-encoding', 'transfer-encoding']:
                            self.send_header(header, value)
                    
                    self.end_headers()
                    
                    # Copy response body
                    self.wfile.write(response.read())
                    
            except urllib.error.HTTPError as e:
                # Handle HTTP errors from Azure
                self.send_response(e.code)
                for header, value in e.headers.items():
                    if header.lower() not in ['content-encoding', 'transfer-encoding']:
                        self.send_header(header, value)
                self.end_headers()
                
                if e.fp:
                    self.wfile.write(e.fp.read())
                    
        except Exception as e:
            print(f"PROXY ERROR: {e}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error_response = json.dumps({"error": str(e), "mode": "origin-based routing"}).encode()
            self.wfile.write(error_response)

def main():
    PORT = 8080
    
    # Change to the project root directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)  # Go up one level from dev-tools
    os.chdir(project_root)
    
    print(f"🎮 Pokemon Game Origin-Based Development Server")
    print(f"📁 Serving from: {project_root}")
    print(f"🌐 URL: http://localhost:{PORT}")
    print()
    
    # Check if local Azure Functions are running
    local_running = check_local_functions_running()
    
    print(f"🔄 Routing Logic:")
    print(f"  📍 localhost:8080 requests → {'✅ Local Functions (localhost:7071)' if local_running else '⚠️  Local Functions (not running, will fallback to live)'}")
    print(f"  🌍 Live domain requests → ☁️  Live Azure Functions")
    
    if not local_running:
        print()
        print(f"💡 To enable local functions: cd api && func start --port 7071")
    
    print(f"⚡ Live reload: Just refresh your browser after changes!")
    print()
    
    with socketserver.TCPServer(("", PORT), PokemonOriginDevHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        print("Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print(f"\n🛑 Server stopped")

if __name__ == "__main__":
    main()
