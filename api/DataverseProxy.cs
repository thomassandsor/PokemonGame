using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Text;
using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Net;
using Microsoft.AspNetCore.WebUtilities;

namespace PokemonGame.API
{
    public class DataverseProxy
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<DataverseProxy> _logger;
        
        public DataverseProxy(HttpClient httpClient, ILogger<DataverseProxy> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }
        
        [Function("DataverseProxy")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", "patch", "delete", 
                Route = "dataverse/{restOfPath}")] HttpRequestData req,
            string restOfPath)
        {
            try
            {
                _logger.LogInformation($"DataverseProxy function processed request for path: {restOfPath}");
                
                // Get configuration from environment variables
                var dataverseUrl = Environment.GetEnvironmentVariable("DATAVERSE_URL") ?? "https://pokemongame.crm4.dynamics.com";
                var clientId = Environment.GetEnvironmentVariable("DATAVERSE_CLIENT_ID");
                var clientSecret = Environment.GetEnvironmentVariable("DATAVERSE_CLIENT_SECRET");
                var tenantId = Environment.GetEnvironmentVariable("DATAVERSE_TENANT_ID");
                
                if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret) || string.IsNullOrEmpty(tenantId))
                {
                    _logger.LogError($"Missing required environment variables for Dataverse authentication. ClientId: {!string.IsNullOrEmpty(clientId)}, ClientSecret: {!string.IsNullOrEmpty(clientSecret)}, TenantId: {!string.IsNullOrEmpty(tenantId)}");
                    var errorResponse = req.CreateResponse(HttpStatusCode.BadRequest);
                    errorResponse.Headers.Add("Content-Type", "application/json");
                    await errorResponse.WriteStringAsync(JsonSerializer.Serialize(new { 
                        error = "Dataverse configuration not found",
                        details = new {
                            hasClientId = !string.IsNullOrEmpty(clientId),
                            hasClientSecret = !string.IsNullOrEmpty(clientSecret),
                            hasTenantId = !string.IsNullOrEmpty(tenantId),
                            dataverseUrl = dataverseUrl
                        }
                    }));
                    return errorResponse;
                }
                
                // Get access token
                var accessToken = await GetAccessTokenAsync(clientId, clientSecret, tenantId, dataverseUrl);
                if (string.IsNullOrEmpty(accessToken))
                {
                    var errorResponse = req.CreateResponse(HttpStatusCode.BadRequest);
                    errorResponse.Headers.Add("Content-Type", "application/json");
                    await errorResponse.WriteStringAsync(JsonSerializer.Serialize(new { error = "Failed to authenticate with Dataverse", statusCode = 401 }));
                    return errorResponse;
                }
                
                // Build the target URL - remove /api/data/v9.2 from dataverseUrl if it exists and add it properly
                var baseUrl = dataverseUrl.Replace("/api/data/v9.2", "");
                var targetUrl = $"{baseUrl}/api/data/v9.2/{restOfPath}";
                if (!string.IsNullOrEmpty(req.Url.Query))
                {
                    targetUrl += req.Url.Query;
                }
                
                _logger.LogInformation($"Proxying request to: {targetUrl}");
                
                // Create the request
                var request = new HttpRequestMessage(new HttpMethod(req.Method), targetUrl);
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
                request.Headers.Add("OData-MaxVersion", "4.0");
                request.Headers.Add("OData-Version", "4.0");
                request.Headers.Add("Accept", "application/json");
                
                // Copy request body if it exists
                if (req.Body != null)
                {
                    var body = await new StreamReader(req.Body).ReadToEndAsync();
                    if (!string.IsNullOrEmpty(body))
                    {
                        request.Content = new StringContent(body, Encoding.UTF8, "application/json");
                    }
                }
                
                // Forward the request
                var response = await _httpClient.SendAsync(request);
                var responseContent = await response.Content.ReadAsStringAsync();
                
                _logger.LogInformation($"Dataverse response status: {response.StatusCode}");
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError($"Dataverse request failed. Status: {response.StatusCode}, Content: {responseContent}");
                }
                
                // Return the response
                var result = req.CreateResponse(response.StatusCode);
                result.Headers.Add("Content-Type", "application/json");
                await result.WriteStringAsync(responseContent);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error in DataverseProxy: {ex.Message}");
                _logger.LogError($"Stack trace: {ex.StackTrace}");
                var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
                errorResponse.Headers.Add("Content-Type", "application/json");
                await errorResponse.WriteStringAsync(JsonSerializer.Serialize(new { error = "Backend call failure", details = ex.Message }));
                return errorResponse;
            }
        }
        
        private async Task<string?> GetAccessTokenAsync(string clientId, string clientSecret, string tenantId, string dataverseUrl)
        {
            try
            {
                var tokenUrl = $"https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token";
                var scope = dataverseUrl.Replace("/api/data/v9.2", "") + "/.default";
                
                var parameters = new List<KeyValuePair<string, string>>
                {
                    new KeyValuePair<string, string>("client_id", clientId),
                    new KeyValuePair<string, string>("client_secret", clientSecret),
                    new KeyValuePair<string, string>("scope", scope),
                    new KeyValuePair<string, string>("grant_type", "client_credentials")
                };
                
                var request = new HttpRequestMessage(HttpMethod.Post, tokenUrl)
                {
                    Content = new FormUrlEncodedContent(parameters)
                };
                
                var response = await _httpClient.SendAsync(request);
                var responseContent = await response.Content.ReadAsStringAsync();
                
                if (response.IsSuccessStatusCode)
                {
                    var tokenResponse = JsonSerializer.Deserialize<JsonElement>(responseContent);
                    return tokenResponse.GetProperty("access_token").GetString();
                }
                else
                {
                    _logger.LogError($"Failed to get access token: {responseContent}");
                    return null;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Exception getting access token: {ex.Message}");
                return null;
            }
        }
    }
}
