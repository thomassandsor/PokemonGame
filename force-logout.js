// FORCE LOGOUT AND REDIRECT TO REAL MICROSOFT LOGIN
console.log('🚨 FORCING LOGOUT...');

// Use the enhanced logout method
if (typeof AuthService !== 'undefined') {
    AuthService.forceLogoutAndRedirect();
} else {
    // Manual cleanup if AuthService isn't available
    console.log('AuthService not available, doing manual cleanup...');
    
    // Clear all storage
    sessionStorage.clear();
    localStorage.clear();
    
    // Redirect to Microsoft login
    window.location.href = 'https://pokemongame-functions-2025.azurewebsites.net/api/microsoftlogin';
}
