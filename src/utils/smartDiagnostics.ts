import { appInsightsLogger } from './appInsightsLogger';

export interface DiagnosticResult {
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  action?: string;
  data?: any;
}

export class AuthenticationDiagnostics {
  
  static diagnoseCurrentState(): DiagnosticResult[] {
    const results: DiagnosticResult[] = [];
    
    try {
      // Check URL for authentication parameters
      const hasAuthParams = window.location.hash.includes('id_token') || 
                          window.location.search.includes('code') ||
                          window.location.hash.includes('access_token');
      
      if (hasAuthParams) {
        results.push({
          severity: 'info',
          title: 'Authentication Parameters Detected',
          message: 'URL contains authentication parameters - redirect flow in progress',
          data: { url: window.location.href }
        });
      }
      
      // Check MSAL instance state
      const msalInstance = (window as any)._pokemonGameMsalInstance;
      if (!msalInstance) {
        results.push({
          severity: 'error',
          title: 'MSAL Instance Missing',
          message: 'No MSAL instance found - initialization may have failed',
          action: 'Try refreshing the page or clearing browser data'
        });
      } else {
        // Check accounts
        try {
          const accounts = msalInstance.getAllAccounts();
          if (accounts.length === 0) {
            results.push({
              severity: 'warning',
              title: 'No Accounts Found',
              message: 'MSAL instance exists but no accounts are stored',
              action: 'User may need to log in again'
            });
          } else {
            results.push({
              severity: 'success',
              title: 'Accounts Found',
              message: `Found ${accounts.length} account(s) in MSAL cache`,
              data: { accountCount: accounts.length, accounts: accounts.map((a: any) => a.username) }
            });
            
            // Check active account
            const activeAccount = msalInstance.getActiveAccount();
            if (!activeAccount) {
              results.push({
                severity: 'warning',
                title: 'No Active Account',
                message: 'Accounts exist but no active account is set',
                action: 'Active account should be set automatically'
              });
            } else {
              results.push({
                severity: 'success',
                title: 'Active Account Set',
                message: `Active account: ${activeAccount.username}`,
                data: { activeAccount: activeAccount.username }
              });
            }
          }
        } catch (error) {
          results.push({
            severity: 'error',
            title: 'MSAL Account Check Failed',
            message: `Error accessing MSAL accounts: ${error}`,
            action: 'MSAL instance may be corrupted'
          });
        }
      }
      
      // Check initialization attempts
      const initAttempts = sessionStorage.getItem('msalInitAttempts');
      if (initAttempts) {
        const attempts = parseInt(initAttempts, 10);
        if (attempts > 1) {
          results.push({
            severity: attempts > 5 ? 'error' : 'warning',
            title: 'Multiple Initialization Attempts',
            message: `MSAL initialization attempted ${attempts} times this session`,
            action: attempts > 5 ? 'Clear browser data and restart' : 'Monitor for loops',
            data: { attempts }
          });
        }
      }
      
      // Check localStorage availability
      if (!this.isStorageAvailable('localStorage')) {
        results.push({
          severity: 'error',
          title: 'LocalStorage Not Available',
          message: 'LocalStorage is required for MSAL token storage',
          action: 'Check browser settings or try incognito mode'
        });
      }
      
      // Check for private mode
      if (this.isPrivateMode()) {
        results.push({
          severity: 'warning',
          title: 'Private/Incognito Mode Detected',
          message: 'Authentication may behave differently in private browsing',
          action: 'Try normal browsing mode if issues persist'
        });
      }
      
      // Check device type
      const deviceInfo = this.getDeviceInfo();
      results.push({
        severity: 'info',
        title: 'Device Information',
        message: `Device: ${deviceInfo.type}, Browser: ${deviceInfo.browser}`,
        data: deviceInfo
      });
      
      // Check current page
      const currentPath = window.location.pathname;
      if (currentPath === '/' || currentPath === '/login') {
        if (msalInstance && msalInstance.getAllAccounts().length > 0) {
          results.push({
            severity: 'warning',
            title: 'Logged In But On Login Page',
            message: 'User appears to be authenticated but is on login page',
            action: 'Navigation after authentication may have failed'
          });
        }
      }
      
      // Check for React mounting issues
      const rootElement = document.getElementById('root');
      if (rootElement && rootElement.children.length === 0) {
        results.push({
          severity: 'error',
          title: 'React App Not Mounted',
          message: 'Root element is empty - React app failed to mount',
          action: 'Check for JavaScript errors in console'
        });
      }
      
    } catch (error) {
      results.push({
        severity: 'error',
        title: 'Diagnostic Error',
        message: `Failed to run diagnostics: ${error}`,
        action: 'Manual investigation required'
      });
    }
    
    // Log all results to Application Insights
    appInsightsLogger.trackEvent('Authentication_Diagnostics', {
      resultCount: results.length,
      severityCounts: this.countSeverities(results),
      results: results
    });
    
    return results;
  }
  
  static diagnoseWhiteScreen(): DiagnosticResult[] {
    const results: DiagnosticResult[] = [];
    
    // Check if we're actually on a white screen
    const bodyContent = document.body.innerText.trim();
    const hasMinimalContent = bodyContent.length < 100;
    
    if (hasMinimalContent) {
      results.push({
        severity: 'error',
        title: 'White Screen Confirmed',
        message: 'Page has minimal content, indicating white screen issue',
        data: { contentLength: bodyContent.length }
      });
      
      // Track this specific issue
      appInsightsLogger.trackWhiteScreenIssue({
        contentLength: bodyContent.length,
        url: window.location.href,
        hasAuthParams: window.location.hash.includes('id_token') || window.location.search.includes('code')
      });
    }
    
    // Add all standard diagnostics
    results.push(...AuthenticationDiagnostics.diagnoseCurrentState());
    
    return results;
  }
  
