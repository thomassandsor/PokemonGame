# Azure Static Web Apps Deployment Guide

## Overview
Your Pokemon Game is already configured for Azure Static Web Apps deployment with GitHub Actions. Here's how to deploy and manage it.

## Current Setup
- ✅ GitHub workflows configured (2 files in `.github/workflows/`)
- ✅ Azure Static Web Apps configuration (`staticwebapp.config.json`)
- ✅ React app build process configured
- ✅ Azure Functions API integration ready

## Deployment Steps

### 1. Prerequisites
- Azure subscription with Azure Static Web Apps resource
- GitHub repository with your code
- Azure Static Web Apps API token configured in GitHub secrets

### 2. Required GitHub Secrets
Make sure these secrets are configured in your GitHub repository:

**Repository Settings → Secrets and variables → Actions**

#### Azure Static Web Apps Secrets:
- `AZURE_STATIC_WEB_APPS_API_TOKEN` - Your Azure Static Web Apps deployment token
- `AZURE_STATIC_WEB_APPS_API_TOKEN_RED_FOREST_0B2B6AE03` - Alternative deployment token

#### Environment Variables:
- `REACT_APP_CLIENT_ID` - Your Azure AD App Registration Client ID
- `REACT_APP_AUTHORITY` - Your Azure AD Authority URL
- `REACT_APP_REDIRECT_URI` - Your app's redirect URI
- `REACT_APP_POST_LOGOUT_REDIRECT_URI` - Your app's logout redirect URI
- `REACT_APP_DATAVERSE_URL` - Your Dataverse environment URL
- `REACT_APP_DATAVERSE_SCOPE` - Your Dataverse API scope

### 3. Automatic Deployment
The app will automatically deploy when you:
- Push to the `main` branch
- Create/update a pull request to `main`

### 4. Manual Deployment
To trigger a manual deployment:
1. Go to your GitHub repository
2. Click on "Actions" tab
3. Select "Azure Static Web Apps CI/CD"
4. Click "Run workflow"

### 5. Deployment Structure
```
Azure Static Web Apps Resource
├── Frontend (React App)
│   ├── Built from: / (root folder)
│   ├── Output: build/ folder
│   └── Routes: Configured in staticwebapp.config.json
└── API (Azure Functions)
    ├── Built from: api/ folder
    ├── Runtime: .NET 6
    └── Endpoints: /api/*
```

### 6. Environment Configuration
The app uses different API endpoints based on environment:
- **Development**: `http://localhost:3000/api` (local Azure Functions)
- **Production**: `/api` (Azure Static Web Apps managed functions)

### 7. Testing Deployment
After deployment, test these key features:
1. **Frontend**: Navigate to your Azure Static Web Apps URL
2. **API**: Test `/api/dataverse/pokemon_battles` endpoint
3. **Authentication**: Test login/logout flow
4. **Data**: Test Pokemon import and battle challenges

### 8. Monitoring and Troubleshooting
- **Azure Portal**: Monitor your Static Web Apps resource
- **GitHub Actions**: Check workflow runs for deployment status
- **Browser DevTools**: Check console for API endpoint issues
- **Application Insights**: Monitor API performance (if configured)

## Common Issues and Solutions

### 1. API Not Working
- Check if `api_location: "api"` is correctly set in GitHub workflow
- Verify Azure Functions are building correctly
- Check CORS settings in staticwebapp.config.json

### 2. Authentication Issues
- Verify all `REACT_APP_*` environment variables are set
- Check Azure AD app registration settings
- Ensure redirect URIs match your Azure Static Web Apps URL

### 3. Dataverse Connection Issues
- Verify `REACT_APP_DATAVERSE_URL` and `REACT_APP_DATAVERSE_SCOPE`
- Check if Azure AD app has correct permissions for Dataverse
- Test API endpoints directly in browser

### 4. Build Failures
- Check GitHub Actions logs for specific error messages
- Verify package.json dependencies
- Test local build: `npm run build`

## Next Steps
1. **Push your current changes** to trigger deployment
2. **Monitor the GitHub Actions** for deployment status
3. **Test the deployed app** thoroughly
4. **Set up custom domain** (optional)
5. **Configure staging environments** (optional)

## URLs to Monitor
- GitHub Actions: `https://github.com/[username]/[repo]/actions`
- Azure Portal: `https://portal.azure.com` → Static Web Apps
- Your App URL: Will be provided by Azure Static Web Apps

---
*This guide assumes your Azure Static Web Apps resource is already created and configured.*
