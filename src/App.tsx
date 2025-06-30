import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import LoginPage from './components/Auth/LoginPage';
import MyPage from './components/MyPage/MyPage';
import QRScannerPage from './components/QRScanner/QRScannerPage';
import Layout from './components/Layout/Layout';
import './App.css';

function App() {
  const isAuthenticated = useIsAuthenticated();
  const { instance, accounts } = useMsal();
  
  // Debug logging
  React.useEffect(() => {
    console.log('Authentication status:', isAuthenticated);
    console.log('Number of accounts:', accounts.length);
    console.log('Accounts:', accounts);
    console.log('MSAL config being used:', {
      authority: process.env.REACT_APP_AUTHORITY,
      clientId: process.env.REACT_APP_CLIENT_ID,
      redirectUri: process.env.REACT_APP_REDIRECT_URI
    });
  }, [isAuthenticated, accounts]);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route 
            path="/login" 
            element={!isAuthenticated ? <LoginPage /> : <Navigate to="/my-page" />} 
          />
          <Route 
            path="/my-page" 
            element={isAuthenticated ? <MyPage /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/scan-pokemon" 
            element={isAuthenticated ? <QRScannerPage /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/" 
            element={<Navigate to={isAuthenticated ? "/my-page" : "/login"} />} 
          />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
