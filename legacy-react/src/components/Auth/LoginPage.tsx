import React, { useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const { login } = useAuth();

  useEffect(() => {
    // Check for token in URL params (OAuth redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleLogin = () => {
    login();
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={6}>
          <Card>
            <Card.Header className="text-center">
              <h3>🔴 Pokemon Game</h3>
            </Card.Header>
            <Card.Body className="text-center">
              <Alert variant="info" className="mb-4">
                <strong>Welcome!</strong><br />
                Sign in with your Microsoft account to start catching Pokemon!
              </Alert>
              
              <Button 
                variant="primary" 
                size="lg" 
                onClick={handleLogin}
                className="w-100"
              >
                <i className="fab fa-microsoft me-2"></i>
                Sign in with Microsoft
              </Button>
              
              <div className="mt-3">
                <small className="text-muted">
                  Your game progress will be saved to your Microsoft account
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default LoginPage;
