import React, { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Modal, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useMsal, useAccount } from '@azure/msal-react';
import QrScanner from 'qr-scanner';
import { catchPokemonByName, getContactByEmail } from '../../services/azureFunctionsDataverseService';

const QRScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const { accounts } = useMsal();
  const account = useAccount(accounts[0] || {});
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [pokemonData, setPokemonData] = useState({
    name: '',
    id: 1
  });

  useEffect(() => {
    return () => {
      // Cleanup scanner on unmount
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setError('');
      setScanning(true);

      if (videoRef.current) {
        qrScannerRef.current = new QrScanner(
          videoRef.current,
          result => handleScanResult(result.data),
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        );
        
        await qrScannerRef.current.start();
      }
    } catch (error) {
      console.error('Error starting scanner:', error);
      setError('Failed to start camera. Please check your camera permissions.');
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
    }
    setScanning(false);
  };

  const handleScanResult = async (data: string) => {
    try {
      stopScanning();
      
      // Parse QR code data (assuming it's JSON with Pokemon info)
      let pokemonInfo;
      try {
        pokemonInfo = JSON.parse(data);
      } catch {
        // If not JSON, treat as simple pokemon name
        pokemonInfo = { name: data };
      }
      
      setPokemonData({
        name: pokemonInfo.name || 'Unknown Pokemon',
        id: pokemonInfo.id || 1 // Default to Bulbasaur if no ID provided
      });
      
      setShowModal(true);
      
    } catch (error) {
      console.error('Error processing scan result:', error);
      setError('Failed to process QR code data.');
    }
  };

  const handleSavePokemon = async () => {
    if (!account?.username) {
      setError('User not authenticated');
      return;
    }

    try {
      setError('');
      
      // Get current user's contact
      const contact = await getContactByEmail(account.username);
      if (!contact?.contactid) {
        setError('User profile not found. Please try logging out and back in.');
        return;
      }

      // Catch the Pokemon using the simplified schema
      await catchPokemonByName(contact.contactid, pokemonData.id, pokemonData.name);
      
      setSuccess(`${pokemonData.name} has been added to your collection!`);
      setShowModal(false);
      
      // Navigate back to My Page after a delay
      setTimeout(() => {
        navigate('/my-page');
      }, 2000);
      
    } catch (error) {
      console.error('Error saving Pokemon:', error);
      setError('Failed to save Pokemon. Please try again.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPokemonData(prev => ({
      ...prev,
      [name]: name === 'level' ? parseInt(value) || 1 : value
    }));
  };

  return (
    <Container>
      <Row className="justify-content-center">
        <Col lg={8}>
          <Card>
            <Card.Header className="text-center">
              <h2>📱 Pokemon QR Scanner</h2>
              <p className="text-muted mb-0">Scan a Pokemon QR code to add it to your collection</p>
            </Card.Header>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}
              
              <div className="scanner-container">
                <div className="scanner-wrapper">
                  <video
                    ref={videoRef}
                    className="w-100"
                    style={{ 
                      maxHeight: '400px',
                      borderRadius: '10px',
                      backgroundColor: '#f8f9fa'
                    }}
                  />
                </div>
                
                <div className="text-center mt-3">
                  {!scanning ? (
                    <Button 
                      variant="primary" 
                      size="lg"
                      onClick={startScanning}
                    >
                      Start Scanning
                    </Button>
                  ) : (
                    <Button 
                      variant="danger" 
                      size="lg"
                      onClick={stopScanning}
                    >
                      Stop Scanning
                    </Button>
                  )}
                </div>
                
                <div className="mt-4">
                  <Alert variant="info">
                    <strong>How to use:</strong>
                    <ul className="mb-0 mt-2">
                      <li>Click "Start Scanning" to activate your camera</li>
                      <li>Point your camera at a Pokemon QR code</li>
                      <li>The Pokemon will be automatically detected and added to your collection</li>
                    </ul>
                  </Alert>
                </div>
              </div>
            </Card.Body>
          </Card>
          
          <div className="text-center mt-3">
            <Button 
              variant="outline-secondary"
              onClick={() => navigate('/my-page')}
            >
              ← Back to My Pokemon
            </Button>
          </div>
        </Col>
      </Row>

      {/* Pokemon Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Pokemon Caught! 🎉</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Pokemon Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={pokemonData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter Pokemon name"
              />
              <Form.Text className="text-muted">
                This will be saved to your Pokedex collection.
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSavePokemon}>
            Add to Collection
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default QRScannerPage;
