
import { PublicClientApplication, LogLevel } from "@azure/msal-browser";

export const msalConfig = {
  auth: {
    clientId: process.env.CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.CLIENT_ID}`,
    redirectUri: "http://localhost:3000",
    postLogoutRedirectUri: "http://localhost:3000",
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message) => {
        if (level === LogLevel.Error) console.error(message);
      },
      logLevel: LogLevel.Error,
    },
  },
};

export const loginRequest = {
  scopes: ["User.Read"],
};

// Initialize MSAL instance
export const msalInstance = new PublicClientApplication(msalConfig);

msalInstance.addEventCallback((e) => {
  if (e.error) {
    console.error("[MSAL EVENT]", e.eventType, e.error, e.errorMessage);
  }
});
