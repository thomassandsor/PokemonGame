// URL-based emergency access for mobile devices without dev tools access
export class MobileEmergencyURL {
  
  static init() {
    // Check URL parameters on page load for emergency commands
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    
    // Emergency parameter handling
    if (urlParams.has('emergency')) {
      const command = urlParams.get('emergency');
      this.handleEmergencyCommand(command);
    }
    
    // Hash-based emergency commands (work even when URL params are cleared)
    if (hash.includes('#emergency-')) {
      const command = hash.replace('#emergency-', '');
      this.handleEmergencyCommand(command);
    }
    
    // Auto-detect infinite loops and show emergency options
    this.detectAndShowEmergencyOptions();
  }
  
  static handleEmergencyCommand(command: string | null) {
    if (!command) return;
    
    console.log(`🚨 Processing emergency command: ${command}`);
    
    switch (command.toLowerCase()) {
      case 'stop':
      case 'clear':
      case 'reset':
        this.showEmergencyStopOption();
        break;
      case 'debug':
      case 'status':
        this.showMobileDebugOptions();
        break;
      default:
        this.showEmergencyMenu();
    }
  }
  
  static showEmergencyStopOption() {
    // Create a full-screen emergency stop interface
    const emergency = document.createElement('div');
    emergency.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #dc3545;
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      text-align: center;
      padding: 20px;
    `;
    
    emergency.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 20px;">🚨</div>
      <h1 style="font-size: 24px; margin-bottom: 20px;">Authentication Loop Detected</h1>
      <p style="font-size: 18px; margin-bottom: 30px; max-width: 400px;">
        The app appears to be stuck in an authentication loop. 
        Do you want to clear all authentication data and restart?
      </p>
      
      <button onclick="window.mobileEmergencyURL.performEmergencyStop()" 
              style="background: white; color: #dc3545; border: none; padding: 15px 30px; 
                     font-size: 18px; border-radius: 8px; margin: 10px; cursor: pointer;">
        🧹 Clear Auth Data & Restart
      </button>
      
      <button onclick="window.mobileEmergencyURL.showDiagnostics()" 
              style="background: transparent; color: white; border: 2px solid white; 
                     padding: 15px 30px; font-size: 18px; border-radius: 8px; margin: 10px; cursor: pointer;">
        🔍 Show Diagnostics First
      </button>
      
      <button onclick="this.parentElement.remove()" 
              style="background: transparent; color: white; border: 1px solid white; 
                     padding: 10px 20px; font-size: 16px; border-radius: 8px; margin: 10px; cursor: pointer;">
        ❌ Cancel
      </button>
      
      <div style="margin-top: 30px; font-size: 14px; opacity: 0.8;">
        <p>Emergency URL Access Available:</p>
        <p><strong>Add to URL:</strong> ?emergency=stop</p>
        <p><strong>Or hash:</strong> #emergency-stop</p>
      </div>
    `;
    
    document.body.appendChild(emergency);
    
    // Track this emergency access
    if ((window as any).appInsightsLogger) {
      (window as any).appInsightsLogger.trackEvent('Emergency_URL_Access', {
        command: 'stop',
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    }
  }
  
  static showMobileDebugOptions() {
    const debug = document.createElement('div');
    debug.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #17a2b8;
      color: white;
      overflow-y: auto;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 20px;
    `;
    
    // Get current diagnostic info
    const msalInstance = (window as any)._pokemonGameMsalInstance;
    const accounts = msalInstance ? msalInstance.getAllAccounts() : [];
    const initAttempts = sessionStorage.getItem('msalInitAttempts') || '0';
    
    debug.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 32px; margin-bottom: 10px;">🔍</div>
        <h1 style="font-size: 24px;">Mobile Debug Information</h1>
      </div>
      
      <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h3>Current Status</h3>
        <p><strong>URL:</strong> ${window.location.href}</p>
        <p><strong>User Agent:</strong> ${navigator.userAgent}</p>
        <p><strong>MSAL Instance:</strong> ${msalInstance ? 'Present' : 'Missing'}</p>
        <p><strong>Accounts:</strong> ${accounts.length}</p>
        <p><strong>Init Attempts:</strong> ${initAttempts}</p>
        <p><strong>Has Auth Params:</strong> ${window.location.hash.includes('id_token') || window.location.search.includes('code')}</p>
      </div>
      
      <div style="display: flex; flex-direction: column; gap: 15px;">
        <button onclick="window.mobileEmergencyURL.performEmergencyStop()" 
                style="background: #dc3545; color: white; border: none; padding: 15px; 
                       font-size: 18px; border-radius: 8px; cursor: pointer;">
          🚨 Emergency Stop
        </button>
        
        <button onclick="window.mobileEmergencyURL.clearAuthOnly()" 
                style="background: #ffc107; color: #212529; border: none; padding: 15px; 
                       font-size: 18px; border-radius: 8px; cursor: pointer;">
          🧹 Clear Auth Data Only
        </button>
        
        <button onclick="window.mobileEmergencyURL.testNavigation()" 
                style="background: #28a745; color: white; border: none; padding: 15px; 
                       font-size: 18px; border-radius: 8px; cursor: pointer;">
          🧭 Test Navigation
        </button>
        
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: transparent; color: white; border: 2px solid white; 
                       padding: 15px; font-size: 18px; border-radius: 8px; cursor: pointer;">
          ❌ Close Debug
        </button>
      </div>
    `;
    
    document.body.appendChild(debug);
  }
  
  static performEmergencyStop() {
    // Clear all auth data
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.includes('msal') || key.includes('auth')) {
          localStorage.removeItem(key);
        }
      });
      
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('msal') || key.includes('auth')) {
          sessionStorage.removeItem(key);
        }
      });
      
      (window as any)._pokemonGameMsalInstance = null;
      (window as any)._pokemonGameMsalInitializing = false;
      
      // Show success message
      this.showSuccessMessage('Authentication data cleared successfully!', 'Redirecting to login page...');
      
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      
    } catch (error) {
      this.showErrorMessage('Failed to clear authentication data', 'Try manually clearing browser data');
    }
  }
  
  static clearAuthOnly() {
    // Just clear auth without redirect
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.includes('msal') || key.includes('auth')) {
          localStorage.removeItem(key);
        }
      });
      
      sessionStorage.removeItem('msalInitAttempts');
      
      this.showSuccessMessage('Authentication cache cleared', 'Try refreshing the page');
      
    } catch (error) {
      this.showErrorMessage('Failed to clear cache', 'Browser may be blocking storage access');
    }
  }
  
  static testNavigation() {
    // Test if navigation works
    this.showInfoMessage('Testing navigation...', 'Attempting to navigate to main page');
    
    setTimeout(() => {
      try {
        window.location.href = '/my-page';
      } catch (error) {
        this.showErrorMessage('Navigation failed', 'App routing may be broken');
      }
    }, 1000);
  }
  
  static showSuccessMessage(title: string, message: string) {
    this.showMessage(title, message, '#28a745', '✅');
  }
  
  static showErrorMessage(title: string, message: string) {
    this.showMessage(title, message, '#dc3545', '🚨');
  }
  
  static showInfoMessage(title: string, message: string) {
    this.showMessage(title, message, '#17a2b8', 'ℹ️');
  }
  
  static showMessage(title: string, message: string, color: string, icon: string) {
    const msg = document.createElement('div');
    msg.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${color};
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      z-index: 9999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    msg.innerHTML = `
      <div style="font-size: 32px; margin-bottom: 10px;">${icon}</div>
      <h3 style="margin-bottom: 10px;">${title}</h3>
      <p>${message}</p>
    `;
    
    document.body.appendChild(msg);
    
    setTimeout(() => {
      if (msg.parentNode) {
        msg.remove();
      }
    }, 3000);
  }
  
  static detectAndShowEmergencyOptions() {
    // Auto-detect if we might be in a loop
    const initAttempts = parseInt(sessionStorage.getItem('msalInitAttempts') || '0', 10);
    const hasAuthParams = window.location.hash.includes('id_token') || window.location.search.includes('code');
    const isStuckOnLogin = window.location.pathname === '/login' || window.location.pathname === '/';
    
    // If we detect potential issues, show a help button
    if (initAttempts > 3 || (hasAuthParams && isStuckOnLogin)) {
      setTimeout(() => {
        this.showHelpButton();
      }, 3000); // Show after 3 seconds if user seems stuck
    }
  }
  
  static showHelpButton() {
    // Don't show if already shown
    if (document.getElementById('mobile-emergency-help')) return;
    
    const helpButton = document.createElement('div');
    helpButton.id = 'mobile-emergency-help';
    helpButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #dc3545;
      color: white;
      padding: 15px;
      border-radius: 50%;
      font-size: 24px;
      cursor: pointer;
      z-index: 999999;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      animation: pulse 2s infinite;
    `;
    
    helpButton.innerHTML = '🆘';
    helpButton.onclick = () => this.showEmergencyMenu();
    
    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(helpButton);
  }
  
  static showEmergencyMenu() {
    this.showEmergencyStopOption();
  }
}

// Initialize immediately and make globally available
(window as any).mobileEmergencyURL = MobileEmergencyURL;
MobileEmergencyURL.init();
