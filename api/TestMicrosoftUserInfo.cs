using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text.Json;

namespace PokemonGame.Api
{
    public class TestMicrosoftUserInfo
    {
        private readonly ILogger _logger;

        public TestMicrosoftUserInfo(ILoggerFactory loggerFactory)
        {
            _logger = loggerFactory.CreateLogger<TestMicrosoftUserInfo>();
        }

        [Function("TestMicrosoftUserInfo")]
        public async Task<HttpResponseData> TestUserInfo([HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req)
        {
            _logger.LogInformation("Testing Microsoft Graph user info response");

            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "application/json");

            var testData = new
            {
                message = "To test this, you need to get an access token from Microsoft OAuth first.",
                instructions = new[]
                {
                    "1. Go to: https://pokemongame-functions-2025.azurewebsites.net/api/MicrosoftLogin",
                    "2. Complete OAuth flow",
                    "3. Look in browser dev tools Network tab for the Microsoft Graph call to /me",
                    "4. Or check Azure Function logs for the user info response"
                },
                available_fields = new
                {
                    displayName = "Full name (e.g., 'John Smith')",
                    givenName = "First name only (e.g., 'John')",
                    surname = "Last name only (e.g., 'Smith')",
                    mail = "Primary email address",
                    userPrincipalName = "User principal name (often email-like)"
                },
                current_usage = "We currently use 'displayName' and store it in Dataverse 'firstname' field",
                recommendation = "We should probably split the name or use separate fields"
            };

            await response.WriteStringAsync(JsonSerializer.Serialize(testData, new JsonSerializerOptions { WriteIndented = true }));
            return response;
        }
    }
}
