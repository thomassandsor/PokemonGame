using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;
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
        public HttpResponseData WhoAmI([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options")] HttpRequestData req)
        {
            _logger.LogInformation("WhoAmI endpoint called");

            // Handle CORS preflight request
            if (req.Method.Equals("OPTIONS", StringComparison.OrdinalIgnoreCase))
            {
                var response = req.CreateResponse(HttpStatusCode.OK);
                response.Headers.Add("Access-Control-Allow-Origin", "*");
                response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
                response.Headers.Add("Access-Control-Allow-Credentials", "true");
                return response;
            }

            try
            {
                // Check for token in query string (from OAuth redirect)
                var query = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
                var token = query["token"];
                
                _logger.LogInformation($"Token from query string: {(string.IsNullOrEmpty(token) ? "EMPTY" : $"{token.Substring(0, Math.Min(20, token.Length))}...")}");
                
                // Check for session cookie
                if (string.IsNullOrEmpty(token))
                {
                    try
                    {
                        var cookies = req.Headers.GetValues("Cookie")?.FirstOrDefault();
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
                    catch (InvalidOperationException)
                    {
                        // No Cookie header present - this is fine
                        _logger.LogInformation("No Cookie header found in request");
                    }
                }

                if (string.IsNullOrEmpty(token))
                {
                    return CreateJsonResponse(req, HttpStatusCode.Unauthorized, new { 
                        authenticated = false, 
                        message = "No session found" 
                    });
                }

                // Decode the simple token
                var userInfo = DecodeSessionToken(token);
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
                if (string.IsNullOrEmpty(token))
                {
                    _logger.LogWarning("Token is null or empty");
                    return null;
                }
                
                _logger.LogInformation($"Attempting to decode token of length: {token.Length}");
                
                var jsonBytes = Convert.FromBase64String(token);
                var jsonString = System.Text.Encoding.UTF8.GetString(jsonBytes);
                
                _logger.LogInformation($"Decoded JSON string: {jsonString}");
                
                var payload = JsonSerializer.Deserialize<Dictionary<string, object>>(jsonString);
                
                if (payload == null) 
                {
                    _logger.LogWarning("Payload is null after deserialization");
                    return null;
                }
                
                // Check expiration
                if (payload.ContainsKey("exp"))
                {
                    var expElement = payload["exp"];
                    long exp;
                    
                    // Handle JsonElement conversion
                    if (expElement is JsonElement jsonElement)
                    {
                        exp = jsonElement.GetInt64();
                    }
                    else
                    {
                        exp = Convert.ToInt64(expElement);
                    }
                    
                    var currentTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                    
                    _logger.LogInformation($"Token expiration: {exp}, Current time: {currentTime}, Expired: {currentTime > exp}");
                    
                    if (currentTime > exp)
                    {
                        _logger.LogWarning("Token has expired");
                        return null; // Token expired
                    }
                }
                
                var email = GetStringFromPayload(payload, "email");
                var name = GetStringFromPayload(payload, "name");
                
                _logger.LogInformation($"Successfully decoded token for user: {email}");
                
                return new UserSession
                {
                    email = email,
                    name = name,
                    loginTime = DateTime.UtcNow // You could store this in the token too
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error decoding session token");
                return null;
            }
        }

        private static string GetStringFromPayload(Dictionary<string, object> payload, string key)
        {
            if (!payload.ContainsKey(key)) return "";
            
            var value = payload[key];
            if (value is JsonElement jsonElement)
            {
                return jsonElement.GetString() ?? "";
            }
            
            return value?.ToString() ?? "";
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

        private HttpResponseData CreateJsonResponse(HttpRequestData req, HttpStatusCode statusCode, object data)
        {
            var response = req.CreateResponse(statusCode);
            response.Headers.Add("Content-Type", "application/json");
            response.Headers.Add("Access-Control-Allow-Origin", "*");
            response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
            response.Headers.Add("Access-Control-Allow-Credentials", "true");
            
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
