// Simple console logger to replace Application Insights
export const logger = {
  trackEvent: (name: string, properties?: Record<string, any>) => {
    console.log(`[EVENT] ${name}`, properties);
  },
  
  trackMSALEvent: (name: string, properties?: Record<string, any>) => {
    console.log(`[MSAL] ${name}`, properties);
  },
  
  trackAuthEvent: (name: string, properties?: Record<string, any>) => {
    console.log(`[AUTH] ${name}`, properties);
  },
  
  trackException: (error: any, properties?: Record<string, any>) => {
    console.error(`[EXCEPTION]`, error, properties);
  }
};
