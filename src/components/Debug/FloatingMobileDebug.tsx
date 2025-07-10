import React, { useState, useEffect } from 'react';
import { Button, Offcanvas } from 'react-bootstrap';
import MobileDebugPanel from './MobileDebugPanel';

const FloatingMobileDebug: React.FC = () => {
  const [show, setShow] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  // Make debug panel globally accessible
  useEffect(() => {
    (window as any).showMobileDebug = () => {
      console.log('Forcing mobile debug panel to show');
      setShouldShow(true);
      setShow(true);
    };
    
    (window as any).hideMobileDebug = () => {
      console.log('Hiding mobile debug panel');
      setShow(false);
      setShouldShow(false);
    };

    return () => {
      delete (window as any).showMobileDebug;
      delete (window as any).hideMobileDebug;
    };
  }, []);

  useEffect(() => {
    const determineVisibility = () => {
      // Always show on mobile devices
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Show if debug parameter is in URL
      const hasDebugParam = window.location.search.includes('debug=mobile');
      
      // Show if there are authentication parameters (potential white screen scenario)
      const hasAuthParams = window.location.hash.includes('id_token') ||
                           window.location.hash.includes('access_token') ||
                           window.location.search.includes('code') ||
                           window.location.search.includes('error');
      
      // Show if we're on a blank/minimal page (potential white screen)
      const isMinimalPage = document.body.children.length <= 3;
      
      // Show if localStorage has MSAL data (user has authenticated before)
      const hasMsalData = Object.keys(localStorage).some(key => key.includes('msal'));
      
      // Show in development mode
      const isDev = window.location.hostname === 'localhost';
      
      const shouldDisplay = isMobile || hasDebugParam || hasAuthParams || 
                           (isMinimalPage && hasMsalData) || isDev;
      
      setShouldShow(shouldDisplay);
      
      // Log debug button visibility decision
      console.log('FloatingMobileDebug visibility:', {
        isMobile,
        hasDebugParam,
        hasAuthParams,
        isMinimalPage,
        hasMsalData,
        isDev,
        shouldDisplay
      });
    };

    determineVisibility();
    
    // Re-check visibility after a short delay (in case page content loads)
    const timer = setTimeout(determineVisibility, 1000);
    
    // Add keyboard shortcut to force show debug panel (Ctrl+Shift+D)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        console.log('Debug panel keyboard shortcut triggered');
        setShouldShow(true);
        setShow(true);
        event.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!shouldShow) {
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
          zIndex: 10000, // Higher z-index to appear above everything
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          fontSize: '24px',
          boxShadow: '0 6px 12px rgba(0,0,0,0.5)',
          border: '3px solid #ffffff',
          animation: shouldShow ? 'pulse 2s infinite' : 'none',
        }}
        onClick={() => setShow(true)}
        title="Mobile Debug Panel (Ctrl+Shift+D)"
      >
        🔧
      </Button>

      {/* Add CSS animation for pulsing effect */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

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
