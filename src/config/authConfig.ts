// Configuration for Azure AD External Identities
export const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_CLIENT_ID || "your-client-id-here", // Replace with your Azure AD App Registration Client ID
    authority: process.env.REACT_APP_AUTHORITY || "https://your-tenant.b2clogin.com/your-tenant.onmicrosoft.com/B2C_1_signupsignin", // Replace with your B2C authority
    knownAuthorities: [process.env.REACT_APP_KNOWN_AUTHORITY || "your-tenant.b2clogin.com"], // Replace with your B2C domain
    redirectUri: process.env.REACT_APP_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: process.env.REACT_APP_POST_LOGOUT_REDIRECT_URI || window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: any, message: string, containsPii: boolean) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case "Error":
            console.error(message);
            return;
          case "Info":
            console.info(message);
            return;
          case "Verbose":
            console.debug(message);
            return;
          case "Warning":
            console.warn(message);
            return;
          default:
            return;
        }
      },
    },
  },
};

// Scopes for Microsoft Graph API and Dataverse
export const loginRequest = {
  scopes: ["openid", "profile", "email"],
  extraQueryParameters: {
    "response_mode": "fragment"
  }
};

// Dataverse API configuration (Service-to-Service)
export const dataverseConfig = {
  baseUrl: process.env.REACT_APP_DATAVERSE_URL || "https://your-environment.crm.dynamics.com/api/data/v9.2",
  tenantId: process.env.REACT_APP_DATAVERSE_TENANT_ID || "your-dataverse-tenant-id",
  clientId: process.env.REACT_APP_DATAVERSE_CLIENT_ID || "your-dataverse-client-id",
  clientSecret: process.env.REACT_APP_DATAVERSE_CLIENT_SECRET || "your-dataverse-client-secret",
  scope: process.env.REACT_APP_DATAVERSE_SCOPE || "https://your-environment.crm.dynamics.com/.default",
};
