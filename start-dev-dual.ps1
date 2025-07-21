Write-Host "🎮 Pokemon Game Dual-Mode Development Server" -ForegroundColor Green
Write-Host ""
Write-Host "⚡ Choose your development mode:" -ForegroundColor Yellow
Write-Host "  [L] LOCAL - Fast testing with local Azure Functions (localhost:7071)"
Write-Host "  [R] LIVE - Test against real Azure (for mobile testing)"
Write-Host ""

$choice = Read-Host "Enter L for Local or R for Live (default: L)"

if ($choice -eq "" -or $choice.ToUpper() -eq "L") {
    $useLocal = "True"
    $mode = "LOCAL FUNCTIONS"
    Write-Host "🔧 Setting up LOCAL mode..." -ForegroundColor Cyan
} else {
    $useLocal = "False"
    $mode = "LIVE AZURE"
    Write-Host "☁️ Setting up LIVE mode..." -ForegroundColor Cyan
}

# Update the dev server configuration
$devServerPath = "dev-tools\dev-server-dual.py"
$content = Get-Content $devServerPath -Raw
$content = $content -replace "USE_LOCAL_FUNCTIONS = (True|False)", "USE_LOCAL_FUNCTIONS = $useLocal"
Set-Content -Path $devServerPath -Value $content

Write-Host ""
Write-Host "🌐 Your game will be at: http://localhost:8080" -ForegroundColor Green
Write-Host "📡 API Mode: $mode" -ForegroundColor Yellow
Write-Host ""

if ($useLocal -eq "True") {
    Write-Host "⚠️  Make sure Azure Functions are running locally:" -ForegroundColor Yellow
    Write-Host "   cd api && func start --port 7071" -ForegroundColor Gray
    Write-Host ""
}

try {
    python dev-tools\dev-server-dual.py
} catch {
    Write-Host "❌ Error starting server. Make sure Python is installed." -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
