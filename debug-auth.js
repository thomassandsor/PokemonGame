// Debug script to check authentication status
console.log('=== AUTHENTICATION DEBUG ===');
console.log('Current user:', AuthService.getCurrentUser());
console.log('Is authenticated:', AuthService.isAuthenticated());
console.log('Development mode:', AuthService.isDevelopmentMode());
console.log('Current hostname:', window.location.hostname);
console.log('Base URL:', PokemonService.baseUrl);

// Check sessionStorage
console.log('=== SESSION STORAGE ===');
console.log('Stored user:', sessionStorage.getItem('pokemonGame_user'));
console.log('Stored auth flag:', sessionStorage.getItem('pokemonGame_authenticated'));

// Test a simple API call
console.log('=== TESTING API CALL ===');
const authUser = AuthService.getCurrentUser();
if (authUser && authUser.token) {
    console.log('Token preview:', authUser.token.substring(0, 50) + '...');
    
    // Test the health endpoint first
    fetch('https://pokemongame-functions-2025.azurewebsites.net/api/health')
        .then(response => {
            console.log('Health endpoint status:', response.status);
            return response.text();
        })
        .then(data => console.log('Health endpoint response:', data))
        .catch(error => console.error('Health endpoint error:', error));
    
    // Test an authenticated endpoint
    fetch('https://pokemongame-functions-2025.azurewebsites.net/api/dataverse/pokemon_pokemons?%24top=5', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${authUser.token}`,
            'Content-Type': 'application/json',
            'X-User-Email': authUser.email
        }
    })
    .then(response => {
        console.log('Pokemon API status:', response.status);
        console.log('Pokemon API headers:', response.headers);
        return response.text();
    })
    .then(data => console.log('Pokemon API response:', data))
    .catch(error => console.error('Pokemon API error:', error));
} else {
    console.log('No authentication token found');
}
