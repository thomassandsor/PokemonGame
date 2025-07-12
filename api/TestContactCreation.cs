using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text;
using System.Text.Json;

namespace PokemonGame.Api
{
    public class TestContactCreation
    {
        private readonly ILogger _logger;

        public TestContactCreation(ILoggerFactory loggerFactory)
        {
            _logger = loggerFactory.CreateLogger<TestContactCreation>();
        }

        [Function("TestContactCreation")]
        public async Task<HttpResponseData> RunTest([HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req)
        {
            _logger.LogInformation("Testing contact creation via DataverseProxy");

            try
            {
                // Use the existing DataverseProxy to test contact creation
                using var httpClient = new HttpClient();
                var baseUrl = "https://pokemongame-functions-2025.azurewebsites.net";
                
                // Test email - change this to your actual email
                var testEmail = "sandsor@outlook.com";
                var testName = "Test User";
                
                // First check if user exists
                var checkUrl = $"{baseUrl}/api/dataverse/contacts?$filter=emailaddress1 eq '{testEmail}'&$select=contactid,firstname,emailaddress1";
                _logger.LogInformation($"TEST: Checking if user exists: {checkUrl}");
                
                var checkResponse = await httpClient.GetAsync(checkUrl);
                var checkContent = await checkResponse.Content.ReadAsStringAsync();
                
                _logger.LogInformation($"TEST: Check response - Status: {checkResponse.StatusCode}, Content: {checkContent}");
                
                var responseData = new
                {
                    step = "check_existing",
                    status = checkResponse.StatusCode.ToString(),
                    content = checkContent,
                    url = checkUrl
                };

                if (checkResponse.IsSuccessStatusCode)
                {
                    var checkResult = JsonSerializer.Deserialize<JsonElement>(checkContent);
                    var existingContacts = checkResult.GetProperty("value").EnumerateArray().ToList();
                    
                    if (existingContacts.Any())
                    {
                        responseData = new
                        {
                            step = "user_exists",
                            status = "found",
                            existing_contacts = existingContacts.Count,
                            message = $"User {testEmail} already exists"
                        };
                    }
                    else
                    {
                        // Try to create the contact
                        var contactData = new
                        {
                            emailaddress1 = testEmail,
                            firstname = testName
                        };

                        var createUrl = $"{baseUrl}/api/dataverse/contacts";
                        var createRequest = new HttpRequestMessage(HttpMethod.Post, createUrl);
                        createRequest.Headers.Add("Accept", "application/json");
                        createRequest.Content = new StringContent(JsonSerializer.Serialize(contactData), Encoding.UTF8, "application/json");

                        var createResponse = await httpClient.SendAsync(createRequest);
                        var createContent = await createResponse.Content.ReadAsStringAsync();

                        _logger.LogInformation($"TEST: Create response - Status: {createResponse.StatusCode}, Content: {createContent}");

                        responseData = new
                        {
                            step = "create_contact",
                            status = createResponse.StatusCode.ToString(),
                            content = createContent,
                            url = createUrl,
                            data = contactData
                        };
                    }
                }

                var response = req.CreateResponse(HttpStatusCode.OK);
                response.Headers.Add("Content-Type", "application/json");
                await response.WriteStringAsync(JsonSerializer.Serialize(responseData, new JsonSerializerOptions { WriteIndented = true }));
                
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing contact creation");
                
                var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
                errorResponse.Headers.Add("Content-Type", "application/json");
                await errorResponse.WriteStringAsync(JsonSerializer.Serialize(new { error = ex.Message, stack = ex.StackTrace }));
                
                return errorResponse;
            }
        }
    }
}
