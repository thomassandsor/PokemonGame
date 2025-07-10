import { API_CONFIG } from '../config/api';

export class ApiHealthMonitor {
  private static logs: Array<{ timestamp: string; message: string; data?: any }> = [];

  static log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    this.logs.push({ timestamp, message, data });
    console.log(`[API Health] ${timestamp}: ${message}`, data || '');

    // Store in localStorage for persistence
    try {
      const existingLogs = JSON.parse(localStorage.getItem('apiHealthLogs') || '[]');
      existingLogs.push({ timestamp, message, data });
      localStorage.setItem('apiHealthLogs', JSON.stringify(existingLogs.slice(-50))); // Keep last 50 logs
    } catch (e) {
      console.warn('Failed to store API health log:', e);
    }
  }

  static async checkApiHealth(): Promise<{
    isHealthy: boolean;
    responseTime: number;
    status: string;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      this.log('Starting API health check');
      
      const response = await fetch(`${API_CONFIG.BASE_URL.replace('/dataverse', '')}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        this.log(`API health check successful (${responseTime}ms)`, data);
        return {
          isHealthy: true,
          responseTime,
          status: 'healthy',
        };
      } else {
        this.log(`API health check failed with status ${response.status}`, { status: response.status, statusText: response.statusText });
        return {
          isHealthy: false,
          responseTime,
          status: `HTTP ${response.status}`,
          error: response.statusText,
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.log('API health check error', error);
      return {
        isHealthy: false,
        responseTime,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async testApiConnectivity(): Promise<{
    health: any;
    environment: {
      apiBaseUrl: string;
      origin: string;
      userAgent: string;
      connection: string;
    };
    network: {
      online: boolean;
      effectiveType?: string;
    };
  }> {
    this.log('Starting comprehensive API connectivity test');
    
    const health = await this.checkApiHealth();
    
    const environment = {
      apiBaseUrl: API_CONFIG.BASE_URL,
      origin: window.location.origin,
      userAgent: navigator.userAgent,
      connection: (navigator as any).connection?.effectiveType || 'unknown',
    };

    const network = {
      online: navigator.onLine,
      effectiveType: (navigator as any).connection?.effectiveType,
    };

    const result = { health, environment, network };
    this.log('API connectivity test completed', result);
    
    return result;
  }

  static getLogs(): Array<{ timestamp: string; message: string; data?: any }> {
    try {
      return JSON.parse(localStorage.getItem('apiHealthLogs') || '[]');
    } catch (e) {
      return this.logs;
    }
  }

  static clearLogs() {
    this.logs = [];
    localStorage.removeItem('apiHealthLogs');
    this.log('API health logs cleared');
  }

  static async checkColdStart(): Promise<{ isColdStart: boolean; initialResponseTime: number }> {
    this.log('Checking for API cold start');
    
    const result1 = await this.checkApiHealth();
    
    // Wait a moment and check again
    await new Promise(resolve => setTimeout(resolve, 1000));
    const result2 = await this.checkApiHealth();
    
    const isColdStart = result1.responseTime > 5000 && result2.responseTime < result1.responseTime / 2;
    
    this.log(`Cold start detection: ${isColdStart ? 'Detected' : 'Not detected'}`, {
      firstCall: result1.responseTime,
      secondCall: result2.responseTime,
    });
    
    return {
      isColdStart,
      initialResponseTime: result1.responseTime,
    };
  }
}

// Make it available globally for debugging
(window as any).ApiHealthMonitor = ApiHealthMonitor;
