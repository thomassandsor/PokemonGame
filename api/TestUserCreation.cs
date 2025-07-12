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

        [Function("CheckUserExists")]
        public async Task<HttpResponseData> CheckUserExists(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "test/check-user/{email}")] HttpRequestData req,
            string email)
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

                if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret) || string.IsNullOrEmpty(tenantId))
                {
                    var configError = new
                    {
                        error = "Dataverse configuration missing",
                        timestamp = DateTime.UtcNow,
                        hasClientId = !string.IsNullOrEmpty(clientId),
                        hasClientSecret = !string.IsNullOrEmpty(clientSecret),
                        hasTenantId = !string.IsNullOrEmpty(tenantId)
                    };
                    await response.WriteStringAsync(JsonSerializer.Serialize(configError, new JsonSerializerOptions { WriteIndented = true }));
                    return response;
                }

                // Get access token
                var accessToken = await GetDataverseAccessToken(clientId, clientSecret, tenantId, dataverseUrl);
                if (string.IsNullOrEmpty(accessToken))
                {
                    var tokenError = new
                    {
                        error = "Failed to get Dataverse access token",
                        timestamp = DateTime.UtcNow
                    };
                    await response.WriteStringAsync(JsonSerializer.Serialize(tokenError, new JsonSerializerOptions { WriteIndented = true }));
                    return response;
                }

                // Check if user exists
                using var httpClient = new HttpClient();
                var baseUrl = dataverseUrl.Replace("/api/data/v9.2", "");
                var checkUrl = $"{baseUrl}/api/data/v9.2/contacts?$filter=emailaddress1 eq '{email}'&$select=contactid,firstname,emailaddress1,createdon";
                
                var checkRequest = new HttpRequestMessage(HttpMethod.Get, checkUrl);
                checkRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
                checkRequest.Headers.Add("OData-MaxVersion", "4.0");
                checkRequest.Headers.Add("OData-Version", "4.0");
                checkRequest.Headers.Add("Accept", "application/json");

                var checkResponse = await httpClient.SendAsync(checkRequest);
                var checkContent = await checkResponse.Content.ReadAsStringAsync();

                var result = new
                {
                    timestamp = DateTime.UtcNow,
                    email = email,
                    checkUrl = checkUrl,
                    responseStatus = checkResponse.StatusCode.ToString(),
                    exists = checkResponse.IsSuccessStatusCode,
                    rawResponse = checkContent
                };

                await response.WriteStringAsync(JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true }));
                return response;
            }
            catch (Exception ex)
            {
                var errorResult = new
                {
                    error = ex.Message,
                    stackTrace = ex.StackTrace,
                    timestamp = DateTime.UtcNow
                };

                await response.WriteStringAsync(JsonSerializer.Serialize(errorResult, new JsonSerializerOptions { WriteIndented = true }));
                return response;
            }
        }

        private async Task<string?> GetDataverseAccessToken(string clientId, string clientSecret, string tenantId, string dataverseUrl)
        {
            try
            {
                using var httpClient = new HttpClient();
                
                var tokenRequest = new Dictionary<string, string>
                {
                    ["grant_type"] = "client_credentials",
                    ["client_id"] = clientId,
                    ["client_secret"] = clientSecret,
                    ["scope"] = $"{dataverseUrl}/.default"
                };

                var tokenUrl = $"https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token";
                var tokenResponse = await httpClient.PostAsync(tokenUrl, new FormUrlEncodedContent(tokenRequest));

                if (tokenResponse.IsSuccessStatusCode)
                {
                    var tokenContent = await tokenResponse.Content.ReadAsStringAsync();
                    var tokenData = JsonSerializer.Deserialize<JsonElement>(tokenContent);
                    return tokenData.GetProperty("access_token").GetString();
                }

                return null;
            }
            catch
            {
                return null;
            }
        }
    }
}