  static diagnoseLoginLoop(): DiagnosticResult[] {
    const results: DiagnosticResult[] = [];
    
    // Check for rapid redirects
    const redirectCount = parseInt(sessionStorage.getItem('redirectCount') || '0', 10);
    if (redirectCount > 3) {
      results.push({
        severity: 'error',
        title: 'Login Loop Detected',
        message: `Page has redirected ${redirectCount} times`,
        action: 'Clear authentication data to break the loop',
        data: { redirectCount }
      });
    }
    
    // Check for authentication parameters without successful login
    const hasAuthParams = window.location.hash.includes('id_token') || window.location.search.includes('code');
    const msalInstance = (window as any)._pokemonGameMsalInstance;
    const hasAccounts = msalInstance && msalInstance.getAllAccounts().length > 0;
    
    if (hasAuthParams && !hasAccounts) {
      results.push({
        severity: 'error',
        title: 'Auth Parameters Without Accounts',
        message: 'URL has auth parameters but no accounts in MSAL cache',
        action: 'Authentication flow may be failing to complete'
      });
    }
    
    results.push(...AuthenticationDiagnostics.diagnoseCurrentState());
    
    return results;
  }
  
  private static isStorageAvailable(type: string): boolean {
    try {
      const storage = (window as any)[type];
      const test = '__storage_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  private static isPrivateMode(): boolean {
    try {
      // Quick test for private mode
      localStorage.setItem('__private_test__', 'test');
      localStorage.removeItem('__private_test__');
      return false;
    } catch (e) {
      return true;
    }
  }
  
  private static getDeviceInfo() {
    const ua = navigator.userAgent;
    return {
      type: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ? 'mobile' : 'desktop',
      browser: ua.includes('Chrome') && !ua.includes('Edg') ? 'Chrome' :
               ua.includes('Safari') && !ua.includes('Chrome') ? 'Safari' :
               ua.includes('Firefox') ? 'Firefox' :
               ua.includes('Edg') ? 'Edge' : 'Unknown',
      isIOS: /iPad|iPhone|iPod/.test(ua),
      isAndroid: /Android/.test(ua)
    };
  }
  
  private static countSeverities(results: DiagnosticResult[]) {
    return results.reduce((counts, result) => {
      counts[result.severity] = (counts[result.severity] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }
}

// Smart notification system
export class SmartNotificationSystem {
  
  static showDiagnosticResults(results: DiagnosticResult[], containerId = 'diagnostic-notifications') {
    // Remove existing notifications
    const existing = document.getElementById(containerId);
    if (existing) {
      existing.remove();
    }
    
    // Create notification container
    const container = document.createElement('div');
    container.id = containerId;
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 400px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    
    results.forEach((result, index) => {
      const notification = this.createNotificationElement(result);
      container.appendChild(notification);
      
      // Auto-dismiss info notifications after 10 seconds
      if (result.severity === 'info') {
        setTimeout(() => {
          if (notification.parentNode) {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
          }
        }, 10000);
      }
    });
    
    document.body.appendChild(container);
    
    return container;
  }
  
  private static createNotificationElement(result: DiagnosticResult): HTMLElement {
    const notification = document.createElement('div');
    
    const colors = {
      success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
      info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' },
      warning: { bg: '#fff3cd', border: '#ffeaa7', text: '#856404' },
      error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' }
    };
    
    const color = colors[result.severity];
    
    notification.style.cssText = `
      background: ${color.bg};
      border: 1px solid ${color.border};
      color: ${color.text};
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      position: relative;
      transition: opacity 0.3s ease;
    `;
    
    const title = result.severity === 'error' ? '🚨' : 
                  result.severity === 'warning' ? '⚠️' : 
                  result.severity === 'success' ? '✅' : 'ℹ️';
    
    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">
        ${title} ${result.title}
      </div>
      <div style="font-size: 14px; margin-bottom: ${result.action ? '8px' : '0'};">
        ${result.message}
      </div>
      ${result.action ? `
        <div style="font-size: 13px; font-style: italic; opacity: 0.8;">
          💡 ${result.action}
        </div>
      ` : ''}
      <button onclick="this.parentElement.remove()" style="
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        color: ${color.text};
        opacity: 0.6;
      ">×</button>
    `;
    
    return notification;
  }
  
  static showAuthenticationStatus() {
    const results = AuthenticationDiagnostics.diagnoseCurrentState();
    return this.showDiagnosticResults(results, 'auth-status-notifications');
  }
  
  static showWhiteScreenDiagnosis() {
    const results = AuthenticationDiagnostics.diagnoseWhiteScreen();
    return this.showDiagnosticResults(results, 'white-screen-notifications');
  }
  
  static showLoginLoopDiagnosis() {
    const results = AuthenticationDiagnostics.diagnoseLoginLoop();
    return this.showDiagnosticResults(results, 'login-loop-notifications');
  }
}

// Make globally available for emergency access
(window as any).showAuthDiagnosis = () => SmartNotificationSystem.showAuthenticationStatus();
(window as any).showWhiteScreenDiagnosis = () => SmartNotificationSystem.showWhiteScreenDiagnosis();
(window as any).showLoginLoopDiagnosis = () => SmartNotificationSystem.showLoginLoopDiagnosis();
