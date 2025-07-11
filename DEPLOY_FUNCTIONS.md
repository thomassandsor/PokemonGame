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

## Step 5: Configure Environment Variables

In Azure Portal → Function App → Configuration → Application Settings:
- `DATAVERSE_URL`: https://pokemongame.crm4.dynamics.com/api/data/v9.2
- `DATAVERSE_TENANT_ID`: [your-tenant-id]
- `DATAVERSE_CLIENT_ID`: [your-client-id]  
- `DATAVERSE_CLIENT_SECRET`: [your-client-secret]
- `DATAVERSE_SCOPE`: https://pokemongame.crm4.dynamics.com/.default

## Step 6: Configure CORS

In Azure Portal → Function App → CORS:
Add your Static Web Apps URL: `https://[your-static-app].azurestaticapps.net`

## Step 7: Update Frontend

Create new environment variable for production:
`REACT_APP_API_BASE_URL=https://[your-function-app].azurewebsites.net`

## Step 8: Test

Your Functions will be available at:
- `https://[your-function-app].azurewebsites.net/api/health`
- `https://[your-function-app].azurewebsites.net/api/dataverse/contacts`
