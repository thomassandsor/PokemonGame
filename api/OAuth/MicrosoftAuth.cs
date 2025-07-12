using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text.Json;
using System.Web;

namespace PokemonGame.Api.OAuth
{
    public class MicrosoftAuth
    {
        private readonly ILogger _logger;
        private readonly string _clientId;
        private readonly string _clientSecret;
        private readonly string _redirectUri;
        private readonly string _tenantId;

        public MicrosoftAuth(ILoggerFactory loggerFactory)
        {
            _logger = loggerFactory.CreateLogger<MicrosoftAuth>();
            _clientId = Environment.GetEnvironmentVariable("MICROSOFT_CLIENT_ID") ?? "";
            _clientSecret = Environment.GetEnvironmentVariable("MICROSOFT_CLIENT_SECRET") ?? "";
            _redirectUri = Environment.GetEnvironmentVariable("MICROSOFT_REDIRECT_URI") ?? "";
            _tenantId = Environment.GetEnvironmentVariable("MICROSOFT_TENANT_ID") ?? "common"; // 'common' allows any Microsoft account
        }

        [Function("MicrosoftLogin")]
        public HttpResponseData MicrosoftLogin([HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req)
        {
            _logger.LogInformation("Microsoft OAuth login initiated");

            // Check if request is coming from localhost (for development)
            var query = HttpUtility.ParseQueryString(req.Url.Query);
            var devMode = query["dev"] == "true";
            
            // Build Microsoft OAuth URL
            var state = devMode ? "localhost" : Guid.NewGuid().ToString(); // Use "localhost" as state for dev mode
            var microsoftAuthUrl = $"https://login.microsoftonline.com/{_tenantId}/oauth2/v2.0/authorize" +
                $"?client_id={_clientId}" +
                $"&redirect_uri={HttpUtility.UrlEncode(_redirectUri)}" +
                "&response_type=code" +
                "&scope=openid%20profile%20email" +
                $"&state={state}";

            var response = req.CreateResponse(HttpStatusCode.Redirect);
            response.Headers.Add("Location", microsoftAuthUrl);
            
            return response;
        }

        [Function("MicrosoftCallback")]
        public async Task<HttpResponseData> MicrosoftCallback([HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req)
        {
            _logger.LogInformation("Microsoft OAuth callback received");

            var query = HttpUtility.ParseQueryString(req.Url.Query);
            var code = query["code"];
            var state = query["state"];
            var error = query["error"];

            if (!string.IsNullOrEmpty(error))
            {
                _logger.LogError($"Microsoft OAuth error: {error}");
                return CreateErrorResponse(req, "Authentication failed");
            }

            if (string.IsNullOrEmpty(code))
            {
                _logger.LogError("No authorization code received from Microsoft");
                return CreateErrorResponse(req, "No authorization code received");
            }

            try
            {
                // Exchange code for access token
                var tokenResponse = await ExchangeCodeForToken(code);
                if (tokenResponse == null)
                {
                    return CreateErrorResponse(req, "Failed to get access token");
                }

                // Get user info from Microsoft
                var userInfo = await GetMicrosoftUserInfo(tokenResponse.access_token);
                if (userInfo == null)
                {
                    return CreateErrorResponse(req, "Failed to get user information");
                }

                // Create session and redirect to game
                var gameUrl = Environment.GetEnvironmentVariable("GAME_URL") ?? "/game.html";
                
                // If state is "localhost", redirect to localhost instead
                if (state == "localhost")
                {
                    gameUrl = "http://localhost:8080";
                }
                
                var sessionToken = CreateSessionToken(userInfo.mail ?? userInfo.userPrincipalName, userInfo.displayName);
                
                var response = req.CreateResponse(HttpStatusCode.Redirect);
                var userEmail = userInfo.mail ?? userInfo.userPrincipalName;
                response.Headers.Add("Location", $"{gameUrl}?token={sessionToken}&email={HttpUtility.UrlEncode(userEmail)}&name={HttpUtility.UrlEncode(userInfo.displayName)}");
                
                // Set session cookie
                response.Headers.Add("Set-Cookie", $"pokemon_session={sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict");
                
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during Microsoft OAuth callback");
                return CreateErrorResponse(req, "Authentication error occurred");
            }
        }

        private async Task<MicrosoftTokenResponse?> ExchangeCodeForToken(string code)
        {
            using var httpClient = new HttpClient();
            
            var tokenRequest = new Dictionary<string, string>
            {
                {"code", code},
                {"client_id", _clientId},
                {"client_secret", _clientSecret},
                {"redirect_uri", _redirectUri},
                {"grant_type", "authorization_code"},
                {"scope", "openid profile email"}
            };

            var content = new FormUrlEncodedContent(tokenRequest);
            var response = await httpClient.PostAsync($"https://login.microsoftonline.com/{_tenantId}/oauth2/v2.0/token", content);
            
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError($"Token exchange failed: {response.StatusCode}");
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError($"Error details: {errorContent}");
                return null;
            }

            var jsonString = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<MicrosoftTokenResponse>(jsonString, new JsonSerializerOptions 
            { 
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase 
            });
        }

        private async Task<MicrosoftUserInfo?> GetMicrosoftUserInfo(string accessToken)
        {
            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
            
            var response = await httpClient.GetAsync("https://graph.microsoft.com/v1.0/me");
            
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError($"User info request failed: {response.StatusCode}");
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError($"Error details: {errorContent}");
                return null;
            }

            var jsonString = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<MicrosoftUserInfo>(jsonString, new JsonSerializerOptions 
            { 
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase 
            });
        }

        private string CreateSessionToken(string email, string name)
        {
            // Simple JWT-like token for demo - in production, use proper JWT library
            var payload = JsonSerializer.Serialize(new { email, name, exp = DateTimeOffset.UtcNow.AddHours(24).ToUnixTimeSeconds() });
            return Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(payload));
        }

        private HttpResponseData CreateErrorResponse(HttpRequestData req, string message)
        {
            var response = req.CreateResponse(HttpStatusCode.Redirect);
            var gameUrl = Environment.GetEnvironmentVariable("GAME_URL") ?? "/game.html";
            response.Headers.Add("Location", $"{gameUrl}?error={HttpUtility.UrlEncode(message)}");
            return response;
        }
    }

    public class MicrosoftTokenResponse
    {
        public string access_token { get; set; } = "";
        public string token_type { get; set; } = "";
        public int expires_in { get; set; }
        public string refresh_token { get; set; } = "";
        public string id_token { get; set; } = "";
    }

    public class MicrosoftUserInfo
    {
        public string id { get; set; } = "";
        public string displayName { get; set; } = "";
        public string givenName { get; set; } = "";
        public string surname { get; set; } = "";
        public string mail { get; set; } = "";
        public string userPrincipalName { get; set; } = "";
    }
}
