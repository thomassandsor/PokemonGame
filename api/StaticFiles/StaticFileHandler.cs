using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;

namespace PokemonGame.Api.StaticFiles
{
    public class StaticFileHandler
    {
        private readonly ILogger _logger;

        public StaticFileHandler(ILoggerFactory loggerFactory)
        {
            _logger = loggerFactory.CreateLogger<StaticFileHandler>();
        }

        [Function("ServeGame")]
        public HttpResponseData ServeGame([HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req)
        {
            // Azure Functions runs from api\bin\output, so we need to go up several levels
            var currentDir = Directory.GetCurrentDirectory();
            var gameHtmlPath = Path.Combine(currentDir, "..", "..", "..", "public", "game.html");
            
            if (!File.Exists(gameHtmlPath))
            {
                var response404 = req.CreateResponse(HttpStatusCode.NotFound);
                response404.WriteString($"Game file not found. Looking in: {Path.GetFullPath(gameHtmlPath)}. Current dir: {currentDir}");
                return response404;
            }

            var htmlContent = File.ReadAllText(gameHtmlPath);
            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "text/html");
            response.WriteString(htmlContent);
            return response;
        }

        [Function("ServeLocalTest")]
        public HttpResponseData ServeLocalTest([HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req)
        {
            // Azure Functions runs from api\bin\output, so we need to go up several levels
            var currentDir = Directory.GetCurrentDirectory();
            var testHtmlPath = Path.Combine(currentDir, "..", "..", "..", "public", "local-test.html");
            
            if (!File.Exists(testHtmlPath))
            {
                var response404 = req.CreateResponse(HttpStatusCode.NotFound);
                response404.WriteString($"Test file not found. Looking in: {Path.GetFullPath(testHtmlPath)}. Current dir: {currentDir}");
                return response404;
            }

            var htmlContent = File.ReadAllText(testHtmlPath);
            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Content-Type", "text/html");
            response.WriteString(htmlContent);
            return response;
        }
    }
}
