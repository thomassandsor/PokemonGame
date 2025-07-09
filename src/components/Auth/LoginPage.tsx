import React from 'react';
import { Card, Button, Row, Col, Alert } from 'react-bootstrap';
import { useMsal } from '@azure/msal-react';

const LoginPage: React.FC = () => {
  const { instance } = useMsal();
  const [error, setError] = React.useState<string>('');

  const handleFreshRegistration = async () => {
    try {
      setError('');
      // Force logout first, then fresh login
      await instance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin + '/login?fresh=true'
      });
    } catch (error) {
      console.error('Fresh registration failed:', error);
      setError(`Fresh registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLogin = async () => {
    try {
      setError('');
      console.log('Attempting login with config:', {
        authority: process.env.REACT_APP_AUTHORITY,
        clientId: process.env.REACT_APP_CLIENT_ID,
        knownAuthorities: process.env.REACT_APP_KNOWN_AUTHORITY
      });
      
      // Force fresh registration flow
      const customLoginRequest = {
        scopes: ["openid"],
        prompt: "consent",  // Force consent screen
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
      }
    } catch (error) {
      console.error('Login failed:', error);
      
      // If popup fails, try redirect as fallback
      if (error instanceof Error && error.message.includes('popup')) {
        console.log('Popup failed, trying redirect...');
        try {
          const customLoginRequest = {
            scopes: ["openid"],
            prompt: "consent",
            extraQueryParameters: {
              "response_mode": "fragment"
            }
          };
          await instance.loginRedirect(customLoginRequest);
        } catch (redirectError) {
          console.error('Redirect also failed:', redirectError);
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
            
            {error && <Alert variant="danger">{error}</Alert>}
            
            <div className="d-grid gap-2">
              <Button 
                variant="primary" 
                size="lg" 
                onClick={handleLogin}
                className="mb-2"
              >
                Sign In / Sign Up
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
