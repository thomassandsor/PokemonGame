# Application Insights Setup Guide

## Quick Setup Steps

### Step 1: Create Application Insights in Azure

**Option A: Azure Portal (Easiest)**
1. Go to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource"
3. Search for "Application Insights"
4. Click "Create"
5. Fill in:
   - **Resource Group**: Same as your Pokemon Game resources
   - **Name**: `pokemon-game-insights`
   - **Region**: Same region as your Static Web App (probably East US)
   - **Resource Mode**: Classic

**Option B: Azure CLI (Faster)**
```bash
# Update these variables first
RESOURCE_GROUP="your-pokemon-game-resource-group"
LOCATION="eastus"  # or your region
APP_INSIGHTS_NAME="pokemon-game-insights"

# Create the resource
az extension add --name application-insights
az monitor app-insights component create \
  --app $APP_INSIGHTS_NAME \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --application-type web \
  --retention-time 90
```

### Step 2: Get the Connection String

1. In Azure Portal, go to your new Application Insights resource
2. Go to "Settings" → "Properties"
3. Copy the **Connection String** (full string, not just Instrumentation Key)
4. It should look like: 
   ```
   InstrumentationKey=12345678-1234-1234-1234-123456789012;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/
   ```

### Step 3: Add to GitHub Secrets

1. Go to your GitHub repository
2. Go to "Settings" → "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Name: `REACT_APP_APPINSIGHTS_CONNECTION_STRING`
5. Value: [Paste the connection string from Step 2]
6. Click "Add secret"

### Step 4: Add to Local Development (Optional)

If you want Application Insights logging during local development:

1. Open your `.env` file
2. Add this line:
   ```
   REACT_APP_APPINSIGHTS_CONNECTION_STRING=InstrumentationKey=your-key-here;IngestionEndpoint=https://your-region.in.applicationinsights.azure.com/
   ```

**Note**: For local development, you can skip this step and logs will just go to the browser console.

## Verification

### After Setup
1. **Deploy your app** (push to GitHub to trigger deployment)
2. **Test the mobile authentication issue**
3. **Check Application Insights** for logs

### Where to Find Logs in Application Insights

1. **Go to your Application Insights resource in Azure Portal**
2. **Click "Logs" in the left menu**
3. **Use these queries:**

```kusto
// All custom events (authentication events)
customEvents
| where timestamp > ago(1h)
| project timestamp, name, customDimensions
| order by timestamp desc

// MSAL initialization loops
customEvents
| where name == "MSAL_Initialization_Loop"
| project timestamp, customDimensions.attempts, customDimensions.url

// Emergency tool usage
customEvents
| where name startswith "Emergency_"
| project timestamp, name, customDimensions.url

// All authentication failures
customEvents
| where name == "Auth_Event" and customDimensions.eventType contains "fail"
| project timestamp, customDimensions
```

### What You'll See

Once configured, you'll see logs like:
- `App_Start` - When the app loads
- `MSAL_Initialization_Attempt` - Each init attempt
- `MSAL_Initialization_Loop` - When loop is detected
- `Emergency_Stop_Triggered` - When emergency commands are used
- `Auth_Event` - All authentication events
- Plus all exceptions and errors with full stack traces

## Benefits

✅ **Remote debugging** - See mobile issues even when you can't access browser console  
✅ **Historical data** - Track patterns over time  
✅ **User behavior** - See which emergency tools users are using  
✅ **Performance monitoring** - Track authentication timing  
✅ **Error tracking** - Automatic exception capture with context  

## Cost

Application Insights has a generous free tier:
- **First 5 GB per month**: Free
- **90-day retention**: Free
- For a debugging scenario like this, you're very unlikely to exceed the free tier

## Next Steps

1. **Create the Application Insights resource**
2. **Add the connection string to GitHub secrets**
3. **Push changes to trigger deployment**
4. **Test the mobile authentication**
5. **Check Application Insights for the captured data**

This will give you complete visibility into what's happening during the mobile authentication loop, even when you can't access the browser console on mobile devices.
