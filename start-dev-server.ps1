Write-Host "🎮 Starting Pokemon Game Development Server..." -ForegroundColor Green
Write-Host ""
Write-Host "⚡ This will:" -ForegroundColor Yellow
Write-Host "  - Serve your HTML files from project root"
Write-Host "  - Proxy API calls to Azure Functions (no CORS issues!)"
Write-Host "  - Allow instant testing of changes (just refresh browser)"
Write-Host ""
Write-Host "🌐 Your game will be at: http://localhost:8080" -ForegroundColor Cyan
Write-Host ""

try {
    python dev-tools\dev-server.py
} catch {
    Write-Host "❌ Error starting server. Make sure Python is installed." -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
