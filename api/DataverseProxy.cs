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
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Text.RegularExpressions;

namespace PokemonGame.API
{
    public class UserInfo
    {
        public string Email { get; set; } = string.Empty;
        public bool IsValid { get; set; }
    }

    public class DataverseProxy
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<DataverseProxy> _logger;
        
        public DataverseProxy(HttpClient httpClient, ILogger<DataverseProxy> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        // 🔒 SECURITY: Validate Microsoft access token
        private async Task<UserInfo?> ValidateTokenAsync(string bearerToken)
        {
            try
            {
                // First, try to validate as a Microsoft access token by calling Microsoft Graph
                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", bearerToken);
                
                var response = await httpClient.GetAsync("https://graph.microsoft.com/v1.0/me");
                
                if (response.IsSuccessStatusCode)
                {
                    // Token is valid, extract user info from Microsoft Graph
                    var jsonContent = await response.Content.ReadAsStringAsync();
                    var userProfile = JsonSerializer.Deserialize<JsonElement>(jsonContent);
                    
                    var email = userProfile.TryGetProperty("mail", out var mailProp) ? mailProp.GetString() :
                              userProfile.TryGetProperty("userPrincipalName", out var upnProp) ? upnProp.GetString() : null;
                    
                    if (!string.IsNullOrEmpty(email))
                    {
                        _logger.LogInformation($"✅ SECURITY: Microsoft token validated for user: {email}");
                        return new UserInfo
                        {
                            Email = email,
                            IsValid = true
                        };
                    }
                }
                
                // Fallback: Try to validate as JWT token (for backward compatibility)
                var tokenHandler = new JwtSecurityTokenHandler();
                if (tokenHandler.CanReadToken(bearerToken))
                {
                    var jwtToken = tokenHandler.ReadJwtToken(bearerToken);
                    
                    // Basic validation - check if token is expired
                    if (jwtToken.ValidTo < DateTime.UtcNow)
                    {
                        _logger.LogWarning("🚨 SECURITY: Expired JWT token provided");
                        return null;
                    }
                    
                    // Extract user email from token claims
                    var emailClaim = jwtToken.Claims.FirstOrDefault(c => 
                        c.Type == "email" || 
                        c.Type == "preferred_username" || 
                        c.Type == "upn")?.Value;
                        
                    if (!string.IsNullOrEmpty(emailClaim))
                    {
                        _logger.LogInformation($"✅ SECURITY: JWT token validated for user: {emailClaim}");
                        return new UserInfo
                        {
                            Email = emailClaim,
                            IsValid = true
                        };
                    }
                }
                
                _logger.LogWarning("🚨 SECURITY: Token validation failed - neither Microsoft Graph nor JWT validation succeeded");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "🚨 SECURITY: Token validation failed");
                return null;
            }
        }

