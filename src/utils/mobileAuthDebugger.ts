// Mobile authentication debugging utility
import { appInsightsLogger } from './appInsightsLogger';

export class MobileAuthDebugger {
  private static logs: string[] = [];

  static log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    
    // Store in memory for later retrieval
    this.logs.push(logEntry);
    
    // Also log to console
    console.log(logEntry, data || '');
    
    // Send to Application Insights
    appInsightsLogger.trackTrace(`Mobile Debug: ${message}`, 1, {
      debugData: data,
      isMobile: true,
      debugContext: 'MobileAuthDebugger'
    });
    
    // Store in localStorage for persistence across redirects
    try {
      const existingLogs = JSON.parse(localStorage.getItem('mobileAuthDebugLogs') || '[]');
      existingLogs.push({ timestamp, message, data });
      localStorage.setItem('mobileAuthDebugLogs', JSON.stringify(existingLogs.slice(-50))); // Keep last 50 logs
    } catch (e) {
      console.warn('Failed to store debug log:', e);
    }
  }

  static getLogs(): string[] {
    try {
      const storedLogs = JSON.parse(localStorage.getItem('mobileAuthDebugLogs') || '[]');
      return storedLogs.map((log: any) => `[${log.timestamp}] ${log.message}`);
    } catch (e) {
      return this.logs;
    }
  }

  static clearLogs() {
    this.logs = [];
    localStorage.removeItem('mobileAuthDebugLogs');
  }

  static getDeviceInfo() {
    const info = {
      userAgent: navigator.userAgent,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isAndroid: /Android/.test(navigator.userAgent),
      isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
      isChrome: /Chrome/.test(navigator.userAgent),
      isPrivateMode: false, // We'll detect this separately
      screenSize: `${window.screen.width}x${window.screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      cookiesEnabled: navigator.cookieEnabled,
      localStorageAvailable: this.isLocalStorageAvailable(),
      sessionStorageAvailable: this.isSessionStorageAvailable()
    };

    this.log('Device Info', info);
    return info;
  }

  private static isLocalStorageAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  private static isSessionStorageAvailable(): boolean {
    try {
      const test = '__sessionStorage_test__';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  static detectPrivateMode(): Promise<boolean> {
    return new Promise((resolve) => {
      // Test for private mode by trying to use various APIs
      const tests = [
        // Test localStorage quota
        () => {
          try {
            localStorage.setItem('__private_test__', '1');
            localStorage.removeItem('__private_test__');
            return false;
          } catch (e) {
            return true;
          }
        },
        // Test IndexedDB
        () => {
          try {
            return !window.indexedDB;
          } catch (e) {
            return true;
          }
        }
      ];

      const isPrivate = tests.some(test => test());
      this.log(`Private mode detected: ${isPrivate}`);
      resolve(isPrivate);
    });
  }

  static displayDebugInfo() {
    const logs = this.getLogs();
    const debugInfo = `
=== MOBILE AUTH DEBUG INFO ===
${logs.join('\n')}
=============================
    `;
    
    // Create a debug overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      right: 10px;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 20px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      max-height: 80vh;
      overflow-y: auto;
      border-radius: 8px;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: #dc3545;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 4px;
      cursor: pointer;
    `;
    closeBtn.onclick = () => document.body.removeChild(overlay);
    
    const content = document.createElement('pre');
    content.textContent = debugInfo;
    content.style.whiteSpace = 'pre-wrap';
    content.style.marginTop = '30px';
    
    overlay.appendChild(closeBtn);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
  }

  static logMsalEvent(eventType: string, eventData: any) {
    this.log(`MSAL Event: ${eventType}`, eventData);
  }

  static logAuthState(instance: any, accounts: any[]) {
    const authState = {
      hasActiveAccount: !!instance.getActiveAccount(),
      accountCount: accounts.length,
      accounts: accounts.map(acc => ({
        username: acc.username,
        homeAccountId: acc.homeAccountId,
        localAccountId: acc.localAccountId
      })),
      cacheState: this.getCacheState()
    };
    this.log('Current Auth State', authState);
    return authState;
  }

  private static getCacheState() {
    try {
      const localStorage = window.localStorage;
      const sessionStorage = window.sessionStorage;
      
      const cacheKeys = {
        localStorage: Object.keys(localStorage).filter(key => 
          key.includes('msal') || key.includes('authority') || key.includes('token')
        ),
        sessionStorage: Object.keys(sessionStorage).filter(key => 
          key.includes('msal') || key.includes('authority') || key.includes('token')
        )
      };
      
      return {
        localStorageKeys: cacheKeys.localStorage,
        sessionStorageKeys: cacheKeys.sessionStorage,
        localStorageCount: cacheKeys.localStorage.length,
        sessionStorageCount: cacheKeys.sessionStorage.length
      };
    } catch (e) {
      return { error: 'Cannot access storage' };
    }
  }

  static clearAuthCache() {
    try {
      // Clear MSAL cache from both storages
      const storages = [localStorage, sessionStorage];
      storages.forEach(storage => {
        const keysToDelete = Object.keys(storage).filter(key => 
          key.includes('msal') || key.includes('authority') || key.includes('token')
        );
        keysToDelete.forEach(key => storage.removeItem(key));
      });
      this.log('Auth cache cleared successfully');
    } catch (e) {
      this.log('Failed to clear auth cache', e);
    }
  }

  static detectWhiteScreenIssue(): { 
    hasAuthParams: boolean; 
    hasAccounts: boolean; 
    isStuck: boolean; 
    possibleCause: string;
  } {
    // Check if we're in a potential white screen scenario
    const hasAuthParams = window.location.hash.includes('id_token') ||
                         window.location.hash.includes('access_token') ||
                         window.location.search.includes('code') ||
                         window.location.search.includes('error');
    
    // Check if we have authentication data in storage
    const hasStoredAccounts = this.checkStoredAccounts();
    
    // Check if we're on a blank page with auth data
    const isBlankPage = document.body.children.length <= 2; // Minimal content
    const isStuck = hasAuthParams && isBlankPage;
    
    let possibleCause = 'Unknown';
    if (isStuck) {
      if (!hasStoredAccounts) {
        possibleCause = 'Authentication data not stored';
      } else {
        possibleCause = 'Navigation/redirect handling issue';
      }
    } else if (hasAuthParams && !hasStoredAccounts) {
      possibleCause = 'MSAL redirect promise not handled';
    }
    
    const result = {
      hasAuthParams,
      hasAccounts: hasStoredAccounts,
      isStuck,
      possibleCause
    };
    
    this.log('White screen issue detection', result);
    return result;
  }

  private static checkStoredAccounts(): boolean {
    try {
      // Check both localStorage and sessionStorage for MSAL account data
      const storages = [localStorage, sessionStorage];
      for (const storage of storages) {
        const keys = Object.keys(storage);
        const hasAccountData = keys.some(key => 
          key.includes('msal') && key.includes('account')
        );
        if (hasAccountData) return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  static checkNavigationState(): {
    currentPath: string;
    expectedPath: string;
    hasAuthRedirect: boolean;
    shouldRedirect: boolean;
    inProgressState: string;
    isLoading: boolean;
  } {
    const currentPath = window.location.pathname;
    const hasAuthParams = window.location.hash.includes('id_token') ||
                         window.location.hash.includes('access_token') ||
                         window.location.search.includes('code');
    
    // Check MSAL instance state (if available globally)
    const msalInstance = (window as any).msalInstance;
    let inProgressState = 'unknown';
    
    if (msalInstance) {
      // Try to get the current state from MSAL
      inProgressState = 'available';
    }
    
    // Expected behavior: if we have auth params, we should be on /login or root
    const expectedPath = hasAuthParams ? '/login' : '/my-page';
    const shouldRedirect = hasAuthParams && currentPath !== '/login' && currentPath !== '/';
    
    // Check if we're stuck in loading state
    const isLoading = document.body.innerHTML.includes('Processing authentication');
    
    const result = {
      currentPath,
      expectedPath,
      hasAuthRedirect: hasAuthParams,
      shouldRedirect,
      inProgressState,
      isLoading
    };
    
    this.log('Navigation state check', result);
    return result;
  }

  static diagnoseAuthenticationLoop(): {
    isStuckInLoop: boolean;
    loopType: string;
    recommendations: string[];
  } {
    const navigation = this.checkNavigationState();
    const whiteScreen = this.detectWhiteScreenIssue();
    const hasStoredAccounts = this.checkStoredAccounts();
    
    let isStuckInLoop = false;
    let loopType = 'none';
    const recommendations: string[] = [];
    
    // Detect different types of loops
    if (navigation.isLoading && navigation.hasAuthRedirect) {
      isStuckInLoop = true;
      loopType = 'processing_loop';
      recommendations.push('Clear auth parameters from URL');
      recommendations.push('Force stop loading state');
      recommendations.push('Check MSAL inProgress state');
    }
    
    if (whiteScreen.hasAuthParams && !hasStoredAccounts) {
      isStuckInLoop = true;
      loopType = 'redirect_not_processed';
      recommendations.push('MSAL redirect promise may not be completing');
      recommendations.push('Check network connectivity');
      recommendations.push('Try clearing all browser cache');
    }
    
    if (hasStoredAccounts && navigation.hasAuthRedirect) {
      isStuckInLoop = true;
      loopType = 'auth_params_not_cleared';
      recommendations.push('Authentication succeeded but URL not cleaned');
      recommendations.push('Manually navigate to clean URL');
      recommendations.push('Clear auth cache and restart');
    }
    
    const result = {
      isStuckInLoop,
      loopType,
      recommendations
    };
    
    this.log('Authentication loop diagnosis', result);
    return result;
  }

  // Emergency access methods for login loop situations
  static emergencyStop() {
    // Track emergency stop usage
    appInsightsLogger.trackEvent('Emergency_Stop_Triggered', {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      reason: 'User triggered emergency stop'
    });
    
    // Stop all MSAL operations
    try {
      // Clear all authentication state
      localStorage.removeItem('msal.token.keys');
      localStorage.removeItem('msal.account.keys');
      localStorage.removeItem('msal.cache.keys');
      sessionStorage.clear();
      
      // Clear any ongoing redirects
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      // Force redirect to login page
      window.location.href = '/login';
    } catch (e) {
      console.error('Emergency stop failed:', e);
      appInsightsLogger.trackException(e as Error, { context: 'Emergency_Stop_Failed' });
    }
  }

  static emergencyDebugAccess() {
    // Create emergency debug overlay even during login loops
    const overlay = document.createElement('div');
    overlay.id = 'emergency-debug-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      color: white;
      z-index: 999999;
      overflow: auto;
      padding: 20px;
      font-family: monospace;
      font-size: 12px;
    `;
    
    const content = `
      <h2>EMERGENCY DEBUG ACCESS</h2>
      <p>Login loop detected. Current state:</p>
      <pre>${JSON.stringify(this.getDeviceInfo(), null, 2)}</pre>
      <h3>Recent Logs:</h3>
      <pre>${this.getLogs().slice(-20).join('\n')}</pre>
      <h3>MSAL State:</h3>
      <pre>LocalStorage MSAL Keys: ${Object.keys(localStorage).filter(k => k.includes('msal')).length}</pre>
      <h3>Emergency Actions:</h3>
      <button onclick="window.mobileAuthDebugger.emergencyStop()" style="margin: 10px; padding: 10px; font-size: 14px;">
        🚨 STOP LOGIN LOOP
      </button>
      <button onclick="window.mobileAuthDebugger.clearAllAuth()" style="margin: 10px; padding: 10px; font-size: 14px;">
        🧹 CLEAR ALL AUTH
      </button>
      <button onclick="document.getElementById('emergency-debug-overlay').remove()" style="margin: 10px; padding: 10px; font-size: 14px;">
        ❌ CLOSE
      </button>
    `;
    
    overlay.innerHTML = content;
    document.body.appendChild(overlay);
    
    // Make debugger globally accessible
    (window as any).mobileAuthDebugger = this;
  }

  static clearAllAuth() {
    // Track clear all auth usage
    appInsightsLogger.trackEvent('Clear_All_Auth_Triggered', {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      reason: 'User triggered clear all auth'
    });
    
    // Nuclear option - clear everything
    try {
      // Clear all localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.includes('msal') || key.includes('auth')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear all sessionStorage
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('msal') || key.includes('auth')) {
          sessionStorage.removeItem(key);
        }
      });
      
      // Clear global MSAL instance
      (window as any)._pokemonGameMsalInstance = null;
      (window as any)._pokemonGameMsalInitializing = false;
      
      // Clear cookies
      document.cookie.split(";").forEach(c => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });
      
      alert('All authentication data cleared. Redirecting to login...');
      window.location.href = '/login';
    } catch (e) {
      console.error('Clear all auth failed:', e);
      appInsightsLogger.trackException(e as Error, { context: 'Clear_All_Auth_Failed' });
      alert('Failed to clear auth data. Try manually clearing browser data.');
    }
  }
}

// Make it available globally for easy access in mobile browser console
(window as any).MobileAuthDebugger = MobileAuthDebugger;
