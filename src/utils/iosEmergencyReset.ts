/**
 * iOS Emergency Reset System
 * Provides simple URL-based emergency actions that work on iOS/Safari
 * without requiring dev tools or complex JavaScript
 */

export class IOSEmergencyReset {
    private static readonly EMERGENCY_PARAMS = {
        LOGOUT: 'emergency_logout',
        CLEAR_ALL: 'emergency_clear_all',
        FORCE_RESTART: 'emergency_restart',
        REDIRECT_HOME: 'emergency_home',
        SHOW_DEBUG: 'emergency_debug'
    };

    static init(): void {
        // Check URL parameters immediately on load
        const urlParams = new URLSearchParams(window.location.search);
        
        // Log to console for debugging
        console.log('iOS Emergency Reset - Checking URL params:', Array.from(urlParams.entries()));
        
        // Handle each emergency parameter
        if (urlParams.has(this.EMERGENCY_PARAMS.LOGOUT)) {
            this.handleEmergencyLogout();
            return;
        }
        
        if (urlParams.has(this.EMERGENCY_PARAMS.CLEAR_ALL)) {
            this.handleClearAll();
            return;
        }
        
        if (urlParams.has(this.EMERGENCY_PARAMS.FORCE_RESTART)) {
            this.handleForceRestart();
            return;
        }
        
        if (urlParams.has(this.EMERGENCY_PARAMS.REDIRECT_HOME)) {
            this.handleRedirectHome();
            return;
        }
        
        if (urlParams.has(this.EMERGENCY_PARAMS.SHOW_DEBUG)) {
            this.showDebugInfo();
            return;
        }
    }

    private static handleEmergencyLogout(): void {
        try {
            console.log('iOS Emergency: Performing logout...');
            
            // Clear all localStorage
            localStorage.clear();
            
            // Clear all sessionStorage
            sessionStorage.clear();
            
            // Clear MSAL cache
            const msalKeys = Object.keys(localStorage).filter(key => 
                key.includes('msal') || key.includes('MSAL') || key.includes('authority')
            );
            msalKeys.forEach(key => localStorage.removeItem(key));
            
            // Show success message
            document.body.innerHTML = `
                <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
                    <h2 style="color: green;">✅ Emergency Logout Complete</h2>
                    <p>All authentication data has been cleared.</p>
                    <p><strong>Next steps:</strong></p>
                    <ol style="text-align: left; max-width: 400px; margin: 0 auto;">
                        <li>Close this browser tab completely</li>
                        <li>Close all other Pokémon Game tabs</li>
                        <li>Clear Safari cache: Settings → Safari → Clear History and Website Data</li>
                        <li>Wait 10 seconds</li>
                        <li>Open a new tab and go to the Pokémon Game URL (without any ?emergency parameters)</li>
                    </ol>
                    <br>
                    <button onclick="window.close()" style="padding: 10px 20px; background: #007cba; color: white; border: none; border-radius: 5px;">
                        Close This Tab
                    </button>
                </div>
            `;
            
        } catch (error) {
            console.error('Emergency logout failed:', error);
            alert('Emergency logout failed. Please manually clear Safari data.');
        }
    }

    private static handleClearAll(): void {
        try {
            console.log('iOS Emergency: Clearing all data...');
            
            // Clear everything
            localStorage.clear();
            sessionStorage.clear();
            
            // Clear cookies if possible
            document.cookie.split(";").forEach(cookie => {
                const eqPos = cookie.indexOf("=");
                const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
            });
            
            document.body.innerHTML = `
                <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
                    <h2 style="color: orange;">🧹 Emergency Clear Complete</h2>
                    <p>All browser data has been cleared.</p>
                    <p>The page will automatically reload in 3 seconds...</p>
                    <div id="countdown" style="font-size: 24px; font-weight: bold;">3</div>
                </div>
            `;
            
            let countdown = 3;
            const interval = setInterval(() => {
                countdown--;
                const element = document.getElementById('countdown');
                if (element) element.textContent = countdown.toString();
                
                if (countdown <= 0) {
                    clearInterval(interval);
                    window.location.href = window.location.origin;
                }
            }, 1000);
            
        } catch (error) {
            console.error('Emergency clear failed:', error);
            alert('Emergency clear failed. Please reload the page manually.');
        }
    }

    private static handleForceRestart(): void {
        console.log('iOS Emergency: Force restarting...');
        
        // Clear authentication data
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirect to home without any parameters
        window.location.href = window.location.origin;
    }

    private static handleRedirectHome(): void {
        console.log('iOS Emergency: Redirecting to home...');
        window.location.href = window.location.origin;
    }

    private static showDebugInfo(): void {
        const userAgent = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(userAgent);
        const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
        
        const debugInfo = {
            timestamp: new Date().toISOString(),
            userAgent,
            isIOS,
            isSafari,
            localStorage: Object.keys(localStorage),
            sessionStorage: Object.keys(sessionStorage),
            url: window.location.href,
            referrer: document.referrer,
            cookies: document.cookie
        };
        
        document.body.innerHTML = `
            <div style="padding: 20px; font-family: monospace; font-size: 12px;">
                <h2>📱 iOS Debug Info</h2>
                <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px; white-space: pre-wrap; word-wrap: break-word;">
${JSON.stringify(debugInfo, null, 2)}
                </pre>
                <br>
                <h3>Emergency URLs (tap to use):</h3>
                <div style="margin: 10px 0;">
                    <a href="?${this.EMERGENCY_PARAMS.LOGOUT}=true" style="display: block; padding: 10px; background: #ff6b6b; color: white; text-decoration: none; margin: 5px 0; border-radius: 5px;">
                        🚨 Emergency Logout
                    </a>
                    <a href="?${this.EMERGENCY_PARAMS.CLEAR_ALL}=true" style="display: block; padding: 10px; background: #ffa500; color: white; text-decoration: none; margin: 5px 0; border-radius: 5px;">
                        🧹 Clear All Data
                    </a>
                    <a href="?${this.EMERGENCY_PARAMS.FORCE_RESTART}=true" style="display: block; padding: 10px; background: #4ecdc4; color: white; text-decoration: none; margin: 5px 0; border-radius: 5px;">
                        🔄 Force Restart
                    </a>
                    <a href="${window.location.origin}" style="display: block; padding: 10px; background: #45b7d1; color: white; text-decoration: none; margin: 5px 0; border-radius: 5px;">
                        🏠 Go Home (Clean)
                    </a>
                </div>
            </div>
        `;
    }

    // Generate emergency URLs that can be bookmarked or shared
    static generateEmergencyURLs(): Record<string, string> {
        const base = window.location.origin + window.location.pathname;
        
        return {
            logout: `${base}?${this.EMERGENCY_PARAMS.LOGOUT}=true`,
            clearAll: `${base}?${this.EMERGENCY_PARAMS.CLEAR_ALL}=true`,
            forceRestart: `${base}?${this.EMERGENCY_PARAMS.FORCE_RESTART}=true`,
            redirectHome: `${base}?${this.EMERGENCY_PARAMS.REDIRECT_HOME}=true`,
            showDebug: `${base}?${this.EMERGENCY_PARAMS.SHOW_DEBUG}=true`
        };
    }
}

// Auto-initialize on import
IOSEmergencyReset.init();
