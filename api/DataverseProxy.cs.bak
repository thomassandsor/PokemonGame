using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Text;
using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace PokemonGame.API
{
    public static class DataverseProxy
    {
        private static readonly HttpClient httpClient = new HttpClient();
        
        [FunctionName("DataverseProxy")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", "patch", "delete", 
                Route = "dataverse/{*restOfPath}")] HttpRequest req,
            string restOfPath,
            ILogger log)
        {
            try
            {
                log.LogInformation($"DataverseProxy function processed request for path: {restOfPath}");
                
                // Get configuration from environment variables
                var dataverseUrl = Environment.GetEnvironmentVariable("DATAVERSE_URL") ?? "https://pokemongame.crm4.dynamics.com";
                var clientId = Environment.GetEnvironmentVariable("DATAVERSE_CLIENT_ID");
                var clientSecret = Environment.GetEnvironmentVariable("DATAVERSE_CLIENT_SECRET");
                var tenantId = Environment.GetEnvironmentVariable("DATAVERSE_TENANT_ID");
                
                if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret) || string.IsNullOrEmpty(tenantId))
                {
                    log.LogError($"Missing required environment variables for Dataverse authentication. ClientId: {!string.IsNullOrEmpty(clientId)}, ClientSecret: {!string.IsNullOrEmpty(clientSecret)}, TenantId: {!string.IsNullOrEmpty(tenantId)}");
                    return new BadRequestObjectResult(new { 
                        error = "Dataverse configuration not found",
                        details = new {
                            hasClientId = !string.IsNullOrEmpty(clientId),
                            hasClientSecret = !string.IsNullOrEmpty(clientSecret),
                            hasTenantId = !string.IsNullOrEmpty(tenantId),
                            dataverseUrl = dataverseUrl
                        }
                    });
                }
                
                // Get access token
                var accessToken = await GetAccessTokenAsync(clientId, clientSecret, tenantId, dataverseUrl, log);
                if (string.IsNullOrEmpty(accessToken))
                {
                    return new BadRequestObjectResult(new { error = "Failed to authenticate with Dataverse", statusCode = 401 });
                }
                
                // Build the target URL - remove /api/data/v9.2 from dataverseUrl if it exists and add it properly
                var baseUrl = dataverseUrl.Replace("/api/data/v9.2", "");
                var targetUrl = $"{baseUrl}/api/data/v9.2/{restOfPath}";
                if (req.QueryString.HasValue)
                {
                    targetUrl += req.QueryString.Value;
                }
                
                log.LogInformation($"Proxying request to: {targetUrl}");
                
                // Create the request
                var request = new HttpRequestMessage(new HttpMethod(req.Method), targetUrl);
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
                request.Headers.Add("OData-MaxVersion", "4.0");
                request.Headers.Add("OData-Version", "4.0");
                request.Headers.Add("Accept", "application/json");
                
                // Copy request body if it exists
                if (req.ContentLength.HasValue && req.ContentLength > 0)
                {
                    var body = await new StreamReader(req.Body).ReadToEndAsync();
                    request.Content = new StringContent(body, Encoding.UTF8, "application/json");
                }
                
                // Forward the request
                var response = await httpClient.SendAsync(request);
                var responseContent = await response.Content.ReadAsStringAsync();
                
                log.LogInformation($"Dataverse response status: {response.StatusCode}");
                if (!response.IsSuccessStatusCode)
                {
                    log.LogError($"Dataverse request failed. Status: {response.StatusCode}, Content: {responseContent}");
                }
                
                // Return the response
                return new ContentResult
                {
                    Content = responseContent,
                    ContentType = "application/json",
                    StatusCode = (int)response.StatusCode
                };
            }
            catch (Exception ex)
            {
                log.LogError($"Error in DataverseProxy: {ex.Message}");
                log.LogError($"Stack trace: {ex.StackTrace}");
                return new ObjectResult(new { error = "Backend call failure", details = ex.Message }) 
                { 
                    StatusCode = 500 
                };
            }
        }
        
        private static async Task<string> GetAccessTokenAsync(string clientId, string clientSecret, string tenantId, string dataverseUrl, ILogger log)
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
                
                var response = await httpClient.SendAsync(request);
                var responseContent = await response.Content.ReadAsStringAsync();
                
                if (response.IsSuccessStatusCode)
                {
                    var tokenResponse = JsonConvert.DeserializeObject<dynamic>(responseContent);
                    return tokenResponse.access_token;
                }
                else
                {
                    log.LogError($"Failed to get access token: {responseContent}");
                    return null;
                }
            }
            catch (Exception ex)
            {
                log.LogError($"Exception getting access token: {ex.Message}");
                return null;
            }
        }
    }
}
