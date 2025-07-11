// Smart Diagnostics utility
export const SmartDiagnostics = {
  runDiagnostics: () => {
    return {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      localStorage: Object.keys(localStorage).length,
      sessionStorage: Object.keys(sessionStorage).length
    };
  }
};

export default SmartDiagnostics;
