// Clear fake authentication and redirect to proper Microsoft login
console.log('🚨 CLEARING FAKE AUTHENTICATION...');

// Clear all authentication data
sessionStorage.removeItem('pokemonGame_user');
sessionStorage.removeItem('pokemonGame_authenticated');
localStorage.removeItem('pokemonGame_user');
localStorage.removeItem('pokemonGame_authenticated');

// Clear any other session data
Object.keys(sessionStorage).forEach(key => {
    if (key.includes('pokemon') || key.includes('auth')) {
        sessionStorage.removeItem(key);
    }
});

console.log('✅ Fake authentication cleared');
console.log('🔑 Redirecting to REAL Microsoft authentication...');

// Redirect to proper Microsoft login
window.location.href = 'https://pokemongame-functions-2025.azurewebsites.net/api/microsoftlogin';
