# Azure Functions API Setup

## Configuration Files

### local.settings.json
This file contains local development settings including Azure AD secrets. It is excluded from git for security.

To set up:
1. Copy `local.settings.json.example` to `local.settings.json`
2. Replace the placeholder values with your actual Azure AD credentials:
   - `DATAVERSE_TENANT_ID`: Your Azure AD tenant ID
   - `DATAVERSE_CLIENT_ID`: Your Azure AD application (client) ID
   - `DATAVERSE_CLIENT_SECRET`: Your Azure AD application secret

### temp-server.js
This file contains a temporary Express server for testing. It uses environment variables or falls back to placeholder values. Set your environment variables before running:
- `DATAVERSE_TENANT_ID`
- `DATAVERSE_CLIENT_ID` 
- `DATAVERSE_CLIENT_SECRET`
- `DATAVERSE_URL`
- `DATAVERSE_SCOPE`

## Running the Functions

1. Make sure you have the Azure Functions Core Tools installed
2. Configure your `local.settings.json` file as described above
3. Run `func start` or `npm start` in this directory

## Security Note

Never commit files containing actual secrets to version control. Always use environment variables or configuration files that are excluded from git.
