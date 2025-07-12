using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace PokemonGame.API
{
    public class TestUserCreation
    {
        private readonly ILogger<TestUserCreation> _logger;

        public TestUserCreation(ILogger<TestUserCreation> logger)
        {
            _logger = logger;
        }

        [Function("TestUserCreation")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "test/user-creation")] HttpRequestData req)
        {
            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "application/json");
            response.Headers.Add("Access-Control-Allow-Origin", "*");

            try
            {
                // Get configuration
                var dataverseUrl = Environment.GetEnvironmentVariable("DATAVERSE_URL") ?? "https://pokemongame.crm4.dynamics.com";
                var clientId = Environment.GetEnvironmentVariable("DATAVERSE_CLIENT_ID");
                var clientSecret = Environment.GetEnvironmentVariable("DATAVERSE_CLIENT_SECRET");
                var tenantId = Environment.GetEnvironmentVariable("DATAVERSE_TENANT_ID");

                var result = new
                {
                    timestamp = DateTime.UtcNow,
                    configuration = new
                    {
                        dataverseUrl = dataverseUrl,
                        hasClientId = !string.IsNullOrEmpty(clientId),
                        hasClientSecret = !string.IsNullOrEmpty(clientSecret),
                        hasTenantId = !string.IsNullOrEmpty(tenantId),
                        clientIdPreview = clientId?.Substring(0, Math.Min(8, clientId.Length)) + "...",
                        tenantIdPreview = tenantId?.Substring(0, Math.Min(8, tenantId.Length)) + "..."
                    },
                    status = "Configuration check complete"
                };

                await response.WriteStringAsync(JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true }));
                return response;
            }
            catch (Exception ex)
            {
                var errorResult = new
                {
                    error = ex.Message,
                    timestamp = DateTime.UtcNow
                };

                await response.WriteStringAsync(JsonSerializer.Serialize(errorResult));
                return response;
            }
        }
    }
}
