import { ApplicationInsights } from '@microsoft/applicationinsights-web';

class AppInsightsLogger {
  private appInsights: ApplicationInsights | null = null;
  private isInitialized = false;
  private queuedEvents: Array<{ eventName: string; properties: any; timestamp: Date }> = [];

  initialize(connectionString?: string) {
    // Don't initialize in development unless explicitly configured
    if (process.env.NODE_ENV === 'development' && !connectionString && !process.env.REACT_APP_APPINSIGHTS_CONNECTION_STRING) {
      console.log('🔍 AppInsights: Skipping initialization in development (no connection string)');
      return;
    }

    try {
      // Use connection string from environment or parameter
      const connString = connectionString || process.env.REACT_APP_APPINSIGHTS_CONNECTION_STRING;
      
      if (!connString) {
        console.warn('🔍 AppInsights: No connection string provided, using console logging only');
        this.isInitialized = true; // Allow logging to console
        return;
      }

      this.appInsights = new ApplicationInsights({
        config: {
          connectionString: connString,
          enableAutoRouteTracking: true,
          enableRequestHeaderTracking: true,
          enableResponseHeaderTracking: true,
          enableAjaxErrorStatusText: true,
          enableAjaxPerfTracking: true,
          enableUnhandledPromiseRejectionTracking: true,
          disableAjaxTracking: false,
          disableFetchTracking: false,
          excludeRequestFromAutoTrackingPatterns: [
            // Exclude health checks and frequent calls
            /\/api\/health/i,
            /\/favicon\.ico/i,
            /\.map$/i
          ],
          samplingPercentage: 100, // Log everything for debugging
          enableDebug: process.env.NODE_ENV === 'development'
        }
      });

      this.appInsights.loadAppInsights();
      this.appInsights.trackPageView();

      // Set user context
      this.appInsights.setAuthenticatedUserContext(
        `user_${Date.now()}`, // Anonymous user ID
        undefined,
        true
      );

      this.isInitialized = true;
      console.log('🔍 AppInsights: Initialized successfully');

      // Process queued events
      this.processQueuedEvents();

    } catch (error) {
      console.error('🔍 AppInsights: Failed to initialize:', error);
      this.isInitialized = true; // Still allow console logging
    }
  }

  private processQueuedEvents() {
    while (this.queuedEvents.length > 0) {
      const event = this.queuedEvents.shift();
      if (event) {
        this.trackEvent(event.eventName, event.properties);
      }
    }
  }

  trackEvent(eventName: string, properties: any = {}) {
    const timestamp = new Date();
    const enrichedProperties = {
      ...properties,
      timestamp: timestamp.toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer
    };

    // Always log to console for immediate debugging
    console.log(`🔍 AppInsights Event: ${eventName}`, enrichedProperties);

    if (!this.isInitialized) {
      // Queue events until initialized
      this.queuedEvents.push({ eventName, properties: enrichedProperties, timestamp });
      return;
    }

    if (this.appInsights) {
      try {
        this.appInsights.trackEvent({
          name: eventName,
          properties: enrichedProperties
        });
      } catch (error) {
        console.error('🔍 AppInsights: Failed to track event:', error);
      }
    }
  }

  trackException(error: Error, properties: any = {}) {
    const enrichedProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Always log to console
    console.error(`🔍 AppInsights Exception: ${error.message}`, error, enrichedProperties);

    if (this.appInsights && this.isInitialized) {
      try {
        this.appInsights.trackException({
          exception: error,
          properties: enrichedProperties
        });
      } catch (trackingError) {
        console.error('🔍 AppInsights: Failed to track exception:', trackingError);
      }
    }
  }

  trackTrace(message: string, severityLevel: number = 1, properties: any = {}) {
    const enrichedProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Always log to console
    console.log(`🔍 AppInsights Trace: ${message}`, enrichedProperties);

    if (this.appInsights && this.isInitialized) {
      try {
        this.appInsights.trackTrace({
          message,
          severityLevel,
          properties: enrichedProperties
        });
      } catch (error) {
        console.error('🔍 AppInsights: Failed to track trace:', error);
      }
    }
  }

  // Helper methods for specific authentication events
  trackAuthEvent(eventType: string, details: any = {}) {
    this.trackEvent('Auth_Event', {
      eventType,
      ...details,
      deviceType: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isAndroid: /Android/.test(navigator.userAgent),
      browser: this.getBrowserInfo()
    });
  }

  trackMSALEvent(eventType: string, details: any = {}) {
    this.trackEvent('MSAL_Event', {
      eventType,
      ...details,
      msalVersion: '3.28.1', // Current version
      timestamp: new Date().toISOString()
    });
  }

  trackWhiteScreenIssue(details: any = {}) {
    this.trackEvent('White_Screen_Issue', {
      ...details,
      pageLoadTime: Date.now() - performance.timing.navigationStart,
      domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      storageAvailable: {
        localStorage: this.isStorageAvailable('localStorage'),
        sessionStorage: this.isStorageAvailable('sessionStorage')
      }
    });
  }

  private getBrowserInfo() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    return 'Unknown';
  }

  private isStorageAvailable(type: string): boolean {
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

  flush() {
    if (this.appInsights && this.isInitialized) {
      try {
        this.appInsights.flush();
      } catch (error) {
        console.error('🔍 AppInsights: Failed to flush:', error);
      }
    }
  }
}

// Create singleton instance
export const appInsightsLogger = new AppInsightsLogger();

// Auto-initialize
appInsightsLogger.initialize();

export default appInsightsLogger;
