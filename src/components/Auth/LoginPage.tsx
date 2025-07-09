import React from 'react';
import { Card, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useMsal } from '@azure/msal-react';

const LoginPage: React.FC = () => {
  const { instance } = useMsal();
  const [error, setError] = React.useState<string>('');
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Check if we're processing a redirect on page load
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasAuthParams = window.location.hash.includes('id_token') || 
                         window.location.hash.includes('access_token') ||
                         urlParams.has('code') || 
                         urlParams.has('error');
    
    if (hasAuthParams) {
      console.log('Authentication redirect detected, processing...');
      setIsProcessing(true);
      
      // Clear any existing error since we're processing auth
      setError('');
      
      // Give MSAL time to process the redirect
      const timer = setTimeout(() => {
        setIsProcessing(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleFreshRegistration = async () => {
    try {
      setError('');
      setIsProcessing(true);
      // Force logout first, then fresh login
      await instance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin + '/login?fresh=true'
      });
    } catch (error) {
      console.error('Fresh registration failed:', error);
      setError(`Fresh registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsProcessing(false);
    }
  };

  const handleLogin = async () => {
    try {
      setError('');
      setIsProcessing(true);
      console.log('Attempting login with config:', {
        authority: process.env.REACT_APP_AUTHORITY,
        clientId: process.env.REACT_APP_CLIENT_ID,
        knownAuthorities: process.env.REACT_APP_KNOWN_AUTHORITY
      });
      
      // Force fresh registration flow
      const customLoginRequest = {
        scopes: ["openid", "profile", "email"],
        prompt: "select_account",  // Changed from "consent" to "select_account"
        loginHint: "",      // Clear any login hints
        extraQueryParameters: {
          "response_mode": "fragment"
        }
      };
      
      // Check if we're in a mobile environment or private browsing
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isPrivateBrowsing = await checkPrivateBrowsing();
      
      if (isMobile || isPrivateBrowsing) {
        console.log('Using redirect flow for mobile/private browsing');
        await instance.loginRedirect(customLoginRequest);
      } else {
        console.log('Using popup flow for desktop');
        await instance.loginPopup(customLoginRequest);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Login failed:', error);
      setIsProcessing(false);
      
      // If popup fails, try redirect as fallback
      if (error instanceof Error && error.message.includes('popup')) {
        console.log('Popup failed, trying redirect...');
        try {
          setIsProcessing(true);
          const customLoginRequest = {
            scopes: ["openid", "profile", "email"],
            prompt: "select_account",
            extraQueryParameters: {
              "response_mode": "fragment"
            }
          };
          await instance.loginRedirect(customLoginRequest);
        } catch (redirectError) {
          console.error('Redirect also failed:', redirectError);
          setIsProcessing(false);
          setError(`Login failed: ${redirectError instanceof Error ? redirectError.message : 'Unknown error'}`);
        }
      } else {
        let errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Provide specific help for hash_empty_error
        if (errorMessage.includes('hash_empty_error')) {
          errorMessage = 'Authentication error on mobile/private browsing. Please try refreshing the page and logging in again. If the problem persists, try using a regular browser window.';
        }
        
        setError(`Login failed: ${errorMessage}`);
      }
    }
  };

  // Check if running in private browsing mode
  const checkPrivateBrowsing = async (): Promise<boolean> => {
    try {
      // Try to use localStorage - this fails in private browsing in some browsers
      const testKey = '__test_private_browsing__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      
      // Check for Safari private browsing
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        return (estimate.quota || 0) < 120000000; // Less than ~120MB usually indicates private mode
      }
      
      return false;
    } catch {
      return true; // If localStorage access fails, assume private browsing
    }
  };

  return (
    <Row className="justify-content-center">
      <Col md={6} lg={4}>
        <Card className="auth-container">
          <Card.Body>
            <div className="text-center mb-4">
              <h2>🔴 Pokemon Game</h2>
              <p className="text-muted">Welcome back, Trainer!</p>
            </div>
            
            {isProcessing && (
              <Alert variant="info" className="text-center">
                <Spinner animation="border" size="sm" className="me-2" />
                Processing authentication...
              </Alert>
            )}
            
            {error && !isProcessing && <Alert variant="danger">{error}</Alert>}
            
            <div className="d-grid gap-2">
              <Button 
                variant="primary" 
                size="lg" 
                onClick={handleLogin}
                className="mb-2"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Signing In...
                  </>
                ) : (
                  'Sign In / Sign Up'
                )}
              </Button>
              
              <Button 
                variant="outline-secondary" 
                onClick={handleFreshRegistration}
                className="mb-3"
              >
                Fresh Registration (Reset Session)
              </Button>
              
              <div className="text-center">
                <p className="text-muted">
                  New to Pokemon Game? Click the login button above to sign up or sign in!
                </p>
                <p className="text-muted small">
                  Having issues? Try "Fresh Registration" to reset your session.
                </p>
              </div>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default LoginPage;
