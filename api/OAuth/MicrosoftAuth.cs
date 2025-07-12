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
            
            // Build Microsoft OAuth URL
            var state = devMode ? "localhost" : Guid.NewGuid().ToString(); // Use "localhost" as state for dev mode
            var microsoftAuthUrl = $"https://login.microsoftonline.com/{_tenantId}/oauth2/v2.0/authorize" +
                $"?client_id={_clientId}" +
                $"&redirect_uri={HttpUtility.UrlEncode(_redirectUri)}" +
                "&response_type=code" +
                "&scope=openid%20profile%20email%20User.Read" +
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
                var profileCreationResult = "";
                
                try 
                {
                    await CreateOrUpdateUserProfile(userEmail, userInfo.displayName);
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
                
                var sessionToken = CreateSessionToken(userEmail, userInfo.displayName);
                
                var response = req.CreateResponse(HttpStatusCode.Redirect);
                // Include profile creation result in the redirect URL for debugging
                response.Headers.Add("Location", $"{gameUrl}?token={sessionToken}&email={HttpUtility.UrlEncode(userEmail)}&name={HttpUtility.UrlEncode(userInfo.displayName)}&profile_result={HttpUtility.UrlEncode(profileCreationResult)}");
                
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

        private async Task CreateOrUpdateUserProfile(string email, string displayName)
        {
            try
            {
                _logger.LogInformation($"PROFILE-CREATION: Starting user profile creation for {email} with displayName: {displayName}");
                
                // Get Dataverse configuration
                var dataverseUrl = Environment.GetEnvironmentVariable("DATAVERSE_URL") ?? "https://pokemongame.crm4.dynamics.com";
                var clientId = Environment.GetEnvironmentVariable("DATAVERSE_CLIENT_ID");
                var clientSecret = Environment.GetEnvironmentVariable("DATAVERSE_CLIENT_SECRET");
                var tenantId = Environment.GetEnvironmentVariable("DATAVERSE_TENANT_ID");
                
                _logger.LogInformation($"PROFILE-CREATION: Config check - DataverseUrl: {dataverseUrl}, HasClientId: {!string.IsNullOrEmpty(clientId)}, HasClientSecret: {!string.IsNullOrEmpty(clientSecret)}, HasTenantId: {!string.IsNullOrEmpty(tenantId)}");
                
                if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret) || string.IsNullOrEmpty(tenantId))
                {
                    _logger.LogError("PROFILE-CREATION: Dataverse configuration missing, cannot create user profile");
                    throw new Exception("Dataverse configuration is incomplete");
                }

                // Get access token for Dataverse
                _logger.LogInformation("PROFILE-CREATION: Requesting Dataverse access token...");
                var accessToken = await GetDataverseAccessToken(clientId, clientSecret, tenantId, dataverseUrl);
                if (string.IsNullOrEmpty(accessToken))
                {
                    _logger.LogError("PROFILE-CREATION: Failed to get Dataverse access token");
                    throw new Exception("Failed to authenticate with Dataverse");
                }
                _logger.LogInformation("PROFILE-CREATION: Successfully obtained Dataverse access token");

                using var httpClient = new HttpClient();
                var baseUrl = dataverseUrl.Replace("/api/data/v9.2", "");
                
                // First, check if user already exists
                var checkUrl = $"{baseUrl}/api/data/v9.2/contacts?$filter=emailaddress1 eq '{email}'&$select=contactid,fullname,emailaddress1";
                _logger.LogInformation($"PROFILE-CREATION: Checking if user exists with URL: {checkUrl}");
                
                var checkRequest = new HttpRequestMessage(HttpMethod.Get, checkUrl);
                checkRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
                checkRequest.Headers.Add("OData-MaxVersion", "4.0");
                checkRequest.Headers.Add("OData-Version", "4.0");
                checkRequest.Headers.Add("Accept", "application/json");

                var checkResponse = await httpClient.SendAsync(checkRequest);
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
                    _logger.LogError($"PROFILE-CREATION: Failed to check existing user. Status: {checkResponse.StatusCode}, Content: {checkContent}");
                    throw new Exception($"Failed to check if user exists: {checkResponse.StatusCode}");
                }

                // Create new contact with minimal data - only use standard fields
                var contactData = new
                {
                    emailaddress1 = email,
                    firstname = displayName ?? email.Split('@').FirstOrDefault()
                };

                _logger.LogInformation($"PROFILE-CREATION: Creating new contact with data: {JsonSerializer.Serialize(contactData)}");

                var createUrl = $"{baseUrl}/api/data/v9.2/contacts";
                _logger.LogInformation($"PROFILE-CREATION: Creating contact at URL: {createUrl}");
                
                var createRequest = new HttpRequestMessage(HttpMethod.Post, createUrl);
                createRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
                createRequest.Headers.Add("OData-MaxVersion", "4.0");
                createRequest.Headers.Add("OData-Version", "4.0");
                createRequest.Headers.Add("Accept", "application/json");
                createRequest.Content = new StringContent(JsonSerializer.Serialize(contactData), Encoding.UTF8, "application/json");

                var createResponse = await httpClient.SendAsync(createRequest);
                var createContent = await createResponse.Content.ReadAsStringAsync();

                _logger.LogInformation($"PROFILE-CREATION: Contact creation response - Status: {createResponse.StatusCode}, Content: {createContent}");

                if (createResponse.IsSuccessStatusCode)
                {
                    _logger.LogInformation($"PROFILE-CREATION: Successfully created user profile for {email}");
                }
                else
                {
                    _logger.LogError($"PROFILE-CREATION: Failed to create user profile for {email}. Status: {createResponse.StatusCode}, Response: {createContent}");
                    throw new Exception($"Contact creation failed: {createResponse.StatusCode} - {createContent}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"PROFILE-CREATION: Exception creating user profile for {email}: {ex.Message}");
                throw; // Re-throw so the outer catch can handle it
            }
        }

        private async Task<string?> GetDataverseAccessToken(string clientId, string clientSecret, string tenantId, string dataverseUrl)
        {
            try
            {
                _logger.LogInformation($"DATAVERSE-TOKEN: Requesting access token for tenant: {tenantId}, scope: {dataverseUrl}/.default");
                
                using var httpClient = new HttpClient();
                
                var tokenRequest = new Dictionary<string, string>
                {
                    ["grant_type"] = "client_credentials",
                    ["client_id"] = clientId,
                    ["client_secret"] = clientSecret,
                    ["scope"] = $"{dataverseUrl}/.default"
                };

                var tokenUrl = $"https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token";
                _logger.LogInformation($"DATAVERSE-TOKEN: Requesting token from: {tokenUrl}");

                var tokenResponse = await httpClient.PostAsync(tokenUrl, new FormUrlEncodedContent(tokenRequest));
                var tokenContent = await tokenResponse.Content.ReadAsStringAsync();
                
                _logger.LogInformation($"DATAVERSE-TOKEN: Token response - Status: {tokenResponse.StatusCode}, Content: {tokenContent}");

                if (tokenResponse.IsSuccessStatusCode)
                {
                    var tokenData = JsonSerializer.Deserialize<JsonElement>(tokenContent);
                    var accessToken = tokenData.GetProperty("access_token").GetString();
                    _logger.LogInformation($"DATAVERSE-TOKEN: Successfully obtained access token (length: {accessToken?.Length})");
                    return accessToken;
                }

                _logger.LogError($"DATAVERSE-TOKEN: Failed to get Dataverse access token. Status: {tokenResponse.StatusCode}, Content: {tokenContent}");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"DATAVERSE-TOKEN: Exception getting Dataverse access token: {ex.Message}");
                return null;
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
