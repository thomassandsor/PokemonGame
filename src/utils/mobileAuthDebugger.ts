// Mobile authentication debugging utility
export class MobileAuthDebugger {
  private static logs: string[] = [];

  static log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    
    // Store in memory for later retrieval
    this.logs.push(logEntry);
    
    // Also log to console
    console.log(logEntry, data || '');
    
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
}

// Make it available globally for easy access in mobile browser console
(window as any).MobileAuthDebugger = MobileAuthDebugger;
