import React from 'react';
import ReactDOM from 'react-dom/client';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig, eventCallback } from './config/authConfig';
import { MobileAuthDebugger } from './utils/mobileAuthDebugger';
import { logger } from './utils/consoleLogger';
import { SmartNotificationSystem } from './utils/smartDiagnostics';
import { IOSEmergencyReset } from './utils/iosEmergencyReset';
import { SmartRoutingService } from './utils/mobileDetection';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

// FIRST: Check if we should use HTML fallback for mobile
try {
  SmartRoutingService.init();
  // If we reach here, we should continue with React
} catch (error) {
  console.error('Smart routing failed:', error);
  // Continue with React as fallback
}

// iOS Emergency Reset System - handles URL-based emergency actions FIRST
// This runs before anything else to catch emergency URLs
IOSEmergencyReset.init();

// Initialize console logging
logger.trackEvent('App_Start', {
  url: window.location.href,
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent
});

// Emergency access for login loops - available immediately
(window as any).emergencyDebug = () => MobileAuthDebugger.emergencyDebugAccess();
(window as any).emergencyStop = () => MobileAuthDebugger.emergencyStop();
(window as any).clearAllAuth = () => MobileAuthDebugger.clearAllAuth();

// Smart diagnostic access - available immediately
(window as any).showAuthDiagnosis = () => SmartNotificationSystem.showAuthenticationStatus();
(window as any).showWhiteScreenDiagnosis = () => SmartNotificationSystem.showWhiteScreenDiagnosis();
(window as any).showLoginLoopDiagnosis = () => SmartNotificationSystem.showLoginLoopDiagnosis();

// Log that emergency access is available
console.log('🚨 EMERGENCY ACCESS AVAILABLE:');
console.log('- Type: emergencyDebug() to access debug tools');
console.log('- Type: emergencyStop() to stop login loop');
console.log('- Type: clearAllAuth() to clear all auth data');
console.log('🔍 SMART DIAGNOSTICS AVAILABLE:');
console.log('- Type: showAuthDiagnosis() to see current auth status');
console.log('- Type: showWhiteScreenDiagnosis() to diagnose white screen');
console.log('- Type: showLoginLoopDiagnosis() to diagnose login loops');

// Global singleton with window-level protection
const MSAL_INSTANCE_KEY = '_pokemonGameMsalInstance';
const MSAL_INIT_KEY = '_pokemonGameMsalInitializing';

declare global {
  interface Window {
    [MSAL_INSTANCE_KEY]?: PublicClientApplication;
    [MSAL_INIT_KEY]?: boolean;
  }
}

const getMsalInstance = (): PublicClientApplication => {
  // Check if we already have a global instance
  if (window[MSAL_INSTANCE_KEY]) {
    console.log('🔄 Reusing existing global MSAL instance');
    return window[MSAL_INSTANCE_KEY];
  }
  
  // Check if we're already initializing
  if (window[MSAL_INIT_KEY]) {
    console.log('⏳ MSAL is already initializing globally, throwing error to prevent loop');
    throw new Error('MSAL is already initializing - preventing duplicate initialization');
  }
  
  console.log('🆕 Creating new global MSAL instance');
  window[MSAL_INIT_KEY] = true;
  
  try {
    const instance = new PublicClientApplication(msalConfig);
    
    // Add event callback for debugging
    instance.addEventCallback(eventCallback);
    
    // Store globally
    window[MSAL_INSTANCE_KEY] = instance;
    
    console.log('✅ MSAL instance created and stored globally');
    return instance;
  } catch (error) {
    console.error('❌ Failed to create MSAL instance:', error);
    window[MSAL_INIT_KEY] = false;
    throw error;
  }
};

const msalInstanceSingleton = getMsalInstance();

// Detect and prevent initialization loops
const INIT_ATTEMPT_KEY = '_pokemonGameInitAttempts';
let initAttempts = parseInt(sessionStorage.getItem(INIT_ATTEMPT_KEY) || '0');

