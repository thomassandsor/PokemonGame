using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace PokemonGameApi
{
    public class DataverseProxy
    {
        private readonly ILogger _logger;
        private readonly HttpClient _httpClient;
        private readonly string _dataverseUrl;
        private readonly string _tenantId;
        private readonly string _clientId;
        private readonly string _clientSecret;
        private readonly string _scope;

        public DataverseProxy(ILoggerFactory loggerFactory, HttpClient httpClient)
        {
            _logger = loggerFactory.CreateLogger<DataverseProxy>();
            _httpClient = httpClient;
            
            // Get configuration from environment variables
            _dataverseUrl = Environment.GetEnvironmentVariable("DATAVERSE_URL") ?? throw new InvalidOperationException("DATAVERSE_URL not configured");
            _tenantId = Environment.GetEnvironmentVariable("DATAVERSE_TENANT_ID") ?? throw new InvalidOperationException("DATAVERSE_TENANT_ID not configured");
            _clientId = Environment.GetEnvironmentVariable("DATAVERSE_CLIENT_ID") ?? throw new InvalidOperationException("DATAVERSE_CLIENT_ID not configured");
            _clientSecret = Environment.GetEnvironmentVariable("DATAVERSE_CLIENT_SECRET") ?? throw new InvalidOperationException("DATAVERSE_CLIENT_SECRET not configured");
            _scope = Environment.GetEnvironmentVariable("DATAVERSE_SCOPE") ?? throw new InvalidOperationException("DATAVERSE_SCOPE not configured");
        }

        [Function("dataverse-proxy")]
        public async Task<HttpResponseData> Run([HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", "put", "delete")] HttpRequestData req)
        {
            _logger.LogInformation("Dataverse proxy function triggered");

            try
            {
                // Get access token
                var accessToken = await GetAccessTokenAsync();
                if (string.IsNullOrEmpty(accessToken))
                {
                    var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
                    await errorResponse.WriteStringAsync("Failed to get access token");
                    return errorResponse;
                }

                // Extract the path from the query parameters
                var path = req.Query["path"];
                if (string.IsNullOrEmpty(path))
                {
                    var errorResponse = req.CreateResponse(HttpStatusCode.BadRequest);
                    await errorResponse.WriteStringAsync("Missing 'path' parameter");
                    return errorResponse;
                }

                // Build the full Dataverse URL
                var dataverseUrl = $"{_dataverseUrl}{path}";
                
                // Create the request to Dataverse
                var dataverseRequest = new HttpRequestMessage(new HttpMethod(req.Method), dataverseUrl);
                dataverseRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
                dataverseRequest.Headers.Add("OData-MaxVersion", "4.0");
                dataverseRequest.Headers.Add("OData-Version", "4.0");
                dataverseRequest.Headers.Add("Accept", "application/json");

                // Copy the request body if it exists
                if (req.Method.ToUpper() != "GET" && req.Method.ToUpper() != "DELETE")
                {
                    var requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                    if (!string.IsNullOrEmpty(requestBody))
                    {
                        dataverseRequest.Content = new StringContent(requestBody, Encoding.UTF8, "application/json");
                    }
                }

                // Send the request to Dataverse
                var dataverseResponse = await _httpClient.SendAsync(dataverseRequest);
                var responseContent = await dataverseResponse.Content.ReadAsStringAsync();

                _logger.LogInformation($"Dataverse response status: {dataverseResponse.StatusCode}");
                if (!dataverseResponse.IsSuccessStatusCode)
                {
                    _logger.LogError($"Dataverse error response: {responseContent}");
                }

                // Create the response
                var response = req.CreateResponse(dataverseResponse.StatusCode);
                response.Headers.Add("Content-Type", "application/json");
                
                // Enable CORS
                response.Headers.Add("Access-Control-Allow-Origin", "*");
                response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization");

                await response.WriteStringAsync(responseContent);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in dataverse proxy");
                var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResponse.WriteStringAsync($"Internal server error: {ex.Message}");
                return errorResponse;
            }
        }

        private async Task<string?> GetAccessTokenAsync()
        {
            try
            {
                var tokenUrl = $"https://login.microsoftonline.com/{_tenantId}/oauth2/v2.0/token";
                var tokenRequest = new HttpRequestMessage(HttpMethod.Post, tokenUrl);
                
                var parameters = new List<KeyValuePair<string, string>>
                {
                    new("grant_type", "client_credentials"),
                    new("client_id", _clientId),
                    new("client_secret", _clientSecret),
                    new("scope", _scope)
                };

                tokenRequest.Content = new FormUrlEncodedContent(parameters);

                var tokenResponse = await _httpClient.SendAsync(tokenRequest);
                var tokenContent = await tokenResponse.Content.ReadAsStringAsync();

                if (tokenResponse.IsSuccessStatusCode)
                {
                    var tokenData = JsonSerializer.Deserialize<JsonElement>(tokenContent);
                    return tokenData.GetProperty("access_token").GetString();
                }

                _logger.LogError($"Failed to get access token: {tokenContent}");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting access token");
                return null;
            }
        }
    }
}
