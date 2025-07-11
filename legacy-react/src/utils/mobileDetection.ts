/**
 * Mobile Detection and Fallback System
 * Provides intelligent mobile detection and fallback mechanisms
 */

export interface DeviceInfo {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isPrivateBrowsing: boolean;
  supportsReact: boolean;
  recommendedApproach: 'react' | 'html';
}

export class MobileDetectionService {
  private static deviceInfo: DeviceInfo | null = null;

  static getDeviceInfo(): DeviceInfo {
    if (this.deviceInfo) return this.deviceInfo;

    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome|Chromium/.test(userAgent);
    const isChrome = /Chrome|Chromium/.test(userAgent);

    // Detect private browsing
    const isPrivateBrowsing = this.detectPrivateBrowsing();

    // Determine if React is likely to work well
    const supportsReact = this.assessReactCompatibility(isMobile, isIOS, isSafari, isPrivateBrowsing);

    // Recommend approach based on compatibility
    const recommendedApproach: 'react' | 'html' = supportsReact ? 'react' : 'html';

    this.deviceInfo = {
      isMobile,
      isIOS,
      isAndroid,
      isSafari,
      isChrome,
      isPrivateBrowsing,
      supportsReact,
      recommendedApproach
    };

    return this.deviceInfo;
  }

  private static detectPrivateBrowsing(): boolean {
    try {
      // Try to access localStorage
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      return false;
    } catch {
      return true;
    }
  }

  private static assessReactCompatibility(
    isMobile: boolean, 
    isIOS: boolean, 
    isSafari: boolean, 
    isPrivateBrowsing: boolean
  ): boolean {
    // Desktop is generally fine with React
    if (!isMobile) return true;

    // iOS Safari in private mode has known issues with React/MSAL
    if (isIOS && isSafari && isPrivateBrowsing) return false;

    // iOS Safari has authentication redirect issues
    if (isIOS && isSafari) return false;

    // Other mobile browsers might work, but HTML is more reliable
    return false;
  }

  static shouldUseHTMLFallback(): boolean {
    const info = this.getDeviceInfo();
    return info.recommendedApproach === 'html';
  }

  static redirectToHTMLVersion(): void {
    const currentPath = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    
    // Preserve important parameters
    const preservedParams = new URLSearchParams();
    if (params.has('debug')) preservedParams.set('debug', params.get('debug')!);
    if (params.has('mobile')) preservedParams.set('mobile', params.get('mobile')!);
    
    const paramsString = preservedParams.toString();
    const queryString = paramsString ? `?${paramsString}` : '';
    
    // Redirect to HTML version
    window.location.href = `/game.html${queryString}`;
  }

  static logDeviceInfo(): void {
    const info = this.getDeviceInfo();
    console.log('📱 Device Detection Results:', {
      ...info,
      userAgent: navigator.userAgent,
      screen: {
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight
      },
      window: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight
      },
      platform: navigator.platform,
      language: navigator.language
    });
  }
}

// Auto-detection and redirect utility
export class SmartRoutingService {
  static init(): void {
    const info = MobileDetectionService.getDeviceInfo();
    MobileDetectionService.logDeviceInfo();

    // If we should use HTML but we're in React, redirect
    if (info.recommendedApproach === 'html' && !window.location.pathname.includes('.html')) {
      console.log('🔄 Redirecting to HTML version for better mobile compatibility');
      MobileDetectionService.redirectToHTMLVersion();
      return;
    }

    console.log(`✅ Using ${info.recommendedApproach.toUpperCase()} approach for this device`);
  }
}
