import React from 'react';
import ReactDOM from 'react-dom/client';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './config/authConfig';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL and handle redirects
msalInstance.initialize().then(() => {
  console.log('MSAL initialized successfully');
  return msalInstance.handleRedirectPromise();
}).then((response) => {
  if (response) {
    console.log('Redirect response:', response);
  } else {
    console.log('No redirect response (first load or silent)');
  }
}).catch((error) => {
  console.error('MSAL initialization or redirect handling failed:', error);
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  </React.StrictMode>
);
