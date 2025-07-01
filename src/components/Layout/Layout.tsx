import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isAuthenticated = useIsAuthenticated();
  const { instance } = useMsal();
  const navigate = useNavigate();

  const handleLogout = () => {
    instance.logoutRedirect({
      postLogoutRedirectUri: "/",
    });
  };

  return (
    <>
      <Navbar bg="primary" variant="dark" expand="lg" className="mb-4">
        <Container>
          <Navbar.Brand onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            🔴 Pokemon Game
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              {isAuthenticated && (
                <>
                  <Nav.Link onClick={() => navigate('/my-page')}>My Pokemon</Nav.Link>
                  <Nav.Link onClick={() => navigate('/pokemon-browser')}>Browse Pokemon</Nav.Link>
                  <Nav.Link onClick={() => navigate('/battle-arena')}>Battle Arena</Nav.Link>
                  <Nav.Link onClick={() => navigate('/evolution-lab')}>Evolution Lab</Nav.Link>
                  <Nav.Link onClick={() => navigate('/scan-pokemon')}>Scan Pokemon</Nav.Link>
                  <Nav.Link onClick={() => navigate('/admin')}>Admin</Nav.Link>
                </>
              )}
            </Nav>
            <Nav>
              {isAuthenticated ? (
                <Button variant="outline-light" onClick={handleLogout}>
                  Logout
                </Button>
              ) : (
                <Button 
                  variant="outline-light" 
                  onClick={() => navigate('/login')}
                >
                  Sign In / Sign Up
                </Button>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container fluid>
        {children}
      </Container>
    </>
  );
};

export default Layout;
