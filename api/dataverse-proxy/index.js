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
  
  if (!config.clientId || !config.clientSecret || !config.tenantId || !config.dataverseUrl) {
    throw new Error('Missing required Dataverse configuration. Please check environment variables.');
  }
  
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

  try {
    // Get access token
    const accessToken = await getAccessToken();
    const config = getDataverseConfig();
    
    // Build the full Dataverse URL
    const dataverseUrl = `${config.dataverseUrl}/${req.params.restOfPath || ''}`;
    const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
    const fullUrl = queryString ? `${dataverseUrl}?${queryString}` : dataverseUrl;
    
    context.log(`Forwarding request to: ${fullUrl}`);
    
    // Forward the request to Dataverse
    const axiosConfig = {
      method: req.method,
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
    if (req.body && (req.method === 'POST' || req.method === 'PATCH')) {
      axiosConfig.data = req.body;
    }
    
    const response = await axios(axiosConfig);
    
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
    context.log.error('Error in dataverse proxy:', error.message);
    
    if (error.response) {
      // Dataverse returned an error
      context.res = {
        status: error.response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: {
          error: error.response.data || error.message,
          status: error.response.status
        }
      };
    } else {
      // Network or other error
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
