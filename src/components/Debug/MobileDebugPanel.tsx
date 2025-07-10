import React, { useState, useEffect } from 'react';
import { Card, Button, Accordion, Badge, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { MobileAuthDebugger } from '../../utils/mobileAuthDebugger';
import { ApiHealthMonitor } from '../../utils/apiHealthMonitor';
import { useMsal } from '@azure/msal-react';

interface DeviceInfo {
  userAgent: string;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isPrivateMode: boolean;
  screenSize: string;
  viewportSize: string;
  cookiesEnabled: boolean;
  localStorageAvailable: boolean;
  sessionStorageAvailable: boolean;
}

const MobileDebugPanel: React.FC = () => {
  const { instance, accounts } = useMsal();
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isPrivateMode, setIsPrivateMode] = useState<boolean>(false);
  const [apiHealth, setApiHealth] = useState<any>(null);
  const [testingApi, setTestingApi] = useState<boolean>(false);

  useEffect(() => {
    // Initialize device info
    const info = MobileAuthDebugger.getDeviceInfo() as any;
    setDeviceInfo(info);

    // Detect private mode
    MobileAuthDebugger.detectPrivateMode().then(setIsPrivateMode);

    // Load existing logs
    setLogs(MobileAuthDebugger.getLogs());

    // Update device info with private mode
    if (info) {
      info.isPrivateMode = isPrivateMode;
      setDeviceInfo(info);
    }
  }, [isPrivateMode]);

  const handleClearLogs = () => {
    MobileAuthDebugger.clearLogs();
    setLogs([]);
  };

  const handleRefreshLogs = () => {
    setLogs(MobileAuthDebugger.getLogs());
  };

  const handleTestLogin = async () => {
    MobileAuthDebugger.log('Manual test login initiated');
    try {
      await instance.loginPopup({
        scopes: ['openid', 'profile', 'email']
      });
      MobileAuthDebugger.log('Manual test login completed successfully');
      MobileAuthDebugger.logAuthState(instance, accounts);
    } catch (error) {
      MobileAuthDebugger.log('Manual test login failed', error);
    }
    handleRefreshLogs();
  };

  const handleClearAuthCache = () => {
    MobileAuthDebugger.clearAuthCache();
    MobileAuthDebugger.log('Auth cache cleared - please refresh page');
    handleRefreshLogs();
  };

  const handleLogAuthState = () => {
    MobileAuthDebugger.logAuthState(instance, accounts);
    handleRefreshLogs();
  };

  const handleTestApiHealth = async () => {
    setTestingApi(true);
    try {
      const result = await ApiHealthMonitor.testApiConnectivity();
      setApiHealth(result);
      MobileAuthDebugger.log('API connectivity test completed', result);
    } catch (error) {
      MobileAuthDebugger.log('API connectivity test failed', error);
    } finally {
      setTestingApi(false);
      handleRefreshLogs();
    }
  };

  const getDeviceTypeDisplay = () => {
    if (!deviceInfo) return 'Unknown';
    
    if (deviceInfo.isIOS) return 'iOS';
    if (deviceInfo.isAndroid) return 'Android';
    if (deviceInfo.isMobile) return 'Mobile (Other)';
    return 'Desktop';
  };

  const getBrowserDisplay = () => {
    if (!deviceInfo) return 'Unknown';
    
    if (deviceInfo.isSafari) return 'Safari';
    if (deviceInfo.isChrome) return 'Chrome';
    return 'Other';
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5 className="mb-0">
          Mobile Authentication Debug Panel
          <Badge bg="info" className="ms-2">
            {getDeviceTypeDisplay()}
          </Badge>
          <Badge bg={isPrivateMode ? "warning" : "success"} className="ms-2">
            {isPrivateMode ? "Private Mode" : "Normal Mode"}
          </Badge>
        </h5>
      </Card.Header>
      <Card.Body>
        <Accordion defaultActiveKey="0">
          <Accordion.Item eventKey="0">
            <Accordion.Header>Device Information</Accordion.Header>
            <Accordion.Body>
              {deviceInfo && (
                <Row>
                  <Col md={6}>
                    <strong>Device Type:</strong> {getDeviceTypeDisplay()}<br/>
                    <strong>Browser:</strong> {getBrowserDisplay()}<br/>
                    <strong>Screen Size:</strong> {deviceInfo.screenSize}<br/>
                    <strong>Viewport:</strong> {deviceInfo.viewportSize}<br/>
                  </Col>
                  <Col md={6}>
                    <strong>Cookies Enabled:</strong> {deviceInfo.cookiesEnabled ? '✅' : '❌'}<br/>
                    <strong>LocalStorage:</strong> {deviceInfo.localStorageAvailable ? '✅' : '❌'}<br/>
                    <strong>SessionStorage:</strong> {deviceInfo.sessionStorageAvailable ? '✅' : '❌'}<br/>
                    <strong>Private Mode:</strong> {isPrivateMode ? '⚠️' : '✅'}<br/>
                  </Col>
                </Row>
              )}
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="1">
            <Accordion.Header>Authentication Status</Accordion.Header>
            <Accordion.Body>
              <Row>
                <Col md={6}>
                  <strong>Accounts:</strong> {accounts.length}<br/>
                  <strong>Active Account:</strong> {instance.getActiveAccount()?.username || 'None'}<br/>
                </Col>
                <Col md={6}>
                  <Button variant="outline-primary" onClick={handleTestLogin} className="me-2 mb-2">
                    Test Login
                  </Button>
                  <Button variant="outline-info" onClick={handleLogAuthState} className="me-2 mb-2">
                    Log Auth State
                  </Button>
                  <Button variant="outline-warning" onClick={handleClearAuthCache} className="mb-2">
                    Clear Auth Cache
                  </Button>
                </Col>
              </Row>
              {accounts.length > 0 && (
                <Alert variant="success" className="mt-3">
                  <strong>Authenticated as:</strong> {accounts[0].username}
                </Alert>
              )}
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="2">
            <Accordion.Header>API Health & Connectivity</Accordion.Header>
            <Accordion.Body>
              <div className="mb-3">
                <Button 
                  variant="outline-info" 
                  onClick={handleTestApiHealth} 
                  disabled={testingApi}
                  className="me-2"
                >
                  {testingApi ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Testing...
                    </>
                  ) : (
                    'Test API Health'
                  )}
                </Button>
              </div>
              
              {apiHealth && (
                <div>
                  <Alert variant={apiHealth.health.isHealthy ? "success" : "danger"}>
                    <strong>API Status:</strong> {apiHealth.health.status} 
                    ({apiHealth.health.responseTime}ms)
                    {apiHealth.health.error && (
                      <><br/><small>Error: {apiHealth.health.error}</small></>
                    )}
                  </Alert>
                  
                  <Row>
                    <Col md={6}>
                      <strong>Network:</strong> {apiHealth.network.online ? '✅ Online' : '❌ Offline'}<br/>
                      <strong>Connection:</strong> {apiHealth.network.effectiveType || 'Unknown'}<br/>
                      <strong>Response Time:</strong> {apiHealth.health.responseTime}ms<br/>
                    </Col>
                    <Col md={6}>
                      <strong>API URL:</strong><br/>
                      <code style={{ fontSize: '10px', wordBreak: 'break-all' }}>
                        {apiHealth.environment.apiBaseUrl}
                      </code>
                    </Col>
                  </Row>
                </div>
              )}
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="3">
            <Accordion.Header>Debug Logs ({logs.length})</Accordion.Header>
            <Accordion.Body>
              <div className="mb-3">
                <Button variant="outline-secondary" onClick={handleRefreshLogs} className="me-2">
                  Refresh Logs
                </Button>
                <Button variant="outline-danger" onClick={handleClearLogs}>
                  Clear Logs
                </Button>
              </div>
              <div 
                style={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                  backgroundColor: '#f8f9fa',
                  padding: '10px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '12px'
                }}
              >
                {logs.length === 0 ? (
                  <div className="text-muted">No logs available</div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} style={{ marginBottom: '2px' }}>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="4">
            <Accordion.Header>Environment Information</Accordion.Header>
            <Accordion.Body>
              <Row>
                <Col md={6}>
                  <strong>API Base URL:</strong><br/>
                  <code>{process.env.REACT_APP_API_BASE_URL || 'Not set'}</code><br/><br/>
                  <strong>Client ID:</strong><br/>
                  <code>{process.env.REACT_APP_CLIENT_ID || 'Not set'}</code><br/><br/>
                  <strong>Authority:</strong><br/>
                  <code>{process.env.REACT_APP_AUTHORITY || 'Not set'}</code><br/>
                </Col>
                <Col md={6}>
                  <strong>Redirect URI:</strong><br/>
                  <code>{process.env.REACT_APP_REDIRECT_URI || 'Not set'}</code><br/><br/>
                  <strong>Current URL:</strong><br/>
                  <code>{window.location.href}</code><br/><br/>
                  <strong>User Agent:</strong><br/>
                  <code style={{ fontSize: '10px', wordBreak: 'break-all' }}>
                    {navigator.userAgent}
                  </code>
                </Col>
              </Row>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </Card.Body>
    </Card>
  );
};

export default MobileDebugPanel;
