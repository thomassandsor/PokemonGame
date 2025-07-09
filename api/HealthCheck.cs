using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace PokemonGame.API
{
    public static class HealthCheck
    {
        [FunctionName("HealthCheck")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "health")] HttpRequest req,
            ILogger log)
        {
            try
            {
                log.LogInformation("Health check endpoint called");
                
                // Get configuration from environment variables (without exposing secrets)
                var dataverseUrl = Environment.GetEnvironmentVariable("DATAVERSE_URL");
                var clientId = Environment.GetEnvironmentVariable("DATAVERSE_CLIENT_ID");
                var tenantId = Environment.GetEnvironmentVariable("DATAVERSE_TENANT_ID");
                var hasClientSecret = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("DATAVERSE_CLIENT_SECRET"));
                
                var diagnostics = new
                {
                    status = "healthy",
                    timestamp = DateTime.UtcNow,
                    environment = new
                    {
                        dataverseUrl = !string.IsNullOrEmpty(dataverseUrl) ? "✅ Set" : "❌ Missing",
                        clientId = !string.IsNullOrEmpty(clientId) ? "✅ Set" : "❌ Missing",
                        tenantId = !string.IsNullOrEmpty(tenantId) ? "✅ Set" : "❌ Missing",
                        clientSecret = hasClientSecret ? "✅ Set" : "❌ Missing"
                    },
                    values = new
                    {
                        dataverseUrl = dataverseUrl,
                        clientId = clientId,
                        tenantId = tenantId
                        // Never expose the client secret
                    }
                };
                
                log.LogInformation($"Health check completed. Environment status: URL={!string.IsNullOrEmpty(dataverseUrl)}, ClientId={!string.IsNullOrEmpty(clientId)}, TenantId={!string.IsNullOrEmpty(tenantId)}, Secret={hasClientSecret}");
                
                return new OkObjectResult(diagnostics);
            }
            catch (Exception ex)
            {
                log.LogError($"Health check failed: {ex.Message}");
                return new StatusCodeResult(500);
            }
        }
    }
}
