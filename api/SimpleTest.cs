using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace PokemonGame.API
{
    public static class SimpleTest
    {
        [FunctionName("SimpleTest")]
        public static IActionResult Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "test")] HttpRequest req,
            ILogger log)
        {
            log.LogInformation("Simple test function executed");
            
            return new OkObjectResult(new { 
                message = "Azure Functions is working!",
                timestamp = DateTime.UtcNow,
                environment = Environment.GetEnvironmentVariable("AZURE_FUNCTIONS_ENVIRONMENT") ?? "Unknown"
            });
        }
    }
}
