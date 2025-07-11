// iOS Emergency Reset utility
export const IosEmergencyReset = {
  reset: () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  }
};

export default IosEmergencyReset;
