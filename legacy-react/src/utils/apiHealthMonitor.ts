// API Health Monitor utility
export const ApiHealthMonitor = {
  checkHealth: async (url: string) => {
    try {
      const response = await fetch(`${url}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
};

export default ApiHealthMonitor;
