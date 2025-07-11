// Authentication Service - Keeps your existing Azure Functions security
class AuthService {
    constructor() {
        this.baseURL = 'https://pokemongame-functions-2025.azurewebsites.net/api';
        this.user = null;
        this.authenticated = false;
        this.loading = false;
        
        // Restore authentication from session on startup
        this.restoreAuthFromSession();
    }

    // Check session storage on page load
    restoreAuthFromSession() {
        console.log('AUTH: Restoring authentication from session...');
        
        const authUser = sessionStorage.getItem('authUser');
        const authenticated = sessionStorage.getItem('authenticated');
        
        if (authUser && authenticated === 'true') {
            console.log('AUTH: Found existing session, restoring user...');
            this.user = JSON.parse(authUser);
            this.authenticated = true;
            return true;
        }
        
        console.log('AUTH: No valid session found');
        return false;
    }

    async checkAuth() {
        // First check session storage
        if (this.restoreAuthFromSession()) {
            console.log('AUTH: Using session authentication');
            return true;
        }
        
        try {
            this.loading = true;
            const response = await fetch(`${this.baseURL}/whoami`, {
                credentials: 'include' // Include cookies for session
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    this.user = {
                        email: data.email,
                        name: data.name,
                        pokemonCount: data.pokemonCount || 0,
                        level: data.level || 1,
                        lastPlayed: data.lastPlayed || new Date().toISOString(),
                        loginTime: data.loginTime || new Date().toISOString()
                    };
                    this.authenticated = true;
                    
                    // Store in session
                    sessionStorage.setItem('authUser', JSON.stringify(this.user));
                    sessionStorage.setItem('authenticated', 'true');
                    
                    return true;
                }
            }
            
            this.user = null;
            this.authenticated = false;
            return false;
        } catch (error) {
            console.error('Auth check failed:', error);
            this.user = null;
            this.authenticated = false;
            return false;
        } finally {
            this.loading = false;
        }
    }

    async login() {
        try {
            // Store the current localhost URL so we can return here
            sessionStorage.setItem('originalUrl', window.location.origin);
            
            // Redirect to your Azure Functions OAuth login
            // Don't specify returnUrl - let it go through the normal flow
            window.location.href = `${this.baseURL}/MicrosoftLogin`;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    async logout() {
        try {
            const response = await fetch(`${this.baseURL}/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            
            this.user = null;
            this.authenticated = false;
            
            // Clear session storage
            sessionStorage.removeItem('authUser');
            sessionStorage.removeItem('authenticated');
            sessionStorage.removeItem('authToken');
            
            // Redirect to login page
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout failed:', error);
            // Force redirect anyway
            this.user = null;
            this.authenticated = false;
            sessionStorage.clear();
            window.location.href = 'index.html';
        }
    }

    // Set authenticated user from callback
    setAuthenticatedUser(userData) {
        console.log('AUTH: Setting authenticated user:', userData);
        this.user = {
            email: userData.email,
            name: userData.name,
            token: userData.token,
            pokemonCount: userData.pokemonCount || 0,
            level: userData.level || 1,
            lastPlayed: userData.lastPlayed || new Date().toISOString(),
            loginTime: userData.loginTime || new Date().toISOString()
        };
        this.authenticated = true;
        
        // Store in session storage for persistence
        sessionStorage.setItem('authUser', JSON.stringify(this.user));
        sessionStorage.setItem('authenticated', 'true');
        sessionStorage.setItem('authToken', userData.token);
        
        console.log('AUTH: User authenticated and stored in session');
    }

    // Get user info
    getUser() {
        return this.user;
    }

    isAuthenticated() {
        return this.authenticated;
    }

    isLoading() {
        return this.loading;
    }

    // Demo mode for testing without authentication
    enableDemoMode() {
        this.user = {
            email: 'demo@pokemon.com',
            name: 'Demo Trainer',
            pokemonCount: 3,
            level: 5,
            lastPlayed: new Date().toISOString(),
            loginTime: new Date().toISOString()
        };
        this.authenticated = true;
        
        // Store demo flag
        localStorage.setItem('demoMode', 'true');
        
        // Redirect to main app
        window.location.href = 'my-pokemon.html';
    }

    isDemoMode() {
        return localStorage.getItem('demoMode') === 'true';
    }
}

// Global auth service instance
window.authService = new AuthService();
