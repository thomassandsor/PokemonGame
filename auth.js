// Authentication Service for Pokemon Game
class AuthService {
    static currentUser = null;
    static isAuthenticatedFlag = false;

    // Check if we're in development mode
    static isDevelopmentMode() {
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    }

    // Development mode login bypass
    static loginDevelopmentMode() {
        console.log('AUTH: loginDevelopmentMode called');
        console.log('AUTH: isDevelopmentMode check:', this.isDevelopmentMode());
        
        if (this.isDevelopmentMode()) {
            console.log('AUTH: Development mode confirmed, creating dev user');
            const devUser = {
                email: 'dev@localhost.com',
                name: 'Development User',
                token: 'dev-token-123',
                userId: 'dev-user-123'
            };
            console.log('AUTH: Created dev user:', devUser);
            console.log('AUTH: Calling setAuthenticatedUser...');
            this.setAuthenticatedUser(devUser);
            console.log('AUTH: setAuthenticatedUser completed');
            return devUser;
        } else {
            console.log('AUTH: Not in development mode, returning null');
        }
        return null;
    }

    // Set authenticated user and store in session
    static setAuthenticatedUser(user) {
        console.log('AUTH: Setting authenticated user:', user);
        this.currentUser = user;
        this.isAuthenticatedFlag = true;
        
        // Store in sessionStorage for persistence
        sessionStorage.setItem('pokemonGame_user', JSON.stringify(user));
        sessionStorage.setItem('pokemonGame_authenticated', 'true');
        
        console.log('AUTH: User authentication complete');
    }

    // Get current authenticated user
    static getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is authenticated
    static isAuthenticated() {
        return this.isAuthenticatedFlag && this.currentUser !== null;
    }

    // Restore authentication from session storage
    static async restoreAuthFromSession() {
        console.log('AUTH: Attempting to restore authentication from session...');
        
        try {
            const storedUser = sessionStorage.getItem('pokemonGame_user');
            const isAuthenticated = sessionStorage.getItem('pokemonGame_authenticated');
            
            console.log('AUTH: Stored user data:', storedUser);
            console.log('AUTH: Stored auth flag:', isAuthenticated);
            
            if (storedUser && isAuthenticated === 'true') {
                const user = JSON.parse(storedUser);
                console.log('AUTH: Restored user from session:', user);
                
                // Skip token verification for localhost development due to CORS
                if (window.location.hostname === 'localhost') {
                    console.log('AUTH: Localhost detected, skipping token verification');
                    this.currentUser = user;
                    this.isAuthenticatedFlag = true;
                    console.log('AUTH: Session restoration successful (localhost)');
                    return user;
                } else {
                    console.log('AUTH: Production environment, validating token with backend...');
                    // Validate the token with the backend
                    const isValid = await this.verifyUserToken(user.token);
                    
                    if (isValid) {
                        this.currentUser = user;
                        this.isAuthenticatedFlag = true;
                        console.log('AUTH: Session restoration successful (token validated)');
                        return user;
                    } else {
                        console.log('AUTH: Token validation failed, clearing session and redirecting to login');
                        this.logout();
                        // Redirect to proper Microsoft login
                        window.location.href = 'https://pokemongame-functions-2025.azurewebsites.net/api/microsoftlogin';
                        return null;
                    }
                }
            } else {
                console.log('AUTH: No valid session found');
                return null;
            }
        } catch (error) {
            console.error('AUTH: Error restoring session:', error);
            this.logout();
            return null;
        }
    }

    // Verify user token with backend
    static async verifyUserToken(token) {
        try {
            console.log('AUTH: Verifying token with backend...');
            
            const response = await fetch('https://pokemongame-functions-2025.azurewebsites.net/api/whoami', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                console.log('AUTH: Token verification successful:', userData);
                return true;
            } else {
                console.log('AUTH: Token verification failed:', response.status);
                return false;
            }
        } catch (error) {
            console.error('AUTH: Token verification error:', error);
            return false;
        }
    }

    // Check authentication status (used by other pages)
    static async checkAuth() {
        console.log('AUTH: Checking authentication status...');
        
        // First try to restore from session
        await this.restoreAuthFromSession();
        
        if (this.isAuthenticated()) {
            console.log('AUTH: User is authenticated');
            return this.currentUser;
        } else {
            console.log('AUTH: User is not authenticated');
            return null;
        }
    }

    // Logout user
    static logout() {
        console.log('AUTH: Logging out user...');
        
        this.currentUser = null;
        this.isAuthenticatedFlag = false;
        
        // Clear session storage
        sessionStorage.removeItem('pokemonGame_user');
        sessionStorage.removeItem('pokemonGame_authenticated');
        
        // Clear local storage too (just in case)
        localStorage.removeItem('pokemonGame_user');
        localStorage.removeItem('pokemonGame_authenticated');
        
        // Clear any other Pokemon-related storage
        Object.keys(sessionStorage).forEach(key => {
            if (key.includes('pokemon') || key.includes('auth')) {
                sessionStorage.removeItem(key);
            }
        });
        
        console.log('AUTH: Logout complete');
    }

    // Force logout and redirect to proper login
    static forceLogoutAndRedirect() {
        console.log('AUTH: Force logout and redirect to Microsoft login...');
        this.logout();
        window.location.href = 'https://pokemongame-functions-2025.azurewebsites.net/api/microsoftlogin';
    }

    // Get user's email (commonly needed for API calls)
    static getUserEmail() {
        return this.currentUser ? this.currentUser.email : null;
    }

    // Get user's token (for API calls)
    static getUserToken() {
        return this.currentUser ? this.currentUser.token : null;
    }
}

// Make it available globally
window.AuthService = AuthService;
