import axios from 'axios';
import { dataverseConfig } from '../config/authConfig';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

class DataverseAuthService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Get new token using client credentials flow
    await this.refreshToken();
    return this.accessToken!;
  }

  private async refreshToken(): Promise<void> {
    try {
      const tokenEndpoint = `https://login.microsoftonline.com/${dataverseConfig.tenantId}/oauth2/v2.0/token`;
      
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', dataverseConfig.clientId);
      params.append('client_secret', dataverseConfig.clientSecret);
      params.append('scope', dataverseConfig.scope);

      const response = await axios.post<TokenResponse>(tokenEndpoint, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      this.accessToken = response.data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
      
      console.log('Successfully obtained Dataverse access token');
    } catch (error) {
      console.error('Failed to obtain Dataverse access token:', error);
      throw new Error('Failed to authenticate with Dataverse');
    }
  }

  clearToken(): void {
    this.accessToken = null;
    this.tokenExpiry = 0;
  }
}

export const dataverseAuthService = new DataverseAuthService();
