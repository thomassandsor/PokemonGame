#!/usr/bin/env python3
"""
Simple HTTP server with Dataverse proxy for Pokemon Game
Serves static files and proxies Dataverse requests to avoid CORS issues
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
from urllib.parse import urlparse, parse_qs

class DataverseProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Parse the URL
        parsed_path = urlparse(self.path)
        
        # Check if this is a dataverse proxy request
        if parsed_path.path.startswith('/api/dataverse/'):
            self.handle_dataverse_proxy(parsed_path)
        else:
            # Serve static files normally
            super().do_GET()
    
    def handle_dataverse_proxy(self, parsed_path):
        try:
            # Remove '/api/' from the path to get the dataverse path
            dataverse_path = parsed_path.path[5:]  # Remove '/api/'
            
            # Build the target URL
            target_url = f"https://pokemongame-functions-2025.azurewebsites.net/api/{dataverse_path}"
            if parsed_path.query:
                target_url += f"?{parsed_path.query}"
            
            print(f"Proxying request to: {target_url}")
            
            # Make the request to Azure Functions
            req = urllib.request.Request(target_url)
            req.add_header('User-Agent', 'Pokemon-Game-Proxy/1.0')
            
            with urllib.request.urlopen(req) as response:
                data = response.read()
                
                # Send CORS headers and the response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
                self.end_headers()
                
                self.wfile.write(data)
                
        except Exception as e:
            print(f"Error proxying request: {e}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            error_response = json.dumps({
                'error': 'Proxy error',
                'message': str(e)
            })
            self.wfile.write(error_response.encode())
    
    def do_OPTIONS(self):
        # Handle CORS preflight for proxy requests
        if self.path.startswith('/api/dataverse/'):
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            self.send_header('Access-Control-Max-Age', '86400')
            self.end_headers()
        else:
            super().do_OPTIONS()

if __name__ == "__main__":
    PORT = 8080
    Handler = DataverseProxyHandler
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Pokemon Game server with Dataverse proxy running at http://localhost:{PORT}")
        print("Proxy endpoints available at: /api/dataverse/*")
        httpd.serve_forever()
