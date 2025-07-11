// App Insights Logger utility
export const AppInsightsLogger = {
  log: (message: string, data?: any) => {
    console.log(`[AppInsights] ${message}`, data);
  }
};

export default AppInsightsLogger;
