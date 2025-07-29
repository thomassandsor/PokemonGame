// Debug script to check local authentication
console.log('=== LOCAL AUTHENTICATION DEBUG ===');

// Check current authentication
const authUser = AuthService.getCurrentUser();
console.log('Current user:', authUser);
console.log('Is authenticated:', AuthService.isAuthenticated());

if (authUser && authUser.token) {
    console.log('Token type:', typeof authUser.token);
    console.log('Token length:', authUser.token.length);
    console.log('Token preview:', authUser.token.substring(0, 100) + '...');
    
    // Check if it's a Microsoft access token vs dev token
    if (authUser.token.startsWith('eyJ')) {
        console.log('✅ This appears to be a real JWT token');
    } else if (authUser.token === 'dev-token-123') {
        console.log('⚠️ This is a development token, might not work with secure backend');
    } else {
        console.log('🔍 Token format:', authUser.token.substring(0, 20));
    }
    
    // Test local Azure Functions health
    console.log('=== TESTING LOCAL AZURE FUNCTIONS ===');
    fetch('http://localhost:7071/api/health')
        .then(response => {
            console.log('Local health endpoint status:', response.status);
            return response.text();
        })
        .then(data => console.log('Local health response:', data))
        .catch(error => console.error('Local health error:', error));
        
    // Test authentication with local backend
    fetch('http://localhost:7071/api/whoami', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${authUser.token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('Local WhoAmI status:', response.status);
        return response.text();
    })
    .then(data => console.log('Local WhoAmI response:', data))
    .catch(error => console.error('Local WhoAmI error:', error));
} else {
    console.log('❌ No authentication token found');
}
