# Deploy Azure Functions Separately - Complete Guide

## Prerequisites ✅
- ✅ Azure Functions Core Tools (v4.0.5455 installed)
- ⚠️ Azure CLI (needs to be installed)

## Step 1: Install Azure CLI

Download and install from: https://aka.ms/installazurecliwindows
Or run:
```powershell
winget install Microsoft.AzureCLI
```

## Step 2: Login to Azure

```bash
az login
# Select your subscription
az account set --subscription "0b6c3cc2-afd0-4b1e-8617-ab7125854b6c"
```

## Step 3: Create Resources (FREE TIER)

```bash
# Create resource group in West Europe
az group create --name rg-pokemongame --location "West Europe"

# Create storage account (required for Functions) - FREE TIER
az storage account create \
  --name pokemongamestorage2025 \
  --resource-group rg-pokemongame \
  --location westeurope \
  --sku Standard_LRS

# Create Azure Functions app - CONSUMPTION PLAN (FREE TIER)
az functionapp create \
  --resource-group rg-pokemongame \
  --consumption-plan-location westeurope \
  --runtime dotnet \
  --functions-version 4 \
  --name pokemongame-functions-2025 \
  --storage-account pokemongamestorage2025 \
  --os-type Windows
```

💡 **Free Tier Details:**
- **Consumption Plan**: Automatically free tier (1M requests/month)
- **Storage**: LRS (Locally Redundant Storage) - cheapest option
- **Location**: West Europe (as requested)

## Step 4: Deploy Your Functions

```bash
# From the api directory
cd api
func azure functionapp publish pokemongame-functions-2025
```

## Step 5: Disable Application Insights (Optional - Save Costs)

```bash
# Remove Application Insights to save costs and improve privacy
az functionapp config appsettings delete --name pokemongame-functions-2025 --resource-group rg-pokemongame --setting-names APPLICATIONINSIGHTS_CONNECTION_STRING

# Redeploy without Application Insights
func azure functionapp publish pokemongame-functions-2025
```

## Step 6: Configure Environment Variables

In Azure Portal → Function App → Configuration → Application Settings:
- `DATAVERSE_URL`: https://pokemongame.crm4.dynamics.com/api/data/v9.2
- `DATAVERSE_TENANT_ID`: [your-tenant-id]
- `DATAVERSE_CLIENT_ID`: [your-client-id]  
- `DATAVERSE_CLIENT_SECRET`: [your-client-secret]
- `DATAVERSE_SCOPE`: https://pokemongame.crm4.dynamics.com/.default

## Step 7: Configure CORS (Production Only)

⚠️ **Security Note**: Only add CORS origins for your production domains. Never add localhost origins as they create security vulnerabilities.

```bash
# Add your Static Web App URL
az functionapp cors add --name pokemongame-functions-2025 --resource-group rg-pokemongame --allowed-origins "https://red-forest-0b2b6ae03.1.azurestaticapps.net"
```

**For Local Development**: Use local Functions (`func start`) instead of configuring CORS.

## Step 8: Update Frontend

Update your frontend environment variables:
- **Production**: `REACT_APP_API_BASE_URL=https://pokemongame-functions-2025.azurewebsites.net`
- **Local Dev**: `REACT_APP_API_BASE_URL=http://localhost:7071` (when using `func start`)

## Step 9: Test

Your Functions are now available at:
- **Health Check**: `https://pokemongame-functions-2025.azurewebsites.net/api/health`
- **Hello Endpoint**: `https://pokemongame-functions-2025.azurewebsites.net/api/hello`
- **Dataverse Proxy**: `https://pokemongame-functions-2025.azurewebsites.net/api/dataverse/contacts`

**Static Web App**: https://red-forest-0b2b6ae03.1.azurestaticapps.net
