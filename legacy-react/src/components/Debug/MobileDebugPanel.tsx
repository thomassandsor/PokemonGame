import React from 'react';
import { Modal, Button, Badge, ListGroup } from 'react-bootstrap';

interface MobileDebugPanelProps {
  onClose: () => void;
  authData: {
    authenticated: boolean;
    user: any;
    isDemoMode: boolean;
  };
  actions: {
    toggleDemoMode: () => void;
  };
}

const MobileDebugPanel: React.FC<MobileDebugPanelProps> = ({ onClose, authData, actions }) => {
  return (
    <Modal show={true} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>🐛 Debug Panel</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ListGroup variant="flush">
          <ListGroup.Item className="d-flex justify-content-between align-items-center">
            Authenticated
            <Badge bg={authData.authenticated ? 'success' : 'danger'}>
              {authData.authenticated ? 'Yes' : 'No'}
            </Badge>
          </ListGroup.Item>
          <ListGroup.Item className="d-flex justify-content-between align-items-center">
            Demo Mode
            <Badge bg={authData.isDemoMode ? 'warning' : 'secondary'}>
              {authData.isDemoMode ? 'On' : 'Off'}
            </Badge>
          </ListGroup.Item>
          {authData.user && (
            <ListGroup.Item>
              <strong>User:</strong><br />
              {authData.user.name} ({authData.user.email})
            </ListGroup.Item>
          )}
          <ListGroup.Item>
            <strong>URL:</strong><br />
            <small>{window.location.href}</small>
          </ListGroup.Item>
          <ListGroup.Item>
            <strong>User Agent:</strong><br />
            <small>{navigator.userAgent}</small>
          </ListGroup.Item>
        </ListGroup>
        
        <div className="mt-3">
          <Button 
            variant="outline-warning" 
            size="sm" 
            onClick={actions.toggleDemoMode}
            className="me-2"
          >
            Toggle Demo Mode
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default MobileDebugPanel;
