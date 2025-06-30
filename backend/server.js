const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Dataverse authentication service
class DataverseAuth {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = 0;
  }

  async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    await this.refreshToken();
    return this.accessToken;
  }

  async refreshToken() {
    try {
      const tokenEndpoint = `https://login.microsoftonline.com/${process.env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`;
      
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', process.env.DATAVERSE_CLIENT_ID);
      params.append('client_secret', process.env.DATAVERSE_CLIENT_SECRET);
      params.append('scope', process.env.DATAVERSE_SCOPE);

      const response = await axios.post(tokenEndpoint, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
      
      console.log('Successfully obtained Dataverse access token');
    } catch (error) {
      console.error('Failed to obtain Dataverse access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Dataverse');
    }
  }
}

const dataverseAuth = new DataverseAuth();

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Pokemon Game Backend is running' });
});

// Proxy endpoint for Dataverse API calls
app.all('/api/dataverse/*', async (req, res) => {
  try {
    const token = await dataverseAuth.getAccessToken();
    const dataversePath = req.path.replace('/api/dataverse', '');
    const dataverseUrl = `${process.env.DATAVERSE_URL}${dataversePath}`;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      'Accept': 'application/json',
    };

    const config = {
      method: req.method,
      url: dataverseUrl,
      headers,
      params: req.query,
    };

    if (req.body && Object.keys(req.body).length > 0) {
      config.data = req.body;
    }

    const response = await axios(config);
    res.json(response.data);
  } catch (error) {
    console.error('Dataverse API error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Dataverse API call failed',
      details: error.response?.data || error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
