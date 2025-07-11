// LOGIN FUNCTIONALITY ONLY
document.addEventListener('DOMContentLoaded', function() {
    console.log('LOGIN: Page loaded, checking for auth callback...');
    
    // Check if this is a callback from Azure Functions with token
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const email = urlParams.get('email');
    const name = urlParams.get('name');
    
    if (token && email) {
        console.log('LOGIN: Auth callback detected from Azure website...');
        console.log('LOGIN: Token:', token);
        console.log('LOGIN: Email:', email);
        console.log('LOGIN: Name:', name);
        
        // Set the user as authenticated
        authService.setAuthenticatedUser({
            email: decodeURIComponent(email),
            name: decodeURIComponent(name),
            token: token,
            loginTime: new Date().toISOString()
        });
        
        console.log('LOGIN: User authenticated, redirecting to My Pokemon...');
        window.location.href = 'my-pokemon.html';
        return;
    }
    
    // Check if we're running on localhost and user just came back from Azure site
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Try to check authentication status with Azure Functions
        checkAuthStatus();
    }
    
    // Normal login button setup
    setTimeout(function() {
        const loginBtn = document.getElementById('loginBtn');
        console.log('LOGIN: Button element:', loginBtn);
        
        if (loginBtn) {
            console.log('LOGIN: Found login button, setting up click handler');
            loginBtn.onclick = function() {
                console.log('LOGIN: Button clicked, starting login...');
                authService.login();
            };
            console.log('LOGIN: Button handler set successfully');
        } else {
            console.error('LOGIN: Button with ID "loginBtn" not found');
        }
    }, 100);
});

async function checkAuthStatus() {
    console.log('LOGIN: Checking if user is already authenticated...');
    
    try {
        const isAuthenticated = await authService.checkAuth();
        
        if (isAuthenticated) {
            console.log('LOGIN: User is authenticated, redirecting to My Pokemon...');
            window.location.href = 'my-pokemon.html';
        } else {
            console.log('LOGIN: User not authenticated, staying on login page');
        }
    } catch (error) {
        console.log('LOGIN: Auth check failed, staying on login page');
    }
}
