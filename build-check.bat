@echo off
echo Building Azure Functions project...
dotnet build api/api.csproj

if %ERRORLEVEL% EQU 0 (
    echo ✅ Build successful! Ready to deploy.
) else (
    echo ❌ Build failed! Fix errors before deploying.
    exit /b 1
)