// Check if this is a redirect from authentication
const isAuthRedirect = window.location.hash.includes('id_token') || 
                      window.location.search.includes('code') ||
                      window.location.search.includes('state');

// If this is an auth redirect, be more lenient with attempt counting
const maxAttempts = isAuthRedirect ? 12 : 8;

console.log(`🔍 Init attempt check: ${initAttempts} (max: ${maxAttempts}, isAuthRedirect: ${isAuthRedirect})`);

if (initAttempts > maxAttempts) {
  console.error('🚨 INITIALIZATION LOOP DETECTED! Too many attempts:', initAttempts);
  console.log('[MSAL] Initialization Loop', {
    attempts: initAttempts,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  });
  
  // Show user a smart notification about the loop detection
  MobileAuthDebugger.showSmartNotification('warning', 'Login Loop Detected', 
    `Authentication has been attempted ${initAttempts} times. This usually indicates an infinite loop.`, 
    'Emergency tools are available in browser console');
  
  // Auto-trigger diagnostic display
  setTimeout(() => {
    SmartNotificationSystem.showLoginLoopDiagnosis();
  }, 2000);
  
  // Automatically clear auth data after showing diagnosis
  setTimeout(() => {
    console.log('Auto-clearing auth data due to loop detection');
    MobileAuthDebugger.clearAllAuth();
  }, 5000);
  
  throw new Error('Too many initialization attempts - auto-recovery initiated');
}

// Increment attempt counter
initAttempts++;
sessionStorage.setItem(INIT_ATTEMPT_KEY, initAttempts.toString());

// Track initialization attempt
logger.trackMSALEvent('Initialization_Attempt', {
  attempt: initAttempts,
  url: window.location.href,
  hasAuthParams: window.location.hash.includes('id_token') || window.location.search.includes('code')
});

// Initialize MSAL and handle redirects
console.log(`🔄 Starting MSAL initialization sequence... (attempt ${initAttempts})`);
console.log('🔄 Window location:', window.location.href);
console.log('🔄 Time:', new Date().toISOString());

// Add timing tracking to debug the initialization loop
const initStartTime = Date.now();

// Set a timeout to prevent infinite hanging
const initTimeout = setTimeout(() => {
  console.error('🚨 MSAL initialization timeout! Forcing emergency stop...');
  logger.trackEvent('MSAL_Initialization_Timeout', {
    timeoutMs: 10000,
    url: window.location.href,
    attempt: initAttempts
  });
  MobileAuthDebugger.emergencyStop();
}, 10000); // 10 second timeout

