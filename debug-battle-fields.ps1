# Debug Battle Database Fields
# This script will query the Dataverse API to examine the battle table structure

Write-Host "🔍 Debug Battle Database Fields" -ForegroundColor Green

# Battle ID that we know has Player 2 set correctly
$battleId = "34db8361-4a72-f011-b4cb-7c1e5250e283"
$baseUrl = "https://pokemongame-functions-2025.azurewebsites.net/api/dataverse"

Write-Host "📡 Querying battle: $battleId" -ForegroundColor Yellow

# You'll need to get the auth token from the browser console
Write-Host "❗ Please get the auth token from browser console:" -ForegroundColor Red
Write-Host "   1. Open browser console on any authenticated page" -ForegroundColor White
Write-Host "   2. Run: AuthService.getCurrentUser().token" -ForegroundColor White
Write-Host "   3. Copy the token and paste it here" -ForegroundColor White

$token = Read-Host "🔑 Enter auth token"

if ([string]::IsNullOrEmpty($token)) {
    Write-Host "❌ No token provided" -ForegroundColor Red
    exit
}

try {
    # Query the specific battle
    $headers = @{
        'Authorization' = "Bearer $token"
        'X-User-Email' = 'thomas@sandsor.dk'
    }
    
    $url = "$baseUrl/pokemon_battles($battleId)"
    Write-Host "🌐 URL: $url" -ForegroundColor Cyan
    
    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
    
    Write-Host "✅ Battle data retrieved successfully" -ForegroundColor Green
    Write-Host "" 
    
    # Show all properties
    Write-Host "📋 All Battle Properties:" -ForegroundColor Yellow
    $response.PSObject.Properties | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Value)" -ForegroundColor White
    }
    
    Write-Host ""
    
    # Filter for Pokemon-related fields
    Write-Host "🐾 Pokemon-related fields:" -ForegroundColor Yellow
    $pokemonFields = $response.PSObject.Properties | Where-Object { $_.Name -like "*pokemon*" }
    $pokemonFields | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Value)" -ForegroundColor Cyan
    }
    
    Write-Host ""
    
    # Filter for winner/loser fields
    Write-Host "🏆 Winner/Loser-related fields:" -ForegroundColor Yellow
    $winnerFields = $response.PSObject.Properties | Where-Object { 
        $_.Name -like "*winner*" -or $_.Name -like "*loser*" -or $_.Name -like "*win*" -or $_.Name -like "*lose*"
    }
    
    if ($winnerFields.Count -gt 0) {
        $winnerFields | ForEach-Object {
            Write-Host "  $($_.Name): $($_.Value)" -ForegroundColor Green
        }
    } else {
        Write-Host "  No winner/loser fields found" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error querying battle: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
