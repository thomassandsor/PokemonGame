// Mobile authentication debugger utility
export const MobileAuthDebugger = {
  log: (message: string, data?: any) => {
    console.log(`[MobileAuth] ${message}`, data);
  },
  
  logMsalEvent: (eventType: string, data?: any) => {
    console.log(`[MSAL Event] ${eventType}`, data);
  },
  
  getDeviceInfo: () => {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isAndroid: /Android/.test(navigator.userAgent)
    };
  }
};

export default MobileAuthDebugger;
