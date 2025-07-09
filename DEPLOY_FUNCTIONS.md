# Deploy Azure Functions Separately

## Step 1: Create Azure Functions App

```bash
# Create resource group (if needed)
az group create --name rg-pokemongame --location "East US"

# Create Azure Functions app
az functionapp create \
  --resource-group rg-pokemongame \
  --consumption-plan-location eastus \
  --runtime dotnet \
  --functions-version 4 \
  --name pokemongame-functions \
  --storage-account pokemongamestorage
```

## Step 2: Deploy Functions

```bash
# From the api directory
cd api
func azure functionapp publish pokemongame-functions
```

## Step 3: Configure Environment Variables

Set these in the Azure Functions app configuration:
- DATAVERSE_URL
- DATAVERSE_TENANT_ID  
- DATAVERSE_CLIENT_ID
- DATAVERSE_CLIENT_SECRET
- DATAVERSE_SCOPE

## Step 4: Update Frontend

Update frontend environment variables to point to:
`https://pokemongame-functions.azurewebsites.net`
