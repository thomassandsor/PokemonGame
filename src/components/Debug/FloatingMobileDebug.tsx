import React, { useState } from 'react';
import { Button, Offcanvas } from 'react-bootstrap';
import MobileDebugPanel from './MobileDebugPanel';

const FloatingMobileDebug: React.FC = () => {
  const [show, setShow] = useState(false);

  // Only show on mobile devices or when specifically needed
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const showDebugButton = isMobile || window.location.search.includes('debug=mobile');

  if (!showDebugButton) {
    return null;
  }

  return (
    <>
      <Button
        variant="info"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1050,
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          fontSize: '20px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        }}
        onClick={() => setShow(true)}
        title="Mobile Debug Panel"
      >
        🔧
      </Button>

      <Offcanvas show={show} onHide={() => setShow(false)} placement="bottom" style={{ height: '80vh' }}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Mobile Authentication Debug</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <MobileDebugPanel />
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default FloatingMobileDebug;
