using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;

namespace PokemonGame.Api.Auth
{
    public class UserIdentity
    {
        private readonly ILogger _logger;

        public UserIdentity(ILoggerFactory loggerFactory)
        {
            _logger = loggerFactory.CreateLogger<UserIdentity>();
        }

        [Function("WhoAmI")]
        public async Task<HttpResponseData> WhoAmI([HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req)
        {
            _logger.LogInformation("WhoAmI endpoint called");

            try
            {
                // Check for token in query string (from OAuth redirect)
                var query = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
                var token = query["token"];
                
                // Check for Authorization header (Bearer token)
                if (string.IsNullOrEmpty(token))
                {
                    if (req.Headers.TryGetValues("Authorization", out var authHeaders))
                    {
                        var authHeader = authHeaders.FirstOrDefault();
                        if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
                        {
                            token = authHeader.Substring("Bearer ".Length);
                        }
                    }
                }
                
                // Check for session cookie
                if (string.IsNullOrEmpty(token))
                {
                    if (req.Headers.TryGetValues("Cookie", out var cookieHeaders))
                    {
                        var cookies = cookieHeaders.FirstOrDefault();
                        if (!string.IsNullOrEmpty(cookies))
                        {
                            var sessionCookie = cookies.Split(';')
                                .Select(c => c.Trim())
                                .FirstOrDefault(c => c.StartsWith("pokemon_session="));
                            
                            if (sessionCookie != null)
                            {
                                token = sessionCookie.Split('=')[1];
                            }
                        }
                    }
                }

                if (string.IsNullOrEmpty(token))
                {
                    return CreateJsonResponse(req, HttpStatusCode.Unauthorized, new { 
                        authenticated = false, 
                        message = "No session found" 
                    });
                }

                // First, try to validate as Microsoft access token
                var userInfo = await ValidateMicrosoftToken(token);
                if (userInfo == null)
                {
                    // Fallback: Try to decode as session token (for backward compatibility)
                    userInfo = DecodeSessionToken(token);
                }
                
                if (userInfo == null)
                {
                    return CreateJsonResponse(req, HttpStatusCode.Unauthorized, new { 
                        authenticated = false, 
                        message = "Invalid or expired session" 
                    });
                }

                return CreateJsonResponse(req, HttpStatusCode.OK, new {
                    authenticated = true,
                    email = userInfo.email,
                    name = userInfo.name,
                    loginTime = userInfo.loginTime,
                    // You can add more user-specific data here based on email lookup
                    pokemonCount = GetUserPokemonCount(userInfo.email),
                    level = GetUserLevel(userInfo.email),
                    lastPlayed = GetUserLastPlayed(userInfo.email)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in WhoAmI endpoint");
                return CreateJsonResponse(req, HttpStatusCode.InternalServerError, new { 
                    authenticated = false, 
                    message = "Server error" 
                });
            }
        }

        private UserSession? DecodeSessionToken(string token)
        {
            try
            {
                var jsonBytes = Convert.FromBase64String(token);
                var jsonString = System.Text.Encoding.UTF8.GetString(jsonBytes);
                var payload = JsonSerializer.Deserialize<Dictionary<string, object>>(jsonString);
                
                if (payload == null) return null;
                
                // Check expiration
                if (payload.ContainsKey("exp"))
                {
                    var exp = Convert.ToInt64(payload["exp"]);
                    if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() > exp)
                    {
                        return null; // Token expired
                    }
                }
                
                return new UserSession
                {
                    email = payload.GetValueOrDefault("email")?.ToString() ?? "",
                    name = payload.GetValueOrDefault("name")?.ToString() ?? "",
                    loginTime = DateTime.UtcNow // You could store this in the token too
                };
            }
            catch
            {
                return null;
            }
        }

        // Mock methods - replace with actual database queries based on email
        private int GetUserPokemonCount(string email)
        {
            // TODO: Query your database using email as the key
            // For now, return mock data
            return email.GetHashCode() % 50 + 10; // Mock: 10-59 Pokemon
        }

        private int GetUserLevel(string email)
        {
            // TODO: Query your database using email as the key
            return Math.Abs(email.GetHashCode()) % 20 + 1; // Mock: Level 1-20
        }

        private DateTime GetUserLastPlayed(string email)
        {
            // TODO: Query your database using email as the key
            return DateTime.UtcNow.AddDays(-Math.Abs(email.GetHashCode()) % 7); // Mock: Within last week
        }

        // Validate Microsoft access token by calling Microsoft Graph
        private async Task<UserSession?> ValidateMicrosoftToken(string token)
        {
            try
            {
                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                
                var response = await httpClient.GetAsync("https://graph.microsoft.com/v1.0/me");
                
                if (response.IsSuccessStatusCode)
                {
                    var jsonContent = await response.Content.ReadAsStringAsync();
                    var userProfile = JsonSerializer.Deserialize<JsonElement>(jsonContent);
                    
                    var email = userProfile.TryGetProperty("mail", out var mailProp) ? mailProp.GetString() :
                              userProfile.TryGetProperty("userPrincipalName", out var upnProp) ? upnProp.GetString() : null;
                    
                    var name = userProfile.TryGetProperty("displayName", out var nameProp) ? nameProp.GetString() :
                             userProfile.TryGetProperty("givenName", out var givenProp) ? givenProp.GetString() : email;
                    
                    if (!string.IsNullOrEmpty(email))
                    {
                        _logger.LogInformation($"Microsoft token validated for user: {email}");
                        return new UserSession
                        {
                            email = email,
                            name = name ?? email,
                            loginTime = DateTime.UtcNow
                        };
                    }
                }
                
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to validate Microsoft token");
                return null;
            }
        }

        private HttpResponseData CreateJsonResponse(HttpRequestData req, HttpStatusCode statusCode, object data)
        {
            var response = req.CreateResponse(statusCode);
            response.Headers.Add("Content-Type", "application/json");
            response.Headers.Add("Access-Control-Allow-Origin", "*");
            response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization");
            
            var jsonString = JsonSerializer.Serialize(data, new JsonSerializerOptions 
            { 
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase 
            });
            
            response.WriteString(jsonString);
            return response;
        }
    }

    public class UserSession
    {
        public string email { get; set; } = "";
        public string name { get; set; } = "";
        public DateTime loginTime { get; set; }
    }
}