msalInstanceSingleton.initialize().then(() => {
  clearTimeout(initTimeout); // Clear timeout on success
  const initEndTime = Date.now();
  const initDuration = initEndTime - initStartTime;
  
  console.log(`✅ MSAL initialized successfully in ${initDuration}ms`);
  console.log('✅ Current URL:', window.location.href);
  console.log('✅ Has auth params:', window.location.hash.includes('id_token') || window.location.search.includes('code'));
  
  // Track successful initialization
  logger.trackMSALEvent('Initialization_Success', {
    durationMs: initDuration,
    attempt: initAttempts,
    url: window.location.href,
    hasAuthParams: window.location.hash.includes('id_token') || window.location.search.includes('code')
  });
  
  // Reset the initialization flag since we succeeded
  window[MSAL_INIT_KEY] = false;
  
  // Reset attempt counter on successful initialization
  if (initAttempts > 1) {
    console.log(`🔄 Resetting attempt counter after successful init (was ${initAttempts})`);
    sessionStorage.removeItem(INIT_ATTEMPT_KEY);
  }
  
  console.log('🔄 Starting redirect promise handling...');
  
  return msalInstanceSingleton.handleRedirectPromise();
}).then((response: any) => {
  const redirectEndTime = Date.now();
  const totalDuration = redirectEndTime - initStartTime;
  console.log(`✅ Redirect promise handled in ${totalDuration}ms total`);
  
  // Track redirect handling
  logger.trackMSALEvent('Redirect_Handled', {
    durationMs: totalDuration,
    hasResponse: !!response,
    url: window.location.href
  });
  
  // Reset init attempts counter on successful redirect handling
  sessionStorage.removeItem(INIT_ATTEMPT_KEY);
  console.log('✅ Init attempts counter reset - no loop detected');
  
  if (response) {
    console.log('✅ Redirect response received:', response);
    console.log('✅ User successfully authenticated:', response.account?.username);
    console.log('✅ Access token present:', !!response.accessToken);
    
    // Track successful authentication
    logger.trackAuthEvent('Authentication_Success', {
      username: response.account?.username,
      hasAccessToken: !!response.accessToken,
      hasIdToken: !!response.idToken,
      scopes: response.scopes,
      totalDurationMs: totalDuration
    });
    
    // Set the active account
    msalInstanceSingleton.setActiveAccount(response.account);
    console.log('✅ Active account set');
    
    // Clear auth parameters from URL to prevent reprocessing
    if (window.location.hash.includes('id_token') || window.location.search.includes('code')) {
      console.log('🔄 Clearing auth parameters from URL');
      const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
    
    // For mobile debugging - log redirect success
    console.log('📱 MOBILE DEBUG: Redirect successful, user should be logged in');
    console.log('📱 Account details:', {
      username: response.account?.username,
      name: response.account?.name,
      homeAccountId: response.account?.homeAccountId
    });
    
  } else {
    console.log('No redirect response (first load or silent)');
  }
  
  // Check current authentication state
  const accounts = msalInstanceSingleton.getAllAccounts();
  console.log('Current accounts after redirect handling:', accounts.length);
  
  if (accounts.length > 0 && !msalInstanceSingleton.getActiveAccount()) {
    console.log('🔄 Setting active account from available accounts');
    msalInstanceSingleton.setActiveAccount(accounts[0]);
  }
  
}).catch((error: any) => {
  console.error('❌ MSAL initialization or redirect handling failed:', error);
  window[MSAL_INIT_KEY] = false; // Reset flag on error
  
  // Track the error
  logger.trackException(error, {
    errorCode: error.errorCode,
    errorMessage: error.errorMessage,
    stage: 'MSAL_Initialization_or_Redirect',
    url: window.location.href,
    attempt: initAttempts
  });
  
  // Handle specific hash_empty_error
  if (error.errorCode === 'hash_empty_error') {
    console.log('Hash empty error detected - this is usually safe to ignore on first load');
    logger.trackMSALEvent('Hash_Empty_Error', {
      message: 'Safe to ignore on first load',
      url: window.location.href
    });
    // Don't clear cache here as it might interfere with ongoing auth
  } else if (error.errorCode === 'interaction_in_progress') {
    console.log('Authentication interaction already in progress');
    logger.trackMSALEvent('Interaction_In_Progress', {
      message: 'Retrying in 2 seconds',
      url: window.location.href
    });
    // For mobile, sometimes we need to wait and retry
    setTimeout(() => {
      console.log('🔄 Retrying redirect handling after interaction_in_progress');
      msalInstanceSingleton.handleRedirectPromise().then(response => {
        console.log('Retry result:', response);
        logger.trackMSALEvent('Retry_Success', { hasResponse: !!response });
      }).catch(retryError => {
        console.error('Retry failed:', retryError);
        logger.trackException(retryError, { stage: 'Retry_After_Interaction_In_Progress' });
      });
    }, 2000);
  } else {
    console.error('Unexpected authentication error:', error);
    logger.trackMSALEvent('Unexpected_Error', {
      errorCode: error.errorCode,
      errorMessage: error.errorMessage,
      stack: error.stack
    });
  }
}).finally(() => {
  // Ensure app renders regardless of MSAL state
  console.log('🚀 Rendering React app');
  
  // Prevent double-mount issues with React.StrictMode
  const rootElement = document.getElementById('root') as HTMLElement;
  if (rootElement.hasChildNodes()) {
    console.log('⚠️ Root element already has children, skipping render to prevent double-mount');
    return;
  }
  
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <MsalProvider instance={msalInstanceSingleton}>
        <App />
      </MsalProvider>
    </React.StrictMode>
  );
});
