using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Web;

namespace PokemonGame.Api
{
    public class ServeGame
    {
        private readonly ILogger _logger;

        public ServeGame(ILoggerFactory loggerFactory)
        {
            _logger = loggerFactory.CreateLogger<ServeGame>();
        }

        [Function("ServeGame")]
        public HttpResponseData Run([HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req)
        {
            _logger.LogInformation("ServeGame function received request");

            // Get authentication parameters from query string
            var query = HttpUtility.ParseQueryString(req.Url.Query);
            var token = query["token"];
            var email = query["email"];
            var name = query["name"];

            _logger.LogInformation($"ServeGame - Token: {(string.IsNullOrEmpty(token) ? "Missing" : "Present")}, Email: {email}");

            // Create redirect HTML page that sends user to localhost with auth data
            var redirectHtml = $@"<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Redirecting to Pokemon Game...</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }}
        .loading {{
            font-size: 24px;
            margin-bottom: 20px;
        }}
        .details {{
            margin-top: 30px;
            font-size: 14px;
            opacity: 0.8;
        }}
    </style>
</head>
<body>
    <div class=""loading"">🎮 Redirecting to Pokemon Game...</div>
    <div>Please wait while we complete your login...</div>
    
    <div class=""details"" id=""details""></div>
    
    <script>
        console.log('SERVEGAME: Page loaded, processing authentication...');
        
        // Get the current URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const email = urlParams.get('email');
        const name = urlParams.get('name');
        
        console.log('SERVEGAME: Token:', token);
        console.log('SERVEGAME: Email:', email);
        console.log('SERVEGAME: Name:', name);
        
        document.getElementById('details').innerHTML = `
            <p>Token received: ${{token ? 'Yes' : 'No'}}</p>
            <p>Email: ${{email || 'Not provided'}}</p>
            <p>Name: ${{name || 'Not provided'}}</p>
        `;
        
        if (token && email) {{
            console.log('SERVEGAME: Valid authentication data found, redirecting to localhost...');
            
            // Build the localhost URL with the authentication data
            const localhostUrl = `http://localhost:8080/index.html?token=${{encodeURIComponent(token)}}&email=${{encodeURIComponent(email)}}&name=${{encodeURIComponent(name || '')}}`;
            
            console.log('SERVEGAME: Redirecting to:', localhostUrl);
            
            // Give user a moment to see the message, then redirect
            setTimeout(() => {{
                window.location.href = localhostUrl;
            }}, 2000);
            
        }} else {{
            console.error('SERVEGAME: Missing authentication data');
            document.querySelector('.loading').textContent = '❌ Missing Authentication Data';
            document.querySelector('body > div').textContent = 'Please try logging in again.';
            
            setTimeout(() => {{
                window.location.href = 'http://localhost:8080';
            }}, 5000);
        }}
    </script>
</body>
</html>";

            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "text/html; charset=utf-8");
            response.WriteString(redirectHtml);

            return response;
        }
    }
}
