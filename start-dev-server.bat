@echo off
echo 🎮 Starting Pokemon Game Development Server...
echo.
echo ⚡ This will:
echo   - Serve your HTML files from project root
echo   - Proxy API calls to Azure Functions (no CORS issues!)
echo   - Allow instant testing of changes (just refresh browser)
echo.
echo 🌐 Your game will be at: http://localhost:8080
echo.
python dev-tools\dev-server.py
pause
