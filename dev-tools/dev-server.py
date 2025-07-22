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
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, OData-MaxVersion, OData-Version, If-Match')
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
    
    def do_POST(self):
        parsed_path = urlparse(self.path)
        
        # Proxy API calls to Azure Functions
        if parsed_path.path.startswith('/api/'):
            self.proxy_to_azure(parsed_path, method='POST')
        else:
            self.send_response(405)
            self.end_headers()
    
    def do_PATCH(self):
        parsed_path = urlparse(self.path)
        
        # Proxy API calls to Azure Functions
        if parsed_path.path.startswith('/api/'):
            self.proxy_to_azure(parsed_path, method='PATCH')
        else:
            self.send_response(405)
            self.end_headers()
    
    def proxy_to_azure(self, parsed_path, method='GET'):
        try:
            # Check if local Azure Functions are running
            local_functions_url = "http://localhost:7071"
            try:
                import socket
                # Just test if port 7071 is open, don't make HTTP request
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(1)
                result = sock.connect_ex(('localhost', 7071))
                sock.close()
                
                if result == 0:
                    # Port 7071 is open - use local functions
                    azure_url = f"{local_functions_url}{self.path}"
                    print(f"PROXY [LOCAL] {method}: {self.path} -> {azure_url}")
                else:
                    raise Exception("Port 7071 not open")
            except:
                # Local functions not running - fallback to live Azure
                azure_url = f"https://pokemongame-functions-2025.azurewebsites.net{self.path}"
                print(f"PROXY [LIVE] {method}: {self.path} -> {azure_url}")
            
            # Prepare request data
            data = None
            if method in ['POST', 'PATCH', 'PUT']:
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length > 0:
                    data = self.rfile.read(content_length)
            
            # Make request to Azure
            req = urllib.request.Request(azure_url, data=data, method=method)
            
            # Copy headers from client request
            for header_name, header_value in self.headers.items():
                if header_name.lower() not in ['host', 'connection']:
                    req.add_header(header_name, header_value)
            
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
            print(f"PROXY ERROR ({method}): {e}")
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
