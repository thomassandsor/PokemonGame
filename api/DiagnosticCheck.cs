using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text.Json;

namespace PokemonGame.Api
{
    public class DiagnosticCheck
    {
        private readonly ILogger _logger;

        public DiagnosticCheck(ILoggerFactory loggerFactory)
        {
            _logger = loggerFactory.CreateLogger<DiagnosticCheck>();
        }

        [Function("DiagnosticCheck")]
        public HttpResponseData Run([HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req)
        {
            _logger.LogInformation("DiagnosticCheck endpoint called");

            var diagnostics = new
            {
                message = "Diagnostic Check for OAuth Configuration",
                environmentVariables = new
                {
                    MICROSOFT_CLIENT_ID = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("MICROSOFT_CLIENT_ID")) ? "✅ Set" : "❌ Missing",
                    MICROSOFT_CLIENT_SECRET = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("MICROSOFT_CLIENT_SECRET")) ? "✅ Set" : "❌ Missing",
                    MICROSOFT_REDIRECT_URI = Environment.GetEnvironmentVariable("MICROSOFT_REDIRECT_URI") ?? "❌ Missing",
                    MICROSOFT_TENANT_ID = Environment.GetEnvironmentVariable("MICROSOFT_TENANT_ID") ?? "❌ Missing",
                    GAME_URL = Environment.GetEnvironmentVariable("GAME_URL") ?? "❌ Missing",
                    
                    // Also check Dataverse (for comparison)
                    DATAVERSE_CLIENT_ID = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("DATAVERSE_CLIENT_ID")) ? "✅ Set" : "❌ Missing",
                    DATAVERSE_URL = Environment.GetEnvironmentVariable("DATAVERSE_URL") ?? "❌ Missing"
                },
                timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss UTC")
            };

            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "application/json");
            response.Headers.Add("Access-Control-Allow-Origin", "*");
            
            var jsonString = JsonSerializer.Serialize(diagnostics, new JsonSerializerOptions 
            { 
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = true
            });
            
            response.WriteString(jsonString);
            return response;
        }
    }
}
