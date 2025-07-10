# Azure Application Insights Setup Script
# Run these commands in Azure CLI or Cloud Shell

# Variables (update these to match your setup)
RESOURCE_GROUP="your-pokemon-game-resource-group"
LOCATION="eastus"  # or your preferred region
APP_INSIGHTS_NAME="pokemon-game-insights"

# Create Application Insights resource
echo "Creating Application Insights resource..."
az extension add --name application-insights

az monitor app-insights component create \
  --app $APP_INSIGHTS_NAME \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --application-type web \
  --retention-time 90

# Get the connection string
echo "Getting connection string..."
CONNECTION_STRING=$(az monitor app-insights component show \
  --app $APP_INSIGHTS_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "connectionString" \
  --output tsv)

echo ""
echo "🎉 Application Insights created successfully!"
echo ""
echo "Connection String:"
echo "$CONNECTION_STRING"
echo ""
echo "📋 Copy this connection string to your .env file:"
echo "REACT_APP_APPINSIGHTS_CONNECTION_STRING=$CONNECTION_STRING"
