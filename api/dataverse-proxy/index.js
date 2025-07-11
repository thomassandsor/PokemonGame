const { app } = require('@azure/functions');

// DISABLED: This was a fake demo function that returned hardcoded Pokemon
// We now use the REAL DataverseProxy.cs for actual Dataverse queries
app.http('dataverse-proxy-disabled', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'dataverse-proxy-disabled/{restofpath?}',
    handler: async (request, context) => {
        return {
            status: 410,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: 'This demo endpoint has been disabled',
                message: 'Use the real DataverseProxy.cs via /api/dataverse/ instead'
            })
        };
    }
});
