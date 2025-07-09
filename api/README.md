# Azure Functions API

This directory contains the Azure Functions that serve as the backend API for the Pokemon Game application.

## Local Development Setup

1. **Install Azure Functions Core Tools**:
   ```bash
   npm install -g azure-functions-core-tools@4 --unsafe-perm true
   ```

2. **Create local settings file**:
   ```bash
   cp local.settings.json.example local.settings.json
   ```

3. **Configure your local.settings.json** with your Dataverse connection details:
   - `DATAVERSE_URL`: Your Dataverse environment URL
   - `DATAVERSE_TENANT_ID`: Your Azure AD tenant ID
   - `DATAVERSE_CLIENT_ID`: Your app registration client ID
   - `DATAVERSE_CLIENT_SECRET`: Your app registration client secret
   - `DATAVERSE_SCOPE`: Your Dataverse scope

4. **Run the Functions locally**:
   ```bash
   func start
   ```

## Endpoints

- `GET /api/health` - Health check endpoint
- `POST /api/dataverse-proxy` - Proxy requests to Dataverse

## Deployment

The Functions are automatically deployed to Azure via GitHub Actions when changes are pushed to the main branch.

## Environment Variables

In production, these environment variables must be configured in your Azure Functions App:
- `DATAVERSE_URL`
- `DATAVERSE_TENANT_ID` 
- `DATAVERSE_CLIENT_ID`
- `DATAVERSE_CLIENT_SECRET`
- `DATAVERSE_SCOPE`