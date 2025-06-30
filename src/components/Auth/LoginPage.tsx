import React from 'react';
import { Card, Button, Row, Col, Alert } from 'react-bootstrap';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../config/authConfig';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const { instance } = useMsal();
  const navigate = useNavigate();
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
      
      await instance.loginPopup(customLoginRequest);
    } catch (error) {
      console.error('Login failed:', error);
      setError(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