        // 🔒 SECURITY: Get user's contact ID from Dataverse
        private async Task<string?> GetUserContactIdAsync(string userEmail, string accessToken, string dataverseUrl)
        {
            try
            {
                var baseUrl = dataverseUrl.Replace("/api/data/v9.2", "");
                var contactUrl = $"{baseUrl}/api/data/v9.2/contacts?$filter=emailaddress1 eq '{userEmail}'&$select=contactid";
                
                var request = new HttpRequestMessage(HttpMethod.Get, contactUrl);
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
                request.Headers.Add("OData-MaxVersion", "4.0");
                request.Headers.Add("OData-Version", "4.0");
                request.Headers.Add("Accept", "application/json");
                
                var response = await _httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    var jsonDoc = JsonDocument.Parse(responseContent);
                    var contacts = jsonDoc.RootElement.GetProperty("value");
                    
                    if (contacts.GetArrayLength() > 0)
                    {
                        var contactId = contacts[0].GetProperty("contactid").GetString();
                        _logger.LogInformation($"✅ SECURITY: Found contact ID for user {userEmail}");
                        return contactId;
                    }
                }
                
                _logger.LogWarning($"🚨 SECURITY: No contact found for user {userEmail}");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"🚨 SECURITY: Error getting contact ID for {userEmail}");
                return null;
            }
        }

        // 🔒 SECURITY: Enforce user data isolation for sensitive endpoints
        private string EnforceDataIsolation(string restOfPath, string query, string userContactId, string userEmail)
        {
            try
            {
                // For pokemon_pokedexes endpoint - most critical security check
                if (restOfPath.Contains("pokemon_pokedexes"))
                {
                    _logger.LogInformation($"🔒 SECURITY: Enforcing data isolation for pokemon_pokedexes - User: {userContactId}");
                    return $"$filter=_pokemon_user_value eq '{userContactId}'";
                }
                
                // For contacts endpoint - user can only query their own contact
                if (restOfPath.Contains("contacts"))
                {
                    _logger.LogInformation($"🔒 SECURITY: Enforcing data isolation for contacts");
                    _logger.LogInformation($"🔍 DEBUG: Query string: {query}");
                    _logger.LogInformation($"🔍 DEBUG: User email: {userEmail}");
                    
                    // Decode URL encoding and check for user's email
                    var decodedQuery = System.Web.HttpUtility.UrlDecode(query ?? "");
                    var userEmailEncoded = System.Web.HttpUtility.UrlEncode(userEmail);
                    
                    // Check if the query is looking up the authenticated user's email (multiple formats)
                    if ((query?.Contains($"emailaddress1 eq '{userEmail}'") ?? false) || 
                        (query?.Contains($"emailaddress1%20eq%20%27{userEmail}%27") ?? false) ||
                        (query?.Contains($"emailaddress1%20eq%20%27{userEmailEncoded}%27") ?? false) ||
                        decodedQuery.Contains($"emailaddress1 eq '{userEmail}'"))
                    {
                        _logger.LogInformation($"✅ SECURITY: Contact lookup for authenticated user {userEmail} - allowed");
                        return query ?? ""; // Allow the original query
                    }
                    else
                    {
                        _logger.LogWarning($"🚨 SECURITY: Contact lookup for different email attempted by {userEmail}");
                        _logger.LogWarning($"🚨 SECURITY: Query was: {query}");
                        _logger.LogWarning($"🚨 SECURITY: Decoded query was: {decodedQuery}");
                        return "$filter=1 eq 2"; // Block unauthorized contact lookups
                    }
                }
                
                // For other endpoints, return original query but log access
                _logger.LogInformation($"🔒 SECURITY: Non-sensitive endpoint accessed: {restOfPath}");
                return query;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "🚨 SECURITY: Error in data isolation enforcement");
                return "$filter=1 eq 2"; // Return impossible filter as fallback
            }
        }
        
        [Function("DataverseProxy")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", "patch", "delete", "options",
                Route = "dataverse/{restOfPath}")] HttpRequestData req,
            string restOfPath)
        {
            // Handle CORS preflight requests
            if (req.Method.Equals("OPTIONS", StringComparison.OrdinalIgnoreCase))
            {
                var corsResponse = req.CreateResponse(HttpStatusCode.OK);
                corsResponse.Headers.Add("Access-Control-Allow-Origin", "*");
                corsResponse.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                corsResponse.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization");
                corsResponse.Headers.Add("Access-Control-Max-Age", "86400");
                return corsResponse;
            }

            try
            {
                _logger.LogInformation($"🔐 SECURITY CHECK: DataverseProxy processing request for path: {restOfPath}");
                
                // � OAUTH EXCEPTION: Allow internal OAuth profile creation calls
                var userAgent = req.Headers.FirstOrDefault(h => h.Key.Equals("User-Agent", StringComparison.OrdinalIgnoreCase));
                var referrer = req.Headers.FirstOrDefault(h => h.Key.Equals("Referer", StringComparison.OrdinalIgnoreCase));
                
                bool isInternalOAuthCall = false;
                
                // Check if this is an internal call from MicrosoftAuth OAuth process
                if (restOfPath.Contains("contacts") && req.Method.Equals("GET", StringComparison.OrdinalIgnoreCase))
                {
                    // Check if it's from the same Azure Functions domain (internal call)
                    var host = req.Headers.FirstOrDefault(h => h.Key.Equals("Host", StringComparison.OrdinalIgnoreCase));
                    if (host.Value != null && host.Value.Any() && 
                        host.Value.First().Contains("pokemongame-functions-2025.azurewebsites.net"))
                    {
                        // Additional check: no Authorization header AND no X-User-Email header suggests internal OAuth call
                        var authHeader = req.Headers.FirstOrDefault(h => h.Key.Equals("Authorization", StringComparison.OrdinalIgnoreCase));
                        var userEmailHeader = req.Headers.FirstOrDefault(h => h.Key.Equals("X-User-Email", StringComparison.OrdinalIgnoreCase));
                        
                        if ((authHeader.Key == null || !authHeader.Value.Any()) && 
                            (userEmailHeader.Key == null || !userEmailHeader.Value.Any()))
                        {
                            _logger.LogInformation($"🔓 OAUTH: Allowing internal OAuth profile creation call for: {restOfPath}");
                            isInternalOAuthCall = true;
                        }
                    }
                }
                
                // Initialize userInfo for OAuth exception handling
                UserInfo? userInfo = null;
                
                // �🔒 CRITICAL SECURITY: Validate authentication token (except for internal OAuth calls)
                if (!isInternalOAuthCall)
                {
                    var authHeader = req.Headers.FirstOrDefault(h => h.Key.Equals("Authorization", StringComparison.OrdinalIgnoreCase));
                    if (authHeader.Key == null || authHeader.Value == null || !authHeader.Value.Any())
                    {
                    _logger.LogWarning($"🚨 SECURITY VIOLATION: Unauthenticated access attempt to {restOfPath}");
                    var unauthorizedResponse = req.CreateResponse(HttpStatusCode.Unauthorized);
                    unauthorizedResponse.Headers.Add("Content-Type", "application/json");
                    unauthorizedResponse.Headers.Add("Access-Control-Allow-Origin", "*");
                    unauthorizedResponse.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                    unauthorizedResponse.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization");
                    await unauthorizedResponse.WriteStringAsync(JsonSerializer.Serialize(new { 
                        error = "Authentication required",
                        message = "This endpoint requires a valid authentication token"
                    }));
                    return unauthorizedResponse;
                }
                
                var authValue = authHeader.Value.FirstOrDefault();
                if (string.IsNullOrEmpty(authValue) || !authValue.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning($"🚨 SECURITY VIOLATION: Invalid auth header format for {restOfPath}");
                    var unauthorizedResponse = req.CreateResponse(HttpStatusCode.Unauthorized);
                    unauthorizedResponse.Headers.Add("Content-Type", "application/json");
                    unauthorizedResponse.Headers.Add("Access-Control-Allow-Origin", "*");
                    unauthorizedResponse.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                    unauthorizedResponse.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization");
                    await unauthorizedResponse.WriteStringAsync(JsonSerializer.Serialize(new { 
                        error = "Invalid authentication format",
                        message = "Authentication header must be in format: Bearer <token>"
                    }));
                    return unauthorizedResponse;
                }
                
                var token = authValue.Substring(7); // Remove "Bearer " prefix
                userInfo = await ValidateTokenAsync(token);
                
                if (userInfo == null || !userInfo.IsValid)
                {
                    _logger.LogWarning($"🚨 SECURITY VIOLATION: Invalid token provided for {restOfPath}");
                    var unauthorizedResponse = req.CreateResponse(HttpStatusCode.Unauthorized);
                    unauthorizedResponse.Headers.Add("Content-Type", "application/json");
                    unauthorizedResponse.Headers.Add("Access-Control-Allow-Origin", "*");
                    unauthorizedResponse.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                    unauthorizedResponse.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization");
                    await unauthorizedResponse.WriteStringAsync(JsonSerializer.Serialize(new { 
                        error = "Invalid authentication token",
                        message = "The provided authentication token is invalid or expired"
                    }));
                    return unauthorizedResponse;
                }
                
                _logger.LogInformation($"✅ SECURITY: Authenticated user {userInfo.Email} accessing {restOfPath}");
                } // End of authentication check block (!isInternalOAuthCall)
                
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
                    errorResponse.Headers.Add("Access-Control-Allow-Origin", "*");
                    errorResponse.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                    errorResponse.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization");
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
                    errorResponse.Headers.Add("Access-Control-Allow-Origin", "*");
                    errorResponse.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                    errorResponse.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization");
                    await errorResponse.WriteStringAsync(JsonSerializer.Serialize(new { error = "Failed to authenticate with Dataverse", statusCode = 401 }));
                    return errorResponse;
                }

                // 🔒 CRITICAL SECURITY: Get user's contact ID for data isolation (except for internal OAuth calls and contact lookups)
                string? userContactId = null;
                if (!isInternalOAuthCall && userInfo != null && restOfPath.Contains("pokemon_pokedexes"))
                {
                    userContactId = await GetUserContactIdAsync(userInfo.Email, accessToken, dataverseUrl);
                    if (string.IsNullOrEmpty(userContactId))
                    {
                        _logger.LogWarning($"🚨 SECURITY: User {userInfo.Email} not found in contacts table");
                        var unauthorizedResponse = req.CreateResponse(HttpStatusCode.Unauthorized);
                        unauthorizedResponse.Headers.Add("Content-Type", "application/json");
                        unauthorizedResponse.Headers.Add("Access-Control-Allow-Origin", "*");
                        unauthorizedResponse.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                        unauthorizedResponse.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization");
                        await unauthorizedResponse.WriteStringAsync(JsonSerializer.Serialize(new { 
                            error = "User not found in system",
                            message = "Your user account was not found in the Pokemon game system"
                        }));
                        return unauthorizedResponse;
                    }
                }

                // 🔒 SECURITY: Enforce data isolation - modify query to restrict user access (skip for OAuth calls)
                var originalQuery = req.Url.Query;
                string secureQuery;
                if (isInternalOAuthCall || userInfo == null)
                {
                    // For OAuth calls, use original query without modification
                    secureQuery = originalQuery ?? "";
                }
                else
                {
                    secureQuery = "?" + EnforceDataIsolation(restOfPath, originalQuery?.TrimStart('?') ?? "", userContactId ?? "", userInfo.Email);
                }
                
                // Build the target URL - remove /api/data/v9.2 from dataverseUrl if it exists and add it properly
                var baseUrl = dataverseUrl.Replace("/api/data/v9.2", "");
                var targetUrl = $"{baseUrl}/api/data/v9.2/{restOfPath}{secureQuery}";
                
                _logger.LogInformation($"🔒 SECURE REQUEST: Proxying to: {targetUrl}");
                
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
                
                // Return the response with CORS headers
                var result = req.CreateResponse(response.StatusCode);
                result.Headers.Add("Content-Type", "application/json");
                result.Headers.Add("Access-Control-Allow-Origin", "*");
                result.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                result.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization");
                await result.WriteStringAsync(responseContent);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error in DataverseProxy: {ex.Message}");
                _logger.LogError($"Stack trace: {ex.StackTrace}");
                var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
                errorResponse.Headers.Add("Content-Type", "application/json");
                errorResponse.Headers.Add("Access-Control-Allow-Origin", "*");
                errorResponse.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                errorResponse.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization");
                await errorResponse.WriteStringAsync(JsonSerializer.Serialize(new { error = "Backend call failure", details = ex.Message }));
                return errorResponse;
            }
        } // End of Run method
        
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
