import React from 'react';
import ReactDOM from 'react-dom/client';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig, eventCallback } from './config/authConfig';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

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

// Initialize MSAL and handle redirects
console.log('🔄 Starting MSAL initialization sequence...');
console.log('🔄 Window location:', window.location.href);
console.log('🔄 Time:', new Date().toISOString());

// Add timing tracking to debug the initialization loop
const initStartTime = Date.now();

msalInstanceSingleton.initialize().then(() => {
  const initEndTime = Date.now();
  console.log(`✅ MSAL initialized successfully in ${initEndTime - initStartTime}ms`);
  console.log('✅ Current URL:', window.location.href);
  console.log('✅ Has auth params:', window.location.hash.includes('id_token') || window.location.search.includes('code'));
  
  // Reset the initialization flag since we succeeded
  window[MSAL_INIT_KEY] = false;
  
  console.log('🔄 Starting redirect promise handling...');
  const redirectStartTime = Date.now();
  
  return msalInstanceSingleton.handleRedirectPromise();
}).then((response: any) => {
  const redirectEndTime = Date.now();
  console.log(`✅ Redirect promise handled in ${redirectEndTime - initStartTime}ms total`);
  
  if (response) {
    console.log('✅ Redirect response received:', response);
    console.log('✅ User successfully authenticated:', response.account?.username);
    console.log('✅ Access token present:', !!response.accessToken);
    
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
  
  // Handle specific hash_empty_error
  if (error.errorCode === 'hash_empty_error') {
    console.log('Hash empty error detected - this is usually safe to ignore on first load');
    // Don't clear cache here as it might interfere with ongoing auth
  } else if (error.errorCode === 'interaction_in_progress') {
    console.log('Authentication interaction already in progress');
    // For mobile, sometimes we need to wait and retry
    setTimeout(() => {
      console.log('🔄 Retrying redirect handling after interaction_in_progress');
      msalInstanceSingleton.handleRedirectPromise().then(response => {
        console.log('Retry result:', response);
      }).catch(retryError => {
        console.error('Retry failed:', retryError);
      });
    }, 2000);
  } else {
    console.error('Unexpected authentication error:', error);
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
