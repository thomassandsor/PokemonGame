#!/bin/bash
echo "Building Azure Functions project..."
dotnet build api/api.csproj

if [ $? -eq 0 ]; then
    echo "✅ Build successful! Ready to deploy."
else
    echo "❌ Build failed! Fix errors before deploying."
    exit 1
fi
