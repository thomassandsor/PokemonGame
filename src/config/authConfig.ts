// Configuration for Azure AD External Identities
import { MobileAuthDebugger } from '../utils/mobileAuthDebugger';

// Detect mobile devices
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

MobileAuthDebugger.log(`Initializing auth config - Mobile: ${isMobile}, iOS: ${isIOS}`);

export const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_CLIENT_ID || "your-client-id-here", // Replace with your Azure AD App Registration Client ID
    authority: process.env.REACT_APP_AUTHORITY || "https://your-tenant.b2clogin.com/your-tenant.onmicrosoft.com/B2C_1_signupsignin", // Replace with your B2C authority
    knownAuthorities: [process.env.REACT_APP_KNOWN_AUTHORITY || "your-tenant.b2clogin.com"], // Replace with your B2C domain
    redirectUri: process.env.REACT_APP_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: process.env.REACT_APP_POST_LOGOUT_REDIRECT_URI || window.location.origin,
    navigateToLoginRequestUrl: true, // Important for mobile redirects
  },
  cache: {
    cacheLocation: isMobile ? "localStorage" : "sessionStorage", // Use localStorage on mobile for better persistence
    storeAuthStateInCookie: true, // Essential for mobile/private browsing compatibility
    secureCookies: false, // Set to false for development, true for production with HTTPS
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: any, message: string, containsPii: boolean) => {
        if (containsPii) {
          return;
        }
        const logMessage = `MSAL ${level}: ${message}`;
        MobileAuthDebugger.log(logMessage);
        
        switch (level) {
          case "Error":
            console.error(logMessage);
            return;
          case "Info":
            console.info(logMessage);
            return;
          case "Verbose":
            console.debug(logMessage);
            return;
          case "Warning":
            console.warn(logMessage);
            return;
          default:
            return;
        }
      },
    },
    allowNativeBroker: false, // Disable native broker for better web compatibility
    windowHashTimeout: isMobile ? 120000 : 60000, // Longer timeout for mobile
    iframeHashTimeout: 15000, // Increased for mobile
    loadFrameTimeout: 15000, // Increased for mobile
    asyncPopups: false, // Disable async popups for better mobile compatibility
    navigateFrameWait: isMobile ? 1000 : 500, // Wait longer on mobile
  },
};

// Scopes for Microsoft Graph API and Dataverse
export const loginRequest = {
  scopes: ["openid", "profile", "email"],
  extraQueryParameters: {
    "response_mode": "fragment"
  },
  prompt: "select_account" // Changed to select_account for better UX
};

// Dataverse API configuration (Service-to-Service)
export const dataverseConfig = {
  baseUrl: process.env.REACT_APP_DATAVERSE_URL || "https://your-environment.crm.dynamics.com/api/data/v9.2",
  tenantId: process.env.REACT_APP_DATAVERSE_TENANT_ID || "your-dataverse-tenant-id",
  clientId: process.env.REACT_APP_DATAVERSE_CLIENT_ID || "your-dataverse-client-id",
  clientSecret: process.env.REACT_APP_DATAVERSE_CLIENT_SECRET || "your-dataverse-client-secret",
  scope: process.env.REACT_APP_DATAVERSE_SCOPE || "https://your-environment.crm.dynamics.com/.default",
};

// Event callback to capture MSAL events for debugging
export const eventCallback = (message: any) => {
  MobileAuthDebugger.logMsalEvent(message.eventType, {
    error: message.error,
    result: message.result ? {
      account: message.result.account?.username,
      accessToken: message.result.accessToken ? 'Present' : 'Missing',
      scopes: message.result.scopes
    } : null,
    timestamp: new Date().toISOString()
  });
};
