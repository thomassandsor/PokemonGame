const axios = require('axios');

// Dataverse authentication configuration
const getDataverseConfig = () => {
  return {
    clientId: process.env.DATAVERSE_CLIENT_ID,
    clientSecret: process.env.DATAVERSE_CLIENT_SECRET,
    tenantId: process.env.DATAVERSE_TENANT_ID,
    dataverseUrl: process.env.DATAVERSE_URL,
    scope: `${process.env.DATAVERSE_URL}/.default`
  };
};

// Get access token for Dataverse
const getAccessToken = async () => {
  const config = getDataverseConfig();
  
  const params = new URLSearchParams();
  params.append('client_id', config.clientId);
  params.append('client_secret', config.clientSecret);
  params.append('scope', config.scope);
  params.append('grant_type', 'client_credentials');

  const response = await axios.post(
    `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
    params,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  return response.data.access_token;
};

module.exports = async function (context, req) {
  context.log(`Processing ${req.method} request for: ${req.params.restOfPath}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    };
    return;
  }

  try {
    // Get access token
    const accessToken = await getAccessToken();
    const config = getDataverseConfig();
    
    // Build the Dataverse API URL
    const dataverseApiUrl = `${config.dataverseUrl}/api/data/v9.2/${req.params.restOfPath}`;
    
    // Add query parameters if present
    const url = new URL(req.url);
    const queryParams = url.searchParams.toString();
    const fullUrl = queryParams ? `${dataverseApiUrl}?${queryParams}` : dataverseApiUrl;
    
    context.log(`Calling Dataverse API: ${fullUrl}`);

    // Prepare request configuration
    const axiosConfig = {
      method: req.method.toLowerCase(),
      url: fullUrl,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Accept': 'application/json'
      }
    };

    // Add request body for POST/PATCH requests
    if (req.method === 'POST' || req.method === 'PATCH') {
      if (req.body) {
        axiosConfig.data = req.body;
      }
    }

    // Make the API call to Dataverse
    const response = await axios(axiosConfig);
    
    context.log(`Dataverse API response status: ${response.status}`);

    // Return the response
    context.res = {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: response.data
    };

  } catch (error) {
    context.log.error('Error in dataverse-proxy:', error);
    
    if (error.response) {
      // Dataverse API error
      context.log.error('Dataverse API error:', error.response.data);
      context.res = {
        status: error.response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: {
          error: 'Dataverse API error',
          details: error.response.data,
          status: error.response.status
        }
      };
    } else {
      // General error
      context.res = {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: {
          error: 'Internal server error',
          message: error.message
        }
      };
    }
  }
};
