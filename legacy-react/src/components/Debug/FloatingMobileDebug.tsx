import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import MobileDebugPanel from './MobileDebugPanel';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoMode } from '../../contexts/DemoContext';

const FloatingMobileDebug: React.FC = () => {
  const [showDebug, setShowDebug] = useState(false);
  const { authenticated, user } = useAuth();
  const { isDemoMode, setDemoMode } = useDemoMode();

  const toggleDemoMode = () => {
    setDemoMode(!isDemoMode);
  };

  // Only show on mobile devices
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (!isMobile) return null;

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setShowDebug(!showDebug)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1050,
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          padding: '0',
          opacity: 0.8
        }}
      >
        🐛
      </Button>
      
      {showDebug && (
        <MobileDebugPanel 
          onClose={() => setShowDebug(false)}
          authData={{
            authenticated,
            user,
            isDemoMode
          }}
          actions={{
            toggleDemoMode
          }}
        />
      )}
    </>
  );
};

export default FloatingMobileDebug;
