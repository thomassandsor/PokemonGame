        using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Linq;
using System.Net;
using System.Text;
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
            var rememberMe = query["remember"] == "true";
            var loginHint = query["login_hint"];
            
            // Build Microsoft OAuth URL
            var state = devMode ? "localhost" : Guid.NewGuid().ToString(); // Use "localhost" as state for dev mode
            var microsoftAuthUrl = $"https://login.microsoftonline.com/{_tenantId}/oauth2/v2.0/authorize" +
                $"?client_id={_clientId}" +
                $"&redirect_uri={HttpUtility.UrlEncode(_redirectUri)}" +
                "&response_type=code" +
                "&scope=openid%20profile%20email%20User.Read" +
                $"&state={state}";
            
            // Add login hint if provided (helps skip account selection)
            if (!string.IsNullOrEmpty(loginHint))
            {
                microsoftAuthUrl += $"&login_hint={HttpUtility.UrlEncode(loginHint)}";
            }
            
            // Add prompt=none for returning users if remember me is set
            if (rememberMe && !string.IsNullOrEmpty(loginHint))
            {
                microsoftAuthUrl += "&prompt=none";
            }

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
                return CreateErrorResponse(req, "Authentication failed", state);
            }

            if (string.IsNullOrEmpty(code))
            {
                _logger.LogError("No authorization code received from Microsoft");
                return CreateErrorResponse(req, "No authorization code received", state);
            }

            try
            {
                // Exchange code for access token
                var tokenResponse = await ExchangeCodeForToken(code);
                if (tokenResponse == null)
                {
                    return CreateErrorResponse(req, "Failed to get access token", state);
                }

                // Get user info from Microsoft
                var userInfo = await GetMicrosoftUserInfo(tokenResponse.access_token);
                if (userInfo == null)
                {
                    return CreateErrorResponse(req, "Failed to get user information", state);
                }

                // Create or update user profile in Dataverse
                var userEmail = userInfo.mail ?? userInfo.userPrincipalName;
                
                // Map name fields properly
                string firstName, lastName;
                
                if (!string.IsNullOrEmpty(userInfo.givenName))
                {
                    // Use givenName for first name
                    firstName = userInfo.givenName;
                    // Use surname for last name if available
                    lastName = userInfo.surname ?? "";
                }
                else
                {
                    // Fallback to displayName for first name, no last name
                    firstName = userInfo.displayName ?? userEmail.Split('@').FirstOrDefault() ?? "User";
                    lastName = "";
                }
                
                var profileCreationResult = "";
                
                try 
                {
                    await CreateOrUpdateUserProfile(userEmail, firstName, lastName);
                    profileCreationResult = "SUCCESS";
                }
                catch (Exception profileEx)
                {
                    _logger.LogError(profileEx, $"Failed to create user profile for {userEmail}");
                    profileCreationResult = $"ERROR: {profileEx.Message}";
                    // Don't fail the authentication if profile creation fails
                }

                // Create session and redirect to game
                var gameUrl = Environment.GetEnvironmentVariable("GAME_URL") ?? "/game.html";
                
                // If state is "localhost", redirect to localhost instead
                if (state == "localhost")
                {
                    gameUrl = "http://localhost:8080";
                }
                
                // Use the real Microsoft access token instead of a fake session token
                var sessionToken = tokenResponse.access_token;
                
                var response = req.CreateResponse(HttpStatusCode.Redirect);
                // Include profile creation result in the redirect URL for debugging
                response.Headers.Add("Location", $"{gameUrl}?token={sessionToken}&email={HttpUtility.UrlEncode(userEmail)}&name={HttpUtility.UrlEncode(firstName)}&profile_result={HttpUtility.UrlEncode(profileCreationResult)}");
                
                // Set session cookie
                response.Headers.Add("Set-Cookie", $"pokemon_session={sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict");
                
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during Microsoft OAuth callback");
                return CreateErrorResponse(req, "Authentication error occurred", state);
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
                {"scope", "openid profile email User.Read"}
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

        private HttpResponseData CreateErrorResponse(HttpRequestData req, string message, string? state = null)
        {
            var response = req.CreateResponse(HttpStatusCode.Redirect);
            var gameUrl = Environment.GetEnvironmentVariable("GAME_URL") ?? "/game.html";
            
            // If state is "localhost", redirect to localhost instead
            if (state == "localhost")
            {
                gameUrl = "http://localhost:8080";
            }
            
            response.Headers.Add("Location", $"{gameUrl}?error={HttpUtility.UrlEncode(message)}");
            return response;
        }

        private async Task CreateOrUpdateUserProfile(string email, string firstName, string lastName = "")
        {
            try
            {
                _logger.LogInformation($"PROFILE-CREATION: Starting user profile creation for {email} with firstName: {firstName}, lastName: {lastName}");
                
                // Use the existing DataverseProxy instead of duplicating auth logic
                using var httpClient = new HttpClient();
                var baseUrl = "https://pokemongame-functions-2025.azurewebsites.net"; // Your Azure Functions URL
                
                // First check if user exists using DataverseProxy
                var checkUrl = $"{baseUrl}/api/dataverse/contacts?$filter=emailaddress1 eq '{email}'&$select=contactid,firstname,lastname,emailaddress1";
                _logger.LogInformation($"PROFILE-CREATION: Checking if user exists via DataverseProxy: {checkUrl}");
                
                var checkResponse = await httpClient.GetAsync(checkUrl);
                var checkContent = await checkResponse.Content.ReadAsStringAsync();
                
                _logger.LogInformation($"PROFILE-CREATION: User existence check response - Status: {checkResponse.StatusCode}, Content: {checkContent}");
                
                if (checkResponse.IsSuccessStatusCode)
                {
                    var checkResult = JsonSerializer.Deserialize<JsonElement>(checkContent);
                    var existingContacts = checkResult.GetProperty("value").EnumerateArray().ToList();
                    
                    _logger.LogInformation($"PROFILE-CREATION: Found {existingContacts.Count} existing contacts for {email}");
                    
                    if (existingContacts.Any())
                    {
                        _logger.LogInformation($"PROFILE-CREATION: User {email} already exists in Dataverse, skipping creation");
                        return;
                    }
                }
                else
                {
                    _logger.LogError($"PROFILE-CREATION: Failed to check existing user via DataverseProxy. Status: {checkResponse.StatusCode}, Content: {checkContent}");
                    throw new Exception($"Failed to check if user exists: {checkResponse.StatusCode}");
                }

                // Create new contact using DataverseProxy
                var contactData = new
                {
                    emailaddress1 = email,
                    firstname = firstName,
                    lastname = lastName
                };

                _logger.LogInformation($"PROFILE-CREATION: Creating new contact via DataverseProxy with data: {JsonSerializer.Serialize(contactData)}");

                var createUrl = $"{baseUrl}/api/dataverse/contacts";
                _logger.LogInformation($"PROFILE-CREATION: Creating contact via DataverseProxy at URL: {createUrl}");
                
                var createRequest = new HttpRequestMessage(HttpMethod.Post, createUrl);
                createRequest.Headers.Add("Accept", "application/json");
                createRequest.Content = new StringContent(JsonSerializer.Serialize(contactData), Encoding.UTF8, "application/json");

                var createResponse = await httpClient.SendAsync(createRequest);
                var createContent = await createResponse.Content.ReadAsStringAsync();

                _logger.LogInformation($"PROFILE-CREATION: Contact creation response - Status: {createResponse.StatusCode}, Content: {createContent}");

                if (createResponse.IsSuccessStatusCode)
                {
                    _logger.LogInformation($"PROFILE-CREATION: Successfully created user profile for {email} via DataverseProxy");
                }
                else
                {
                    _logger.LogError($"PROFILE-CREATION: Failed to create user profile for {email} via DataverseProxy. Status: {createResponse.StatusCode}, Response: {createContent}");
                    throw new Exception($"Contact creation failed via DataverseProxy: {createResponse.StatusCode} - {createContent}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"PROFILE-CREATION: Exception creating user profile for {email}: {ex.Message}");
                throw; // Re-throw so the outer catch can handle it
            }
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
